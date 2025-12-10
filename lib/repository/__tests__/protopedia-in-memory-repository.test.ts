import type { ResultOfListPrototypesApiResponse } from 'protopedia-api-v2-client';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { createProtopediaApiCustomClient } from '../../fetcher/index.js';
import { createProtopediaInMemoryRepositoryImpl } from '../protopedia-in-memory-repository.js';

vi.mock('../../fetcher/index', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../fetcher/index.js')>();
  return {
    ...actual,
    createProtopediaApiCustomClient: vi.fn(),
  };
});

// Helper to build minimal-but-valid upstream prototypes
const makePrototype = (
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

describe('createInMemoryRepositoryImpl', () => {
  const listPrototypesMock = vi.fn();
  const fetchPrototypesMock = vi.fn();

  beforeEach(() => {
    listPrototypesMock.mockReset();
    fetchPrototypesMock.mockReset();

    (
      createProtopediaApiCustomClient as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue({
      listPrototypes: listPrototypesMock,
      fetchPrototypes: fetchPrototypesMock,
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

      const repo = createProtopediaInMemoryRepositoryImpl(
        { ttlMs: 60_000 },
        {},
      );

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

      const repo = createProtopediaInMemoryRepositoryImpl({}, {});

      await repo.setupSnapshot({ offset: 7, limit: 25 });

      expect(fetchPrototypesMock).toHaveBeenCalledWith({
        offset: 7,
        limit: 25,
      });

      const found = await repo.getPrototypeFromSnapshotByPrototypeId(100);
      expect(found?.prototypeNm).toBe('override test');
    });

    it('throws a normalized error message when fetchPrototypes returns ok: false', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        errorCode: 'INTERNAL_ERROR',
        errorDetails: 'Upstream failure',
        errorMessage: 'Internal server error',
      });

      const repo = createProtopediaInMemoryRepositoryImpl(
        { ttlMs: 60_000 },
        {},
      );

      await expect(repo.setupSnapshot({})).rejects.toThrow(
        'Unknown error occurred. (500)',
      );

      const stats = repo.getStats();
      expect(stats.size).toBe(0);
    });

    it('applies default limit when only offset is provided', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [makePrototype({ id: 50 })],
      });

      const repo = createProtopediaInMemoryRepositoryImpl({}, {});
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

      const repo = createProtopediaInMemoryRepositoryImpl({}, {});
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

      const repo = createProtopediaInMemoryRepositoryImpl({}, {});
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

      const repo = createProtopediaInMemoryRepositoryImpl(
        { ttlMs: 60_000 },
        {},
      );

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

      const repo = createProtopediaInMemoryRepositoryImpl({}, {});

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

      const repo = createProtopediaInMemoryRepositoryImpl(
        { ttlMs: 60_000 },
        {},
      );

      await repo.setupSnapshot({});

      const beforeStats = repo.getStats();
      expect(beforeStats.size).toBe(1);

      await expect(repo.refreshSnapshot()).rejects.toThrow('network failure');

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

      const repo = createProtopediaInMemoryRepositoryImpl({}, {});

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

  describe('getRandomPrototypeFromSnapshot', () => {
    it('returns undefined when the store is empty', async () => {
      const repo = createProtopediaInMemoryRepositoryImpl({}, {});

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

      const repo = createProtopediaInMemoryRepositoryImpl({}, {});
      await repo.setupSnapshot({});

      const random = await repo.getRandomPrototypeFromSnapshot();
      expect(random).not.toBeNull();
      expect(random?.id).toBe(42);
    });

    it('returns one of the available prototypes when multiple exist', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [
          makePrototype({ id: 1, prototypeNm: 'alpha' }),
          makePrototype({ id: 2, prototypeNm: 'beta' }),
          makePrototype({ id: 3, prototypeNm: 'gamma' }),
        ],
      });

      const repo = createProtopediaInMemoryRepositoryImpl({}, {});
      await repo.setupSnapshot({});

      const random = await repo.getRandomPrototypeFromSnapshot();
      expect(random).not.toBeNull();
      expect([1, 2, 3]).toContain(random?.id);
      expect(['alpha', 'beta', 'gamma']).toContain(random?.prototypeNm);
    });
  });

  describe('getRandomSampleFromSnapshot', () => {
    it('returns empty array when the store is empty', async () => {
      const repo = createProtopediaInMemoryRepositoryImpl({}, {});

      const sample = await repo.getRandomSampleFromSnapshot(5);
      expect(sample).toEqual([]);
    });

    it('returns empty array when size is 0', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [makePrototype({ id: 1 }), makePrototype({ id: 2 })],
      });

      const repo = createProtopediaInMemoryRepositoryImpl({}, {});
      await repo.setupSnapshot({});

      const sample = await repo.getRandomSampleFromSnapshot(0);
      expect(sample).toEqual([]);
    });

    it('returns empty array when size is negative', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [makePrototype({ id: 1 }), makePrototype({ id: 2 })],
      });

      const repo = createProtopediaInMemoryRepositoryImpl({}, {});
      await repo.setupSnapshot({});

      const sample = await repo.getRandomSampleFromSnapshot(-5);
      expect(sample).toEqual([]);
    });

    it('returns requested number of samples when enough data exists', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [
          makePrototype({ id: 1 }),
          makePrototype({ id: 2 }),
          makePrototype({ id: 3 }),
          makePrototype({ id: 4 }),
          makePrototype({ id: 5 }),
        ],
      });

      const repo = createProtopediaInMemoryRepositoryImpl({}, {});
      await repo.setupSnapshot({});

      const sample = await repo.getRandomSampleFromSnapshot(3);
      expect(sample.length).toBe(3);
    });

    it('returns all data when size exceeds available prototypes', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [makePrototype({ id: 1 }), makePrototype({ id: 2 })],
      });

      const repo = createProtopediaInMemoryRepositoryImpl({}, {});
      await repo.setupSnapshot({});

      const sample = await repo.getRandomSampleFromSnapshot(10);
      expect(sample.length).toBe(2);
    });

    it('returns unique samples without duplicates', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [
          makePrototype({ id: 1 }),
          makePrototype({ id: 2 }),
          makePrototype({ id: 3 }),
          makePrototype({ id: 4 }),
          makePrototype({ id: 5 }),
        ],
      });

      const repo = createProtopediaInMemoryRepositoryImpl({}, {});
      await repo.setupSnapshot({});

      const sample = await repo.getRandomSampleFromSnapshot(5);
      const ids = sample.map((p) => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(5);
    });

    it('eventually samples all prototypes over multiple calls', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [
          makePrototype({ id: 1 }),
          makePrototype({ id: 2 }),
          makePrototype({ id: 3 }),
        ],
      });

      const repo = createProtopediaInMemoryRepositoryImpl({}, {});
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
  });

  describe('getPrototypeFromSnapshotById', () => {
    it('returns undefined for unknown ids', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [
          makePrototype({
            id: 9,
            prototypeNm: 'known entry',
          }),
        ],
      });

      const repo = createProtopediaInMemoryRepositoryImpl({}, {});
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

      const repo = createProtopediaInMemoryRepositoryImpl({}, {});
      await repo.setupSnapshot({});

      const found = await repo.getPrototypeFromSnapshotByPrototypeId(9);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(9);
      expect(found?.prototypeNm).toBe('known entry');
    });

    it('can look up multiple prototypes from a larger snapshot', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [
          makePrototype({ id: 1, prototypeNm: 'first' }),
          makePrototype({ id: 2, prototypeNm: 'second' }),
          makePrototype({ id: 3, prototypeNm: 'third' }),
        ],
      });

      const repo = createProtopediaInMemoryRepositoryImpl({}, {});
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
  });

  describe('getStats', () => {
    it('returns null cachedAt and size 0 before any snapshot is created', () => {
      const repo = createProtopediaInMemoryRepositoryImpl({}, {});

      const stats = repo.getStats();
      expect(stats.cachedAt).toBeNull();
      expect(stats.size).toBe(0);
    });

    it('returns cachedAt as a number after a successful fetch', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [
          makePrototype({
            id: 11,
          }),
        ],
      });

      const repo = createProtopediaInMemoryRepositoryImpl({}, {});
      await repo.setupSnapshot({});

      const stats = repo.getStats();
      expect(stats.cachedAt).toBeInstanceOf(Date);
      expect(stats.cachedAt).not.toBeNull();
      expect(stats.size).toBe(1);
    });

    it('reflects the correct size for multiple prototypes', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [
          makePrototype({ id: 1 }),
          makePrototype({ id: 2 }),
          makePrototype({ id: 3 }),
          makePrototype({ id: 4 }),
          makePrototype({ id: 5 }),
        ],
      });

      const repo = createProtopediaInMemoryRepositoryImpl({}, {});
      await repo.setupSnapshot({});

      const stats = repo.getStats();
      expect(stats.size).toBe(5);
    });

    it('updates cachedAt after refresh', async () => {
      fetchPrototypesMock
        .mockResolvedValueOnce({
          ok: true,
          data: [makePrototype({ id: 1 })],
        })
        .mockResolvedValueOnce({
          ok: true,
          data: [makePrototype({ id: 2 })],
        });

      const repo = createProtopediaInMemoryRepositoryImpl({}, {});
      await repo.setupSnapshot({});

      const stats1 = repo.getStats();
      const firstCachedAt = stats1.cachedAt;

      // Small delay to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      await repo.refreshSnapshot();

      const stats2 = repo.getStats();
      const secondCachedAt = stats2.cachedAt;

      expect(firstCachedAt).not.toBeNull();
      expect(secondCachedAt).not.toBeNull();
      expect(secondCachedAt!.getTime()).toBeGreaterThan(
        firstCachedAt!.getTime(),
      );
    });

    it('reports isExpired as false immediately after setup with short TTL', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [makePrototype({ id: 1 })],
      });

      const repo = createProtopediaInMemoryRepositoryImpl({ ttlMs: 1000 }, {});
      await repo.setupSnapshot({});

      const stats = repo.getStats();
      expect(stats.isExpired).toBe(false);
    });

    it('returns consistent stats when called multiple times', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [makePrototype({ id: 1 }), makePrototype({ id: 2 })],
      });

      const repo = createProtopediaInMemoryRepositoryImpl({}, {});
      await repo.setupSnapshot({});

      const stats1 = repo.getStats();
      const stats2 = repo.getStats();
      const stats3 = repo.getStats();

      expect(stats1.size).toBe(stats2.size);
      expect(stats2.size).toBe(stats3.size);
      expect(stats1.cachedAt).toBe(stats2.cachedAt);
      expect(stats2.cachedAt).toBe(stats3.cachedAt);
    });
  });

  describe('error handling', () => {
    it('throws error with 404 status code details', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        errorCode: 'NOT_FOUND',
        errorDetails: 'Resource not found',
        errorMessage: 'Not found',
      });

      const repo = createProtopediaInMemoryRepositoryImpl({}, {});

      await expect(repo.setupSnapshot({})).rejects.toThrow(
        'Unknown error occurred. (404)',
      );
    });

    it('throws error with 401 status code details', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        errorCode: 'UNAUTHORIZED',
        errorDetails: 'Invalid credentials',
        errorMessage: 'Unauthorized',
      });

      const repo = createProtopediaInMemoryRepositoryImpl({}, {});

      await expect(repo.setupSnapshot({})).rejects.toThrow(
        'Unknown error occurred. (401)',
      );
    });

    it('handles network exceptions during setupSnapshot', async () => {
      fetchPrototypesMock.mockRejectedValueOnce(
        new Error('ECONNREFUSED: Connection refused'),
      );

      const repo = createProtopediaInMemoryRepositoryImpl({}, {});

      await expect(repo.setupSnapshot({})).rejects.toThrow(
        'ECONNREFUSED: Connection refused',
      );
    });

    it('allows successful setup after a failed attempt', async () => {
      fetchPrototypesMock
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce({
          ok: true,
          data: [makePrototype({ id: 1, prototypeNm: 'success' })],
        });

      const repo = createProtopediaInMemoryRepositoryImpl({}, {});

      await expect(repo.setupSnapshot({})).rejects.toThrow(
        'First attempt failed',
      );

      let stats = repo.getStats();
      expect(stats.size).toBe(0);

      await repo.setupSnapshot({});

      stats = repo.getStats();
      expect(stats.size).toBe(1);

      const proto = await repo.getPrototypeFromSnapshotByPrototypeId(1);
      expect(proto?.prototypeNm).toBe('success');
    });

    it('recovers from refresh failure and allows subsequent successful refresh', async () => {
      fetchPrototypesMock
        .mockResolvedValueOnce({
          ok: true,
          data: [makePrototype({ id: 1, prototypeNm: 'initial' })],
        })
        .mockRejectedValueOnce(new Error('Temporary network issue'))
        .mockResolvedValueOnce({
          ok: true,
          data: [makePrototype({ id: 2, prototypeNm: 'recovered' })],
        });

      const repo = createProtopediaInMemoryRepositoryImpl({}, {});
      await repo.setupSnapshot({});

      await expect(repo.refreshSnapshot()).rejects.toThrow(
        'Temporary network issue',
      );

      const oldProto = await repo.getPrototypeFromSnapshotByPrototypeId(1);
      expect(oldProto?.prototypeNm).toBe('initial');

      await repo.refreshSnapshot();

      const newProto = await repo.getPrototypeFromSnapshotByPrototypeId(2);
      expect(newProto?.prototypeNm).toBe('recovered');
    });
  });

  describe('snapshot replacement', () => {
    it('completely replaces snapshot when setupSnapshot is called again', async () => {
      fetchPrototypesMock
        .mockResolvedValueOnce({
          ok: true,
          data: [
            makePrototype({ id: 1, prototypeNm: 'old' }),
            makePrototype({ id: 2, prototypeNm: 'old' }),
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
          data: [makePrototype({ id: 3, prototypeNm: 'new' })],
        });

      const repo = createProtopediaInMemoryRepositoryImpl({}, {});
      await repo.setupSnapshot({});

      let stats = repo.getStats();
      expect(stats.size).toBe(2);

      await repo.setupSnapshot({ offset: 10 });

      stats = repo.getStats();
      expect(stats.size).toBe(1);

      const old1 = await repo.getPrototypeFromSnapshotByPrototypeId(1);
      const old2 = await repo.getPrototypeFromSnapshotByPrototypeId(2);
      const newProto = await repo.getPrototypeFromSnapshotByPrototypeId(3);

      expect(old1).toBeNull();
      expect(old2).toBeNull();
      expect(newProto?.prototypeNm).toBe('new');
    });
  });

  describe('store configuration', () => {
    it('creates repository with custom TTL configuration', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [makePrototype({ id: 1 })],
      });

      const repo = createProtopediaInMemoryRepositoryImpl(
        { ttlMs: 120_000 },
        {},
      );
      await repo.setupSnapshot({});

      const stats = repo.getStats();
      expect(stats.size).toBe(1);
      expect(stats.cachedAt).not.toBeNull();
    });

    it('works with minimal store config', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [makePrototype({ id: 1 })],
      });

      const repo = createProtopediaInMemoryRepositoryImpl({}, {});
      await repo.setupSnapshot({});

      const stats = repo.getStats();
      expect(stats.size).toBe(1);
    });
  });

  describe('API client configuration', () => {
    it('forwards API client options to the custom client', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [makePrototype({ id: 1 })],
      });

      const apiOptions = {
        token: 'test-token',
        baseUrl: 'https://test.example.com',
        logLevel: 'debug' as const,
      };

      const repo = createProtopediaInMemoryRepositoryImpl({}, apiOptions);
      await repo.setupSnapshot({});

      expect(
        createProtopediaApiCustomClient as unknown as ReturnType<typeof vi.fn>,
      ).toHaveBeenCalledWith(apiOptions);
    });

    it('works without API client options', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [makePrototype({ id: 1 })],
      });

      const repo = createProtopediaInMemoryRepositoryImpl({});
      await repo.setupSnapshot({});

      const stats = repo.getStats();
      expect(stats.size).toBe(1);
    });
  });

  describe('fetch parameters', () => {
    it('supports prototypeId parameter in setupSnapshot', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [makePrototype({ id: 999, prototypeNm: 'specific' })],
      });

      const repo = createProtopediaInMemoryRepositoryImpl({}, {});
      await repo.setupSnapshot({ prototypeId: 999 });

      expect(fetchPrototypesMock).toHaveBeenCalledWith({
        offset: 0,
        limit: 10,
        prototypeId: 999,
      });

      const proto = await repo.getPrototypeFromSnapshotByPrototypeId(999);
      expect(proto?.prototypeNm).toBe('specific');
    });

    it('remembers prototypeId in subsequent refreshes', async () => {
      fetchPrototypesMock
        .mockResolvedValueOnce({
          ok: true,
          data: [makePrototype({ id: 888, prototypeNm: 'first' })],
        })
        .mockResolvedValueOnce({
          ok: true,
          data: [makePrototype({ id: 888, prototypeNm: 'refreshed' })],
        });

      const repo = createProtopediaInMemoryRepositoryImpl({}, {});
      await repo.setupSnapshot({ prototypeId: 888, offset: 5, limit: 20 });

      expect(fetchPrototypesMock).toHaveBeenNthCalledWith(1, {
        offset: 5,
        limit: 20,
        prototypeId: 888,
      });

      await repo.refreshSnapshot();

      expect(fetchPrototypesMock).toHaveBeenNthCalledWith(2, {
        offset: 5,
        limit: 20,
        prototypeId: 888,
      });
    });

    it('handles all parameter combinations', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [makePrototype({ id: 1 })],
      });

      const repo = createProtopediaInMemoryRepositoryImpl({}, {});
      await repo.setupSnapshot({
        offset: 15,
        limit: 25,
        prototypeId: 777,
      });

      expect(fetchPrototypesMock).toHaveBeenCalledWith({
        offset: 15,
        limit: 25,
        prototypeId: 777,
      });
    });
  });

  describe('data normalization', () => {
    it('stores and retrieves normalized prototype data correctly', async () => {
      const rawPrototype = makePrototype({
        id: 12345,
        prototypeNm: 'Test Prototype',
        teamNm: 'Test Team',
        users: 'user1|user2|user3',
        mainUrl: 'https://example.com/proto',
        viewCount: 100,
        goodCount: 50,
      });

      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [rawPrototype],
      });

      const repo = createProtopediaInMemoryRepositoryImpl({}, {});
      await repo.setupSnapshot({});

      const stored = await repo.getPrototypeFromSnapshotByPrototypeId(12345);

      expect(stored).not.toBeNull();
      expect(stored?.id).toBe(12345);
      expect(stored?.prototypeNm).toBe('Test Prototype');
      expect(stored?.teamNm).toBe('Test Team');
      expect(stored?.mainUrl).toBe('https://example.com/proto');
    });

    it('handles prototypes with minimal data', async () => {
      const minimalPrototype = makePrototype({
        id: 1,
        prototypeNm: '',
        teamNm: '',
        users: '',
        mainUrl: '',
      });

      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [minimalPrototype],
      });

      const repo = createProtopediaInMemoryRepositoryImpl({}, {});
      await repo.setupSnapshot({});

      const stored = await repo.getPrototypeFromSnapshotByPrototypeId(1);
      expect(stored).not.toBeNull();
      expect(stored?.id).toBe(1);
    });
  });

  describe('boundary values', () => {
    it('handles limit of 1', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [makePrototype({ id: 1 })],
      });

      const repo = createProtopediaInMemoryRepositoryImpl({}, {});
      await repo.setupSnapshot({ limit: 1 });

      expect(fetchPrototypesMock).toHaveBeenCalledWith({
        offset: 0,
        limit: 1,
      });

      const stats = repo.getStats();
      expect(stats.size).toBe(1);
    });

    it('handles offset of 0 explicitly', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [makePrototype({ id: 1 })],
      });

      const repo = createProtopediaInMemoryRepositoryImpl({}, {});
      await repo.setupSnapshot({ offset: 0, limit: 5 });

      expect(fetchPrototypesMock).toHaveBeenCalledWith({
        offset: 0,
        limit: 5,
      });
    });

    it('handles large offset values', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [makePrototype({ id: 99999 })],
      });

      const repo = createProtopediaInMemoryRepositoryImpl({}, {});
      await repo.setupSnapshot({ offset: 10000, limit: 100 });

      expect(fetchPrototypesMock).toHaveBeenCalledWith({
        offset: 10000,
        limit: 100,
      });
    });

    it('handles large limit values', async () => {
      const largeDataset = Array.from({ length: 100 }, (_, i) =>
        makePrototype({ id: i + 1, prototypeNm: `proto-${i + 1}` }),
      );

      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: largeDataset,
      });

      const repo = createProtopediaInMemoryRepositoryImpl({}, {});
      await repo.setupSnapshot({ limit: 100 });

      const stats = repo.getStats();
      expect(stats.size).toBe(100);

      const first = await repo.getPrototypeFromSnapshotByPrototypeId(1);
      const last = await repo.getPrototypeFromSnapshotByPrototypeId(100);

      expect(first?.prototypeNm).toBe('proto-1');
      expect(last?.prototypeNm).toBe('proto-100');
    });
  });

  describe('sequential operations', () => {
    it('handles rapid successive reads after setup', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [
          makePrototype({ id: 1, prototypeNm: 'one' }),
          makePrototype({ id: 2, prototypeNm: 'two' }),
        ],
      });

      const repo = createProtopediaInMemoryRepositoryImpl({}, {});
      await repo.setupSnapshot({});

      const results = await Promise.all([
        repo.getPrototypeFromSnapshotByPrototypeId(1),
        repo.getPrototypeFromSnapshotByPrototypeId(2),
        repo.getRandomPrototypeFromSnapshot(),
        Promise.resolve(repo.getStats()),
      ]);

      expect(results[0]?.prototypeNm).toBe('one');
      expect(results[1]?.prototypeNm).toBe('two');
      expect(results[2]).not.toBeNull();
      expect(results[3].size).toBe(2);
    });

    it('maintains consistency across alternating setup and read operations', async () => {
      fetchPrototypesMock
        .mockResolvedValueOnce({
          ok: true,
          data: [makePrototype({ id: 1, prototypeNm: 'first' })],
        })
        .mockResolvedValueOnce({
          ok: true,
          data: [makePrototype({ id: 2, prototypeNm: 'second' })],
        });

      const repo = createProtopediaInMemoryRepositoryImpl({}, {});

      await repo.setupSnapshot({ offset: 0 });
      let proto = await repo.getPrototypeFromSnapshotByPrototypeId(1);
      expect(proto?.prototypeNm).toBe('first');

      await repo.setupSnapshot({ offset: 10 });
      proto = await repo.getPrototypeFromSnapshotByPrototypeId(2);
      expect(proto?.prototypeNm).toBe('second');

      const missingOld = await repo.getPrototypeFromSnapshotByPrototypeId(1);
      expect(missingOld).toBeNull();
    });
  });

  describe('getStats edge cases', () => {
    it('returns null for cachedAt when snapshot not yet set up', () => {
      const repo = createProtopediaInMemoryRepositoryImpl({}, {});
      const stats = repo.getStats();

      expect(stats.cachedAt).toBeNull();
      expect(stats.size).toBe(0);
      expect(stats.isExpired).toBe(true); // No data cached = expired
    });
  });
});
