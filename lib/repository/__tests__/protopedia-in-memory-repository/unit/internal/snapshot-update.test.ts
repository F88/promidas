/**
 * Tests for ProtopediaInMemoryRepositoryImpl setupSnapshot and refreshSnapshot.
 *
 * Covers high-level behavior of snapshot operations.
 * Detailed fetch-and-store logic is tested in fetch-and-store.test.ts.
 * Constructor tests are in constructor.test.ts.
 *
 * @module
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProtopediaApiCustomClient } from '../../../../../fetcher/index.js';
import { PrototypeInMemoryStore } from '../../../../../store/index.js';
import { ProtopediaInMemoryRepositoryImpl } from '../../../../protopedia-in-memory-repository.js';
import {
  createTestContext,
  makeNormalizedPrototype,
  setupMocks,
} from '../../test-helpers.js';

vi.mock('../../../../../fetcher/index', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../../../fetcher/index.js')>();
  return {
    ...actual,
    ProtopediaApiCustomClient: vi.fn(),
  };
});

vi.mock('../../../../../store/index', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../../../store/index.js')>();
  return {
    ...actual,
    PrototypeInMemoryStore: vi.fn(),
  };
});

describe('ProtopediaInMemoryRepositoryImpl - snapshot operations', () => {
  const { resetMocks } = setupMocks();

  let mockStoreInstance: PrototypeInMemoryStore;
  let mockApiClientInstance: InstanceType<typeof ProtopediaApiCustomClient>;

  beforeEach(() => {
    resetMocks();
    vi.clearAllMocks();

    const testContext = createTestContext({
      getByPrototypeId: vi
        .fn()
        .mockReturnValue(makeNormalizedPrototype({ id: 1 })),
      getAll: vi.fn().mockReturnValue([makeNormalizedPrototype({ id: 1 })]),
      getPrototypeIds: vi.fn().mockReturnValue([1]),
    });

    mockStoreInstance = testContext.mockStoreInstance;
    mockApiClientInstance = testContext.mockApiClientInstance;
  });

  describe('setupSnapshot', () => {
    it('calls fetchAndStore with params and updateLastFetchParams=true', async () => {
      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });

      const fetchAndStoreSpy = vi
        .spyOn(repo as any, 'fetchAndStore')
        .mockResolvedValue({
          ok: true,
          stats: {
            size: 1,
            cachedAt: new Date(),
            isExpired: false,
            remainingTtlMs: 50000,
            dataSizeBytes: 1000,
            refreshInFlight: false,
          },
        });

      const params = { offset: 5, limit: 20 };
      await repo.setupSnapshot(params);

      expect(fetchAndStoreSpy).toHaveBeenCalledWith(params, true);
    });

    it('returns the result from fetchAndStore', async () => {
      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });

      const mockResult = {
        ok: false,
        origin: 'fetcher',
        kind: 'http',
        code: 'FETCH_HTTP_ERROR_500',
        message: 'test error',
        status: 500,
        details: {
          url: 'https://protopedia.example.com/api/prototypes',
          method: 'GET',
          requestHeaders: {},
        },
      } as const;

      vi.spyOn(repo as any, 'fetchAndStore').mockResolvedValue(mockResult);

      const result = await repo.setupSnapshot({});

      expect(result).toEqual(mockResult);
    });
  });

  describe('refreshSnapshot', () => {
    it('calls fetchAndStore with lastFetchParams and updateLastFetchParams=false', async () => {
      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });

      const fetchAndStoreSpy = vi
        .spyOn(repo as any, 'fetchAndStore')
        .mockResolvedValue({
          ok: true,
          stats: {
            size: 1,
            cachedAt: new Date(),
            isExpired: false,
            remainingTtlMs: 50000,
            dataSizeBytes: 1000,
            refreshInFlight: false,
          },
        });

      await repo.refreshSnapshot();

      // Should call with DEFAULT_FETCH_PARAMS (initial value of lastFetchParams)
      expect(fetchAndStoreSpy).toHaveBeenCalledWith(
        { offset: 0, limit: 10 },
        false,
      );
    });

    it('returns the result from fetchAndStore', async () => {
      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });

      const mockResult = {
        ok: false,
        origin: 'unknown',
        message: 'refresh failed',
      } as const;

      vi.spyOn(repo as any, 'fetchAndStore').mockResolvedValue(mockResult);

      const result = await repo.refreshSnapshot();

      expect(result).toEqual(mockResult);
    });
  });
});
