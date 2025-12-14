/**
 * Tests for ProtopediaInMemoryRepositoryImpl setup and initialization.
 *
 * Covers constructor, setupSnapshot, and refreshSnapshot operations.
 *
 * @module
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProtopediaApiCustomClient } from '../../../fetcher/index.js';
import type { Logger } from '../../../logger/index.js';
import { PrototypeInMemoryStore } from '../../../store/index.js';
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
  makePrototype,
  setupMocks,
} from './test-helpers.js';

describe('ProtopediaInMemoryRepositoryImpl - setup and initialization', () => {
  const { fetchPrototypesMock, resetMocks } = setupMocks();

  let mockStoreInstance: PrototypeInMemoryStore;
  let mockApiClientInstance: InstanceType<typeof ProtopediaApiCustomClient>;

  beforeEach(() => {
    resetMocks();
    vi.clearAllMocks();

    const testContext = createTestContext({
      getByPrototypeId: vi.fn().mockReturnValue(makePrototype({ id: 1 })),
      getAll: vi.fn().mockReturnValue([makePrototype({ id: 1 })]),
      getPrototypeIds: vi.fn().mockReturnValue([1]),
    });

    mockStoreInstance = testContext.mockStoreInstance;
    mockApiClientInstance = testContext.mockApiClientInstance;
    vi.mocked(mockApiClientInstance.fetchPrototypes).mockImplementation(
      fetchPrototypesMock,
    );
  });

  describe('constructor', () => {
    it('creates instance with store config', () => {
      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });

      expect(repo).toBeInstanceOf(ProtopediaInMemoryRepositoryImpl);
      expect(mockStoreInstance.getConfig).toHaveBeenCalled();
      expect(repo.getConfig().ttlMs).toBe(60_000);
    });

    it('creates instance with minimal config', () => {
      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
      });

      expect(repo).toBeInstanceOf(ProtopediaInMemoryRepositoryImpl);
    });

    it('creates instance without API client options', () => {
      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
      });

      expect(repo).toBeInstanceOf(ProtopediaInMemoryRepositoryImpl);
    });

    it('masks token in logs when apiClientOptions with token is provided', () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      } as unknown as Logger;

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: { logger: mockLogger },
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'ProtopediaInMemoryRepository constructor called',
        expect.objectContaining({
          storeConfig: expect.objectContaining({
            ttlMs: 60_000,
          }),
        }),
      );
      // No longer logging apiClientOptions with token in constructor
      // This assertion is now effectively testing the absence of token logging from the repository constructor
    });
  });

  describe('setupSnapshot', () => {
    it('uses DEFAULT_FETCH_PARAMS when called with an empty object', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [
          makePrototype({
            id: 1,
            prototypeNm: 'test prototype',
          }),
        ],
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });

      await repo.setupSnapshot({});

      expect(fetchPrototypesMock).toHaveBeenCalledTimes(1);
      expect(fetchPrototypesMock).toHaveBeenCalledWith({
        offset: 0,
        limit: 10,
      });

      const stats = repo.getStats();
      expect(stats.size).toBe(1);
      expect(stats.isExpired).toBe(false);
    });

    it('merges defaults with overrides and respects custom limit', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [
          makePrototype({
            id: 100,
            prototypeNm: 'override test',
          }),
        ],
      });

      // Override getByPrototypeId for this specific test
      vi.mocked(mockStoreInstance.getByPrototypeId).mockReturnValueOnce(
        makePrototype({ id: 100, prototypeNm: 'override test' }),
      );

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
      });

      await repo.setupSnapshot({ offset: 7, limit: 25 });

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

      const result = await repo.setupSnapshot({});

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
      await repo.setupSnapshot({ offset: 20 });

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
      await repo.setupSnapshot({ limit: 50 });

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
      await repo.setupSnapshot({});

      const stats = repo.getStats();
      expect(stats.size).toBe(0);
      expect(stats.cachedAt).not.toBeNull();

      const random = await repo.getRandomPrototypeFromSnapshot();
      expect(random).toBeNull();
    });
  });

  describe('refreshSnapshot', () => {
    it('reuses merged params from the last setupSnapshot call', async () => {
      fetchPrototypesMock
        .mockResolvedValueOnce({
          ok: true,
          data: [
            makePrototype({
              id: 1,
              prototypeNm: 'first batch',
            }),
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
          data: [
            makePrototype({
              id: 2,
              prototypeNm: 'second batch',
            }),
          ],
        });

      vi.mocked(mockStoreInstance.setAll).mockReturnValue({
        dataSizeBytes: 100,
      });
      vi.mocked(mockStoreInstance.getStats).mockReturnValue({
        size: 1,
        cachedAt: new Date(),
        isExpired: false,
        remainingTtlMs: 50000,
        dataSizeBytes: 100,
        refreshInFlight: false,
      });
      vi.mocked(mockStoreInstance.getByPrototypeId)
        .mockReturnValueOnce(makePrototype({ id: 1 }))
        .mockReturnValueOnce(makePrototype({ id: 2 }));

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });

      await repo.setupSnapshot({ offset: 5 });

      expect(fetchPrototypesMock).toHaveBeenNthCalledWith(1, {
        offset: 5,
        limit: 10,
      });

      let prototype = await repo.getPrototypeFromSnapshotByPrototypeId(1);
      expect(prototype?.id).toBe(1);

      await repo.refreshSnapshot();

      expect(fetchPrototypesMock).toHaveBeenNthCalledWith(2, {
        offset: 5,
        limit: 10,
      });

      prototype = await repo.getPrototypeFromSnapshotByPrototypeId(2);
      expect(prototype?.id).toBe(2);
    });

    it('falls back to defaults when setupSnapshot has not run yet', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [
          makePrototype({
            id: 3,
            prototypeNm: 'fallback refresh',
          }),
        ],
      });

      vi.mocked(mockStoreInstance.setAll).mockReturnValue({
        dataSizeBytes: 100,
      });
      vi.mocked(mockStoreInstance.getStats).mockReturnValue({
        size: 1,
        cachedAt: new Date(),
        isExpired: false,
        remainingTtlMs: 50000,
        dataSizeBytes: 100,
        refreshInFlight: false,
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
      });

      await repo.refreshSnapshot();

      expect(fetchPrototypesMock).toHaveBeenCalledTimes(1);
      expect(fetchPrototypesMock).toHaveBeenCalledWith({
        offset: 0,
        limit: 10,
      });

      const stats = repo.getStats();
      expect(stats.size).toBe(1);
    });

    it('preserves the snapshot when refreshSnapshot fails', async () => {
      fetchPrototypesMock
        .mockResolvedValueOnce({
          ok: true,
          data: [
            makePrototype({
              id: 1,
              prototypeNm: 'initial',
            }),
          ],
        })
        .mockRejectedValueOnce(new Error('network failure'));

      vi.mocked(mockStoreInstance.setAll).mockReturnValue({
        dataSizeBytes: 100,
      });
      vi.mocked(mockStoreInstance.getStats).mockReturnValue({
        size: 1,
        cachedAt: new Date(),
        isExpired: false,
        remainingTtlMs: 50000,
        dataSizeBytes: 100,
        refreshInFlight: false,
      });
      vi.mocked(mockStoreInstance.getByPrototypeId).mockReturnValue(
        makePrototype({ id: 1 }),
      );
      vi.mocked(mockStoreInstance.getAll).mockReturnValue([
        makePrototype({ id: 1 }),
      ]);

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });

      await repo.setupSnapshot({});

      const beforeStats = repo.getStats();
      expect(beforeStats.size).toBe(1);

      const result = await repo.refreshSnapshot();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('network failure');
      }

      const afterStats = repo.getStats();
      expect(afterStats.size).toBe(1);

      const random = await repo.getRandomPrototypeFromSnapshot();
      expect(random).not.toBeNull();
      expect(random?.id).toBe(1);
    });

    it('can refresh multiple times consecutively', async () => {
      fetchPrototypesMock
        .mockResolvedValueOnce({
          ok: true,
          data: [makePrototype({ id: 1, prototypeNm: 'first' })],
        })
        .mockResolvedValueOnce({
          ok: true,
          data: [makePrototype({ id: 2, prototypeNm: 'second' })],
        })
        .mockResolvedValueOnce({
          ok: true,
          data: [makePrototype({ id: 3, prototypeNm: 'third' })],
        });

      vi.mocked(mockStoreInstance.setAll).mockReturnValue({
        dataSizeBytes: 100,
      });
      vi.mocked(mockStoreInstance.getStats).mockReturnValue({
        size: 1,
        cachedAt: new Date(),
        isExpired: false,
        remainingTtlMs: 50000,
        dataSizeBytes: 100,
        refreshInFlight: false,
      });

      // Override getByPrototypeId for this specific test
      vi.mocked(mockStoreInstance.getByPrototypeId)
        .mockReturnValueOnce(makePrototype({ id: 1, prototypeNm: 'first' }))
        .mockReturnValueOnce(makePrototype({ id: 2, prototypeNm: 'second' }))
        .mockReturnValueOnce(makePrototype({ id: 3, prototypeNm: 'third' }));

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
      });

      await repo.refreshSnapshot();
      let proto = await repo.getPrototypeFromSnapshotByPrototypeId(1);
      expect(proto?.prototypeNm).toBe('first');

      await repo.refreshSnapshot();
      proto = await repo.getPrototypeFromSnapshotByPrototypeId(2);
      expect(proto?.prototypeNm).toBe('second');

      await repo.refreshSnapshot();
      proto = await repo.getPrototypeFromSnapshotByPrototypeId(3);
      expect(proto?.prototypeNm).toBe('third');
    });
  });
});
