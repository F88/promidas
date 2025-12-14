/**
 * Shared test helpers and utilities for ProtopediaInMemoryRepositoryImpl tests.
 *
 * This module provides reusable test utilities for creating test data and
 * configuring mocks across the repository test suite.
 *
 * ## Exports
 *
 * ### Data Builders
 * - {@link makePrototype} - Create minimal valid prototype data with overrides
 *
 * ### Mock Management
 * - {@link createMockStore} - Create a functional mock store (for integration/performance tests)
 * - {@link createBasicMockStore} - Create a basic manual mock store with defaults (for unit tests)
 * - {@link createTestContext} - Create complete test context with store and API client mocks
 * - {@link setupMocks} - Configure API client mocks with reset capability
 *
 * ## Mock Strategy Guidelines
 *
 * This test suite uses two different mocking approaches depending on test type:
 *
 * ### Option 1: Manual Mocks (for unit tests)
 * **Use when:** Testing specific behaviors, need fine-grained control over return values
 * **Files:** config-and-stats.test.ts, setup.test.ts, analyze.test.ts, data-retrieval.test.ts
 *
 * ```typescript
 * const mockStoreInstance = {
 *   getConfig: vi.fn().mockReturnValue({...}),
 *   setAll: vi.fn().mockReturnValue({...}),
 *   getStats: vi.fn()
 *     .mockReturnValueOnce({...}) // First call
 *     .mockReturnValueOnce({...}), // Second call
 *   // ... other methods
 * };
 * ```
 *
 * **Benefits:**
 * - Complete control over each method call's return value
 * - Can use `mockReturnValueOnce` for sequential behaviors
 * - Explicit about what's being tested
 * - Suitable for testing edge cases and error conditions
 *
 * ### Option 2: createMockStore (for integration/performance tests)
 * **Use when:** Testing end-to-end flows, performance, or when real store behavior is needed
 * **Files:** integration.test.ts, fetch-error-handling.test.ts, concurrency.test.ts, data-access.perf.test.ts
 *
 * ```typescript
 * const store = createMockStore({ ttlMs: 30_000 });
 * ```
 *
 * **Benefits:**
 * - Simulates actual store behavior (data storage, TTL, expiration)
 * - Less boilerplate for integration tests
 * - Consistent behavior across multiple operations
 * - Better for testing data flow and state management
 *
 * **Limitations:**
 * - Cannot easily test specific error conditions
 * - Fixed `dataSizeBytes` return value (1000)
 * - Not suitable when you need different values on each call
 *
 * ## Usage Pattern
 *
 * **IMPORTANT**:
 * - Tests under `protopedia-in-memory-repository/` should NOT use
 *   `createProtopediaInMemoryRepository` factory function.
 * - Use explicit dependency injection when constructing `ProtopediaInMemoryRepositoryImpl`.
 * - If you use {@link setupMocks}, each test file must include the `vi.mock()`
 *   call at the top level before importing this module.
 *
 * @example Manual Mock Example (Unit Test)
 * ```typescript
 * import { vi } from 'vitest';
 * import { ProtopediaInMemoryRepositoryImpl } from '../../protopedia-in-memory-repository.js';
 * import { makePrototype, setupMocks } from './test-helpers.js';
 *
 * describe('Unit tests', () => {
 *   const { fetchPrototypesMock, resetMocks } = setupMocks();
 *   let mockStoreInstance;
 *
 *   beforeEach(() => {
 *     mockStoreInstance = {
 *       getConfig: vi.fn().mockReturnValue({ ttlMs: 60000, ... }),
 *       getStats: vi.fn().mockReturnValueOnce({ size: 0, ... })
 *                        .mockReturnValueOnce({ size: 1, ... }),
 *       // ... other methods
 *     };
 *   });
 *
 *   it('should update stats after fetch', async () => {
 *     const repo = new ProtopediaInMemoryRepositoryImpl({
 *       store: mockStoreInstance,
 *       apiClient: mockApiClientInstance,
 *     });
 *     // Test specific behavior with controlled mock values
 *   });
 * });
 * ```
 *
 * @example createMockStore Example (Integration Test)
 * ```typescript
 * import { vi } from 'vitest';
 * import { ProtopediaInMemoryRepositoryImpl } from '../../protopedia-in-memory-repository.js';
 * import { createMockStore, makePrototype, setupMocks } from './test-helpers.js';
 *
 * describe('Integration tests', () => {
 *   const { fetchPrototypesMock, resetMocks } = setupMocks();
 *
 *   beforeEach(() => {
 *     resetMocks();
 *   });
 *
 *   it('should handle full fetch-store-retrieve flow', async () => {
 *     const store = createMockStore({ ttlMs: 30_000 });
 *     const apiClient = { fetchPrototypes: fetchPrototypesMock };
 *
 *     const repo = new ProtopediaInMemoryRepositoryImpl({
 *       store,
 *       apiClient,
 *       repositoryConfig: {},
 *     });
 *
 *     fetchPrototypesMock.mockResolvedValueOnce({
 *       ok: true,
 *       data: [makePrototype({ id: 42 })],
 *     });
 *
 *     await repo.setupSnapshot({});
 *     const result = repo.getById(42);
 *     expect(result).toBeDefined();
 *   });
 * });
 * ```
 *
 * ## Design Rationale
 *
 * ### makePrototype
 * Provides minimal valid prototype data to satisfy the API contract while
 * allowing selective override of specific fields for test scenarios.
 *
 * ### createMockStore
 * Implements a functional in-memory store mock that simulates real store behavior
 * including data storage, TTL tracking, and expiration logic. This reduces test
 * boilerplate for integration tests while maintaining predictable behavior.
 *
 * ### setupMocks
 * Returns configured mock functions with a reset helper to ensure clean
 * state between tests without shared beforeEach complexity.
 *
 * @module
 * @see {@link ResultOfListPrototypesApiResponse} for the prototype data structure
 */
