/**
 * @file Tests for concurrency control in ProtopediaInMemoryRepository.
 *
 * Verifies that concurrent calls to setupSnapshot and refreshSnapshot are
 * properly coalesced to prevent duplicate API requests and race conditions.
 */
import type { ProtoPediaApiClientOptions } from 'protopedia-api-v2-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProtopediaApiCustomClient } from '../../../../fetcher/index.js';
import {
  PrototypeInMemoryStore,
  type PrototypeInMemoryStoreConfig,
} from '../../../../store/index.js';
import { ProtopediaInMemoryRepositoryImpl } from '../../../protopedia-in-memory-repository.js';
import { createMockStore, makePrototype } from '../test-helpers.js';

vi.mock('../../../../fetcher/index', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../../fetcher/index.js')>();
  return {
    ...actual,
    ProtopediaApiCustomClient: vi.fn(),
  };
});

vi.mock('../../../../store/index', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../../store/index.js')>();
  return {
    ...actual,
    PrototypeInMemoryStore: vi.fn(),
  };
});

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

const createDeferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

describe('ProtopediaInMemoryRepositoryImpl - concurrency (coalescing)', () => {
  const createRepo = (fetchPrototypes: (params: any) => any) => {
    const store = createMockStore({ ttlMs: 30_000 });
    const apiClient = { fetchPrototypes };

    const logger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    return new ProtopediaInMemoryRepositoryImpl({
      store: store as any,
      apiClient: apiClient as any,
      repositoryConfig: { logger: logger as any },
    });
  };

  describe('basic coalescing behavior', () => {
    it('coalesces concurrent setupSnapshot calls into 1 request', async () => {
      const deferred = createDeferred<any>();
      const fetchPrototypesMock = vi
        .fn()
        .mockImplementation(() => deferred.promise);

      const repo = createRepo(fetchPrototypesMock);

      const pending = Promise.all([
        repo.setupSnapshot({} as any),
        repo.setupSnapshot({} as any),
        repo.setupSnapshot({} as any),
      ]);

      await Promise.resolve();
      expect(fetchPrototypesMock).toHaveBeenCalledTimes(1);

      deferred.resolve({
        ok: true,
        data: [makePrototype({ id: 1, prototypeNm: 'p1' })],
      });

      const [r1, r2, r3] = await pending;
      expect(r1).toEqual(r2);
      expect(r2).toEqual(r3);
    });

    it('coalesces setupSnapshot even with different params', async () => {
      const deferred = createDeferred<any>();
      const fetchPrototypesMock = vi
        .fn()
        .mockImplementation(() => deferred.promise);
      const repo = createRepo(fetchPrototypesMock);

      const pending = Promise.all([
        repo.setupSnapshot({ offset: 0, limit: 10 } as any),
        repo.setupSnapshot({ offset: 0, limit: 100 } as any),
      ]);

      await Promise.resolve();
      expect(fetchPrototypesMock).toHaveBeenCalledTimes(1);

      deferred.resolve({
        ok: true,
        data: [makePrototype({ id: 1, prototypeNm: 'p1' })],
      });

      const [r1, r2] = await pending;
      expect(r1).toEqual(r2);
    });

    it('coalesces concurrent refreshSnapshot calls into 1 request', async () => {
      const fetchPrototypesMock = vi.fn().mockResolvedValueOnce({
        ok: true,
        data: [makePrototype({ id: 1, prototypeNm: 'initial' })],
      });

      const repo = createRepo(fetchPrototypesMock);
      await repo.setupSnapshot({ offset: 0, limit: 10 } as any);
      fetchPrototypesMock.mockClear();

      const deferred = createDeferred<any>();
      fetchPrototypesMock.mockImplementation(() => deferred.promise);

      const pending = Promise.all([
        repo.refreshSnapshot(),
        repo.refreshSnapshot(),
        repo.refreshSnapshot(),
      ]);

      await Promise.resolve();
      expect(fetchPrototypesMock).toHaveBeenCalledTimes(1);

      deferred.resolve({
        ok: true,
        data: [makePrototype({ id: 2, prototypeNm: 'refreshed' })],
      });

      const [r1, r2, r3] = await pending;
      expect(r1).toEqual(r2);
      expect(r2).toEqual(r3);
    });

    it('coalesces setupSnapshot and refreshSnapshot when overlapping', async () => {
      const deferred = createDeferred<any>();
      const fetchPrototypesMock = vi
        .fn()
        .mockImplementation(() => deferred.promise);
      const repo = createRepo(fetchPrototypesMock);

      const pending = Promise.all([
        repo.setupSnapshot({ offset: 0, limit: 10 } as any),
        repo.refreshSnapshot(),
      ]);

      await Promise.resolve();
      expect(fetchPrototypesMock).toHaveBeenCalledTimes(1);

      deferred.resolve({
        ok: true,
        data: [makePrototype({ id: 1, prototypeNm: 'p1' })],
      });

      const [r1, r2] = await pending;
      expect(r1).toEqual(r2);
    });

    it('coalesces requests with empty data response', async () => {
      const fetchPrototypesMock = vi.fn().mockResolvedValueOnce({
        ok: true,
        data: [],
      });

      const repo = createRepo(fetchPrototypesMock);

      const [r1, r2, r3] = await Promise.all([
        repo.setupSnapshot({} as any),
        repo.setupSnapshot({} as any),
        repo.setupSnapshot({} as any),
      ]);

      expect(fetchPrototypesMock).toHaveBeenCalledTimes(1);
      expect(r1.ok).toBe(true);
      expect(r1).toBe(r2);
      expect(r2).toBe(r3);

      const stats = repo.getStats();
      expect(stats.size).toBe(0);
    });

    it('returns same result object reference for all coalesced calls', async () => {
      const fetchPrototypesMock = vi.fn().mockResolvedValueOnce({
        ok: true,
        data: [makePrototype({ id: 1, prototypeNm: 'shared' })],
      });

      const repo = createRepo(fetchPrototypesMock);

      const [r1, r2, r3] = await Promise.all([
        repo.setupSnapshot({} as any),
        repo.setupSnapshot({} as any),
        repo.setupSnapshot({} as any),
      ]);

      expect(r1).toBe(r2);
      expect(r2).toBe(r3);
    });

    it('coalesces exactly 2 concurrent requests correctly', async () => {
      const deferred = createDeferred<any>();
      const fetchPrototypesMock = vi
        .fn()
        .mockImplementation(() => deferred.promise);
      const repo = createRepo(fetchPrototypesMock);

      const pending = Promise.all([
        repo.setupSnapshot({} as any),
        repo.setupSnapshot({} as any),
      ]);

      await Promise.resolve();
      expect(fetchPrototypesMock).toHaveBeenCalledTimes(1);

      deferred.resolve({
        ok: true,
        data: [makePrototype({ id: 1, prototypeNm: 'two-requests' })],
      });

      const [r1, r2] = await pending;
      expect(r1).toBe(r2);
      expect(r1.ok).toBe(true);
    });
  });

  describe('error handling', () => {
    it('propagates errors to all concurrent requests when fetch fails', async () => {
      const deferred = createDeferred<any>();
      const fetchPrototypesMock = vi
        .fn()
        .mockImplementation(() => deferred.promise);
      const repo = createRepo(fetchPrototypesMock);

      const pending = Promise.all([
        repo.setupSnapshot({} as any),
        repo.setupSnapshot({} as any),
        repo.setupSnapshot({} as any),
      ]);

      await Promise.resolve();
      expect(fetchPrototypesMock).toHaveBeenCalledTimes(1);

      deferred.reject(new Error('Network failure'));

      const [r1, r2, r3] = await pending;
      expect(r1.ok).toBe(false);
      expect(r2.ok).toBe(false);
      expect(r3.ok).toBe(false);
      if (!r1.ok && !r2.ok && !r3.ok) {
        expect(r1.message).toBe('Network failure');
        expect(r2.message).toBe('Network failure');
        expect(r3.message).toBe('Network failure');
      }
    });

    it('handles ok: false API responses correctly for concurrent requests', async () => {
      const deferred = createDeferred<any>();
      const fetchPrototypesMock = vi
        .fn()
        .mockImplementation(() => deferred.promise);
      const repo = createRepo(fetchPrototypesMock);

      const pending = Promise.all([
        repo.setupSnapshot({} as any),
        repo.setupSnapshot({} as any),
        repo.setupSnapshot({} as any),
      ]);

      await Promise.resolve();
      expect(fetchPrototypesMock).toHaveBeenCalledTimes(1);

      deferred.resolve({
        ok: false,
        kind: 'http',
        code: 'FETCH_HTTP_ERROR_503',
        error: 'Service unavailable',
        status: 503,
        details: {
          url: 'https://protopedia.example.com/api/prototypes',
          method: 'GET',
          requestHeaders: {},
        },
      });

      const [r1, r2, r3] = await pending;
      expect(r1.ok).toBe(false);
      expect(r2.ok).toBe(false);
      expect(r3.ok).toBe(false);
      if (!r1.ok && !r2.ok && !r3.ok) {
        if (r1.origin === 'fetcher') {
          expect(r1.status).toBe(503);
        }
        expect(r2.message).toBe('Service unavailable');
        if (r3.origin === 'fetcher') {
          expect(r3.code).toBe('FETCH_HTTP_ERROR_503');
        }
      }
    });

    it('preserves store state when concurrent requests fail', async () => {
      const fetchPrototypesMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          data: [makePrototype({ id: 1, prototypeNm: 'initial' })],
        })
        .mockRejectedValueOnce(new Error('Network failure'));

      const repo = createRepo(fetchPrototypesMock);

      await repo.setupSnapshot({} as any);
      const initialStats = repo.getStats();
      expect(initialStats.size).toBe(1);

      const results = await Promise.all([
        repo.refreshSnapshot(),
        repo.refreshSnapshot(),
        repo.refreshSnapshot(),
      ]);

      expect(results.every((r) => r.ok === false)).toBe(true);

      const finalStats = repo.getStats();
      expect(finalStats.size).toBe(1);

      const proto = await repo.getPrototypeFromSnapshotByPrototypeId(1);
      expect(proto?.prototypeNm).toBe('initial');
    });

    it('handles different error types consistently across concurrent requests', async () => {
      const deferred = createDeferred<any>();
      const fetchPrototypesMock = vi
        .fn()
        .mockImplementation(() => deferred.promise);
      const repo = createRepo(fetchPrototypesMock);

      const pending = Promise.all([
        repo.setupSnapshot({} as any),
        repo.setupSnapshot({} as any),
        repo.setupSnapshot({} as any),
      ]);

      await Promise.resolve();

      deferred.reject(new TypeError('Invalid response format'));

      const results = await pending;
      expect(results.every((r) => r.ok === false)).toBe(true);
      if (!results[0].ok && !results[1].ok && !results[2].ok) {
        expect(results[0].message).toBe('Invalid response format');
        expect(results[1].message).toBe('Invalid response format');
        expect(results[2].message).toBe('Invalid response format');
      }
    });
  });

  describe('sequential vs concurrent operations', () => {
    it('allows new requests after coalesced operation completes', async () => {
      const fetchPrototypesMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          data: [makePrototype({ id: 1, prototypeNm: 'batch1' })],
        })
        .mockResolvedValueOnce({
          ok: true,
          data: [makePrototype({ id: 2, prototypeNm: 'batch2' })],
        });

      const repo = createRepo(fetchPrototypesMock);

      await Promise.all([
        repo.setupSnapshot({} as any),
        repo.setupSnapshot({} as any),
      ]);

      expect(fetchPrototypesMock).toHaveBeenCalledTimes(1);

      await Promise.all([repo.refreshSnapshot(), repo.refreshSnapshot()]);

      expect(fetchPrototypesMock).toHaveBeenCalledTimes(2);
    });

    it('processes multiple sequential batches of concurrent requests', async () => {
      const fetchPrototypesMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          data: [makePrototype({ id: 1, prototypeNm: 'batch1' })],
        })
        .mockResolvedValueOnce({
          ok: true,
          data: [makePrototype({ id: 2, prototypeNm: 'batch2' })],
        })
        .mockResolvedValueOnce({
          ok: true,
          data: [makePrototype({ id: 3, prototypeNm: 'batch3' })],
        });

      const repo = createRepo(fetchPrototypesMock);

      await Promise.all([
        repo.setupSnapshot({} as any),
        repo.setupSnapshot({} as any),
      ]);
      expect(fetchPrototypesMock).toHaveBeenCalledTimes(1);

      await Promise.all([
        repo.refreshSnapshot(),
        repo.refreshSnapshot(),
        repo.refreshSnapshot(),
      ]);
      expect(fetchPrototypesMock).toHaveBeenCalledTimes(2);

      await Promise.all([repo.refreshSnapshot(), repo.refreshSnapshot()]);
      expect(fetchPrototypesMock).toHaveBeenCalledTimes(3);
    });

    it('handles rapid sequential requests without coalescing', async () => {
      const fetchPrototypesMock = vi
        .fn()
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

      const repo = createRepo(fetchPrototypesMock);

      await repo.setupSnapshot({} as any);
      await repo.refreshSnapshot();
      await repo.refreshSnapshot();

      expect(fetchPrototypesMock).toHaveBeenCalledTimes(3);
    });

    it('handles race condition where request completes during another setup', async () => {
      const deferred1 = createDeferred<any>();
      const deferred2 = createDeferred<any>();

      const fetchPrototypesMock = vi
        .fn()
        .mockImplementationOnce(() => deferred1.promise)
        .mockImplementationOnce(() => deferred2.promise);

      const repo = createRepo(fetchPrototypesMock);

      const batch1 = Promise.all([
        repo.setupSnapshot({} as any),
        repo.setupSnapshot({} as any),
      ]);

      await Promise.resolve();
      expect(fetchPrototypesMock).toHaveBeenCalledTimes(1);

      deferred1.resolve({
        ok: true,
        data: [makePrototype({ id: 1, prototypeNm: 'batch1' })],
      });

      await batch1;

      const batch2 = Promise.all([
        repo.refreshSnapshot(),
        repo.refreshSnapshot(),
      ]);

      await Promise.resolve();
      expect(fetchPrototypesMock).toHaveBeenCalledTimes(2);

      deferred2.resolve({
        ok: true,
        data: [makePrototype({ id: 2, prototypeNm: 'batch2' })],
      });

      await batch2;

      const proto = await repo.getPrototypeFromSnapshotByPrototypeId(2);
      expect(proto?.prototypeNm).toBe('batch2');
    });
  });

  describe('parameter handling', () => {
    it('uses parameters from first request when coalescing', async () => {
      const deferred = createDeferred<any>();
      const fetchPrototypesMock = vi
        .fn()
        .mockImplementation(() => deferred.promise);
      const repo = createRepo(fetchPrototypesMock);

      const pending = Promise.all([
        repo.setupSnapshot({ offset: 10, limit: 20 } as any),
        repo.setupSnapshot({ offset: 50, limit: 100 } as any),
      ]);

      await Promise.resolve();
      expect(fetchPrototypesMock).toHaveBeenCalledTimes(1);
      expect(fetchPrototypesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          offset: 10,
          limit: 20,
        }),
      );

      deferred.resolve({
        ok: true,
        data: [makePrototype({ id: 1, prototypeNm: 'first-params' })],
      });

      await pending;
    });

    it('correctly handles refreshSnapshot params after setupSnapshot with different params', async () => {
      const fetchPrototypesMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          data: [makePrototype({ id: 1, prototypeNm: 'initial' })],
        })
        .mockResolvedValueOnce({
          ok: true,
          data: [makePrototype({ id: 2, prototypeNm: 'refreshed' })],
        });

      const repo = createRepo(fetchPrototypesMock);

      await repo.setupSnapshot({ offset: 100, limit: 50 } as any);

      expect(fetchPrototypesMock).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ offset: 100, limit: 50 }),
      );

      await Promise.all([
        repo.refreshSnapshot(),
        repo.refreshSnapshot(),
        repo.refreshSnapshot(),
      ]);

      expect(fetchPrototypesMock).toHaveBeenCalledTimes(2);
      expect(fetchPrototypesMock).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ offset: 100, limit: 50 }),
      );
    });
  });

  describe('store state management', () => {
    it('updates store state correctly after coalesced operations', async () => {
      const fetchPrototypesMock = vi.fn().mockResolvedValueOnce({
        ok: true,
        data: [
          makePrototype({ id: 1, prototypeNm: 'proto1' }),
          makePrototype({ id: 2, prototypeNm: 'proto2' }),
        ],
      });

      const repo = createRepo(fetchPrototypesMock);

      await Promise.all([
        repo.setupSnapshot({} as any),
        repo.setupSnapshot({} as any),
        repo.setupSnapshot({} as any),
      ]);

      const stats = repo.getStats();
      expect(stats.size).toBe(2);
      expect(stats.cachedAt).not.toBeNull();

      const proto1 = await repo.getPrototypeFromSnapshotByPrototypeId(1);
      const proto2 = await repo.getPrototypeFromSnapshotByPrototypeId(2);

      expect(proto1?.prototypeNm).toBe('proto1');
      expect(proto2?.prototypeNm).toBe('proto2');
    });

    it('maintains separate cachedAt timestamps across batches', async () => {
      const fetchPrototypesMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          data: [makePrototype({ id: 1, prototypeNm: 'batch1' })],
        })
        .mockResolvedValueOnce({
          ok: true,
          data: [makePrototype({ id: 2, prototypeNm: 'batch2' })],
        });

      const repo = createRepo(fetchPrototypesMock);

      await Promise.all([
        repo.setupSnapshot({} as any),
        repo.setupSnapshot({} as any),
      ]);
      const stats1 = repo.getStats();
      const cachedAt1 = stats1.cachedAt;

      await new Promise((resolve) => setTimeout(resolve, 5));

      await Promise.all([repo.refreshSnapshot(), repo.refreshSnapshot()]);
      const stats2 = repo.getStats();
      const cachedAt2 = stats2.cachedAt;

      expect(cachedAt1).not.toBeNull();
      expect(cachedAt2).not.toBeNull();
      expect(cachedAt2!.getTime()).toBeGreaterThan(cachedAt1!.getTime());
    });
  });

  describe('scale and performance', () => {
    it('coalesces large number of concurrent requests efficiently', async () => {
      const deferred = createDeferred<any>();
      const fetchPrototypesMock = vi
        .fn()
        .mockImplementation(() => deferred.promise);
      const repo = createRepo(fetchPrototypesMock);

      const pending = Promise.all(
        Array.from({ length: 50 }, () => repo.setupSnapshot({} as any)),
      );

      await Promise.resolve();
      expect(fetchPrototypesMock).toHaveBeenCalledTimes(1);

      deferred.resolve({
        ok: true,
        data: [makePrototype({ id: 1, prototypeNm: 'coalesced' })],
      });

      const results = await pending;
      expect(results).toHaveLength(50);
      expect(results.every((r) => r.ok === true)).toBe(true);
    });

    it('coalesces exactly 100 concurrent requests efficiently', async () => {
      const deferred = createDeferred<any>();
      const fetchPrototypesMock = vi
        .fn()
        .mockImplementation(() => deferred.promise);
      const repo = createRepo(fetchPrototypesMock);

      const pending = Promise.all(
        Array.from({ length: 100 }, () => repo.setupSnapshot({} as any)),
      );

      await Promise.resolve();
      expect(fetchPrototypesMock).toHaveBeenCalledTimes(1);

      deferred.resolve({
        ok: true,
        data: [makePrototype({ id: 1, prototypeNm: 'hundred' })],
      });

      const results = await pending;
      expect(results).toHaveLength(100);

      const firstResult = results[0];
      expect(results.every((r) => r === firstResult)).toBe(true);
    });

    it('handles concurrent requests with large dataset response', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) =>
        makePrototype({ id: i + 1, prototypeNm: `proto-${i + 1}` }),
      );

      const fetchPrototypesMock = vi.fn().mockResolvedValueOnce({
        ok: true,
        data: largeDataset,
      });

      const repo = createRepo(fetchPrototypesMock);

      const results = await Promise.all([
        repo.setupSnapshot({} as any),
        repo.setupSnapshot({} as any),
        repo.setupSnapshot({} as any),
      ]);

      expect(fetchPrototypesMock).toHaveBeenCalledTimes(1);
      expect(results[0]).toBe(results[1]);

      const stats = repo.getStats();
      expect(stats.size).toBe(1000);

      const proto1 = await repo.getPrototypeFromSnapshotByPrototypeId(1);
      const proto500 = await repo.getPrototypeFromSnapshotByPrototypeId(500);
      const proto1000 = await repo.getPrototypeFromSnapshotByPrototypeId(1000);

      expect(proto1?.prototypeNm).toBe('proto-1');
      expect(proto500?.prototypeNm).toBe('proto-500');
      expect(proto1000?.prototypeNm).toBe('proto-1000');
    });
  });

  describe('edge cases and timing', () => {
    it('handles concurrent requests during very long-running fetch', async () => {
      const deferred = createDeferred<any>();
      const fetchPrototypesMock = vi
        .fn()
        .mockImplementation(() => deferred.promise);
      const repo = createRepo(fetchPrototypesMock);

      const r1 = repo.setupSnapshot({} as any);
      await Promise.resolve();

      const r2 = repo.setupSnapshot({} as any);
      await Promise.resolve();

      const r3 = repo.setupSnapshot({} as any);
      await Promise.resolve();

      expect(fetchPrototypesMock).toHaveBeenCalledTimes(1);

      deferred.resolve({
        ok: true,
        data: [makePrototype({ id: 99, prototypeNm: 'delayed' })],
      });

      const [result1, result2, result3] = await Promise.all([r1, r2, r3]);
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });

    it('handles setupSnapshot followed by immediate refreshSnapshot before completion', async () => {
      const deferred = createDeferred<any>();
      const fetchPrototypesMock = vi
        .fn()
        .mockImplementation(() => deferred.promise);
      const repo = createRepo(fetchPrototypesMock);

      const setup1 = repo.setupSnapshot({} as any);
      const setup2 = repo.setupSnapshot({} as any);

      const refresh1 = repo.refreshSnapshot();
      const refresh2 = repo.refreshSnapshot();

      await Promise.resolve();

      expect(fetchPrototypesMock).toHaveBeenCalledTimes(1);

      deferred.resolve({
        ok: true,
        data: [makePrototype({ id: 5, prototypeNm: 'mixed' })],
      });

      const results = await Promise.all([setup1, setup2, refresh1, refresh2]);
      expect(results[0]).toBe(results[1]);
      expect(results[1]).toBe(results[2]);
      expect(results[2]).toBe(results[3]);
    });

    it('handles interleaved setupSnapshot and refreshSnapshot calls', async () => {
      const fetchPrototypesMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          data: [makePrototype({ id: 1, prototypeNm: 'initial' })],
        })
        .mockResolvedValueOnce({
          ok: true,
          data: [makePrototype({ id: 2, prototypeNm: 'refreshed' })],
        });

      const repo = createRepo(fetchPrototypesMock);

      await Promise.all([
        repo.setupSnapshot({ offset: 0, limit: 10 } as any),
        repo.setupSnapshot({ offset: 0, limit: 10 } as any),
      ]);

      expect(fetchPrototypesMock).toHaveBeenCalledTimes(1);

      await Promise.all([
        repo.setupSnapshot({ offset: 0, limit: 10 } as any),
        repo.refreshSnapshot(),
        repo.refreshSnapshot(),
      ]);

      expect(fetchPrototypesMock).toHaveBeenCalledTimes(2);
    });
  });
});
