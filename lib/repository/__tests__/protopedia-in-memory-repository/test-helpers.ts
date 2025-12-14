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
 * - {@link setupMocks} - Configure API client mocks with reset capability
 *
 * ## Usage Pattern
 *
 * **IMPORTANT**:
 * - Tests under `protopedia-in-memory-repository/` should NOT use
 *   `createProtopediaInMemoryRepository`.
 * - Prefer explicit dependency injection when constructing
 *   `ProtopediaInMemoryRepositoryImpl`.
 * - If you use {@link setupMocks}, each test file must include the `vi.mock()`
 *   call at the top level before importing this module.
 *
 * @example
 * ```typescript
 * import { vi } from 'vitest';
 * import { ProtopediaInMemoryRepositoryImpl } from '../../protopedia-in-memory-repository.js';
 * import { createMockStore, makePrototype, setupMocks } from './test-helpers.js';
 *
 * describe('My tests', () => {
 *   const { fetchPrototypesMock, resetMocks } = setupMocks();
 *
 *   beforeEach(() => {
 *     resetMocks();
 *   });
 *
 *   it('should work', async () => {
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
import type {
  PrototypeInMemoryStore,
  PrototypeInMemoryStoreConfig,
} from '../../../store/index.js';
import type { NormalizedPrototype } from '../../../types/index.js';

/**
 * Create a mock store instance with required methods.
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
 * Creates mock functions for the API client and configures them.
 *
 * @returns Object containing mock functions and setup helper
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
 * Create a mock fetch function that returns successful prototype data.
 *
 * @param prototypes - Array of partial prototype data to return
 * @returns Mock fetch function that resolves to a successful response
 */
export const createMockFetchPrototypesSuccess = (
  prototypes: Array<Partial<ResultOfListPrototypesApiResponse>>,
) => {
  return () => {
    const fullPrototypes = prototypes.map((p) => makePrototype(p));
    return Promise.resolve(
      new Response(
        JSON.stringify({
          results: fullPrototypes,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );
  };
};