import type { ResultOfListPrototypesApiResponse } from 'protopedia-api-v2-client';
import { vi } from 'vitest';

import { ProtopediaApiCustomClient } from '../../../fetcher/index.js';
import {
  PrototypeInMemoryStore,
  type PrototypeInMemoryStoreConfig,
} from '../../../store/index.js';
import type { NormalizedPrototype } from '../../../types/index.js';

/**
 * Create a mock store instance that simulates real store behavior.
 *
 * This mock implements the core PrototypeInMemoryStore interface with functional
 * behavior including data storage, TTL tracking, and expiration logic.
 *
 * **When to use:**
 * - Integration tests that need end-to-end data flow
 * - Performance tests with large datasets
 * - Tests requiring consistent store state across multiple operations
 *
 * **When NOT to use:**
 * - Unit tests needing specific return values per call (use manual mocks instead)
 * - Tests requiring `mockReturnValueOnce` for sequential different values
 * - Tests validating specific `dataSizeBytes` values (this mock returns fixed 1000)
 *
 * @param configOverrides - Partial configuration to override defaults
 * @returns Functional mock store with Vitest spy tracking
 *
 * @example
 * ```typescript
 * const store = createMockStore({ ttlMs: 30_000 });
 * store.setAll([makePrototype({ id: 1 })]);
 * const result = store.getByPrototypeId(1); // Returns the stored prototype
 * expect(store.size).toBe(1);
 * ```
 */
export const createMockStore = (
  configOverrides: Partial<PrototypeInMemoryStoreConfig> = {},
): PrototypeInMemoryStore => {
  const mockData = new Map<number, NormalizedPrototype>();
  let cachedAt: Date | null = null;
  let cachedArray: NormalizedPrototype[] = [];

  const resolvedConfig: Omit<
    Required<PrototypeInMemoryStoreConfig>,
    'logger'
  > = {
    ttlMs: configOverrides.ttlMs ?? 1_800_000,
    maxDataSizeBytes: configOverrides.maxDataSizeBytes ?? 10_485_760,
    logLevel: configOverrides.logLevel ?? 'info',
  };

  const getRemainingTtlMs = (): number => {
    if (cachedAt === null) {
      return 0;
    }
    const elapsedMs = Date.now() - cachedAt.getTime();
    const remaining = resolvedConfig.ttlMs - elapsedMs;
    return Math.max(0, remaining);
  };

  const getIsExpired = (): boolean => {
    if (cachedAt === null) {
      return true;
    }
    return getRemainingTtlMs() === 0;
  };

  return {
    getConfig: vi.fn().mockReturnValue(resolvedConfig),
    get size() {
      return mockData.size;
    },
    setAll: vi.fn((prototypes: NormalizedPrototype[]) => {
      mockData.clear();
      for (const proto of prototypes) {
        mockData.set(proto.id, proto);
      }
      cachedArray = prototypes;
      cachedAt = new Date();
      return { dataSizeBytes: 1000 };
    }),
    getByPrototypeId: vi.fn((id: number) => mockData.get(id) ?? null),
    getAll: vi.fn(() => cachedArray),
    getPrototypeIds: vi.fn(() => Array.from(mockData.keys())),
    clear: vi.fn(() => {
      mockData.clear();
      cachedArray = [];
      cachedAt = null;
    }),
    isExpired: vi.fn(() => getIsExpired()),
    getCachedAt: vi.fn(() => cachedAt),
    getStats: vi.fn(() => ({
      size: mockData.size,
      cachedAt: cachedAt,
      isExpired: getIsExpired(),
      remainingTtlMs: getRemainingTtlMs(),
      dataSizeBytes: 1000,
      refreshInFlight: false,
    })),
    getSnapshot: vi.fn(() => ({
      data: cachedArray,
      cachedAt: cachedAt,
      isExpired: getIsExpired(),
    })),
    runExclusive: vi.fn(async (task) => await task()),
    isRefreshInFlight: vi.fn().mockReturnValue(false),
  } as any;
};

