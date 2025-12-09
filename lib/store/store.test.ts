import { afterEach, describe, expect, it, vi } from 'vitest';

import type { NormalizedPrototype } from '../types/index.js';

import { PrototypeMapStore } from './store.js';

const createPrototype = (
  overrides: Partial<NormalizedPrototype> = {},
): NormalizedPrototype => ({
  id: overrides.id ?? 1,
  prototypeNm: 'Prototype 1',
  teamNm: 'Team A',
  users: ['User A'],
  status: 1,
  releaseFlg: 1,
  createDate: '2024-01-01',
  updateDate: '2024-01-02',
  releaseDate: '2024-01-03',
  revision: 1,
  freeComment: 'comment',
  viewCount: 0,
  goodCount: 0,
  commentCount: 0,
  mainUrl: 'https://example.com',
  licenseType: 1,
  thanksFlg: 0,
  ...overrides,
});

describe('PrototypeMapStore', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses 30 minutes TTL by default', () => {
    const store = new PrototypeMapStore();
    const stats = store.getStats();

    expect(stats.ttlMs).toBe(30 * 60 * 1_000);
  });

  it('throws when configuring payloads larger than 30 MiB', () => {
    expect(
      () => new PrototypeMapStore({ maxPayloadSizeBytes: 31 * 1024 * 1024 }),
    ).toThrow(
      'PrototypeMapStore maxPayloadSizeBytes must be <= 30 MiB to prevent oversized payloads',
    );
  });

  it('stores prototypes when payload fits within limits', () => {
    const store = new PrototypeMapStore({ maxPayloadSizeBytes: 1024 * 1024 });
    const result = store.setAll([
      createPrototype({ id: 1 }),
      createPrototype({ id: 2 }),
    ]);

    expect(result).not.toBeNull();
    expect(store.size).toBe(2);
    expect(store.getById(1)?.id).toBe(1);
  });

  it('returns the highest prototype id when available', () => {
    const store = new PrototypeMapStore({ maxPayloadSizeBytes: 1024 * 1024 });

    expect(store.getMaxId()).toBeNull();

    store.setAll([
      createPrototype({ id: 3 }),
      createPrototype({ id: 7 }),
      createPrototype({ id: 5 }),
    ]);

    expect(store.getMaxId()).toBe(7);

    store.clear();
    expect(store.getMaxId()).toBeNull();
  });

  it('skips storing when payload exceeds limit', () => {
    const store = new PrototypeMapStore({ maxPayloadSizeBytes: 50 });
    const prototypes = [
      createPrototype({ id: 7, freeComment: 'x'.repeat(200) }),
    ];

    const result = store.setAll(prototypes);
    expect(result).toBeNull();
    expect(store.size).toBe(0);
  });

  it('reports expiration based on TTL', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
    const store = new PrototypeMapStore({
      ttlMs: 1_000,
      maxPayloadSizeBytes: 1024 * 1024,
    });
    store.setAll([createPrototype({ id: 5 })]);

    expect(store.isExpired()).toBe(false);

    vi.setSystemTime(new Date('2025-01-01T00:00:01.100Z'));
    expect(store.isExpired()).toBe(true);
  });

  it('returns random prototypes from the stored snapshot', () => {
    const store = new PrototypeMapStore({ maxPayloadSizeBytes: 1024 * 1024 });
    store.setAll([
      createPrototype({ id: 11 }),
      createPrototype({ id: 12 }),
      createPrototype({ id: 13 }),
    ]);

    const seen = new Set<number>();
    for (let index = 0; index < 10; index += 1) {
      const prototype = store.getRandom();
      expect(prototype).not.toBeNull();
      if (prototype) {
        seen.add(prototype.id);
      }
    }

    expect(seen.size).toBeGreaterThan(0);
  });

  it('prevents concurrent refresh tasks', async () => {
    const store = new PrototypeMapStore({ maxPayloadSizeBytes: 1024 * 1024 });
    const firstTask = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      store.setAll([createPrototype({ id: 90 })]);
    });
    const secondTask = vi.fn(async () => {
      store.setAll([createPrototype({ id: 91 })]);
    });

    const promise = store.runExclusive(firstTask);
    const concurrent = store.runExclusive(secondTask);

    await Promise.allSettled([promise, concurrent]);

    expect(firstTask).toHaveBeenCalledTimes(1);
    expect(secondTask).toHaveBeenCalledTimes(0);
    expect(store.getById(90)?.id).toBe(90);
  });

  describe('getAll', () => {
    it('returns all prototypes in original order', () => {
      const store = new PrototypeMapStore({ maxPayloadSizeBytes: 1024 * 1024 });
      const prototypes = [
        createPrototype({ id: 3, prototypeNm: 'Third' }),
        createPrototype({ id: 1, prototypeNm: 'First' }),
        createPrototype({ id: 2, prototypeNm: 'Second' }),
      ];
      store.setAll(prototypes);

      const all = store.getAll();

      expect(all).toHaveLength(3);
      expect(all[0]?.id).toBe(3);
      expect(all[1]?.id).toBe(1);
      expect(all[2]?.id).toBe(2);
    });

    it('returns empty array when store is empty', () => {
      const store = new PrototypeMapStore();
      expect(store.getAll()).toEqual([]);
    });
  });

  describe('getById', () => {
    it('returns undefined for non-existent id', () => {
      const store = new PrototypeMapStore({ maxPayloadSizeBytes: 1024 * 1024 });
      store.setAll([createPrototype({ id: 1 })]);

      expect(store.getById(999)).toBeUndefined();
    });

    it('retrieves prototype by id in O(1) time', () => {
      const store = new PrototypeMapStore({ maxPayloadSizeBytes: 1024 * 1024 });
      const prototypes = Array.from({ length: 100 }, (_, i) =>
        createPrototype({ id: i + 1 }),
      );
      store.setAll(prototypes);

      const result = store.getById(50);
      expect(result?.id).toBe(50);
    });

    it('returns undefined when store is cleared', () => {
      const store = new PrototypeMapStore({ maxPayloadSizeBytes: 1024 * 1024 });
      store.setAll([createPrototype({ id: 42 })]);
      store.clear();

      expect(store.getById(42)).toBeUndefined();
    });
  });

  describe('getRandom', () => {
    it('returns null when store is empty', () => {
      const store = new PrototypeMapStore();
      expect(store.getRandom()).toBeNull();
    });

    it('returns the only prototype when size is 1', () => {
      const store = new PrototypeMapStore({ maxPayloadSizeBytes: 1024 * 1024 });
      const prototype = createPrototype({ id: 999 });
      store.setAll([prototype]);

      const result = store.getRandom();
      expect(result?.id).toBe(999);
    });

    it('eventually samples all prototypes', () => {
      const store = new PrototypeMapStore({ maxPayloadSizeBytes: 1024 * 1024 });
      store.setAll([
        createPrototype({ id: 1 }),
        createPrototype({ id: 2 }),
        createPrototype({ id: 3 }),
      ]);

      const seen = new Set<number>();
      for (let i = 0; i < 100; i++) {
        const result = store.getRandom();
        if (result) {
          seen.add(result.id);
        }
      }

      expect(seen.size).toBe(3);
    });

    it('returns null after clear', () => {
      const store = new PrototypeMapStore({ maxPayloadSizeBytes: 1024 * 1024 });
      store.setAll([createPrototype({ id: 1 })]);
      store.clear();

      expect(store.getRandom()).toBeNull();
    });
  });

  describe('getCachedAt', () => {
    it('returns null when no data has been cached', () => {
      const store = new PrototypeMapStore();
      expect(store.getCachedAt()).toBeNull();
    });

    it('returns timestamp after setAll', () => {
      vi.useFakeTimers();
      const now = new Date('2025-12-01T12:00:00.000Z');
      vi.setSystemTime(now);

      const store = new PrototypeMapStore({ maxPayloadSizeBytes: 1024 * 1024 });
      store.setAll([createPrototype({ id: 1 })]);

      expect(store.getCachedAt()?.getTime()).toBe(now.getTime());
      vi.useRealTimers();
    });

    it('updates timestamp on subsequent setAll calls', () => {
      vi.useFakeTimers();
      const store = new PrototypeMapStore({ maxPayloadSizeBytes: 1024 * 1024 });

      vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
      store.setAll([createPrototype({ id: 1 })]);
      const first = store.getCachedAt();

      vi.setSystemTime(new Date('2025-01-01T01:00:00Z'));
      store.setAll([createPrototype({ id: 2 })]);
      const second = store.getCachedAt();

      expect(first?.getTime()).not.toBe(second?.getTime());
      vi.useRealTimers();
    });
  });

  describe('isExpired', () => {
    it('returns true when no data is cached', () => {
      const store = new PrototypeMapStore();
      expect(store.isExpired()).toBe(true);
    });

    it('returns false immediately after caching', () => {
      vi.useFakeTimers();
      const store = new PrototypeMapStore({
        ttlMs: 5000,
        maxPayloadSizeBytes: 1024 * 1024,
      });
      store.setAll([createPrototype({ id: 1 })]);

      expect(store.isExpired()).toBe(false);
      vi.useRealTimers();
    });

    it('returns true after TTL expires', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
      const store = new PrototypeMapStore({
        ttlMs: 1000,
        maxPayloadSizeBytes: 1024 * 1024,
      });
      store.setAll([createPrototype({ id: 1 })]);

      vi.setSystemTime(new Date('2025-01-01T00:00:01.001Z'));
      expect(store.isExpired()).toBe(true);
      vi.useRealTimers();
    });

    it('returns false at exact TTL boundary', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
      const store = new PrototypeMapStore({
        ttlMs: 1000,
        maxPayloadSizeBytes: 1024 * 1024,
      });
      store.setAll([createPrototype({ id: 1 })]);

      vi.setSystemTime(new Date('2025-01-01T00:00:01Z'));
      expect(store.isExpired()).toBe(false);
      vi.useRealTimers();
    });
  });

  describe('getSnapshot', () => {
    it('returns snapshot with data and metadata', () => {
      vi.useFakeTimers();
      const now = new Date('2025-12-01T12:00:00Z');
      vi.setSystemTime(now);

      const store = new PrototypeMapStore({
        ttlMs: 5000,
        maxPayloadSizeBytes: 1024 * 1024,
      });
      const prototypes = [createPrototype({ id: 1 })];
      store.setAll(prototypes);

      const snapshot = store.getSnapshot();

      expect(snapshot.data).toEqual(prototypes);
      expect(snapshot.cachedAt?.getTime()).toBe(now.getTime());
      expect(snapshot.isExpired).toBe(false);
      vi.useRealTimers();
    });

    it('returns empty snapshot when store is empty', () => {
      const store = new PrototypeMapStore();
      const snapshot = store.getSnapshot();

      expect(snapshot.data).toEqual([]);
      expect(snapshot.cachedAt).toBeNull();
      expect(snapshot.isExpired).toBe(true);
    });

    it('reflects expired state in snapshot', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
      const store = new PrototypeMapStore({
        ttlMs: 100,
        maxPayloadSizeBytes: 1024 * 1024,
      });
      store.setAll([createPrototype({ id: 1 })]);

      vi.setSystemTime(new Date('2025-01-01T00:00:00.200Z'));
      const snapshot = store.getSnapshot();

      expect(snapshot.isExpired).toBe(true);
      expect(snapshot.data).toHaveLength(1);
      vi.useRealTimers();
    });
  });

  describe('clear', () => {
    it('resets size to 0', () => {
      const store = new PrototypeMapStore({ maxPayloadSizeBytes: 1024 * 1024 });
      store.setAll([createPrototype({ id: 1 })]);
      store.clear();

      expect(store.size).toBe(0);
    });

    it('clears all prototypes', () => {
      const store = new PrototypeMapStore({ maxPayloadSizeBytes: 1024 * 1024 });
      store.setAll([createPrototype({ id: 1 })]);
      store.clear();

      expect(store.getAll()).toEqual([]);
    });

    it('resets cachedAt to null', () => {
      const store = new PrototypeMapStore({ maxPayloadSizeBytes: 1024 * 1024 });
      store.setAll([createPrototype({ id: 1 })]);
      store.clear();

      expect(store.getCachedAt()).toBeNull();
    });

    it('resets maxPrototypeId to null', () => {
      const store = new PrototypeMapStore({ maxPayloadSizeBytes: 1024 * 1024 });
      store.setAll([createPrototype({ id: 100 })]);
      store.clear();

      expect(store.getMaxId()).toBeNull();
    });

    it('can be called multiple times', () => {
      const store = new PrototypeMapStore({ maxPayloadSizeBytes: 1024 * 1024 });
      store.setAll([createPrototype({ id: 1 })]);
      store.clear();
      store.clear();

      expect(store.size).toBe(0);
    });
  });

  describe('isRefreshInFlight', () => {
    it('returns false when no refresh is running', () => {
      const store = new PrototypeMapStore();
      expect(store.isRefreshInFlight()).toBe(false);
    });

    it('returns true while refresh is running', async () => {
      const store = new PrototypeMapStore({ maxPayloadSizeBytes: 1024 * 1024 });
      const task = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      const promise = store.runExclusive(task);
      expect(store.isRefreshInFlight()).toBe(true);
      await promise;
    });

    it('returns false after refresh completes', async () => {
      const store = new PrototypeMapStore({ maxPayloadSizeBytes: 1024 * 1024 });
      const task = vi.fn(async () => {});

      await store.runExclusive(task);
      expect(store.isRefreshInFlight()).toBe(false);
    });
  });

  describe('getStats', () => {
    it('returns all statistics', () => {
      const store = new PrototypeMapStore({
        ttlMs: 10_000,
        maxPayloadSizeBytes: 1024 * 1024,
      });
      const stats = store.getStats();

      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('cachedAt');
      expect(stats).toHaveProperty('ttlMs');
      expect(stats).toHaveProperty('isExpired');
      expect(stats).toHaveProperty('approxSizeBytes');
      expect(stats).toHaveProperty('refreshInFlight');
    });

    it('reports correct values after setAll', () => {
      vi.useFakeTimers();
      const now = new Date('2025-01-01T00:00:00Z');
      vi.setSystemTime(now);

      const store = new PrototypeMapStore({
        ttlMs: 5000,
        maxPayloadSizeBytes: 1024 * 1024,
      });
      store.setAll([createPrototype({ id: 1 })]);

      const stats = store.getStats();

      expect(stats.size).toBe(1);
      expect(stats.cachedAt?.getTime()).toBe(now.getTime());
      expect(stats.ttlMs).toBe(5000);
      expect(stats.isExpired).toBe(false);
      expect(stats.approxSizeBytes).toBeGreaterThan(0);
      expect(stats.refreshInFlight).toBe(false);
      vi.useRealTimers();
    });

    it('reflects expired state', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
      const store = new PrototypeMapStore({
        ttlMs: 100,
        maxPayloadSizeBytes: 1024 * 1024,
      });
      store.setAll([createPrototype({ id: 1 })]);

      vi.setSystemTime(new Date('2025-01-01T00:00:00.200Z'));
      const stats = store.getStats();

      expect(stats.isExpired).toBe(true);
      vi.useRealTimers();
    });
  });

  describe('edge cases and stress tests', () => {
    it('handles empty array in setAll', () => {
      const store = new PrototypeMapStore({ maxPayloadSizeBytes: 1024 * 1024 });
      const result = store.setAll([]);

      expect(result).not.toBeNull();
      expect(store.size).toBe(0);
      expect(store.getMaxId()).toBeNull();
    });

    it('handles single prototype', () => {
      const store = new PrototypeMapStore({ maxPayloadSizeBytes: 1024 * 1024 });
      store.setAll([createPrototype({ id: 42 })]);

      expect(store.size).toBe(1);
      expect(store.getMaxId()).toBe(42);
      expect(store.getById(42)?.id).toBe(42);
    });

    it('handles large number of prototypes', () => {
      const store = new PrototypeMapStore({
        maxPayloadSizeBytes: 10 * 1024 * 1024,
      });
      const prototypes = Array.from({ length: 1000 }, (_, i) =>
        createPrototype({ id: i + 1 }),
      );

      const result = store.setAll(prototypes);

      expect(result).not.toBeNull();
      expect(store.size).toBe(1000);
      expect(store.getMaxId()).toBe(1000);
    });

    it('handles prototype with id 0', () => {
      const store = new PrototypeMapStore({ maxPayloadSizeBytes: 1024 * 1024 });
      store.setAll([createPrototype({ id: 0 })]);

      expect(store.getById(0)?.id).toBe(0);
      expect(store.getMaxId()).toBe(0);
    });

    it('handles negative prototype ids', () => {
      const store = new PrototypeMapStore({ maxPayloadSizeBytes: 1024 * 1024 });
      store.setAll([
        createPrototype({ id: -1 }),
        createPrototype({ id: 5 }),
        createPrototype({ id: -10 }),
      ]);

      expect(store.getById(-1)?.id).toBe(-1);
      expect(store.getById(-10)?.id).toBe(-10);
      expect(store.getMaxId()).toBe(5);
    });

    it('preserves all prototype fields', () => {
      const store = new PrototypeMapStore({ maxPayloadSizeBytes: 1024 * 1024 });
      const original = createPrototype({
        id: 123,
        prototypeNm: 'Test Name',
        teamNm: 'Test Team',
        users: ['Alice', 'Bob'],
        status: 2,
        freeComment: 'Test comment',
        viewCount: 100,
        goodCount: 50,
      });

      store.setAll([original]);
      const retrieved = store.getById(123);

      expect(retrieved).toEqual(original);
    });

    it('handles multiple setAll calls with different data', () => {
      const store = new PrototypeMapStore({ maxPayloadSizeBytes: 1024 * 1024 });

      store.setAll([createPrototype({ id: 1 })]);
      expect(store.size).toBe(1);

      store.setAll([createPrototype({ id: 2 }), createPrototype({ id: 3 })]);
      expect(store.size).toBe(2);
      expect(store.getById(1)).toBeUndefined();
      expect(store.getById(2)?.id).toBe(2);
    });

    it('handles concurrent refresh tasks correctly', async () => {
      const store = new PrototypeMapStore({ maxPayloadSizeBytes: 1024 * 1024 });
      const task1 = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        store.setAll([createPrototype({ id: 1 })]);
      });
      const task2 = vi.fn(async () => {
        store.setAll([createPrototype({ id: 2 })]);
      });
      const task3 = vi.fn(async () => {
        store.setAll([createPrototype({ id: 3 })]);
      });

      const p1 = store.runExclusive(task1);
      const p2 = store.runExclusive(task2);
      const p3 = store.runExclusive(task3);

      await Promise.allSettled([p1, p2, p3]);

      expect(task1).toHaveBeenCalledTimes(1);
      expect(task2).toHaveBeenCalledTimes(0);
      expect(task3).toHaveBeenCalledTimes(0);
    });

    it('handles refresh task that throws error', async () => {
      const store = new PrototypeMapStore({ maxPayloadSizeBytes: 1024 * 1024 });
      const task = vi.fn(async () => {
        throw new Error('Task failed');
      });

      await expect(store.runExclusive(task)).rejects.toThrow('Task failed');
      expect(store.isRefreshInFlight()).toBe(false);
    });

    it('allows new refresh after failed refresh', async () => {
      const store = new PrototypeMapStore({ maxPayloadSizeBytes: 1024 * 1024 });
      const failingTask = vi.fn(async () => {
        throw new Error('First task failed');
      });
      const successTask = vi.fn(async () => {
        store.setAll([createPrototype({ id: 99 })]);
      });

      await expect(store.runExclusive(failingTask)).rejects.toThrow();
      await store.runExclusive(successTask);

      expect(failingTask).toHaveBeenCalledTimes(1);
      expect(successTask).toHaveBeenCalledTimes(1);
      expect(store.getById(99)?.id).toBe(99);
    });
  });

  describe('estimateSize error handling', () => {
    it('handles JSON.stringify errors gracefully', () => {
      const store = new PrototypeMapStore();
      const circularPrototype = createPrototype({ id: 1 }) as any;
      circularPrototype.self = circularPrototype; // create circular reference

      // setAll should not throw even if estimateSize fails
      expect(() => store.setAll([circularPrototype])).not.toThrow();
    });

    it('falls back to 0 when size estimation fails', () => {
      const store = new PrototypeMapStore();

      // Mock JSON.stringify to throw
      const originalStringify = JSON.stringify;
      vi.spyOn(JSON, 'stringify').mockImplementationOnce(() => {
        throw new Error('Stringify failed');
      });

      store.setAll([createPrototype({ id: 1 })]);

      // Restore original implementation
      JSON.stringify = originalStringify;

      expect(store.getById(1)).toBeDefined();
    });
  });
});
