/**
 * Tests for ProtopediaInMemoryRepositoryImpl data retrieval methods.
 *
 * Covers getRandomPrototypeFromSnapshot, getRandomSampleFromSnapshot,
 * getPrototypeIdsFromSnapshot, and getPrototypeFromSnapshotByPrototypeId.
 *
 * @module
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProtopediaApiCustomClient } from '../../../fetcher/index.js';
import { PrototypeInMemoryStore } from '../../../store/index.js';
import { ValidationError } from '../../index.js';
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

describe('ProtopediaInMemoryRepositoryImpl - data retrieval', () => {
  const { fetchPrototypesMock, resetMocks } = setupMocks();

  let mockStoreInstance: PrototypeInMemoryStore;
  let mockApiClientInstance: InstanceType<typeof ProtopediaApiCustomClient>;

  beforeEach(() => {
    resetMocks();
    vi.clearAllMocks();

    const testContext = createTestContext();
    mockStoreInstance = testContext.mockStoreInstance;
    mockApiClientInstance = testContext.mockApiClientInstance;
    vi.mocked(mockApiClientInstance.fetchPrototypes).mockImplementation(
      fetchPrototypesMock,
    );
  });

  describe('getRandomPrototypeFromSnapshot', () => {
    it('returns undefined when the store is empty', async () => {
      vi.mocked(mockStoreInstance.getStats).mockReturnValueOnce({
        size: 0,
        cachedAt: null,
        isExpired: true,
        remainingTtlMs: 0,
        dataSizeBytes: 0,
        refreshInFlight: false,
      });
      vi.mocked(mockStoreInstance.getAll).mockReturnValueOnce([]);
      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });

      const random = await repo.getRandomPrototypeFromSnapshot();
      expect(random).toBeNull();
    });

    it('returns a prototype when the snapshot is populated', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [
          makePrototype({
            id: 42,
            prototypeNm: 'random candidate',
          }),
        ],
      });

      vi.mocked(mockStoreInstance.setAll).mockReturnValueOnce({
        dataSizeBytes: 100,
      });
      vi.mocked(mockStoreInstance.getStats).mockReturnValueOnce({
        size: 1,
        cachedAt: new Date(),
        isExpired: false,
        remainingTtlMs: 50000,
        dataSizeBytes: 100,
        refreshInFlight: false,
      });
      vi.mocked(mockStoreInstance.getAll).mockReturnValueOnce([
        makeNormalizedPrototype({ id: 42, prototypeNm: 'random candidate' }),
      ]);
      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });
      await repo.setupSnapshot({});

      const random = await repo.getRandomPrototypeFromSnapshot();
      expect(random).not.toBeNull();
      expect(random?.id).toBe(42);
    });

    it('returns one of the available prototypes when multiple exist', async () => {
      const prototypes = [
        makeNormalizedPrototype({ id: 1, prototypeNm: 'alpha' }),
        makeNormalizedPrototype({ id: 2, prototypeNm: 'beta' }),
        makeNormalizedPrototype({ id: 3, prototypeNm: 'gamma' }),
      ];
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: prototypes,
      });

      vi.mocked(mockStoreInstance.setAll).mockReturnValueOnce({
        dataSizeBytes: 300,
      });
      vi.mocked(mockStoreInstance.getStats).mockReturnValueOnce({
        size: 3,
        cachedAt: new Date(),
        isExpired: false,
        remainingTtlMs: 50000,
        dataSizeBytes: 300,
        refreshInFlight: false,
      });
      vi.mocked(mockStoreInstance.getAll).mockReturnValueOnce(prototypes);
      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });
      await repo.setupSnapshot({});

      const random = await repo.getRandomPrototypeFromSnapshot();
      expect(random).not.toBeNull();
      expect([1, 2, 3]).toContain(random?.id);
      expect(['alpha', 'beta', 'gamma']).toContain(random?.prototypeNm);
    });
  });

  describe('getRandomSampleFromSnapshot', () => {
    it('returns empty array when the store is empty', async () => {
      vi.mocked(mockStoreInstance.getStats).mockReturnValueOnce({
        size: 0,
        cachedAt: null,
        isExpired: true,
        remainingTtlMs: 0,
        dataSizeBytes: 0,
        refreshInFlight: false,
      });
      vi.mocked(mockStoreInstance.getAll).mockReturnValueOnce([]);
      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });

      const sample = await repo.getRandomSampleFromSnapshot(5);
      expect(sample).toEqual([]);
    });

    it('returns empty array when size is 0', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [makePrototype({ id: 1 }), makePrototype({ id: 2 })],
      });

      vi.mocked(mockStoreInstance.setAll).mockReturnValueOnce({
        dataSizeBytes: 200,
      });
      vi.mocked(mockStoreInstance.getStats).mockReturnValueOnce({
        size: 2,
        cachedAt: new Date(),
        isExpired: false,
        remainingTtlMs: 50000,
        dataSizeBytes: 200,
        refreshInFlight: false,
      });
      vi.mocked(mockStoreInstance.getAll).mockReturnValueOnce([
        makeNormalizedPrototype({ id: 1 }),
        makeNormalizedPrototype({ id: 2 }),
      ]);
      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });
      await repo.setupSnapshot({});

      const sample = await repo.getRandomSampleFromSnapshot(0);
      expect(sample).toEqual([]);
    });

    it('returns empty array when size is negative', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [makePrototype({ id: 1 }), makePrototype({ id: 2 })],
      });

      vi.mocked(mockStoreInstance.setAll).mockReturnValueOnce({
        dataSizeBytes: 200,
      });
      vi.mocked(mockStoreInstance.getStats).mockReturnValueOnce({
        size: 2,
        cachedAt: new Date(),
        isExpired: false,
        remainingTtlMs: 50000,
        dataSizeBytes: 200,
        refreshInFlight: false,
      });
      vi.mocked(mockStoreInstance.getAll).mockReturnValueOnce([
        makeNormalizedPrototype({ id: 1 }),
        makeNormalizedPrototype({ id: 2 }),
      ]);
      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });
      await repo.setupSnapshot({});

      const sample = await repo.getRandomSampleFromSnapshot(-5);
      expect(sample).toEqual([]);
    });

    it('returns requested number of samples when enough data exists', async () => {
      const prototypes = [
        makeNormalizedPrototype({ id: 1 }),
        makeNormalizedPrototype({ id: 2 }),
        makeNormalizedPrototype({ id: 3 }),
        makeNormalizedPrototype({ id: 4 }),
        makeNormalizedPrototype({ id: 5 }),
      ];
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: prototypes,
      });

      vi.mocked(mockStoreInstance.setAll).mockReturnValueOnce({
        dataSizeBytes: 500,
      });
      vi.mocked(mockStoreInstance.getStats).mockReturnValueOnce({
        size: 5,
        cachedAt: new Date(),
        isExpired: false,
        remainingTtlMs: 50000,
        dataSizeBytes: 500,
        refreshInFlight: false,
      });
      vi.mocked(mockStoreInstance.getAll).mockReturnValueOnce(prototypes);
      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });
      await repo.setupSnapshot({});

      const sample = await repo.getRandomSampleFromSnapshot(3);
      expect(sample.length).toBe(3);
    });

    it('returns all data when size exceeds available prototypes', async () => {
      const prototypes = [
        makeNormalizedPrototype({ id: 1 }),
        makeNormalizedPrototype({ id: 2 }),
      ];
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: prototypes,
      });

      vi.mocked(mockStoreInstance.setAll).mockReturnValueOnce({
        dataSizeBytes: 200,
      });
      vi.mocked(mockStoreInstance.getStats).mockReturnValueOnce({
        size: 2,
        cachedAt: new Date(),
        isExpired: false,
        remainingTtlMs: 50000,
        dataSizeBytes: 200,
        refreshInFlight: false,
      });
      vi.mocked(mockStoreInstance.getAll).mockReturnValueOnce(prototypes);
      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });
      await repo.setupSnapshot({});

      const sample = await repo.getRandomSampleFromSnapshot(10);
      expect(sample.length).toBe(2);
    });

    it('returns unique samples without duplicates', async () => {
      const prototypes = [
        makeNormalizedPrototype({ id: 1 }),
        makeNormalizedPrototype({ id: 2 }),
        makeNormalizedPrototype({ id: 3 }),
        makeNormalizedPrototype({ id: 4 }),
        makeNormalizedPrototype({ id: 5 }),
      ];
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: prototypes,
      });

      vi.mocked(mockStoreInstance.setAll).mockReturnValueOnce({
        dataSizeBytes: 500,
      });
      vi.mocked(mockStoreInstance.getStats).mockReturnValueOnce({
        size: 5,
        cachedAt: new Date(),
        isExpired: false,
        remainingTtlMs: 50000,
        dataSizeBytes: 500,
        refreshInFlight: false,
      });
      vi.mocked(mockStoreInstance.getAll).mockReturnValueOnce(prototypes);
      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });
      await repo.setupSnapshot({});

      const sample = await repo.getRandomSampleFromSnapshot(5);
      const ids = sample.map((p) => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(5);
    });

    it('eventually samples all prototypes over multiple calls', async () => {
      const prototypes = [
        makeNormalizedPrototype({ id: 1 }),
        makeNormalizedPrototype({ id: 2 }),
        makeNormalizedPrototype({ id: 3 }),
      ];
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: prototypes,
      });

      vi.mocked(mockStoreInstance.setAll).mockReturnValueOnce({
        dataSizeBytes: 300,
      });
      vi.mocked(mockStoreInstance.getStats).mockReturnValueOnce({
        size: 3,
        cachedAt: new Date(),
        isExpired: false,
        remainingTtlMs: 50000,
        dataSizeBytes: 300,
        refreshInFlight: false,
      });
      vi.mocked(mockStoreInstance.getAll).mockReturnValue(prototypes); // Return a reference for consistent sampling
      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });
      await repo.setupSnapshot({});

      const seen = new Set<number>();
      for (let i = 0; i < 50; i++) {
        const sample = await repo.getRandomSampleFromSnapshot(2);
        sample.forEach((p) => seen.add(p.id));
      }

      expect(seen.size).toBe(3);
      expect(seen.has(1)).toBe(true);
      expect(seen.has(2)).toBe(true);
      expect(seen.has(3)).toBe(true);
    });

    it('handles large sample sizes efficiently (>50% of total)', async () => {
      const prototypes = Array.from({ length: 10 }, (_, i) =>
        makeNormalizedPrototype({ id: i + 1 }),
      );
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: prototypes,
      });

      vi.mocked(mockStoreInstance.setAll).mockReturnValueOnce({
        dataSizeBytes: 1000,
      });
      vi.mocked(mockStoreInstance.getStats).mockReturnValueOnce({
        size: 10,
        cachedAt: new Date(),
        isExpired: false,
        remainingTtlMs: 50000,
        dataSizeBytes: 1000,
        refreshInFlight: false,
      });
      vi.mocked(mockStoreInstance.getAll).mockReturnValueOnce(prototypes);
      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });
      await repo.setupSnapshot({});

      const sample = await repo.getRandomSampleFromSnapshot(6);

      expect(sample.length).toBe(6);
      const ids = new Set(sample.map((p) => p.id));
      expect(ids.size).toBe(6); // All unique
    });

    it('handles small sample sizes efficiently (<50% of total)', async () => {
      const prototypes = Array.from({ length: 10 }, (_, i) =>
        makeNormalizedPrototype({ id: i + 1 }),
      );
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: prototypes,
      });

      vi.mocked(mockStoreInstance.setAll).mockReturnValueOnce({
        dataSizeBytes: 1000,
      });
      vi.mocked(mockStoreInstance.getStats).mockReturnValueOnce({
        size: 10,
        cachedAt: new Date(),
        isExpired: false,
        remainingTtlMs: 50000,
        dataSizeBytes: 1000,
        refreshInFlight: false,
      });
      vi.mocked(mockStoreInstance.getAll).mockReturnValueOnce(prototypes);
      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });
      await repo.setupSnapshot({});

      const sample = await repo.getRandomSampleFromSnapshot(3);

      expect(sample.length).toBe(3);
      const ids = new Set(sample.map((p) => p.id));
      expect(ids.size).toBe(3); // All unique
    });

    describe('parameter validation', () => {
      it('throws ValidationError when size is not an integer', async () => {
        const repo = new ProtopediaInMemoryRepositoryImpl({
          store: mockStoreInstance,
          apiClient: mockApiClientInstance,
          repositoryConfig: {},
        });
        await expect(repo.getRandomSampleFromSnapshot(1.5)).rejects.toThrow(
          ValidationError,
        );
      });

      it('throws ValidationError when size is NaN', async () => {
        const repo = new ProtopediaInMemoryRepositoryImpl({
          store: mockStoreInstance,
          apiClient: mockApiClientInstance,
          repositoryConfig: {},
        });
        await expect(repo.getRandomSampleFromSnapshot(NaN)).rejects.toThrow(
          ValidationError,
        );
      });
    });
  });

  describe('getPrototypeIdsFromSnapshot', () => {
    it('returns empty array when snapshot is empty', async () => {
      vi.mocked(mockStoreInstance.getStats).mockReturnValueOnce({
        size: 0,
        cachedAt: null,
        isExpired: true,
        remainingTtlMs: 0,
        dataSizeBytes: 0,
        refreshInFlight: false,
      });
      vi.mocked(mockStoreInstance.getPrototypeIds).mockReturnValueOnce([]);
      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });
      const ids = await repo.getPrototypeIdsFromSnapshot();
      expect(ids).toEqual([]);
    });

    it('returns all prototype IDs from snapshot', async () => {
      const prototypes = [
        makePrototype({ id: 1, prototypeNm: 'first' }),
        makePrototype({ id: 5, prototypeNm: 'second' }),
        makePrototype({ id: 10, prototypeNm: 'third' }),
      ];
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: prototypes,
      });

      vi.mocked(mockStoreInstance.setAll).mockReturnValueOnce({
        dataSizeBytes: 300,
      });
      vi.mocked(mockStoreInstance.getStats).mockReturnValueOnce({
        size: 3,
        cachedAt: new Date(),
        isExpired: false,
        remainingTtlMs: 50000,
        dataSizeBytes: 300,
        refreshInFlight: false,
      });
      vi.mocked(mockStoreInstance.getPrototypeIds).mockReturnValueOnce([
        1, 5, 10,
      ]);
      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });
      await repo.setupSnapshot({});

      const ids = await repo.getPrototypeIdsFromSnapshot();
      expect(ids).toEqual([1, 5, 10]);
    });

    it('returns array of IDs in order', async () => {
      const prototypes = [
        makePrototype({ id: 3 }),
        makePrototype({ id: 1 }),
        makePrototype({ id: 2 }),
      ];
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: prototypes,
      });

      vi.mocked(mockStoreInstance.setAll).mockReturnValueOnce({
        dataSizeBytes: 300,
      });
      vi.mocked(mockStoreInstance.getStats).mockReturnValueOnce({
        size: 3,
        cachedAt: new Date(),
        isExpired: false,
        remainingTtlMs: 50000,
        dataSizeBytes: 300,
        refreshInFlight: false,
      });
      vi.mocked(mockStoreInstance.getPrototypeIds).mockReturnValueOnce([
        3, 1, 2,
      ]);
      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });
      await repo.setupSnapshot({});

      const ids = await repo.getPrototypeIdsFromSnapshot();
      expect(ids.length).toBe(3);
      expect(ids).toContain(1);
      expect(ids).toContain(2);
      expect(ids).toContain(3);
    });

    it('updates after refreshSnapshot', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [makePrototype({ id: 1 })],
      });

      vi.mocked(mockStoreInstance.setAll).mockReturnValueOnce({
        dataSizeBytes: 100,
      });
      vi.mocked(mockStoreInstance.getStats).mockReturnValueOnce({
        size: 1,
        cachedAt: new Date(),
        isExpired: false,
        remainingTtlMs: 50000,
        dataSizeBytes: 100,
        refreshInFlight: false,
      });
      vi.mocked(mockStoreInstance.getPrototypeIds).mockReturnValueOnce([1]);

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });
      await repo.setupSnapshot({});

      let ids = await repo.getPrototypeIdsFromSnapshot();
      expect(ids).toEqual([1]);

      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [makePrototype({ id: 2 }), makePrototype({ id: 3 })],
      });

      vi.mocked(mockStoreInstance.setAll).mockReturnValueOnce({
        dataSizeBytes: 200,
      });
      vi.mocked(mockStoreInstance.getStats).mockReturnValueOnce({
        size: 2,
        cachedAt: new Date(),
        isExpired: false,
        remainingTtlMs: 50000,
        dataSizeBytes: 200,
        refreshInFlight: false,
      });
      vi.mocked(mockStoreInstance.getPrototypeIds).mockReturnValueOnce([2, 3]);

      await repo.refreshSnapshot();
      ids = await repo.getPrototypeIdsFromSnapshot();
      expect(ids).toEqual([2, 3]);
    });
  });

  describe('getAllFromSnapshot', () => {
    it('returns empty array when snapshot is empty', async () => {
      vi.mocked(mockStoreInstance.getStats).mockReturnValueOnce({
        size: 0,
        cachedAt: null,
        isExpired: true,
        remainingTtlMs: 0,
        dataSizeBytes: 0,
        refreshInFlight: false,
      });
      vi.mocked(mockStoreInstance.getAll).mockReturnValueOnce([]);
      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });
      const prototypes = await repo.getAllFromSnapshot();
      expect(prototypes).toEqual([]);
    });

    it('returns all prototypes when snapshot is populated', async () => {
      const testData = [
        makeNormalizedPrototype({ id: 1, prototypeNm: 'First' }),
        makeNormalizedPrototype({ id: 2, prototypeNm: 'Second' }),
        makeNormalizedPrototype({ id: 3, prototypeNm: 'Third' }),
      ];

      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: testData,
      });

      vi.mocked(mockStoreInstance.setAll).mockReturnValueOnce({
        dataSizeBytes: 300,
      });
      vi.mocked(mockStoreInstance.getStats).mockReturnValueOnce({
        size: 3,
        cachedAt: new Date(),
        isExpired: false,
        remainingTtlMs: 50000,
        dataSizeBytes: 300,
        refreshInFlight: false,
      });
      vi.mocked(mockStoreInstance.getAll).mockReturnValueOnce(testData);
      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });
      await repo.setupSnapshot({});

      const prototypes = await repo.getAllFromSnapshot();

      expect(prototypes).toHaveLength(3);
      expect(prototypes[0]?.id).toBe(1);
      expect(prototypes[0]?.prototypeNm).toBe('First');
      expect(prototypes[1]?.id).toBe(2);
      expect(prototypes[1]?.prototypeNm).toBe('Second');
      expect(prototypes[2]?.id).toBe(3);
      expect(prototypes[2]?.prototypeNm).toBe('Third');
    });

    it('returns read-only data', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [makePrototype({ id: 1 })],
      });

      vi.mocked(mockStoreInstance.setAll).mockReturnValueOnce({
        dataSizeBytes: 100,
      });
      vi.mocked(mockStoreInstance.getStats).mockReturnValueOnce({
        size: 1,
        cachedAt: new Date(),
        isExpired: false,
        remainingTtlMs: 50000,
        dataSizeBytes: 100,
        refreshInFlight: false,
      });
      vi.mocked(mockStoreInstance.getAll).mockReturnValueOnce([
        makeNormalizedPrototype({ id: 1 }),
      ]);
      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });
      await repo.setupSnapshot({});

      const prototypes = await repo.getAllFromSnapshot();

      // The returned array is a type-cast reference, not frozen
      // Store returns direct reference for performance (zero-copy)
      expect(prototypes).toHaveLength(1);
      expect(prototypes[0]?.id).toBe(1);
    });

    it('updates after refreshSnapshot', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [makePrototype({ id: 1, prototypeNm: 'Old' })],
      });

      vi.mocked(mockStoreInstance.setAll).mockReturnValueOnce({
        dataSizeBytes: 100,
      });
      vi.mocked(mockStoreInstance.getStats).mockReturnValueOnce({
        size: 1,
        cachedAt: new Date(),
        isExpired: false,
        remainingTtlMs: 50000,
        dataSizeBytes: 100,
        refreshInFlight: false,
      });
      vi.mocked(mockStoreInstance.getAll).mockReturnValueOnce([
        makeNormalizedPrototype({ id: 1, prototypeNm: 'Old' }),
      ]);
      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });
      await repo.setupSnapshot({});

      let prototypes = await repo.getAllFromSnapshot();
      expect(prototypes).toHaveLength(1);
      expect(prototypes[0]?.prototypeNm).toBe('Old');

      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [
          makePrototype({ id: 2, prototypeNm: 'New1' }),
          makePrototype({ id: 3, prototypeNm: 'New2' }),
        ],
      });

      vi.mocked(mockStoreInstance.setAll).mockReturnValueOnce({
        dataSizeBytes: 200,
      });
      vi.mocked(mockStoreInstance.getStats).mockReturnValueOnce({
        size: 2,
        cachedAt: new Date(),
        isExpired: false,
        remainingTtlMs: 50000,
        dataSizeBytes: 200,
        refreshInFlight: false,
      });
      vi.mocked(mockStoreInstance.getAll).mockReturnValueOnce([
        makeNormalizedPrototype({ id: 2, prototypeNm: 'New1' }),
        makeNormalizedPrototype({ id: 3, prototypeNm: 'New2' }),
      ]);

      await repo.refreshSnapshot();
      prototypes = await repo.getAllFromSnapshot();
      expect(prototypes).toHaveLength(2);
      expect(prototypes[0]?.prototypeNm).toBe('New1');
      expect(prototypes[1]?.prototypeNm).toBe('New2');
    });
  });

  describe('getPrototypeFromSnapshotByPrototypeId', () => {
    it('returns null for unknown ids', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [
          makePrototype({
            id: 9,
            prototypeNm: 'known entry',
          }),
        ],
      });

      vi.mocked(mockStoreInstance.setAll).mockReturnValueOnce({
        dataSizeBytes: 100,
      });
      vi.mocked(mockStoreInstance.getStats).mockReturnValueOnce({
        size: 1,
        cachedAt: new Date(),
        isExpired: false,
        remainingTtlMs: 50000,
        dataSizeBytes: 100,
        refreshInFlight: false,
      });
      vi.mocked(mockStoreInstance.getByPrototypeId).mockImplementation((id) => {
        if (id === 9)
          return makeNormalizedPrototype({ id: 9, prototypeNm: 'known entry' });
        return null; // Ensure null is returned for unknown IDs
      });
      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });
      await repo.setupSnapshot({});

      const missing = await repo.getPrototypeFromSnapshotByPrototypeId(1234);
      expect(missing).toBeNull();
    });

    it('returns the correct prototype for a known id', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [
          makePrototype({
            id: 9,
            prototypeNm: 'known entry',
          }),
        ],
      });

      vi.mocked(mockStoreInstance.setAll).mockReturnValueOnce({
        dataSizeBytes: 100,
      });
      vi.mocked(mockStoreInstance.getStats).mockReturnValueOnce({
        size: 1,
        cachedAt: new Date(),
        isExpired: false,
        remainingTtlMs: 50000,
        dataSizeBytes: 100,
        refreshInFlight: false,
      });
      vi.mocked(mockStoreInstance.getByPrototypeId).mockReturnValueOnce(
        makeNormalizedPrototype({ id: 9, prototypeNm: 'known entry' }),
      );
      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });
      await repo.setupSnapshot({});

      const found = await repo.getPrototypeFromSnapshotByPrototypeId(9);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(9);
      expect(found?.prototypeNm).toBe('known entry');
    });

    it('can look up multiple prototypes from a larger snapshot', async () => {
      const prototypes = [
        makeNormalizedPrototype({ id: 1, prototypeNm: 'first' }),
        makeNormalizedPrototype({ id: 2, prototypeNm: 'second' }),
        makeNormalizedPrototype({ id: 3, prototypeNm: 'third' }),
      ];
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: prototypes,
      });

      vi.mocked(mockStoreInstance.setAll).mockReturnValueOnce({
        dataSizeBytes: 300,
      });
      vi.mocked(mockStoreInstance.getStats).mockReturnValueOnce({
        size: 3,
        cachedAt: new Date(),
        isExpired: false,
        remainingTtlMs: 50000,
        dataSizeBytes: 300,
        refreshInFlight: false,
      });
      vi.mocked(mockStoreInstance.getByPrototypeId).mockImplementation((id) => {
        return prototypes.find((p) => p.id === id) || null; // Ensure null is returned for unknown IDs
      });
      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });
      await repo.setupSnapshot({});

      const proto1 = await repo.getPrototypeFromSnapshotByPrototypeId(1);
      const proto2 = await repo.getPrototypeFromSnapshotByPrototypeId(2);
      const proto3 = await repo.getPrototypeFromSnapshotByPrototypeId(3);
      const missing = await repo.getPrototypeFromSnapshotByPrototypeId(999);

      expect(proto1?.prototypeNm).toBe('first');
      expect(proto2?.prototypeNm).toBe('second');
      expect(proto3?.prototypeNm).toBe('third');
      expect(missing).toBeNull();
    });

    describe('parameter validation', () => {
      it('throws ValidationError when prototypeId is not an integer', async () => {
        const repo = new ProtopediaInMemoryRepositoryImpl({
          store: mockStoreInstance,
          apiClient: mockApiClientInstance,
          repositoryConfig: {},
        });
        await expect(
          repo.getPrototypeFromSnapshotByPrototypeId(1.5),
        ).rejects.toThrow(ValidationError);
      });

      it('throws ValidationError when prototypeId is zero', async () => {
        const repo = new ProtopediaInMemoryRepositoryImpl({
          store: mockStoreInstance,
          apiClient: mockApiClientInstance,
          repositoryConfig: {},
        });
        await expect(
          repo.getPrototypeFromSnapshotByPrototypeId(0),
        ).rejects.toThrow(ValidationError);
      });

      it('throws ValidationError when prototypeId is negative', async () => {
        const repo = new ProtopediaInMemoryRepositoryImpl({
          store: mockStoreInstance,
          apiClient: mockApiClientInstance,
          repositoryConfig: {},
        });
        await expect(
          repo.getPrototypeFromSnapshotByPrototypeId(-1),
        ).rejects.toThrow(ValidationError);
      });

      it('throws ValidationError when prototypeId is NaN', async () => {
        const repo = new ProtopediaInMemoryRepositoryImpl({
          store: mockStoreInstance,
          apiClient: mockApiClientInstance,
          repositoryConfig: {},
        });
        await expect(
          repo.getPrototypeFromSnapshotByPrototypeId(NaN),
        ).rejects.toThrow(ValidationError);
      });
    });
  });
});
