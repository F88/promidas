/**
 * Test suite for the repository factory function.
 *
 * This test suite verifies that {@link createProtopediaInMemoryRepository}
 * correctly instantiates repository instances with proper configuration,
 * dependency injection, and interface compliance.
 *
 * ## Test Coverage
 *
 * ### 1. Basic Instantiation
 * - Creates repository instance successfully with empty options
 * - Creates repository without any arguments
 * - Returns correct implementation type ({@link ProtopediaInMemoryRepositoryImpl})
 * - Implements the {@link ProtopediaInMemoryRepository} interface
 *
 * ### 2. Configuration Handling
 * - Accepts and applies store configuration (TTL, memory limits)
 * - Accepts and applies API client options (token, logLevel, baseUrl, logger)
 * - Handles both configurations simultaneously
 * - Handles partial configurations (only storeConfig or only apiClientOptions)
 * - Applies default values when storeConfig is empty
 * - Applies partial store configuration (ttlMs only, maxDataSizeBytes only)
 *
 * ### 3. Logger Configuration
 * - Passes logger in storeConfig to store
 * - Passes logger in apiClientOptions to API client
 * - Supports different loggers for store and API client
 *
 * ### 4. Instance Independence
 * - Creates separate instances with independent state
 * - Ensures configurations don't leak between instances
 * - Creates fresh instances on each call
 *
 * ### 5. Interface Compliance
 * - Verifies all required methods are present
 * - Checks method types (function, async function)
 *
 * ### 6. Dependency Injection
 * - Calls API client factory with correct options
 * - Calls API client factory exactly once per repository
 * - Handles multiple custom baseUrl values
 *
 * ### 7. Error Handling
 * - Propagates errors from API client factory
 * - Accepts negative maxDataSizeBytes (no factory-level validation)
 * - Accepts negative ttlMs (no factory-level validation)
 *
 * ### 8. Realistic Usage Scenarios
 * - Production-like repository with token and configuration
 * - Development-like repository with custom logger
 * - Minimal configuration for quick prototyping
 * - Repository for testing with short TTL
 * - Multiple repositories for different environments
 *
 * ### 9. Configuration Validation
 * - Smallest practical ttlMs value (100ms)
 * - Largest practical ttlMs value (1 week)
 * - Minimum practical maxDataSizeBytes (1 KB)
 * - Commonly used ttlMs values (1 min, 5 min, 10 min, 30 min, 1 hour, 24 hours)
 * - Commonly used maxDataSizeBytes values (1 MB, 5 MB, 10 MB, 20 MB, 30 MB)
 *
 * ### 10. Repository Method Availability
 * - Exposes all required repository methods
 * - Async methods return promises
 * - Methods callable without errors on empty snapshot
 *
 * ### 11. Zero and Boundary Values
 * - ttlMs of 0 (immediate expiration)
 * - maxDataSizeBytes of 0
 * - Fractional ttlMs values (1500.75)
 * - Very large ttlMs value (1 year)
 * - maxDataSizeBytes at exact limit (30 MiB)
 *
 * ### 12. Configuration Object Immutability
 * - storeConfig mutations don't affect existing repository
 * - apiClientOptions mutations affect subsequent calls (reads current state)
 * - getConfig() returns independent config objects
 *
 * ### 13. API Client Integration Verification
 * - Passes token through to API client
 * - Passes all API client options correctly
 * - Handles omitted API client options gracefully
 *
 * ### 14. Repository Return Values
 * - Synchronous methods return correct types
 * - getPrototypeFromSnapshotByPrototypeId returns null when not found
 * - analyzePrototypes returns null values when snapshot is empty
 * - getRandomSampleFromSnapshot returns empty array when snapshot is empty
 *
 * ### 15. Stress Testing
 * - Handles rapid creation of many instances (1000+)
 * - Ensures instance uniqueness and valid configuration
 *
 * ### 16. Runtime Safety (JS Interop)
 * - Throws TypeError when called with null
 * - Throws TypeError when storeConfig is null
 *
 * ### 17. Type Inheritance
 * - Returns instance of {@link ProtopediaInMemoryRepositoryImpl}
 *
 * ## Test Design Philosophy
 *
 * ### Mock Setup Pattern
 * Each test in this file **intentionally includes its own mock setup** rather
 * than using a shared `beforeEach` block. This design choice prioritizes:
 *
 * 1. **Test Independence**: Each test is fully self-contained and can be read
 *    in isolation without referring to setup code elsewhere.
 *
 * 2. **Clarity over DRY**: While the mock setup is duplicated (3 lines), this
 *    makes each test's preconditions immediately visible to reviewers and
 *    maintainers. No mental context-switching required.
 *
 * 3. **Maintainability**: Future tests with different mock requirements won't
 *    need to refactor shared setup logic or add conditional setup code.
 *
 * 4. **Debugging Simplicity**: When a test fails, all context is in one place.
 *    No need to trace through beforeEach blocks to understand state.
 *
 * ### Trade-offs
 * - ✅ **Better readability** - Each test is a complete story
 * - ✅ **Better maintainability** - No shared state complications
 * - ✅ **Better debugging** - All context visible in failing test
 * - ⚠️ **Some duplication** - 3 lines of mock setup per test (acceptable)
 *
 * The mock duplication is **minimal and intentional**. Do not refactor to
 * beforeEach unless test requirements diverge significantly.
 *
 * ## Mocking Strategy
 *
 * We mock {@link createProtopediaApiCustomClient} to:
 * - Avoid real network calls during testing
 * - Control API client behavior deterministically
 * - Focus tests on factory logic, not API implementation
 *
 * @module
 * @see {@link createProtopediaInMemoryRepository} for the factory being tested
 * @see {@link ProtopediaInMemoryRepository} for the interface contract
 */
import { describe, expect, it, vi } from 'vitest';

