/**
 * Tests for ProtopediaInMemoryRepositoryImpl snapshot operations.
 *
 * Covers internal delegation behavior of:
 * - setupSnapshot -> fetchAndStore
 * - refreshSnapshot -> fetchAndStore (with lastFetchParams validation)
 * - setupSnapshotFromSerializedData -> loadAndStore
 *
 * Detailed fetch-and-store logic is tested in fetch-and-store.test.ts.
 * Detailed load-and-store logic is tested in load-and-store.test.ts.
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

      const fixedDate = new Date('2026-01-13T12:00:00Z');
      const fetchAndStoreSpy = vi
        .spyOn(repo as any, 'fetchAndStore')
        .mockResolvedValue({
          ok: true,
          stats: {
            size: 1,
            cachedAt: fixedDate,
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
    it('returns error when lastFetchParams is undefined (no prior setup)', async () => {
      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });

      const result = await repo.refreshSnapshot();

      expect(result).toEqual({
        ok: false,
        origin: 'repository',
        kind: 'invalid_state',
        code: 'REPOSITORY_INVALID_STATE',
        message:
          'Cannot refresh snapshot: No previous API fetch parameters available. ' +
          'Call setupSnapshot() first to establish fetch parameters.',
      });
    });
  });

  describe('setupSnapshotFromSerializedData', () => {
    it('calls loadAndStore with provided data', () => {
      const testContext = createTestContext({});
      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: testContext.mockStoreInstance,
        apiClient: testContext.mockApiClientInstance,
      });

      const fixedDate = new Date('2026-01-13T12:00:00Z');
      const mockResult = {
        ok: true,
        stats: {
          size: 2,
          cachedAt: fixedDate,
          isExpired: false,
          remainingTtlMs: 60000,
          dataSizeBytes: 2000,
          refreshInFlight: false,
        },
      } as const;

      const loadAndStoreSpy = vi
        .spyOn(repo as any, 'loadAndStore')
        .mockReturnValue(mockResult);

      const serializedData = {
        version: '1.0.0',
        serializedAt: fixedDate.toISOString(),
        prototypes: [
          makeNormalizedPrototype({ id: 1 }),
          makeNormalizedPrototype({ id: 2 }),
        ],
      };

      const result = repo.setupSnapshotFromSerializedData(serializedData);

      expect(loadAndStoreSpy).toHaveBeenCalledTimes(1);
      expect(loadAndStoreSpy).toHaveBeenCalledWith(serializedData);
      expect(result).toEqual(mockResult);
    });

    it('returns the result from loadAndStore when successful', () => {
      const testContext = createTestContext({});
      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: testContext.mockStoreInstance,
        apiClient: testContext.mockApiClientInstance,
      });

      const fixedDate = new Date('2026-01-13T12:00:00Z');
      const mockResult = {
        ok: true,
        stats: {
          size: 1,
          cachedAt: fixedDate,
          isExpired: false,
          remainingTtlMs: 60000,
          dataSizeBytes: 1000,
          refreshInFlight: false,
        },
      } as const;

      vi.spyOn(repo as any, 'loadAndStore').mockReturnValue(mockResult);

      const serializedData = {
        version: '1.0.0',
        serializedAt: fixedDate.toISOString(),
        prototypes: [makeNormalizedPrototype({ id: 1 })],
      };

      const result = repo.setupSnapshotFromSerializedData(serializedData);

      expect(result).toEqual(mockResult);
    });

    it('returns the result from loadAndStore when validation fails', () => {
      const testContext = createTestContext({});
      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: testContext.mockStoreInstance,
        apiClient: testContext.mockApiClientInstance,
      });

      const mockResult = {
        ok: false,
        origin: 'repository' as const,
        kind: 'validation' as const,
        code: 'REPOSITORY_VALIDATION_ERROR' as const,
        message: 'validation failed',
      };

      vi.spyOn(repo as any, 'loadAndStore').mockReturnValue(mockResult);

      const fixedDate = new Date('2026-01-13T12:00:00Z');
      const invalidData = {
        version: '1.0.0',
        serializedAt: fixedDate.toISOString(),
        prototypes: [{ id: 1 } as any],
      };

      const result = repo.setupSnapshotFromSerializedData(invalidData);

      expect(result).toEqual(mockResult);
    });
  });
});