/**
 * Helper to build minimal-but-valid upstream prototypes for testing.
 *
 * Creates a complete prototype object that satisfies the API contract with
 * sensible defaults, allowing selective override of specific fields.
 *
 * @param overrides - Partial prototype data to override defaults
 * @returns Complete prototype object for testing
 *
 * @example
 * ```typescript
 * const proto = makePrototype({ id: 42, prototypeNm: 'Test Prototype' });
 * // All other fields have default values
 * ```
 */
export const makePrototype = (
  overrides: Partial<ResultOfListPrototypesApiResponse> = {},
): ResultOfListPrototypesApiResponse => ({
  id: 1,
  uuid: 'uuid-1',
  nid: 'nid-1',
  createId: 1,
  createDate: '2024-01-01T00:00:00Z',
  updateId: 1,
  updateDate: '2024-01-01T00:00:00Z',
  releaseDate: '2024-01-02T00:00:00Z',
  summary: '',
  tags: '',
  teamNm: 'team',
  users: 'user1|user2',
  status: 1,
  releaseFlg: 1,
  revision: 1,
  prototypeNm: 'default name',
  freeComment: '',
  systemDescription: '',
  videoUrl: '',
  mainUrl: 'https://example.com',
  awards: '',
  viewCount: 0,
  goodCount: 0,
  commentCount: 0,
  relatedLink: '',
  relatedLink2: '',
  relatedLink3: '',
  relatedLink4: '',
  relatedLink5: '',
  licenseType: 0,
  thanksFlg: 0,
  events: '',
  officialLink: '',
  materials: '',
  slideMode: 0,
  ...overrides,
});

/**
 * Creates mock functions for the API client and configures them for testing.
 *
 * This helper sets up the ProtopediaApiCustomClient mock with properly typed
 * mock functions and provides a reset utility for clean test isolation.
 *
 * **Note:** Test files using this must include `vi.mock()` calls at the top level
 * before importing this module to ensure proper mock initialization.
 *
 * @returns Object containing mock functions and reset helper
 *
 * @example
 * ```typescript
 * // At top of test file
 * vi.mock('../../../fetcher/index', async (importOriginal) => {
 *   const actual = await importOriginal();
 *   return { ...actual, ProtopediaApiCustomClient: vi.fn() };
 * });
 *
 * // In test setup
 * const { fetchPrototypesMock, resetMocks } = setupMocks();
 *
 * beforeEach(() => {
 *   resetMocks(); // Clear mock state between tests
 * });
 *
 * it('test', async () => {
 *   fetchPrototypesMock.mockResolvedValueOnce({ ok: true, data: [...] });
 *   // ... test code
 * });
 * ```
 */
export const setupMocks = () => {
  const listPrototypesMock = vi.fn();
  const fetchPrototypesMock = vi.fn();

  const resetMocks = () => {
    listPrototypesMock.mockReset();
    fetchPrototypesMock.mockReset();

    vi.mocked(ProtopediaApiCustomClient).mockImplementation(
      class {
        listPrototypes = listPrototypesMock;
        fetchPrototypes = fetchPrototypesMock;
      } as any,
    );
  };

  // Initial setup
  resetMocks();

  return {
    listPrototypesMock,
    fetchPrototypesMock,
    resetMocks,
  };
};