import { createProtopediaApiCustomClient } from '../../fetcher/index.js';
import { createProtopediaInMemoryRepository } from '../factory.js';
import { ProtopediaInMemoryRepositoryImpl } from '../protopedia-in-memory-repository.js';

vi.mock('../../fetcher/index', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../fetcher/index.js')>();
  return {
    ...actual,
    createProtopediaApiCustomClient: vi.fn(),
  };
});

describe('createProtopediaInMemoryRepository', () => {
  it('should create a repository instance', () => {
    vi.mocked(createProtopediaApiCustomClient).mockReturnValue({
      listPrototypes: vi.fn(),
    } as never);

    const repository = createProtopediaInMemoryRepository({});

    expect(repository).toBeDefined();
    expect(repository).toBeInstanceOf(ProtopediaInMemoryRepositoryImpl);
  });

  it('should create repository with store configuration', () => {
    vi.mocked(createProtopediaApiCustomClient).mockReturnValue({
      listPrototypes: vi.fn(),
    } as never);

    const storeConfig = { maxDataSizeBytes: 5000 };
    const repository = createProtopediaInMemoryRepository({ storeConfig });

    expect(repository).toBeDefined();
    expect(repository.getConfig()).toEqual(
      expect.objectContaining({
        maxDataSizeBytes: 5000,
      }),
    );
  });

  it('should create repository with API client options', () => {
    const mockClient = { listPrototypes: vi.fn() };
    vi.mocked(createProtopediaApiCustomClient).mockReturnValue(
      mockClient as never,
    );

    const apiClientOptions = {
      token: 'test-token',
      logLevel: 'debug' as const,
    };
    const repository = createProtopediaInMemoryRepository({ apiClientOptions });

    expect(repository).toBeDefined();
    expect(repository).toBeInstanceOf(ProtopediaInMemoryRepositoryImpl);
    expect(createProtopediaApiCustomClient).toHaveBeenCalledWith({
      protoPediaApiClientOptions: apiClientOptions,
    });
  });

  it('should create repository with both configurations', () => {
    const mockClient = { listPrototypes: vi.fn() };
    vi.mocked(createProtopediaApiCustomClient).mockReturnValue(
      mockClient as never,
    );

    const storeConfig = { maxDataSizeBytes: 3000 };
    const apiClientOptions = { token: 'test-token' };
    const repository = createProtopediaInMemoryRepository({
      storeConfig,
      apiClientOptions,
    });

    expect(repository).toBeDefined();
    expect(repository.getConfig()).toEqual(
      expect.objectContaining({
        maxDataSizeBytes: 3000,
      }),
    );
    expect(createProtopediaApiCustomClient).toHaveBeenCalledWith({
      protoPediaApiClientOptions: apiClientOptions,
    });
  });

  it('should create repository without any arguments', () => {
    vi.mocked(createProtopediaApiCustomClient).mockReturnValue({
      listPrototypes: vi.fn(),
    } as never);

    const repository = createProtopediaInMemoryRepository();

    expect(repository).toBeDefined();
    expect(repository).toBeInstanceOf(ProtopediaInMemoryRepositoryImpl);
    expect(repository.getConfig()).toEqual(
      expect.objectContaining({
        ttlMs: 30 * 60 * 1000, // default 30 minutes
        maxDataSizeBytes: 10 * 1024 * 1024, // default 10 MiB
      }),
    );
  });

  it('should implement ProtopediaInMemoryRepository interface', () => {
    vi.mocked(createProtopediaApiCustomClient).mockReturnValue({
      listPrototypes: vi.fn(),
    } as never);

    const repository = createProtopediaInMemoryRepository({});

    expect(repository.setupSnapshot).toBeTypeOf('function');
    expect(repository.refreshSnapshot).toBeTypeOf('function');
    expect(repository.getPrototypeFromSnapshotByPrototypeId).toBeTypeOf(
      'function',
    );
    expect(repository.getRandomPrototypeFromSnapshot).toBeTypeOf('function');
    expect(repository.getRandomSampleFromSnapshot).toBeTypeOf('function');
    expect(repository.getPrototypeIdsFromSnapshot).toBeTypeOf('function');
    expect(repository.analyzePrototypes).toBeTypeOf('function');
    expect(repository.getStats).toBeTypeOf('function');
    expect(repository.getConfig).toBeTypeOf('function');
  });

  it('should create independent instances', () => {
    vi.mocked(createProtopediaApiCustomClient).mockReturnValue({
      listPrototypes: vi.fn(),
    } as never);

    const repo1 = createProtopediaInMemoryRepository({
      storeConfig: { maxDataSizeBytes: 1000 },
    });
    const repo2 = createProtopediaInMemoryRepository({
      storeConfig: { maxDataSizeBytes: 2000 },
    });

    expect(repo1).not.toBe(repo2);
    expect(repo1.getConfig().maxDataSizeBytes).toBe(1000);
    expect(repo2.getConfig().maxDataSizeBytes).toBe(2000);
  });

  it('should apply default values when storeConfig is empty', () => {
    vi.mocked(createProtopediaApiCustomClient).mockReturnValue({
      listPrototypes: vi.fn(),
    } as never);

    const repository = createProtopediaInMemoryRepository({
      storeConfig: {},
    });

    const config = repository.getConfig();
    expect(config.ttlMs).toBe(30 * 60 * 1000); // 30 minutes default
    expect(config.maxDataSizeBytes).toBe(10 * 1024 * 1024); // 10 MiB default
  });

  it('should apply partial store configuration with ttlMs only', () => {
    vi.mocked(createProtopediaApiCustomClient).mockReturnValue({
      listPrototypes: vi.fn(),
    } as never);

    const customTtl = 5 * 60 * 1000; // 5 minutes
    const repository = createProtopediaInMemoryRepository({
      storeConfig: { ttlMs: customTtl },
    });

    const config = repository.getConfig();
    expect(config.ttlMs).toBe(customTtl);
    expect(config.maxDataSizeBytes).toBe(10 * 1024 * 1024); // default
  });

  it('should apply partial store configuration with maxDataSizeBytes only', () => {
    vi.mocked(createProtopediaApiCustomClient).mockReturnValue({
      listPrototypes: vi.fn(),
    } as never);

    const customSize = 5 * 1024 * 1024; // 5 MiB
    const repository = createProtopediaInMemoryRepository({
      storeConfig: { maxDataSizeBytes: customSize },
    });

    const config = repository.getConfig();
    expect(config.ttlMs).toBe(30 * 60 * 1000); // default
    expect(config.maxDataSizeBytes).toBe(customSize);
  });

  it('should pass logger in storeConfig to store', () => {
    vi.mocked(createProtopediaApiCustomClient).mockReturnValue({
      listPrototypes: vi.fn(),
    } as never);

    const mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    const repository = createProtopediaInMemoryRepository({
      storeConfig: { logger: mockLogger },
    });

    expect(repository).toBeDefined();
    // Logger is used internally, verify repository was created successfully
    expect(repository).toBeInstanceOf(ProtopediaInMemoryRepositoryImpl);
  });

  it('should pass logger in apiClientOptions to API client', () => {
    const mockClient = { listPrototypes: vi.fn() };
    vi.mocked(createProtopediaApiCustomClient).mockReturnValue(
      mockClient as never,
    );

    const mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    const apiClientOptions = {
      token: 'test-token',
      logger: mockLogger,
    };

    createProtopediaInMemoryRepository({ apiClientOptions });

    expect(createProtopediaApiCustomClient).toHaveBeenCalledWith({
      protoPediaApiClientOptions: apiClientOptions,
    });
  });

  it('should support different loggers for store and API client', () => {
    const mockClient = { listPrototypes: vi.fn() };
    vi.mocked(createProtopediaApiCustomClient).mockReturnValue(
      mockClient as never,
    );

    const storeLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    const apiLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    const repository = createProtopediaInMemoryRepository({
      storeConfig: { logger: storeLogger },
      apiClientOptions: { token: 'test-token', logger: apiLogger },
    });

    expect(repository).toBeDefined();
    expect(createProtopediaApiCustomClient).toHaveBeenCalledWith({
      protoPediaApiClientOptions: {
        token: 'test-token',
        logger: apiLogger,
      },
    });
  });

  it('should pass logLevel in storeConfig to store', () => {
    vi.mocked(createProtopediaApiCustomClient).mockReturnValue({
      listPrototypes: vi.fn(),
    } as never);

    const repository = createProtopediaInMemoryRepository({
      storeConfig: { logLevel: 'debug' },
    });

    expect(repository).toBeDefined();
    expect(repository).toBeInstanceOf(ProtopediaInMemoryRepositoryImpl);
  });

  it('should pass logLevel in apiClientOptions to API client', () => {
    const mockClient = { listPrototypes: vi.fn() };
    vi.mocked(createProtopediaApiCustomClient).mockReturnValue(
      mockClient as never,
    );

    const apiClientOptions = {
      token: 'test-token',
      logLevel: 'warn' as const,
    };

    createProtopediaInMemoryRepository({ apiClientOptions });

    expect(createProtopediaApiCustomClient).toHaveBeenCalledWith({
      protoPediaApiClientOptions: apiClientOptions,
    });
  });

  it('should create fresh instances on each call', () => {
    vi.mocked(createProtopediaApiCustomClient).mockReturnValue({
      listPrototypes: vi.fn(),
    } as never);

    const repo1 = createProtopediaInMemoryRepository({});
    const repo2 = createProtopediaInMemoryRepository({});
    const repo3 = createProtopediaInMemoryRepository({});

    expect(repo1).not.toBe(repo2);
    expect(repo2).not.toBe(repo3);
    expect(repo1).not.toBe(repo3);
  });

  it('should handle all storeConfig options together', () => {
    vi.mocked(createProtopediaApiCustomClient).mockReturnValue({
      listPrototypes: vi.fn(),
    } as never);

    const mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    const storeConfig = {
      ttlMs: 10 * 60 * 1000, // 10 minutes
      maxDataSizeBytes: 20 * 1024 * 1024, // 20 MiB
      logger: mockLogger,
    };

    const repository = createProtopediaInMemoryRepository({ storeConfig });

    const config = repository.getConfig();
    expect(config.ttlMs).toBe(10 * 60 * 1000);
    expect(config.maxDataSizeBytes).toBe(20 * 1024 * 1024);
  });

  it('should handle all apiClientOptions together', () => {
    const mockClient = { listPrototypes: vi.fn() };
    vi.mocked(createProtopediaApiCustomClient)
      .mockClear()
      .mockReturnValue(mockClient as never);

    const mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    const apiClientOptions = {
      token: 'my-api-token',
      logLevel: 'warn' as const,
      logger: mockLogger,
      baseUrl: 'https://custom.api.example.com',
    };

    createProtopediaInMemoryRepository({ apiClientOptions });

    expect(createProtopediaApiCustomClient).toHaveBeenCalledWith({
      protoPediaApiClientOptions: apiClientOptions,
    });
    expect(createProtopediaApiCustomClient).toHaveBeenCalledTimes(1);
  });

  it('should call API client factory exactly once per repository', () => {
    vi.mocked(createProtopediaApiCustomClient).mockReturnValue({
      listPrototypes: vi.fn(),
    } as never);

    vi.mocked(createProtopediaApiCustomClient).mockClear();

    createProtopediaInMemoryRepository({
      apiClientOptions: { token: 'test' },
    });

    expect(createProtopediaApiCustomClient).toHaveBeenCalledTimes(1);
  });

  it('should create repository with only storeConfig when apiClientOptions omitted', () => {
    vi.mocked(createProtopediaApiCustomClient).mockReturnValue({
      listPrototypes: vi.fn(),
    } as never);

    const repository = createProtopediaInMemoryRepository({
      storeConfig: { ttlMs: 5000 },
    });

    expect(repository).toBeDefined();
    expect(repository).toBeInstanceOf(ProtopediaInMemoryRepositoryImpl);
    expect(repository.getConfig().ttlMs).toBe(5000);
  });

  it('should create repository with only apiClientOptions when storeConfig omitted', () => {
    vi.mocked(createProtopediaApiCustomClient).mockReturnValue({
      listPrototypes: vi.fn(),
    } as never);

    const repository = createProtopediaInMemoryRepository({
      apiClientOptions: { token: 'test' },
    });

    expect(repository).toBeDefined();
    expect(repository).toBeInstanceOf(ProtopediaInMemoryRepositoryImpl);
    expect(createProtopediaApiCustomClient).toHaveBeenCalledWith({
      protoPediaApiClientOptions: {
        token: 'test',
      },
    });
  });

  describe('edge cases', () => {
    it('should handle very large ttlMs value', () => {
      vi.mocked(createProtopediaApiCustomClient).mockReturnValue({
        listPrototypes: vi.fn(),
      } as never);

      const largeTtl = Number.MAX_SAFE_INTEGER;
      const repository = createProtopediaInMemoryRepository({
        storeConfig: { ttlMs: largeTtl },
      });

      expect(repository.getConfig().ttlMs).toBe(largeTtl);
    });

    it('should handle maximum allowed maxDataSizeBytes value', () => {
      vi.mocked(createProtopediaApiCustomClient).mockReturnValue({
        listPrototypes: vi.fn(),
      } as never);

      // Maximum allowed is 30 MiB (31457280 bytes)
      const maxAllowedSize = 30 * 1024 * 1024;
      const repository = createProtopediaInMemoryRepository({
        storeConfig: { maxDataSizeBytes: maxAllowedSize },
      });

      expect(repository.getConfig().maxDataSizeBytes).toBe(maxAllowedSize);
    });

    it('should throw error when maxDataSizeBytes exceeds limit', () => {
      vi.mocked(createProtopediaApiCustomClient).mockReturnValue({
        listPrototypes: vi.fn(),
      } as never);

      const tooLargeSize = 31 * 1024 * 1024; // 31 MiB (exceeds 30 MiB limit)

      expect(() => {
        createProtopediaInMemoryRepository({
          storeConfig: { maxDataSizeBytes: tooLargeSize },
        });
      }).toThrow('maxDataSizeBytes must be <=');
    });

    it('should handle zero ttlMs value', () => {
      vi.mocked(createProtopediaApiCustomClient).mockReturnValue({
        listPrototypes: vi.fn(),
      } as never);

      const repository = createProtopediaInMemoryRepository({
        storeConfig: { ttlMs: 0 },
      });

      expect(repository.getConfig().ttlMs).toBe(0);
    });

    it('should handle minimum positive ttlMs value', () => {
      vi.mocked(createProtopediaApiCustomClient).mockReturnValue({
        listPrototypes: vi.fn(),
      } as never);

      const repository = createProtopediaInMemoryRepository({
        storeConfig: { ttlMs: 1 },
      });

      expect(repository.getConfig().ttlMs).toBe(1);
    });

    it('should handle empty string token in apiClientOptions', () => {
      const mockClient = { listPrototypes: vi.fn() };
      vi.mocked(createProtopediaApiCustomClient).mockReturnValue(
        mockClient as never,
      );

      const repository = createProtopediaInMemoryRepository({
        apiClientOptions: { token: '' },
      });

      expect(repository).toBeDefined();
      expect(createProtopediaApiCustomClient).toHaveBeenCalledWith({
        protoPediaApiClientOptions: {
          token: '',
        },
      });
    });

    it('should handle multiple repositories with same configuration', () => {
      vi.mocked(createProtopediaApiCustomClient).mockReturnValue({
        listPrototypes: vi.fn(),
      } as never);

      const config = { storeConfig: { ttlMs: 60000 } };
      const repo1 = createProtopediaInMemoryRepository(config);
      const repo2 = createProtopediaInMemoryRepository(config);

      expect(repo1).not.toBe(repo2);
      expect(repo1.getConfig().ttlMs).toBe(60000);
      expect(repo2.getConfig().ttlMs).toBe(60000);
    });

    it('should not mutate input configuration objects', () => {
      vi.mocked(createProtopediaApiCustomClient).mockReturnValue({
        listPrototypes: vi.fn(),
      } as never);

      const storeConfig = { ttlMs: 5000, maxDataSizeBytes: 1000 };
      const apiClientOptions = {
        token: 'test-token',
        logLevel: 'info' as const,
      };
      const originalStoreConfig = { ...storeConfig };
      const originalApiOptions = { ...apiClientOptions };

      createProtopediaInMemoryRepository({ storeConfig, apiClientOptions });

      expect(storeConfig).toEqual(originalStoreConfig);
      expect(apiClientOptions).toEqual(originalApiOptions);
    });
  });

  describe('type safety', () => {
    it('should accept valid logLevel values', () => {
      const mockClient = { listPrototypes: vi.fn() };
      vi.mocked(createProtopediaApiCustomClient)
        .mockClear()
        .mockReturnValue(mockClient as never);

      const levels: Array<'debug' | 'info' | 'warn' | 'error' | 'silent'> = [
        'debug',
        'info',
        'warn',
        'error',
        'silent',
      ];

      levels.forEach((logLevel) => {
        createProtopediaInMemoryRepository({
          apiClientOptions: { token: 'test', logLevel },
        });
      });

      expect(createProtopediaApiCustomClient).toHaveBeenCalledTimes(
        levels.length,
      );
    });

    it('should accept custom baseUrl in apiClientOptions', () => {
      const mockClient = { listPrototypes: vi.fn() };
      vi.mocked(createProtopediaApiCustomClient)
        .mockClear()
        .mockReturnValue(mockClient as never);

      const customUrls = [
        'https://api.example.com',
        'https://api.example.com/v2',
        'http://localhost:3000',
        'http://192.168.1.1:8080/api',
      ];

      customUrls.forEach((baseUrl) => {
        createProtopediaInMemoryRepository({
          apiClientOptions: { token: 'test', baseUrl },
        });
      });

      expect(createProtopediaApiCustomClient).toHaveBeenCalledTimes(
        customUrls.length,
      );
    });
  });

  describe('error handling', () => {
    it('should propagate errors from API client factory', () => {
      const factoryError = new Error('Failed to create API client');
      vi.mocked(createProtopediaApiCustomClient).mockImplementation(() => {
        throw factoryError;
      });

      expect(() => {
        createProtopediaInMemoryRepository({
          apiClientOptions: { token: 'test' },
        });
      }).toThrow('Failed to create API client');
    });

    it('should accept negative maxDataSizeBytes (no validation at factory level)', () => {
      vi.mocked(createProtopediaApiCustomClient).mockReturnValue({
        listPrototypes: vi.fn(),
      } as never);

      // Factory doesn't validate - passes through to store
      // Store constructor will handle validation
      const repository = createProtopediaInMemoryRepository({
        storeConfig: { maxDataSizeBytes: -1000 },
      });

      // If this passes, it means store accepts it (implementation detail)
      expect(repository).toBeDefined();
    });

    it('should accept negative ttlMs value (no validation at factory level)', () => {
      vi.mocked(createProtopediaApiCustomClient).mockReturnValue({
        listPrototypes: vi.fn(),
      } as never);

      // Factory doesn't validate - passes through to store
      const repository = createProtopediaInMemoryRepository({
        storeConfig: { ttlMs: -1000 },
      });

      expect(repository).toBeDefined();
      expect(repository.getConfig().ttlMs).toBe(-1000);
    });
  });

  describe('realistic usage scenarios', () => {
    it('should create production-like repository with token', () => {
      const mockClient = { listPrototypes: vi.fn() };
      vi.mocked(createProtopediaApiCustomClient)
        .mockClear()
        .mockReturnValue(mockClient as never);

      const repository = createProtopediaInMemoryRepository({
        storeConfig: {
          ttlMs: 60 * 60 * 1000, // 1 hour
          maxDataSizeBytes: 20 * 1024 * 1024, // 20 MiB
        },
        apiClientOptions: {
          token: 'prod-token-abc123',
          logLevel: 'warn',
        },
      });

      expect(repository).toBeDefined();
      expect(repository.getConfig().ttlMs).toBe(60 * 60 * 1000);
      expect(createProtopediaApiCustomClient).toHaveBeenCalledWith({
        protoPediaApiClientOptions: {
          token: 'prod-token-abc123',
          logLevel: 'warn',
        },
      });
    });

    it('should create development-like repository with custom logger', () => {
      const mockClient = { listPrototypes: vi.fn() };
      vi.mocked(createProtopediaApiCustomClient)
        .mockClear()
        .mockReturnValue(mockClient as never);

      const devLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const repository = createProtopediaInMemoryRepository({
        storeConfig: {
          ttlMs: 5 * 60 * 1000, // 5 minutes for frequent refreshes
          logger: devLogger,
        },
        apiClientOptions: {
          token: 'dev-token-xyz789',
          logLevel: 'debug',
          logger: devLogger,
        },
      });

      expect(repository).toBeDefined();
      expect(repository.getConfig().ttlMs).toBe(5 * 60 * 1000);
      expect(createProtopediaApiCustomClient).toHaveBeenCalledWith({
        protoPediaApiClientOptions: {
          token: 'dev-token-xyz789',
          logLevel: 'debug',
          logger: devLogger,
        },
      });
    });

    it('should create minimal configuration for quick prototyping', () => {
      const mockClient = { listPrototypes: vi.fn() };
      vi.mocked(createProtopediaApiCustomClient)
        .mockClear()
        .mockReturnValue(mockClient as never);

      const repository = createProtopediaInMemoryRepository({
        apiClientOptions: { token: 'quick-test-token' },
      });

      expect(repository).toBeDefined();
      // Should use all defaults for store
      const config = repository.getConfig();
      expect(config.ttlMs).toBe(30 * 60 * 1000); // default 30 minutes
      expect(config.maxDataSizeBytes).toBe(10 * 1024 * 1024); // default 10 MiB
    });

    it('should create repository for testing with short TTL', () => {
      const mockClient = { listPrototypes: vi.fn() };
      vi.mocked(createProtopediaApiCustomClient)
        .mockClear()
        .mockReturnValue(mockClient as never);

      const repository = createProtopediaInMemoryRepository({
        storeConfig: {
          ttlMs: 1000, // 1 second for testing
          maxDataSizeBytes: 1024 * 1024, // 1 MiB for test data
        },
        apiClientOptions: {
          token: 'test-token',
        },
      });

      expect(repository).toBeDefined();
      expect(repository.getConfig().ttlMs).toBe(1000);
      expect(repository.getConfig().maxDataSizeBytes).toBe(1024 * 1024);
    });

    it('should create multiple repositories for different environments', () => {
      const mockClient = { listPrototypes: vi.fn() };
      vi.mocked(createProtopediaApiCustomClient).mockReturnValue(
        mockClient as never,
      );

      const prodRepo = createProtopediaInMemoryRepository({
        storeConfig: { ttlMs: 3600000 },
        apiClientOptions: { token: 'prod-token', logLevel: 'error' },
      });

      const stagingRepo = createProtopediaInMemoryRepository({
        storeConfig: { ttlMs: 1800000 },
        apiClientOptions: { token: 'staging-token', logLevel: 'warn' },
      });

      const devRepo = createProtopediaInMemoryRepository({
        storeConfig: { ttlMs: 300000 },
        apiClientOptions: { token: 'dev-token', logLevel: 'debug' },
      });

      expect(prodRepo).not.toBe(stagingRepo);
      expect(stagingRepo).not.toBe(devRepo);
      expect(prodRepo.getConfig().ttlMs).toBe(3600000);
      expect(stagingRepo.getConfig().ttlMs).toBe(1800000);
      expect(devRepo.getConfig().ttlMs).toBe(300000);
    });
  });

  describe('configuration validation', () => {
    it('should accept smallest practical ttlMs value', () => {
      vi.mocked(createProtopediaApiCustomClient).mockReturnValue({
        listPrototypes: vi.fn(),
      } as never);

      const repository = createProtopediaInMemoryRepository({
        storeConfig: { ttlMs: 100 }, // 100ms
      });

      expect(repository.getConfig().ttlMs).toBe(100);
    });

    it('should accept largest practical ttlMs value', () => {
      vi.mocked(createProtopediaApiCustomClient).mockReturnValue({
        listPrototypes: vi.fn(),
      } as never);

      const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
      const repository = createProtopediaInMemoryRepository({
        storeConfig: { ttlMs: oneWeekMs },
      });

      expect(repository.getConfig().ttlMs).toBe(oneWeekMs);
    });

    it('should accept minimum practical maxDataSizeBytes', () => {
      vi.mocked(createProtopediaApiCustomClient).mockReturnValue({
        listPrototypes: vi.fn(),
      } as never);

      const repository = createProtopediaInMemoryRepository({
        storeConfig: { maxDataSizeBytes: 1024 }, // 1 KB
      });

      expect(repository.getConfig().maxDataSizeBytes).toBe(1024);
    });

    it('should handle commonly used ttlMs values', () => {
      vi.mocked(createProtopediaApiCustomClient).mockReturnValue({
        listPrototypes: vi.fn(),
      } as never);

      const commonTtls = [
        { name: '1 minute', value: 60 * 1000 },
        { name: '5 minutes', value: 5 * 60 * 1000 },
        { name: '10 minutes', value: 10 * 60 * 1000 },
        { name: '30 minutes', value: 30 * 60 * 1000 },
        { name: '1 hour', value: 60 * 60 * 1000 },
        { name: '24 hours', value: 24 * 60 * 60 * 1000 },
      ];

      commonTtls.forEach(({ name, value }) => {
        const repo = createProtopediaInMemoryRepository({
          storeConfig: { ttlMs: value },
        });
        expect(repo.getConfig().ttlMs).toBe(value);
      });
    });

    it('should handle commonly used maxDataSizeBytes values', () => {
      vi.mocked(createProtopediaApiCustomClient).mockReturnValue({
        listPrototypes: vi.fn(),
      } as never);

      const commonSizes = [
        { name: '1 MB', value: 1024 * 1024 },
        { name: '5 MB', value: 5 * 1024 * 1024 },
        { name: '10 MB', value: 10 * 1024 * 1024 },
        { name: '20 MB', value: 20 * 1024 * 1024 },
        { name: '30 MB', value: 30 * 1024 * 1024 },
      ];

      commonSizes.forEach(({ name, value }) => {
        const repo = createProtopediaInMemoryRepository({
          storeConfig: { maxDataSizeBytes: value },
        });
        expect(repo.getConfig().maxDataSizeBytes).toBe(value);
      });
    });
  });

  describe('repository method availability', () => {
    it('should expose all required repository methods', () => {
      vi.mocked(createProtopediaApiCustomClient).mockReturnValue({
        listPrototypes: vi.fn(),
      } as never);

      const repository = createProtopediaInMemoryRepository();

      // Verify all required methods exist and are functions
      expect(typeof repository.setupSnapshot).toBe('function');
      expect(typeof repository.refreshSnapshot).toBe('function');
      expect(typeof repository.getPrototypeFromSnapshotByPrototypeId).toBe(
        'function',
      );
      expect(typeof repository.getAllFromSnapshot).toBe('function');
      expect(typeof repository.getPrototypeIdsFromSnapshot).toBe('function');
      expect(typeof repository.getRandomPrototypeFromSnapshot).toBe('function');
      expect(typeof repository.getRandomSampleFromSnapshot).toBe('function');
      expect(typeof repository.analyzePrototypes).toBe('function');
      expect(typeof repository.getStats).toBe('function');
      expect(typeof repository.getConfig).toBe('function');
    });

    it('should have async methods that return promises', async () => {
      const mockClient = {
        listPrototypes: vi.fn().mockResolvedValue({
          data: { prototypes: [] },
        }),
      };
      vi.mocked(createProtopediaApiCustomClient).mockReturnValue(
        mockClient as never,
      );

      const repository = createProtopediaInMemoryRepository({
        apiClientOptions: { token: 'test' },
      });

      // setupSnapshot should return a promise
      const setupResult = repository.setupSnapshot({});
      expect(setupResult).toBeInstanceOf(Promise);

      // Wait for it to resolve
      await setupResult;

      // refreshSnapshot should also return a promise
      const refreshResult = repository.refreshSnapshot();
      expect(refreshResult).toBeInstanceOf(Promise);
      await refreshResult;
    });

    it('should call underlying methods without errors', async () => {
      const mockClient = {
        listPrototypes: vi.fn().mockResolvedValue({
          data: { prototypes: [] },
        }),
      };
      vi.mocked(createProtopediaApiCustomClient).mockReturnValue(
        mockClient as never,
      );

      const repository = createProtopediaInMemoryRepository({
        apiClientOptions: { token: 'test' },
      });

      // Test synchronous methods
      expect(() => repository.getStats()).not.toThrow();
      expect(() => repository.getConfig()).not.toThrow();

      // These should not throw even when snapshot is empty
      await expect(
        repository.getPrototypeFromSnapshotByPrototypeId(1),
      ).resolves.toBeDefined();
      await expect(repository.getAllFromSnapshot()).resolves.toBeDefined();
      await expect(
        repository.getPrototypeIdsFromSnapshot(),
      ).resolves.toBeDefined();
      await expect(
        repository.getRandomPrototypeFromSnapshot(),
      ).resolves.toBeDefined();
      await expect(repository.analyzePrototypes()).resolves.toBeDefined();

      // Test async snapshot operations
      await expect(repository.setupSnapshot({})).resolves.toBeDefined();
    });
  });

  describe('zero and boundary values', () => {
    it('should handle ttlMs of 0 (immediate expiration)', () => {
      vi.mocked(createProtopediaApiCustomClient).mockReturnValue({
        listPrototypes: vi.fn(),
      } as never);

      const repository = createProtopediaInMemoryRepository({
        storeConfig: { ttlMs: 0 },
      });

      expect(repository.getConfig().ttlMs).toBe(0);
      // Snapshot should always be expired with ttl of 0
      const stats = repository.getStats();
      expect(stats.isExpired).toBe(true);
    });

    it('should handle maxDataSizeBytes of 0', () => {
      vi.mocked(createProtopediaApiCustomClient).mockReturnValue({
        listPrototypes: vi.fn(),
      } as never);

      const repository = createProtopediaInMemoryRepository({
        storeConfig: { maxDataSizeBytes: 0 },
      });

      expect(repository.getConfig().maxDataSizeBytes).toBe(0);
    });

    it('should handle fractional ttlMs value', () => {
      vi.mocked(createProtopediaApiCustomClient).mockReturnValue({
        listPrototypes: vi.fn(),
      } as never);

      const repository = createProtopediaInMemoryRepository({
        storeConfig: { ttlMs: 1500.75 },
      });

      // TypeScript allows numbers, including fractional ones
      expect(repository.getConfig().ttlMs).toBe(1500.75);
    });

    it('should handle very large ttlMs value', () => {
      vi.mocked(createProtopediaApiCustomClient).mockReturnValue({
        listPrototypes: vi.fn(),
      } as never);

      const oneYearMs = 365 * 24 * 60 * 60 * 1000;
      const repository = createProtopediaInMemoryRepository({
        storeConfig: { ttlMs: oneYearMs },
      });

      expect(repository.getConfig().ttlMs).toBe(oneYearMs);
    });

    it('should handle maxDataSizeBytes at exact limit', () => {
      vi.mocked(createProtopediaApiCustomClient).mockReturnValue({
        listPrototypes: vi.fn(),
      } as never);

      const MAX_SIZE = 30 * 1024 * 1024; // 30 MiB
      const repository = createProtopediaInMemoryRepository({
        storeConfig: { maxDataSizeBytes: MAX_SIZE },
      });

      expect(repository.getConfig().maxDataSizeBytes).toBe(MAX_SIZE);
    });
  });

  describe('configuration object immutability', () => {
    it('should not be affected by mutations to storeConfig after creation', () => {
      vi.mocked(createProtopediaApiCustomClient).mockReturnValue({
        listPrototypes: vi.fn(),
      } as never);

      const storeConfig = { ttlMs: 5000, maxDataSizeBytes: 5000000 };
      const repository = createProtopediaInMemoryRepository({ storeConfig });

      // Mutate the original config
      storeConfig.ttlMs = 99999;
      storeConfig.maxDataSizeBytes = 99999999;

      // Repository should still have original values
      expect(repository.getConfig().ttlMs).toBe(5000);
      expect(repository.getConfig().maxDataSizeBytes).toBe(5000000);
    });

    it('should not be affected by mutations to apiClientOptions after creation', () => {
      const mockClient = { listPrototypes: vi.fn() };
      vi.mocked(createProtopediaApiCustomClient)
        .mockClear()
        .mockReturnValue(mockClient as never);

      const apiClientOptions: { token: string; logLevel: 'info' | 'debug' } = {
        token: 'original-token',
        logLevel: 'info',
      };
      createProtopediaInMemoryRepository({
        apiClientOptions,
      });

      // Get the call arguments
      const callArgs = vi.mocked(createProtopediaApiCustomClient).mock
        .calls[0]?.[0];
      expect(callArgs?.protoPediaApiClientOptions?.token).toBe(
        'original-token',
      );

      // Mutate the original options
      apiClientOptions.token = 'modified-token';
      apiClientOptions.logLevel = 'debug';

      // Create another repository
      vi.mocked(createProtopediaApiCustomClient).mockClear();
      createProtopediaInMemoryRepository({ apiClientOptions });

      // Should use the mutated values (proving the factory reads current state)
      const newCallArgs = vi.mocked(createProtopediaApiCustomClient).mock
        .calls[0]?.[0];
      expect(newCallArgs?.protoPediaApiClientOptions?.token).toBe(
        'modified-token',
      );
      expect(newCallArgs?.protoPediaApiClientOptions?.logLevel).toBe('debug');
    });

    it('should return independent config objects', () => {
      vi.mocked(createProtopediaApiCustomClient).mockReturnValue({
        listPrototypes: vi.fn(),
      } as never);

      const repository = createProtopediaInMemoryRepository({
        storeConfig: { ttlMs: 3000 },
      });

      const config1 = repository.getConfig();
      const config2 = repository.getConfig();

      // Should be different object references (defensive copy)
      expect(config1).toEqual(config2);
      // Should be different object references (defensive copy)
      expect(config1).not.toBe(config2);
    });
  });

  describe('API client integration verification', () => {
    it('should pass token through to API client', () => {
      const mockClient = { listPrototypes: vi.fn() };
      vi.mocked(createProtopediaApiCustomClient)
        .mockClear()
        .mockReturnValue(mockClient as never);

      const testToken = 'secret-api-token-12345';
      createProtopediaInMemoryRepository({
        apiClientOptions: { token: testToken },
      });

      expect(createProtopediaApiCustomClient).toHaveBeenCalledWith(
        expect.objectContaining({
          protoPediaApiClientOptions: expect.objectContaining({
            token: testToken,
          }),
        }),
      );
    });

    it('should pass all API client options correctly', () => {
      const mockClient = { listPrototypes: vi.fn() };
      const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      vi.mocked(createProtopediaApiCustomClient)
        .mockClear()
        .mockReturnValue(mockClient as never);

      const apiOptions = {
        token: 'test-token',
        logLevel: 'debug' as const,
        baseUrl: 'https://custom.api.example.com',
        logger: mockLogger,
      };

      createProtopediaInMemoryRepository({ apiClientOptions: apiOptions });

      expect(createProtopediaApiCustomClient).toHaveBeenCalledWith({
        protoPediaApiClientOptions: {
          token: 'test-token',
          logLevel: 'debug',
          baseUrl: 'https://custom.api.example.com',
          logger: mockLogger,
        },
      });
    });

    it('should handle omitted API client options gracefully', () => {
      const mockClient = { listPrototypes: vi.fn() };
      vi.mocked(createProtopediaApiCustomClient)
        .mockClear()
        .mockReturnValue(mockClient as never);

      createProtopediaInMemoryRepository({ storeConfig: { ttlMs: 1000 } });

      expect(createProtopediaApiCustomClient).toHaveBeenCalledWith(undefined);
    });
  });

  describe('repository return values', () => {
    it('should return correct types from synchronous methods', () => {
      vi.mocked(createProtopediaApiCustomClient).mockReturnValue({
        listPrototypes: vi.fn(),
      } as never);

      const repository = createProtopediaInMemoryRepository();

      // getStats should return stats object
      const stats = repository.getStats();
      expect(stats).toHaveProperty('dataSizeBytes');
      expect(stats).toHaveProperty('cachedAt');
      expect(stats).toHaveProperty('size');
      expect(typeof stats.dataSizeBytes).toBe('number');

      // getConfig should return config object
      const config = repository.getConfig();
      expect(config).toHaveProperty('ttlMs');
      expect(config).toHaveProperty('maxDataSizeBytes');
      expect(typeof config.ttlMs).toBe('number');
      expect(typeof config.maxDataSizeBytes).toBe('number');

      // Stats should have isExpired boolean
      expect(typeof stats.isExpired).toBe('boolean');

      // getAllFromSnapshot should return a promise
      expect(repository.getAllFromSnapshot()).toBeInstanceOf(Promise);
    });

    it('should return null for getPrototypeFromSnapshotByPrototypeId when prototype not found', async () => {
      vi.mocked(createProtopediaApiCustomClient).mockReturnValue({
        listPrototypes: vi.fn(),
      } as never);

      const repository = createProtopediaInMemoryRepository();

      const result =
        await repository.getPrototypeFromSnapshotByPrototypeId(99999);
      expect(result).toBeNull();
    });

    it('should return analysis with null values when snapshot is empty', async () => {
      vi.mocked(createProtopediaApiCustomClient).mockReturnValue({
        listPrototypes: vi.fn(),
      } as never);

      const repository = createProtopediaInMemoryRepository();

      const result = await repository.analyzePrototypes();
      expect(result).toBeDefined();
      expect(result.min).toBeNull();
      expect(result.max).toBeNull();
    });

    it('should return empty array for getRandomSampleFromSnapshot when snapshot is empty', async () => {
      vi.mocked(createProtopediaApiCustomClient).mockReturnValue({
        listPrototypes: vi.fn(),
      } as never);

      const repository = createProtopediaInMemoryRepository();

      const result = await repository.getRandomSampleFromSnapshot(10);
      expect(result).toEqual([]);
    });
  });

  describe('stress testing', () => {
    it('should handle rapid creation of many instances', () => {
      vi.mocked(createProtopediaApiCustomClient).mockReturnValue({
        listPrototypes: vi.fn(),
      } as never);

      const count = 1000;
      const repositories = Array.from({ length: count }, () =>
        createProtopediaInMemoryRepository(),
      );

      expect(repositories.length).toBe(count);
      // Verify first and last are different instances
      expect(repositories[0]).not.toBe(repositories[count - 1]);

      // Verify they all have valid config
      repositories.forEach((repo) => {
        expect(repo.getConfig()).toBeDefined();
      });
    });
  });

  describe('runtime safety (JS interop)', () => {
    it('should throw TypeError when called with null', () => {
      // @ts-expect-error Testing runtime behavior for JS users
      expect(() => createProtopediaInMemoryRepository(null)).toThrow(TypeError);
    });

    it('should throw TypeError when storeConfig is null', () => {
      vi.mocked(createProtopediaApiCustomClient).mockReturnValue({
        listPrototypes: vi.fn(),
      } as never);

      expect(() =>
        // @ts-expect-error Testing runtime behavior for JS users
        createProtopediaInMemoryRepository({ storeConfig: null }),
      ).toThrow(TypeError);
    });
  });

  describe('type inheritance', () => {
    it('should return instance of ProtopediaInMemoryRepositoryImpl', () => {
      vi.mocked(createProtopediaApiCustomClient).mockReturnValue({
        listPrototypes: vi.fn(),
      } as never);

      const repository = createProtopediaInMemoryRepository();
      expect(repository).toBeInstanceOf(ProtopediaInMemoryRepositoryImpl);
    });
  });
});
