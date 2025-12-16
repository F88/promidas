/**
 * Test suite for factory functions.
 *
 * This test suite verifies that factory functions correctly create
 * repository instances with appropriate configurations for different
 * execution environments.
 *
 * ## Test Coverage
 *
 * ### 1. createPromidasRepositoryForLocal
 * - Creates repository instance with token parameter
 * - Returns ProtopediaInMemoryRepository instance
 * - Sets appropriate timeout for local environments
 * - Sets User-Agent with correct version
 * - Uses default configurations for store and logger
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PromidasRepositoryBuilder } from '../builder.js';
import {
  createPromidasRepositoryForLocal,
  createPromidasRepositoryForServer,
} from '../factory.js';
import type { ProtopediaInMemoryRepository } from '../repository/types/index.js';
import { LIMIT_DATA_SIZE_BYTES } from '../store/index.js';
import { VERSION } from '../version.js';

describe('Factory Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createPromidasRepositoryForLocal', () => {
    let mockRepository: ProtopediaInMemoryRepository;
    let setDefaultLogLevelSpy: ReturnType<typeof vi.spyOn>;
    let setStoreConfigSpy: ReturnType<typeof vi.spyOn>;
    let setApiClientConfigSpy: ReturnType<typeof vi.spyOn>;
    let setRepositoryConfigSpy: ReturnType<typeof vi.spyOn>;
    let buildSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
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
      setDefaultLogLevelSpy = vi.spyOn(
        PromidasRepositoryBuilder.prototype,
        'setDefaultLogLevel',
      );
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

    it('should configure builder with correct default log level', () => {
      createPromidasRepositoryForLocal({ protopediaApiToken: 'test-token' });

      expect(setDefaultLogLevelSpy).toHaveBeenCalledWith('info');
    });

    it('should use provided logLevel when specified', () => {
      createPromidasRepositoryForLocal({
        protopediaApiToken: 'test-token',
        logLevel: 'warn',
      });

      expect(setDefaultLogLevelSpy).toHaveBeenCalledWith('warn');
    });

    it('should use provided logLevel for different levels', () => {
      createPromidasRepositoryForLocal({
        protopediaApiToken: 'test-token',
        logLevel: 'debug',
      });
      expect(setDefaultLogLevelSpy).toHaveBeenCalledWith('debug');

      createPromidasRepositoryForLocal({
        protopediaApiToken: 'test-token',
        logLevel: 'error',
      });
      expect(setDefaultLogLevelSpy).toHaveBeenCalledWith('error');
    });

    it('should configure store with correct TTL and maxDataSizeBytes', () => {
      createPromidasRepositoryForLocal({ protopediaApiToken: 'test-token' });

      expect(setStoreConfigSpy).toHaveBeenCalledWith({
        ttlMs: 30 * 60 * 1000, // 30 minutes
        maxDataSizeBytes: LIMIT_DATA_SIZE_BYTES,
      });
    });

    it('should not override store logger settings', () => {
      createPromidasRepositoryForLocal({ protopediaApiToken: 'test-token' });

      const storeConfigArg = setStoreConfigSpy.mock.calls[0]?.[0];
      expect(storeConfigArg).toBeDefined();
      expect(storeConfigArg?.logger).toBeUndefined();
      expect(storeConfigArg?.logLevel).toBeUndefined();
    });

    it('should configure API client with token, User-Agent, and timeout', () => {
      createPromidasRepositoryForLocal({
        protopediaApiToken: 'test-token-123',
      });

      expect(setApiClientConfigSpy).toHaveBeenCalledWith({
        protoPediaApiClientOptions: {
          token: 'test-token-123',
          userAgent: `PromidasRepositoryForLocal/${VERSION}`,
          timeoutMs: 90000, // 90 seconds
        },
      });
    });

    it('should not override api client logger settings', () => {
      createPromidasRepositoryForLocal({ protopediaApiToken: 'test-token' });

      const apiClientConfigArg = setApiClientConfigSpy.mock.calls[0]?.[0];
      expect(apiClientConfigArg).toBeDefined();
      expect(apiClientConfigArg?.logger).toBeUndefined();
      expect(apiClientConfigArg?.logLevel).toBeUndefined();
    });

    it('should not override other ProtoPedia client options', () => {
      createPromidasRepositoryForLocal({ protopediaApiToken: 'test-token' });

      const configArg = setApiClientConfigSpy.mock.calls[0]?.[0];
      expect(configArg).toBeDefined();
      expect(configArg?.protoPediaApiClientOptions?.baseUrl).toBeUndefined();
      expect(configArg?.protoPediaApiClientOptions?.fetch).toBeUndefined();
      expect(configArg?.protoPediaApiClientOptions?.logger).toBeUndefined();
      expect(configArg?.protoPediaApiClientOptions?.logLevel).toBeUndefined();
    });

    it('should call builder methods in expected order', () => {
      createPromidasRepositoryForLocal({ protopediaApiToken: 'test-token' });

      const defaultLogLevelOrder =
        setDefaultLogLevelSpy.mock.invocationCallOrder[0];
      const storeConfigOrder = setStoreConfigSpy.mock.invocationCallOrder[0];
      const apiClientConfigOrder =
        setApiClientConfigSpy.mock.invocationCallOrder[0];
      const repositoryConfigOrder =
        setRepositoryConfigSpy.mock.invocationCallOrder[0];
      const buildOrder = buildSpy.mock.invocationCallOrder[0];

      expect(defaultLogLevelOrder).toBeLessThan(storeConfigOrder);
      expect(storeConfigOrder).toBeLessThan(apiClientConfigOrder);
      expect(apiClientConfigOrder).toBeLessThan(repositoryConfigOrder);
      expect(repositoryConfigOrder).toBeLessThan(buildOrder);
    });

    it('should call each builder setter exactly once per invocation', () => {
      createPromidasRepositoryForLocal({ protopediaApiToken: 'test-token' });

      expect(setDefaultLogLevelSpy).toHaveBeenCalledTimes(1);
      expect(setStoreConfigSpy).toHaveBeenCalledTimes(1);
      expect(setApiClientConfigSpy).toHaveBeenCalledTimes(1);
      expect(setRepositoryConfigSpy).toHaveBeenCalledTimes(1);
      expect(buildSpy).toHaveBeenCalledTimes(1);
    });

    it('should configure repository with empty config', () => {
      createPromidasRepositoryForLocal({ protopediaApiToken: 'test-token' });

      expect(setRepositoryConfigSpy).toHaveBeenCalledWith({});
    });

    it('should not override repository logger settings', () => {
      createPromidasRepositoryForLocal({ protopediaApiToken: 'test-token' });

      const repositoryConfigArg = setRepositoryConfigSpy.mock.calls[0]?.[0];
      expect(repositoryConfigArg).toBeDefined();
      expect(repositoryConfigArg?.logger).toBeUndefined();
      expect(repositoryConfigArg?.logLevel).toBeUndefined();
    });

    it('should call build method', () => {
      createPromidasRepositoryForLocal({ protopediaApiToken: 'test-token' });

      expect(buildSpy).toHaveBeenCalled();
    });

    it('should return repository instance from builder', () => {
      const repository = createPromidasRepositoryForLocal({
        protopediaApiToken: 'test-token',
      });

      expect(repository).toBe(mockRepository);
    });

    it('should configure with different tokens', () => {
      createPromidasRepositoryForLocal({ protopediaApiToken: 'token-1' });
      expect(setApiClientConfigSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          protoPediaApiClientOptions: expect.objectContaining({
            token: 'token-1',
          }),
        }),
      );

      createPromidasRepositoryForLocal({ protopediaApiToken: 'token-2' });
      expect(setApiClientConfigSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          protoPediaApiClientOptions: expect.objectContaining({
            token: 'token-2',
          }),
        }),
      );
    });

    it('should accept tokens with special characters', () => {
      const specialToken = 'token-with-dashes_underscores.dots';
      createPromidasRepositoryForLocal({ protopediaApiToken: specialToken });

      expect(setApiClientConfigSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          protoPediaApiClientOptions: expect.objectContaining({
            token: specialToken,
          }),
        }),
      );
    });

    it('should accept very long tokens', () => {
      const longToken = 'a'.repeat(500);
      createPromidasRepositoryForLocal({ protopediaApiToken: longToken });

      expect(setApiClientConfigSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          protoPediaApiClientOptions: expect.objectContaining({
            token: longToken,
          }),
        }),
      );
    });

    it('should create independent instances for each invocation', () => {
      // Reset and create new mock for second call
      const repo1 = createPromidasRepositoryForLocal({
        protopediaApiToken: 'token-1',
      });

      const mockRepository2 = {
        setupSnapshot: vi.fn(),
        refreshSnapshot: vi.fn(),
        getPrototypeFromSnapshotByPrototypeId: vi.fn(),
        getRandomPrototypeFromSnapshot: vi.fn(),
        getAllFromSnapshot: vi.fn(),
        getPrototypeIdsFromSnapshot: vi.fn(),
      } as unknown as ProtopediaInMemoryRepository;

      buildSpy.mockReturnValueOnce(mockRepository2);

      const repo2 = createPromidasRepositoryForLocal({
        protopediaApiToken: 'token-2',
      });

      expect(repo1).not.toBe(repo2);
      expect(buildSpy).toHaveBeenCalledTimes(2);
    });

    it('should use correct VERSION constant in User-Agent', () => {
      createPromidasRepositoryForLocal({ protopediaApiToken: 'test-token' });

      const configArg = setApiClientConfigSpy.mock.calls[0]?.[0];
      const userAgent = configArg?.protoPediaApiClientOptions?.userAgent;

      expect(userAgent).toBe(`PromidasRepositoryForLocal/${VERSION}`);
      expect(userAgent).toMatch(/^PromidasRepositoryForLocal\/\d+\.\d+\.\d+$/);
    });

    it('should use correct LIMIT_DATA_SIZE_BYTES constant', () => {
      createPromidasRepositoryForLocal({ protopediaApiToken: 'test-token' });

      const storeConfigArg = setStoreConfigSpy.mock.calls[0]?.[0];
      expect(storeConfigArg?.maxDataSizeBytes).toBe(LIMIT_DATA_SIZE_BYTES);
      expect(storeConfigArg?.maxDataSizeBytes).toBe(30 * 1024 * 1024);
    });

    it('should configure exact TTL value of 30 minutes', () => {
      createPromidasRepositoryForLocal({ protopediaApiToken: 'test-token' });

      const storeConfigArg = setStoreConfigSpy.mock.calls[0]?.[0];
      expect(storeConfigArg?.ttlMs).toBe(1800000); // 30 * 60 * 1000
    });

    it('should configure exact timeout value of 90 seconds', () => {
      createPromidasRepositoryForLocal({ protopediaApiToken: 'test-token' });

      const apiClientConfigArg = setApiClientConfigSpy.mock.calls[0]?.[0];
      expect(apiClientConfigArg?.protoPediaApiClientOptions?.timeoutMs).toBe(
        90000,
      );
    });
  });

  describe('createPromidasRepositoryForServer', () => {
    let mockRepository: ProtopediaInMemoryRepository;
    let setDefaultLogLevelSpy: ReturnType<typeof vi.spyOn>;
    let setStoreConfigSpy: ReturnType<typeof vi.spyOn>;
    let setApiClientConfigSpy: ReturnType<typeof vi.spyOn>;
    let setRepositoryConfigSpy: ReturnType<typeof vi.spyOn>;
    let buildSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
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
      setDefaultLogLevelSpy = vi.spyOn(
        PromidasRepositoryBuilder.prototype,
        'setDefaultLogLevel',
      );
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

    describe('environment variable handling', () => {
      it('should throw error when PROTOPEDIA_API_V2_TOKEN is not set', () => {
        vi.stubEnv('PROTOPEDIA_API_V2_TOKEN', '');

        expect(() => createPromidasRepositoryForServer()).toThrow(
          'PROTOPEDIA_API_V2_TOKEN environment variable is required for server environments',
        );

        vi.unstubAllEnvs();
      });

      it('should use token from environment variable', () => {
        const testToken = 'env-test-token-12345';
        vi.stubEnv('PROTOPEDIA_API_V2_TOKEN', testToken);

        createPromidasRepositoryForServer();

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

          createPromidasRepositoryForServer();

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

      it('should configure builder with default log level (warn)', () => {
        createPromidasRepositoryForServer();

        expect(setDefaultLogLevelSpy).toHaveBeenCalledWith('warn');
      });

      it('should use provided logLevel when specified', () => {
        createPromidasRepositoryForServer({ logLevel: 'error' });

        expect(setDefaultLogLevelSpy).toHaveBeenCalledWith('error');
      });

      it('should use provided logLevel for different levels', () => {
        const logLevels = ['info', 'debug', 'error'] as const;

        logLevels.forEach((logLevel) => {
          createPromidasRepositoryForServer({ logLevel });

          expect(setDefaultLogLevelSpy).toHaveBeenCalledWith(logLevel);
          vi.clearAllMocks();
        });
      });
    });

    describe('store configuration', () => {
      beforeEach(() => {
        vi.stubEnv('PROTOPEDIA_API_V2_TOKEN', 'test-token');
      });

      afterEach(() => {
        vi.unstubAllEnvs();
      });

      it('should configure store with 10-minute TTL', () => {
        createPromidasRepositoryForServer();

        const storeConfigArg = setStoreConfigSpy.mock.calls[0]?.[0];
        expect(storeConfigArg?.ttlMs).toBe(10 * 60 * 1000);
      });

      it('should configure store with maxDataSizeBytes limit', () => {
        createPromidasRepositoryForServer();

        const storeConfigArg = setStoreConfigSpy.mock.calls[0]?.[0];
        expect(storeConfigArg?.maxDataSizeBytes).toBe(LIMIT_DATA_SIZE_BYTES);
      });

      it('should not override logger settings in store config', () => {
        createPromidasRepositoryForServer();

        const storeConfigArg = setStoreConfigSpy.mock.calls[0]?.[0];
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
        createPromidasRepositoryForServer();

        const apiClientConfigArg = setApiClientConfigSpy.mock.calls[0]?.[0];
        const userAgent =
          apiClientConfigArg?.protoPediaApiClientOptions?.userAgent;

        expect(userAgent).toBe(`PromidasRepositoryForServer/${VERSION}`);
      });

      it('should configure API client with 30-second timeout', () => {
        createPromidasRepositoryForServer();

        const apiClientConfigArg = setApiClientConfigSpy.mock.calls[0]?.[0];
        expect(apiClientConfigArg?.protoPediaApiClientOptions?.timeoutMs).toBe(
          30 * 1000,
        );
      });

      it('should not override logger settings in API client config', () => {
        createPromidasRepositoryForServer();

        const apiClientConfigArg = setApiClientConfigSpy.mock.calls[0]?.[0];
        expect(apiClientConfigArg?.logLevel).toBeUndefined();
      });
    });

    describe('repository configuration', () => {
      beforeEach(() => {
        vi.stubEnv('PROTOPEDIA_API_V2_TOKEN', 'test-token');
      });

      afterEach(() => {
        vi.unstubAllEnvs();
      });

      it('should configure repository with empty config object', () => {
        createPromidasRepositoryForServer();

        const repositoryConfigArg = setRepositoryConfigSpy.mock.calls[0]?.[0];
        expect(repositoryConfigArg).toEqual({});
      });

      it('should not override logger settings in repository config', () => {
        createPromidasRepositoryForServer();

        const repositoryConfigArg = setRepositoryConfigSpy.mock.calls[0]?.[0];
        expect(repositoryConfigArg?.logLevel).toBeUndefined();
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
        createPromidasRepositoryForServer();

        const callOrder = [
          setDefaultLogLevelSpy,
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
        createPromidasRepositoryForServer();

        expect(setDefaultLogLevelSpy).toHaveBeenCalledTimes(1);
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
        const result = createPromidasRepositoryForServer();

        expect(result).toBe(mockRepository);
        expect(buildSpy).toHaveBeenCalled();
      });

      it('should create independent repository instances', () => {
        buildSpy
          .mockReturnValueOnce(mockRepository)
          .mockReturnValueOnce({} as unknown as ProtopediaInMemoryRepository);

        const repo1 = createPromidasRepositoryForServer();
        const repo2 = createPromidasRepositoryForServer();

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
        createPromidasRepositoryForServer();

        const configArg = setApiClientConfigSpy.mock.calls[0]?.[0];
        const userAgent = configArg?.protoPediaApiClientOptions?.userAgent;

        expect(userAgent).toBe(`PromidasRepositoryForServer/${VERSION}`);
        expect(userAgent).toMatch(
          /^PromidasRepositoryForServer\/\d+\.\d+\.\d+$/,
        );
      });

      it('should use correct LIMIT_DATA_SIZE_BYTES constant', () => {
        createPromidasRepositoryForServer();

        const storeConfigArg = setStoreConfigSpy.mock.calls[0]?.[0];
        expect(storeConfigArg?.maxDataSizeBytes).toBe(LIMIT_DATA_SIZE_BYTES);
        expect(storeConfigArg?.maxDataSizeBytes).toBe(30 * 1024 * 1024);
      });

      it('should configure exact TTL value of 10 minutes', () => {
        createPromidasRepositoryForServer();

        const storeConfigArg = setStoreConfigSpy.mock.calls[0]?.[0];
        expect(storeConfigArg?.ttlMs).toBe(600000); // 10 * 60 * 1000
      });

      it('should configure exact timeout value of 30 seconds', () => {
        createPromidasRepositoryForServer();

        const apiClientConfigArg = setApiClientConfigSpy.mock.calls[0]?.[0];
        expect(apiClientConfigArg?.protoPediaApiClientOptions?.timeoutMs).toBe(
          30000,
        );
      });
    });
  });
});