/**
 * Create a basic manual mock store instance with default implementations.
 *
 * This helper reduces boilerplate for manual mock setup by providing sensible
 * defaults that can be overridden per-test. Use this for unit tests that need
 * fine-grained control but want to start with standard defaults.
 *
 * **When to use:**
 * - Unit tests needing basic store mock with customizable behavior
 * - Tests that will override specific methods with `mockReturnValueOnce`
 * - Reducing repetitive beforeEach setup code
 *
 * **When NOT to use:**
 * - Integration tests (use `createMockStore` instead)
 * - Tests needing completely custom mock implementations
 *
 * @param overrides - Partial mock implementations to override defaults
 * @returns Mock store instance with default vi.fn() implementations
 *
 * @example
 * ```typescript
 * const mockStoreInstance = createBasicMockStore();
 * // Override specific behavior for this test
 * vi.mocked(mockStoreInstance.getStats).mockReturnValueOnce({ size: 5, ... });
 * ```
 *
 * @example With overrides
 * ```typescript
 * const mockStoreInstance = createBasicMockStore({
 *   getConfig: () => ({ ttlMs: 120_000, maxDataSizeBytes: 10485760, logLevel: 'debug' }),
 * });
 * ```
 */
export const createBasicMockStore = (
  overrides: Partial<Record<keyof PrototypeInMemoryStore, any>> = {},
): PrototypeInMemoryStore => {
  const defaultMock = {
    getConfig: vi.fn().mockReturnValue({
      ttlMs: 60_000,
      maxDataSizeBytes: 10_485_760,
      logLevel: 'info' as const,
    }),
    setAll: vi.fn().mockReturnValue({ dataSizeBytes: 100 }),
    getStats: vi.fn().mockReturnValue({
      size: 1,
      cachedAt: new Date(),
      isExpired: false,
      remainingTtlMs: 50_000,
      dataSizeBytes: 100,
      refreshInFlight: false,
    }),
    getByPrototypeId: vi.fn().mockReturnValue(null),
    getAll: vi.fn().mockReturnValue([]),
    getPrototypeIds: vi.fn().mockReturnValue([]),
    clear: vi.fn(),
    isExpired: vi.fn().mockReturnValue(false),
    getCachedAt: vi.fn().mockReturnValue(new Date()),
    getSnapshot: vi.fn().mockReturnValue({
      data: [],
      cachedAt: new Date(),
      isExpired: false,
    }),
    runExclusive: vi.fn(async (task) => await task()),
    isRefreshInFlight: vi.fn().mockReturnValue(false),
  };

  return {
    ...defaultMock,
    ...overrides,
  } as unknown as PrototypeInMemoryStore;
};

/**
 * Create a complete test context with mocked store and API client.
 *
 * This helper eliminates repetitive beforeEach setup by providing a standard
 * test context with properly configured mocks. It handles all the constructor
 * mocking and wiring automatically.
 *
 * **When to use:**
 * - Unit tests with standard mock requirements
 * - Reducing beforeEach boilerplate across test files
 * - Tests that need both store and API client mocks
 *
 * **When NOT to use:**
 * - Integration tests (use `createMockStore` + manual setup instead)
 * - Tests needing very specific mock configurations from the start
 *
 * **Note:** This must be called within or after `setupMocks()` has been called,
 * and the test file must have the appropriate `vi.mock()` calls at the top level.
 *
 * @param storeOverrides - Optional overrides for store mock methods
 * @returns Object containing mock instances
 *
 * @example
 * ```typescript
 * import { vi } from 'vitest';
 * import { setupMocks, createTestContext } from './test-helpers.js';
 *
 * // Required vi.mock() calls at top level
 * vi.mock('../../../fetcher/index', ...);
 * vi.mock('../../../store/index', ...);
 *
 * describe('My tests', () => {
 *   const { fetchPrototypesMock, resetMocks } = setupMocks();
 *   let testContext;
 *
 *   beforeEach(() => {
 *     resetMocks();
 *     testContext = createTestContext();
 *   });
 *
 *   it('should work', async () => {
 *     const { mockStoreInstance, mockApiClientInstance } = testContext;
 *     const repo = new ProtopediaInMemoryRepositoryImpl({
 *       store: mockStoreInstance,
 *       apiClient: mockApiClientInstance,
 *     });
 *     // ... test code
 *   });
 * });
 * ```
 */
export const createTestContext = (
  storeOverrides: Partial<Record<keyof PrototypeInMemoryStore, any>> = {},
) => {
  const mockStoreInstance = createBasicMockStore(storeOverrides);

  vi.mocked(PrototypeInMemoryStore).mockImplementation(() => mockStoreInstance);

  const mockApiClientInstance = {
    fetchPrototypes: vi.fn(),
  } as unknown as InstanceType<typeof ProtopediaApiCustomClient>;

  vi.mocked(ProtopediaApiCustomClient).mockImplementation(
    () => mockApiClientInstance,
  );

  return {
    mockStoreInstance,
    mockApiClientInstance,
  };
};
