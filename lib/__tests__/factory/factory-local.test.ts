/**
 * Test suite for createPromidasForLocal factory function.
 *
 * This test suite verifies that createPromidasForLocal correctly creates
 * repository instances optimized for local/development environments.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PromidasRepositoryBuilder } from '../../builder.js';
import { createPromidasForLocal } from '../../factory.js';
import type { ProtopediaInMemoryRepository } from '../../repository/types/index.js';
import { LIMIT_DATA_SIZE_BYTES } from '../../store/index.js';
import { VERSION } from '../../version.js';

describe('createPromidasForLocal', () => {
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

  it('should configure store with correct TTL, maxDataSizeBytes, and shared logger', () => {
    createPromidasForLocal({ protopediaApiToken: 'test-token' });

    expect(setStoreConfigSpy).toHaveBeenCalledWith({
      ttlMs: 30 * 60 * 1000, // 30 minutes
      maxDataSizeBytes: LIMIT_DATA_SIZE_BYTES,
      logger: expect.any(Object),
    });
  });

  it('should provide logger instance to store config', () => {
    createPromidasForLocal({ protopediaApiToken: 'test-token' });

    const storeConfigArg = setStoreConfigSpy.mock.calls[0]?.[0];
    expect(storeConfigArg).toBeDefined();
    expect(storeConfigArg?.logger).toBeDefined();
    expect(storeConfigArg?.logLevel).toBeUndefined();
  });

  it('should configure API client with token, User-Agent, timeout, and shared logger', () => {
    createPromidasForLocal({
      protopediaApiToken: 'test-token-123',
    });

    expect(setApiClientConfigSpy).toHaveBeenCalledWith({
      protoPediaApiClientOptions: {
        token: 'test-token-123',
        userAgent: `PromidasForLocal/${VERSION}`,
        timeoutMs: 90000, // 90 seconds
        logger: expect.any(Object),
        logLevel: 'info',
      },
      logger: expect.any(Object),
      progressLog: true,
    });
  });

  it('should provide logger instance to API client config', () => {
    createPromidasForLocal({ protopediaApiToken: 'test-token' });

    const apiClientConfigArg = setApiClientConfigSpy.mock.calls[0]?.[0];
    expect(apiClientConfigArg).toBeDefined();
    expect(apiClientConfigArg?.logger).toBeDefined();
    expect(apiClientConfigArg?.logLevel).toBeUndefined();
  });

  it('should not override other ProtoPedia client options', () => {
    createPromidasForLocal({ protopediaApiToken: 'test-token' });

    const configArg = setApiClientConfigSpy.mock.calls[0]?.[0];
    expect(configArg).toBeDefined();
    expect(configArg?.protoPediaApiClientOptions?.baseUrl).toBeUndefined();
    expect(configArg?.protoPediaApiClientOptions?.fetch).toBeUndefined();
    expect(configArg?.protoPediaApiClientOptions?.logger).toBeDefined();
    expect(configArg?.protoPediaApiClientOptions?.logLevel).toBe('info');
  });

  it('should call builder methods in expected order', () => {
    createPromidasForLocal({ protopediaApiToken: 'test-token' });

    const storeConfigOrder = setStoreConfigSpy.mock.invocationCallOrder[0];
    const apiClientConfigOrder =
      setApiClientConfigSpy.mock.invocationCallOrder[0];
    const repositoryConfigOrder =
      setRepositoryConfigSpy.mock.invocationCallOrder[0];
    const buildOrder = buildSpy.mock.invocationCallOrder[0];

    expect(storeConfigOrder).toBeLessThan(apiClientConfigOrder);
    expect(apiClientConfigOrder).toBeLessThan(repositoryConfigOrder);
    expect(repositoryConfigOrder).toBeLessThan(buildOrder);
  });

  it('should call each builder setter exactly once per invocation', () => {
    createPromidasForLocal({ protopediaApiToken: 'test-token' });

    expect(setStoreConfigSpy).toHaveBeenCalledTimes(1);
    expect(setApiClientConfigSpy).toHaveBeenCalledTimes(1);
    expect(setRepositoryConfigSpy).toHaveBeenCalledTimes(1);
    expect(buildSpy).toHaveBeenCalledTimes(1);
  });

  it('should configure repository with shared logger', () => {
    createPromidasForLocal({ protopediaApiToken: 'test-token' });

    expect(setRepositoryConfigSpy).toHaveBeenCalledWith({
      logger: expect.any(Object),
    });
  });

  it('should provide logger instance to repository config', () => {
    createPromidasForLocal({ protopediaApiToken: 'test-token' });

    const repositoryConfigArg = setRepositoryConfigSpy.mock.calls[0]?.[0];
    expect(repositoryConfigArg).toBeDefined();
    expect(repositoryConfigArg?.logger).toBeDefined();
    expect(repositoryConfigArg?.logLevel).toBeUndefined();
  });

  it('should call build method', () => {
    createPromidasForLocal({ protopediaApiToken: 'test-token' });

    expect(buildSpy).toHaveBeenCalled();
  });

  it('should return repository instance from builder', () => {
    const repository = createPromidasForLocal({
      protopediaApiToken: 'test-token',
    });

    expect(repository).toBe(mockRepository);
  });

  it('should configure with different tokens', () => {
    createPromidasForLocal({ protopediaApiToken: 'token-1' });
    expect(setApiClientConfigSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        protoPediaApiClientOptions: expect.objectContaining({
          token: 'token-1',
        }),
      }),
    );

    createPromidasForLocal({ protopediaApiToken: 'token-2' });
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
    createPromidasForLocal({ protopediaApiToken: specialToken });

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
    createPromidasForLocal({ protopediaApiToken: longToken });

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
    const repo1 = createPromidasForLocal({
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

    const repo2 = createPromidasForLocal({
      protopediaApiToken: 'token-2',
    });

    expect(repo1).not.toBe(repo2);
    expect(buildSpy).toHaveBeenCalledTimes(2);
  });

  it('should use correct VERSION constant in User-Agent', () => {
    createPromidasForLocal({ protopediaApiToken: 'test-token' });

    const configArg = setApiClientConfigSpy.mock.calls[0]?.[0];
    const userAgent = configArg?.protoPediaApiClientOptions?.userAgent;

    expect(userAgent).toBe(`PromidasForLocal/${VERSION}`);
    expect(userAgent).toMatch(/^PromidasForLocal\/\d+\.\d+\.\d+$/);
  });

  it('should use correct LIMIT_DATA_SIZE_BYTES constant', () => {
    createPromidasForLocal({ protopediaApiToken: 'test-token' });

    const storeConfigArg = setStoreConfigSpy.mock.calls[0]?.[0];
    expect(storeConfigArg?.maxDataSizeBytes).toBe(LIMIT_DATA_SIZE_BYTES);
    expect(storeConfigArg?.maxDataSizeBytes).toBe(30 * 1024 * 1024);
  });

  it('should configure exact TTL value of 30 minutes', () => {
    createPromidasForLocal({ protopediaApiToken: 'test-token' });

    const storeConfigArg = setStoreConfigSpy.mock.calls[0]?.[0];
    expect(storeConfigArg?.ttlMs).toBe(1800000); // 30 * 60 * 1000
  });

  it('should configure exact timeout value of 90 seconds', () => {
    createPromidasForLocal({ protopediaApiToken: 'test-token' });

    const apiClientConfigArg = setApiClientConfigSpy.mock.calls[0]?.[0];
    expect(apiClientConfigArg?.protoPediaApiClientOptions?.timeoutMs).toBe(
      90000,
    );
  });

  describe('custom logLevel parameter', () => {
    it('should create logger with custom logLevel for all components when provided', () => {
      createPromidasForLocal({
        protopediaApiToken: 'test-token',
        logLevel: 'debug',
      });

      const storeConfigArg = setStoreConfigSpy.mock.calls[0]?.[0];
      const apiClientConfigArg = setApiClientConfigSpy.mock.calls[0]?.[0];
      const repositoryConfigArg = setRepositoryConfigSpy.mock.calls[0]?.[0];

      // Logger instance contains the logLevel, not passed separately
      expect(storeConfigArg?.logger).toBeDefined();
      expect(apiClientConfigArg?.logger).toBeDefined();
      expect(repositoryConfigArg?.logger).toBeDefined();
      expect(storeConfigArg?.logLevel).toBeUndefined();
      expect(apiClientConfigArg?.logLevel).toBeUndefined();
      expect(repositoryConfigArg?.logLevel).toBeUndefined();
    });

    it('should create logger with warn logLevel when explicitly provided', () => {
      createPromidasForLocal({
        protopediaApiToken: 'test-token',
        logLevel: 'warn',
      });

      const storeConfigArg = setStoreConfigSpy.mock.calls[0]?.[0];
      const apiClientConfigArg = setApiClientConfigSpy.mock.calls[0]?.[0];
      const repositoryConfigArg = setRepositoryConfigSpy.mock.calls[0]?.[0];

      expect(storeConfigArg?.logger).toBeDefined();
      expect(apiClientConfigArg?.logger).toBeDefined();
      expect(repositoryConfigArg?.logger).toBeDefined();
    });

    it('should create logger with error logLevel when explicitly provided', () => {
      createPromidasForLocal({
        protopediaApiToken: 'test-token',
        logLevel: 'error',
      });

      const storeConfigArg = setStoreConfigSpy.mock.calls[0]?.[0];
      const apiClientConfigArg = setApiClientConfigSpy.mock.calls[0]?.[0];
      const repositoryConfigArg = setRepositoryConfigSpy.mock.calls[0]?.[0];

      expect(storeConfigArg?.logger).toBeDefined();
      expect(apiClientConfigArg?.logger).toBeDefined();
      expect(repositoryConfigArg?.logger).toBeDefined();
    });

    it('should create logger with silent logLevel when explicitly provided', () => {
      createPromidasForLocal({
        protopediaApiToken: 'test-token',
        logLevel: 'silent',
      });

      const storeConfigArg = setStoreConfigSpy.mock.calls[0]?.[0];
      const apiClientConfigArg = setApiClientConfigSpy.mock.calls[0]?.[0];
      const repositoryConfigArg = setRepositoryConfigSpy.mock.calls[0]?.[0];

      expect(storeConfigArg?.logger).toBeDefined();
      expect(apiClientConfigArg?.logger).toBeDefined();
      expect(repositoryConfigArg?.logger).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty string token', () => {
      createPromidasForLocal({ protopediaApiToken: '' });

      const apiClientConfigArg = setApiClientConfigSpy.mock.calls[0]?.[0];
      expect(apiClientConfigArg?.protoPediaApiClientOptions?.token).toBe('');
    });

    it('should handle token with only whitespace', () => {
      const whitespaceToken = '   \t\n   ';
      createPromidasForLocal({ protopediaApiToken: whitespaceToken });

      const apiClientConfigArg = setApiClientConfigSpy.mock.calls[0]?.[0];
      expect(apiClientConfigArg?.protoPediaApiClientOptions?.token).toBe(
        whitespaceToken,
      );
    });
  });

  describe('component independence', () => {
    it('should provide shared logger instance to all components', () => {
      createPromidasForLocal({ protopediaApiToken: 'test-token' });

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
      createPromidasForLocal({
        protopediaApiToken: 'test-token',
        logLevel: 'debug',
      });

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
  });
});
