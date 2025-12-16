/**
 * Test suite for createPromidasForServer factory function.
 *
 * This test suite verifies that createPromidasForServer correctly creates
 * repository instances optimized for server/production environments.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PromidasRepositoryBuilder } from '../../builder.js';
import { createPromidasForServer } from '../../factory.js';
import type { ProtopediaInMemoryRepository } from '../../repository/types/index.js';
import { LIMIT_DATA_SIZE_BYTES } from '../../store/index.js';
import { VERSION } from '../../version.js';

describe('createPromidasForServer', () => {
  let mockRepository: ProtopediaInMemoryRepository;
  let setStoreConfigSpy: ReturnType<typeof vi.spyOn>;
  let setApiClientConfigSpy: ReturnType<typeof vi.spyOn>;
  let setRepositoryConfigSpy: ReturnType<typeof vi.spyOn>;
  let buildSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock repository
    mockRepository = {
      setupSnapshot: vi.fn(),
      refreshSnapshot: vi.fn(),
      getPrototypeFromSnapshotByPrototypeId: vi.fn(),
      getRandomPrototypeFromSnapshot: vi.fn(),
      getAllFromSnapshot: vi.fn(),
      getPrototypeIdsFromSnapshot: vi.fn(),
    } as unknown as ProtopediaInMemoryRepository;

    // Spy on PromidasRepositoryBuilder methods
    setStoreConfigSpy = vi.spyOn(
      PromidasRepositoryBuilder.prototype,
      'setStoreConfig',
    );
    setApiClientConfigSpy = vi.spyOn(
      PromidasRepositoryBuilder.prototype,
      'setApiClientConfig',
    );
    setRepositoryConfigSpy = vi.spyOn(
      PromidasRepositoryBuilder.prototype,
      'setRepositoryConfig',
    );
    buildSpy = vi
      .spyOn(PromidasRepositoryBuilder.prototype, 'build')
      .mockReturnValue(mockRepository);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('environment variable handling', () => {
    it('should throw error when PROTOPEDIA_API_V2_TOKEN is not set', () => {
      vi.stubEnv('PROTOPEDIA_API_V2_TOKEN', '');

      expect(() => createPromidasForServer()).toThrow(
        'PROTOPEDIA_API_V2_TOKEN environment variable is required for server environments',
      );

      vi.unstubAllEnvs();
    });

    it('should use token from environment variable', () => {
      const testToken = 'env-test-token-12345';
      vi.stubEnv('PROTOPEDIA_API_V2_TOKEN', testToken);

      createPromidasForServer();

      const apiClientConfigArg = setApiClientConfigSpy.mock.calls[0]?.[0];
      expect(apiClientConfigArg?.protoPediaApiClientOptions?.token).toBe(
        testToken,
      );

      vi.unstubAllEnvs();
    });

    it('should work with different environment variable values', () => {
      const tokens = [
        'short',
        'very-long-token-with-special-characters-!@#$%',
        'token_with_underscores',
      ];

      tokens.forEach((token) => {
        vi.stubEnv('PROTOPEDIA_API_V2_TOKEN', token);

        createPromidasForServer();

        const apiClientConfigArg = setApiClientConfigSpy.mock.calls[0]?.[0];
        expect(apiClientConfigArg?.protoPediaApiClientOptions?.token).toBe(
          token,
        );

        vi.clearAllMocks();
        vi.unstubAllEnvs();
      });
    });
  });

  describe('log level configuration', () => {
    beforeEach(() => {
      vi.stubEnv('PROTOPEDIA_API_V2_TOKEN', 'test-token');
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('should configure store with 10-minute TTL', () => {
      createPromidasForServer();

      const storeConfigArg = setStoreConfigSpy.mock.calls[0]?.[0];
      expect(storeConfigArg?.ttlMs).toBe(10 * 60 * 1000);
    });

    it('should configure store with maxDataSizeBytes limit', () => {
      createPromidasForServer();

      const storeConfigArg = setStoreConfigSpy.mock.calls[0]?.[0];
      expect(storeConfigArg?.maxDataSizeBytes).toBe(LIMIT_DATA_SIZE_BYTES);
    });

    it('should configure store with shared logger', () => {
      createPromidasForServer();

      const storeConfigArg = setStoreConfigSpy.mock.calls[0]?.[0];
      expect(storeConfigArg?.logger).toBeDefined();
      expect(storeConfigArg?.logLevel).toBeUndefined();
    });
  });

  describe('API client configuration', () => {
    beforeEach(() => {
      vi.stubEnv('PROTOPEDIA_API_V2_TOKEN', 'test-token');
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('should configure API client with correct User-Agent', () => {
      createPromidasForServer();

      const apiClientConfigArg = setApiClientConfigSpy.mock.calls[0]?.[0];
      const userAgent =
        apiClientConfigArg?.protoPediaApiClientOptions?.userAgent;

      expect(userAgent).toBe(`PromidasForServer/${VERSION}`);
    });

    it('should configure API client with 30-second timeout', () => {
      createPromidasForServer();

      const apiClientConfigArg = setApiClientConfigSpy.mock.calls[0]?.[0];
      expect(apiClientConfigArg?.protoPediaApiClientOptions?.timeoutMs).toBe(
        30 * 1000,
      );
    });

    it('should configure API client with shared logger', () => {
      createPromidasForServer();

      const apiClientConfigArg = setApiClientConfigSpy.mock.calls[0]?.[0];
      expect(apiClientConfigArg?.logger).toBeDefined();
      expect(apiClientConfigArg?.logLevel).toBeUndefined();
    });

    it('should not configure other API client options', () => {
      createPromidasForServer();

      const apiClientConfigArg = setApiClientConfigSpy.mock.calls[0]?.[0];
      expect(
        apiClientConfigArg?.protoPediaApiClientOptions?.baseUrl,
      ).toBeUndefined();
      expect(
        apiClientConfigArg?.protoPediaApiClientOptions?.fetch,
      ).toBeUndefined();
      expect(
        apiClientConfigArg?.protoPediaApiClientOptions?.logger,
      ).toBeUndefined();
      expect(
        apiClientConfigArg?.protoPediaApiClientOptions?.logLevel,
      ).toBeUndefined();
    });
  });

  describe('repository configuration', () => {
    beforeEach(() => {
      vi.stubEnv('PROTOPEDIA_API_V2_TOKEN', 'test-token');
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('should configure repository with shared logger', () => {
      createPromidasForServer();

      const repositoryConfigArg = setRepositoryConfigSpy.mock.calls[0]?.[0];
      expect(repositoryConfigArg).toEqual({ logger: expect.any(Object) });
    });

    it('should provide logger instance to repository config', () => {
      createPromidasForServer();

      const repositoryConfigArg = setRepositoryConfigSpy.mock.calls[0]?.[0];
      expect(repositoryConfigArg?.logger).toBeDefined();
      expect(repositoryConfigArg?.logLevel).toBeUndefined();
    });

    it('should provide logger instance to repository', () => {
      createPromidasForServer();

      const repositoryConfigArg = setRepositoryConfigSpy.mock.calls[0]?.[0];
      expect(repositoryConfigArg?.logger).toBeDefined();
    });
  });

  describe('custom logLevel parameter', () => {
    beforeEach(() => {
      vi.stubEnv('PROTOPEDIA_API_V2_TOKEN', 'test-token');
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('should create logger with custom logLevel for all components when provided', () => {
      createPromidasForServer({ logLevel: 'debug' });

      const storeConfigArg = setStoreConfigSpy.mock.calls[0]?.[0];
      const apiClientConfigArg = setApiClientConfigSpy.mock.calls[0]?.[0];
      const repositoryConfigArg = setRepositoryConfigSpy.mock.calls[0]?.[0];

      expect(storeConfigArg?.logger).toBeDefined();
      expect(apiClientConfigArg?.logger).toBeDefined();
      expect(repositoryConfigArg?.logger).toBeDefined();
      expect(storeConfigArg?.logLevel).toBeUndefined();
      expect(apiClientConfigArg?.logLevel).toBeUndefined();
      expect(repositoryConfigArg?.logLevel).toBeUndefined();
    });

    it('should create logger with info logLevel when explicitly provided', () => {
      createPromidasForServer({ logLevel: 'info' });

      const storeConfigArg = setStoreConfigSpy.mock.calls[0]?.[0];
      const apiClientConfigArg = setApiClientConfigSpy.mock.calls[0]?.[0];
      const repositoryConfigArg = setRepositoryConfigSpy.mock.calls[0]?.[0];

      expect(storeConfigArg?.logger).toBeDefined();
      expect(apiClientConfigArg?.logger).toBeDefined();
      expect(repositoryConfigArg?.logger).toBeDefined();
    });

    it('should create logger with error logLevel when explicitly provided', () => {
      createPromidasForServer({ logLevel: 'error' });

      const storeConfigArg = setStoreConfigSpy.mock.calls[0]?.[0];
      const apiClientConfigArg = setApiClientConfigSpy.mock.calls[0]?.[0];
      const repositoryConfigArg = setRepositoryConfigSpy.mock.calls[0]?.[0];

      expect(storeConfigArg?.logger).toBeDefined();
      expect(apiClientConfigArg?.logger).toBeDefined();
      expect(repositoryConfigArg?.logger).toBeDefined();
    });

    it('should create logger with silent logLevel when explicitly provided', () => {
      createPromidasForServer({ logLevel: 'silent' });

      const storeConfigArg = setStoreConfigSpy.mock.calls[0]?.[0];
      const apiClientConfigArg = setApiClientConfigSpy.mock.calls[0]?.[0];
      const repositoryConfigArg = setRepositoryConfigSpy.mock.calls[0]?.[0];

      expect(storeConfigArg?.logger).toBeDefined();
      expect(apiClientConfigArg?.logger).toBeDefined();
      expect(repositoryConfigArg?.logger).toBeDefined();
    });
  });

  describe('builder method call order', () => {
    beforeEach(() => {
      vi.stubEnv('PROTOPEDIA_API_V2_TOKEN', 'test-token');
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('should call builder methods in correct order', () => {
      createPromidasForServer();

      const callOrder = [
        setStoreConfigSpy,
        setApiClientConfigSpy,
        setRepositoryConfigSpy,
        buildSpy,
      ];

      callOrder.forEach((spy, index) => {
        expect(spy).toHaveBeenCalled();
        if (index > 0) {
          expect(spy.mock.invocationCallOrder[0]).toBeGreaterThan(
            callOrder[index - 1]!.mock.invocationCallOrder[0]!,
          );
        }
      });
    });

    it('should call each builder method exactly once', () => {
      createPromidasForServer();

      expect(setStoreConfigSpy).toHaveBeenCalledTimes(1);
      expect(setApiClientConfigSpy).toHaveBeenCalledTimes(1);
      expect(setRepositoryConfigSpy).toHaveBeenCalledTimes(1);
      expect(buildSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('return value', () => {
    beforeEach(() => {
      vi.stubEnv('PROTOPEDIA_API_V2_TOKEN', 'test-token');
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('should return repository instance from builder', () => {
      const result = createPromidasForServer();

      expect(result).toBe(mockRepository);
      expect(buildSpy).toHaveBeenCalled();
    });

    it('should create independent repository instances', () => {
      buildSpy
        .mockReturnValueOnce(mockRepository)
        .mockReturnValueOnce({} as unknown as ProtopediaInMemoryRepository);

      const repo1 = createPromidasForServer();
      const repo2 = createPromidasForServer();

      expect(repo1).not.toBe(repo2);
      expect(buildSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('constant validation', () => {
    beforeEach(() => {
      vi.stubEnv('PROTOPEDIA_API_V2_TOKEN', 'test-token');
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('should use correct VERSION constant in User-Agent', () => {
      createPromidasForServer();

      const configArg = setApiClientConfigSpy.mock.calls[0]?.[0];
      const userAgent = configArg?.protoPediaApiClientOptions?.userAgent;

      expect(userAgent).toBe(`PromidasForServer/${VERSION}`);
      expect(userAgent).toMatch(/^PromidasForServer\/\d+\.\d+\.\d+$/);
    });

    it('should use correct LIMIT_DATA_SIZE_BYTES constant', () => {
      createPromidasForServer();

      const storeConfigArg = setStoreConfigSpy.mock.calls[0]?.[0];
      expect(storeConfigArg?.maxDataSizeBytes).toBe(LIMIT_DATA_SIZE_BYTES);
      expect(storeConfigArg?.maxDataSizeBytes).toBe(30 * 1024 * 1024);
    });

    it('should configure exact TTL value of 10 minutes', () => {
      createPromidasForServer();

      const storeConfigArg = setStoreConfigSpy.mock.calls[0]?.[0];
      expect(storeConfigArg?.ttlMs).toBe(600000); // 10 * 60 * 1000
    });

    it('should configure exact timeout value of 30 seconds', () => {
      createPromidasForServer();

      const apiClientConfigArg = setApiClientConfigSpy.mock.calls[0]?.[0];
      expect(apiClientConfigArg?.protoPediaApiClientOptions?.timeoutMs).toBe(
        30000,
      );
    });
  });

  describe('environment variable edge cases', () => {
    it('should throw error when environment variable is undefined', () => {
      vi.stubEnv('PROTOPEDIA_API_V2_TOKEN', undefined);

      expect(() => createPromidasForServer()).toThrow(
        'PROTOPEDIA_API_V2_TOKEN environment variable is required for server environments',
      );

      vi.unstubAllEnvs();
    });

    it('should handle empty string token from environment', () => {
      vi.stubEnv('PROTOPEDIA_API_V2_TOKEN', '');

      expect(() => createPromidasForServer()).toThrow(
        'PROTOPEDIA_API_V2_TOKEN environment variable is required for server environments',
      );

      vi.unstubAllEnvs();
    });

    it('should handle token with only whitespace from environment', () => {
      const whitespaceToken = '   \t\n   ';
      vi.stubEnv('PROTOPEDIA_API_V2_TOKEN', whitespaceToken);

      createPromidasForServer();

      const apiClientConfigArg = setApiClientConfigSpy.mock.calls[0]?.[0];
      expect(apiClientConfigArg?.protoPediaApiClientOptions?.token).toBe(
        whitespaceToken,
      );

      vi.unstubAllEnvs();
    });

    it('should handle token with special characters from environment', () => {
      const specialToken = 'token-!@#$%^&*()_+{}[]|:;"<>,.?/~`';
      vi.stubEnv('PROTOPEDIA_API_V2_TOKEN', specialToken);

      createPromidasForServer();

      const apiClientConfigArg = setApiClientConfigSpy.mock.calls[0]?.[0];
      expect(apiClientConfigArg?.protoPediaApiClientOptions?.token).toBe(
        specialToken,
      );

      vi.unstubAllEnvs();
    });
  });

  describe('component independence', () => {
    beforeEach(() => {
      vi.stubEnv('PROTOPEDIA_API_V2_TOKEN', 'test-token');
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('should provide shared logger instance to all components', () => {
      createPromidasForServer();

      const storeConfigArg = setStoreConfigSpy.mock.calls[0]?.[0];
      const apiClientConfigArg = setApiClientConfigSpy.mock.calls[0]?.[0];
      const repositoryConfigArg = setRepositoryConfigSpy.mock.calls[0]?.[0];

      // Factory should provide same logger instance for memory efficiency
      expect(storeConfigArg?.logger).toBeDefined();
      expect(apiClientConfigArg?.logger).toBeDefined();
      expect(repositoryConfigArg?.logger).toBeDefined();

      // All components should share the same logger instance
      expect(storeConfigArg?.logger).toBe(apiClientConfigArg?.logger);
      expect(apiClientConfigArg?.logger).toBe(repositoryConfigArg?.logger);
    });

    it('should not provide logLevel in configs when logger is provided', () => {
      createPromidasForServer({ logLevel: 'error' });

      const storeConfigArg = setStoreConfigSpy.mock.calls[0]?.[0];
      const apiClientConfigArg = setApiClientConfigSpy.mock.calls[0]?.[0];
      const repositoryConfigArg = setRepositoryConfigSpy.mock.calls[0]?.[0];

      // Logger instance contains the logLevel, no need for separate logLevel config
      expect(storeConfigArg?.logLevel).toBeUndefined();
      expect(apiClientConfigArg?.logLevel).toBeUndefined();
      expect(repositoryConfigArg?.logLevel).toBeUndefined();

      // Logger instances are provided
      expect(storeConfigArg?.logger).toBeDefined();
      expect(apiClientConfigArg?.logger).toBeDefined();
      expect(repositoryConfigArg?.logger).toBeDefined();
    });

    it('should use same logger instance across all components regardless of logLevel', () => {
      const testCases: Array<'debug' | 'info' | 'warn' | 'error' | 'silent'> = [
        'debug',
        'info',
        'warn',
        'error',
        'silent',
      ];

      testCases.forEach((level) => {
        vi.clearAllMocks();

        createPromidasForServer({ logLevel: level });

        const storeConfigArg = setStoreConfigSpy.mock.calls[0]?.[0];
        const apiClientConfigArg = setApiClientConfigSpy.mock.calls[0]?.[0];
        const repositoryConfigArg = setRepositoryConfigSpy.mock.calls[0]?.[0];

        // All components should share the same logger instance
        expect(storeConfigArg?.logger).toBe(apiClientConfigArg?.logger);
        expect(apiClientConfigArg?.logger).toBe(repositoryConfigArg?.logger);
      });
    });
  });
});
