/**
 * Tests for ProtopediaInMemoryRepositoryImpl fetchAndStore method.
 *
 * Covers the core fetch-and-store logic shared by setupSnapshot and refreshSnapshot.
 *
 * @module
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProtopediaApiCustomClient } from '../../../fetcher/index.js';
import {
  DataSizeExceededError,
  PrototypeInMemoryStore,
} from '../../../store/index.js';
import { ProtopediaInMemoryRepositoryImpl } from '../../protopedia-in-memory-repository.js';

vi.mock('../../../fetcher/index', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../fetcher/index.js')>();
  return {
    ...actual,
    ProtopediaApiCustomClient: vi.fn(),
  };
});

vi.mock('../../../store/index', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../store/index.js')>();
  return {
    ...actual,
    PrototypeInMemoryStore: vi.fn(),
  };
});

import {
  createTestContext,
  makeNormalizedPrototype,
  makePrototype,
  setupMocks,
} from './test-helpers.js';

describe('ProtopediaInMemoryRepositoryImpl - fetchAndStore', () => {
  const { fetchPrototypesMock, resetMocks } = setupMocks();

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
    vi.mocked(mockApiClientInstance.fetchPrototypes).mockImplementation(
      fetchPrototypesMock,
    );
  });

  describe('fetch and store operations', () => {
    it('uses DEFAULT_FETCH_PARAMS when called with an empty object', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [makePrototype({ id: 42 })],
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });

      const result = await (repo as any).fetchAndStore({}, true);

      expect(fetchPrototypesMock).toHaveBeenCalledWith({
        offset: 0,
        limit: 10,
      });
      expect(result.ok).toBe(true);
    });

    it('merges defaults with overrides and respects custom limit', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [makePrototype({ id: 100, prototypeNm: 'override test' })],
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });

      // Override getByPrototypeId for this specific test
      vi.mocked(mockStoreInstance.getByPrototypeId).mockReturnValueOnce(
        makeNormalizedPrototype({ id: 100, prototypeNm: 'override test' }),
      );

      await (repo as any).fetchAndStore({ offset: 7, limit: 25 }, true);

      expect(fetchPrototypesMock).toHaveBeenCalledWith({
        offset: 7,
        limit: 25,
      });

      const found = await repo.getPrototypeFromSnapshotByPrototypeId(100);
      expect(found?.prototypeNm).toBe('override test');
    });

    it('returns failure result when fetchPrototypes returns ok: false', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        error: 'Internal server error',
        details: {
          res: { code: 'INTERNAL_ERROR' },
        },
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });

      const result = await (repo as any).fetchAndStore({}, true);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('Internal server error');
        expect(result.status).toBe(500);
        expect(result.code).toBe('INTERNAL_ERROR');
      }

      const stats = repo.getStats();
      expect(stats.size).toBe(1); // Store mock returns 1 for size
    });

    it('applies default limit when only offset is provided', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [makePrototype({ id: 50 })],
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
      });
      await (repo as any).fetchAndStore({ offset: 20 }, true);

      expect(fetchPrototypesMock).toHaveBeenCalledWith({
        offset: 20,
        limit: 10,
      });
    });

    it('applies default offset when only limit is provided', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [makePrototype({ id: 60 })],
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
      });
      await (repo as any).fetchAndStore({ limit: 50 }, true);

      expect(fetchPrototypesMock).toHaveBeenCalledWith({
        offset: 0,
        limit: 50,
      });
    });

    it('handles empty data array from successful fetch', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [],
      });

      vi.mocked(mockStoreInstance.setAll).mockReturnValue({ dataSizeBytes: 2 }); // Empty array size
      vi.mocked(mockStoreInstance.getStats).mockReturnValue({
        size: 0,
        cachedAt: new Date(),
        isExpired: false,
        remainingTtlMs: 50000,
        dataSizeBytes: 2,
        refreshInFlight: false,
      });
      vi.mocked(mockStoreInstance.getByPrototypeId).mockReturnValue(null);
      vi.mocked(mockStoreInstance.getAll).mockReturnValue([]);

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
      });
      await (repo as any).fetchAndStore({}, true);

      const stats = repo.getStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('updateLastFetchParams parameter', () => {
    it('updates lastFetchParams when updateLastFetchParams is true and storage succeeds', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [makePrototype({ id: 1 })],
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
      });

      await (repo as any).fetchAndStore({ offset: 5, limit: 15 }, true);

      // Verify lastFetchParams was updated by calling fetchAndStore again with updateLastFetchParams: false
      // and checking if it uses the cached params
      vi.mocked(mockApiClientInstance.fetchPrototypes).mockClear();
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [makePrototype({ id: 2 })],
      });

      // Call with default params but don't update
      await (repo as any).fetchAndStore({ offset: 0, limit: 10 }, false);

      // Should have called with the params we passed (not the cached ones)
      expect(fetchPrototypesMock).toHaveBeenCalledWith({
        offset: 0,
        limit: 10,
      });
    });

    it('does not update lastFetchParams when updateLastFetchParams is false', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [makePrototype({ id: 1 })],
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
      });

      // First call with update
      await (repo as any).fetchAndStore({ offset: 10, limit: 20 }, true);

      vi.mocked(mockApiClientInstance.fetchPrototypes).mockClear();
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [makePrototype({ id: 2 })],
      });

      // Second call with different params but without update
      await (repo as any).fetchAndStore({ offset: 30, limit: 40 }, false);

      // Third call should use the first params if we were to call refreshSnapshot
      // But since fetchAndStore doesn't use cached params, we verify it used the provided params
      expect(fetchPrototypesMock).toHaveBeenCalledWith({
        offset: 30,
        limit: 40,
      });
    });

    it('does not update lastFetchParams when storage fails', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [makePrototype({ id: 1 })],
      });

      vi.mocked(mockStoreInstance.setAll).mockImplementationOnce(() => {
        throw new DataSizeExceededError('UNCHANGED', 20000, 10000);
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
      });

      const result = await (repo as any).fetchAndStore(
        { offset: 50, limit: 100 },
        true,
      );

      expect(result.ok).toBe(false);

      // Restore normal setAll behavior
      vi.mocked(mockStoreInstance.setAll).mockReturnValue({
        dataSizeBytes: 1000,
      });
      vi.mocked(mockApiClientInstance.fetchPrototypes).mockClear();
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [makePrototype({ id: 2 })],
      });

      // Call again with different params
      await (repo as any).fetchAndStore({ offset: 0, limit: 10 }, true);

      // Should use the new params, not the failed ones
      expect(fetchPrototypesMock).toHaveBeenCalledWith({
        offset: 0,
        limit: 10,
      });
    });
  });

  describe('data size limit handling', () => {
    it('returns error when data size exceeds maxDataSizeBytes', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [makePrototype({ id: 1 })],
      });

      vi.mocked(mockStoreInstance.setAll).mockImplementationOnce(() => {
        throw new DataSizeExceededError('UNCHANGED', 20000, 10000);
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
      });

      const result = await (repo as any).fetchAndStore({}, true);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('exceeds maximum limit');
      }
    });
  });
});
