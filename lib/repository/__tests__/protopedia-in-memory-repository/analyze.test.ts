import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProtopediaApiCustomClient } from '../../../fetcher/index.js';
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
  makeNormalizedPrototype,
  makePrototype,
  setupMocks,
} from './test-helpers.js';

describe('ProtopediaInMemoryRepositoryImpl - analysis', () => {
  const { fetchPrototypesMock, resetMocks } = setupMocks();

  let mockStoreInstance: PrototypeInMemoryStore;
  let mockApiClientInstance: InstanceType<typeof ProtopediaApiCustomClient>;

  beforeEach(() => {
    resetMocks();
    vi.clearAllMocks();

    const testContext = createTestContext({
      getByPrototypeId: vi
        .fn()
        .mockImplementation((id) => makeNormalizedPrototype({ id })),
      getAll: vi.fn().mockReturnValue([makeNormalizedPrototype({ id: 1 })]),
      getPrototypeIds: vi.fn().mockReturnValue([1]),
    });

    mockStoreInstance = testContext.mockStoreInstance;
    mockApiClientInstance = testContext.mockApiClientInstance;
    vi.mocked(mockApiClientInstance.fetchPrototypes).mockImplementation(
      fetchPrototypesMock,
    );
  });

  describe('analyzePrototypes', () => {
    it('returns null min/max when snapshot is empty', async () => {
      vi.mocked(mockStoreInstance.getAll).mockReturnValueOnce([]);
      vi.mocked(mockStoreInstance.getStats).mockReturnValueOnce({
        size: 0,
        cachedAt: null,
        isExpired: true,
        remainingTtlMs: 0,
        dataSizeBytes: 0,
        refreshInFlight: false,
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
      });

      const result = await repo.analyzePrototypes();

      expect(result.min).toBeNull();
      expect(result.max).toBeNull();
    });

    it('returns correct min/max for single prototype', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [makePrototype({ id: 42 })],
      });

      vi.mocked(mockStoreInstance.getAll).mockReturnValueOnce([
        makeNormalizedPrototype({ id: 42 }),
      ]);
      vi.mocked(mockStoreInstance.setAll).mockReturnValueOnce({
        dataSizeBytes: 100,
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
      });
      await repo.setupSnapshot({});

      const result = await repo.analyzePrototypes();

      expect(result.min).toBe(42);
      expect(result.max).toBe(42);
    });

    it('returns correct min/max for multiple prototypes', async () => {
      const prototypes = [
        makePrototype({ id: 5 }),
        makePrototype({ id: 1 }),
        makePrototype({ id: 10 }),
        makePrototype({ id: 3 }),
      ];
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: prototypes,
      });

      const normalizedPrototypes = [
        makeNormalizedPrototype({ id: 5 }),
        makeNormalizedPrototype({ id: 1 }),
        makeNormalizedPrototype({ id: 10 }),
        makeNormalizedPrototype({ id: 3 }),
      ];
      vi.mocked(mockStoreInstance.getAll).mockReturnValueOnce(
        normalizedPrototypes,
      );
      vi.mocked(mockStoreInstance.setAll).mockReturnValueOnce({
        dataSizeBytes: 500,
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
      });
      await repo.setupSnapshot({});

      const result = await repo.analyzePrototypes();

      expect(result.min).toBe(1);
      expect(result.max).toBe(10);
    });
  });

  describe('private methods (via public interface)', () => {
    /**
     * Tests analyzePrototypesWithForLoop by manually reconstructing the prototype array.
     *
     * This test intentionally uses the verbose pattern of:
     * 1. getPrototypeIdsFromSnapshot() - get all IDs
     * 2. map each ID to getPrototypeFromSnapshotByPrototypeId() - individual lookups
     * 3. Promise.all() - wait for all lookups
     *
     * This validates that **individual lookup methods compose correctly**,
     * which is a different code path than getAllFromSnapshot().
     *
     * **Do NOT simplify these tests** - the verbosity is intentional and necessary.
     */
    it('analyzePrototypesWithForLoop works correctly', async () => {
      const prototypes = [
        makePrototype({ id: 100 }),
        makePrototype({ id: 1 }),
        makePrototype({ id: 50 }),
      ];
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: prototypes,
      });

      vi.mocked(mockStoreInstance.setAll).mockReturnValueOnce({
        dataSizeBytes: 300,
      });
      vi.mocked(mockStoreInstance.getPrototypeIds).mockReturnValueOnce([
        100, 1, 50,
      ]);
      const normalizedPrototypes = [
        makeNormalizedPrototype({ id: 100 }),
        makeNormalizedPrototype({ id: 1 }),
        makeNormalizedPrototype({ id: 50 }),
      ];
      vi.mocked(mockStoreInstance.getByPrototypeId).mockImplementation(
        (id) => normalizedPrototypes.find((p) => p.id === id) || null,
      );

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
      });
      await repo.setupSnapshot({});

      // NOTE: Intentionally verbose pattern - DO NOT refactor to getAllFromSnapshot()
      // This tests the composition of individual lookup methods (different code path)
      const result = repo.analyzePrototypesWithForLoop(
        await repo
          .getPrototypeIdsFromSnapshot()
          .then((ids) =>
            ids.map((id) =>
              repo.getPrototypeFromSnapshotByPrototypeId(id).then((p) => p!),
            ),
          )
          .then((promises) => Promise.all(promises)),
      );

      expect(result.min).toBe(1);
      expect(result.max).toBe(100);
    });
  });
});
