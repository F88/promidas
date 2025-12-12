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
    expect(createProtopediaApiCustomClient).toHaveBeenCalledWith(
      apiClientOptions,
    );
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
    expect(createProtopediaApiCustomClient).toHaveBeenCalledWith(
      apiClientOptions,
    );
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

    expect(createProtopediaApiCustomClient).toHaveBeenCalledWith(
      apiClientOptions,
    );
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
      token: 'test-token',
      logger: apiLogger,
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

    expect(createProtopediaApiCustomClient).toHaveBeenCalledWith(
      apiClientOptions,
    );
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
      token: 'test',
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
        token: '',
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
});
