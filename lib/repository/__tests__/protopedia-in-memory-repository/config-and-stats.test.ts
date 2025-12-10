/**
 * Tests for ProtopediaInMemoryRepositoryImpl configuration and statistics.
 *
 * This test suite validates configuration management and runtime statistics
 * reporting for the in-memory repository.
 *
 * ## Test Coverage
 *
 * ### Configuration Tests (`getConfig`)
 * - Custom TTL configuration retrieval
 * - Custom memory limit configuration
 * - Default value handling
 * - Configuration immutability
 *
 * ### Statistics Tests (`getStats`)
 * - Initial state (empty snapshot)
 *   - `cachedAt` is null before first fetch
 *   - `size` is 0 before population
 * - Post-fetch state
 *   - `cachedAt` timestamp is set
 *   - `size` reflects actual data count
 * - Snapshot updates
 *   - `cachedAt` updates after refresh
 *   - Timestamp ordering (newer > older)
 * - TTL and expiration
 *   - `isExpired` reflects current state
 *   - Immediate post-setup is not expired
 * - Consistency
 *   - Multiple `getStats()` calls return consistent values
 *   - Empty state consistency
 *
 * ## Implementation Notes
 *
 * Statistics are read from the underlying {@link PrototypeInMemoryStore}
 * and represent the current snapshot state, not historical data.
 *
 * @module
 * @see {@link ProtopediaInMemoryRepositoryImpl.getConfig} for configuration access
 * @see {@link ProtopediaInMemoryRepositoryImpl.getStats} for statistics access
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProtopediaInMemoryRepositoryImpl } from '../../protopedia-in-memory-repository.js';

vi.mock('../../../fetcher/index', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../fetcher/index.js')>();
  return {
    ...actual,
    createProtopediaApiCustomClient: vi.fn(),
  };
});

import { makePrototype, setupMocks } from './test-helpers.js';

describe('ProtopediaInMemoryRepositoryImpl - configuration and statistics', () => {
  const { fetchPrototypesMock, resetMocks } = setupMocks();

  beforeEach(() => {
    resetMocks();
  });

  describe('getConfig', () => {
    it('returns store configuration with custom TTL', () => {
      const repo = new ProtopediaInMemoryRepositoryImpl({ ttlMs: 120_000 }, {});

      const config = repo.getConfig();
      expect(config.ttlMs).toBe(120_000);
    });

    it('returns configuration with custom maxDataSizeBytes', () => {
      const repo = new ProtopediaInMemoryRepositoryImpl(
        { maxDataSizeBytes: 5_000_000 },
        {},
      );

      const config = repo.getConfig();
      expect(config.maxDataSizeBytes).toBe(5_000_000);
    });

    it('returns configuration with default values', () => {
      const repo = new ProtopediaInMemoryRepositoryImpl({}, {});

      const config = repo.getConfig();
      expect(config.ttlMs).toBeDefined();
      expect(config.maxDataSizeBytes).toBeDefined();
    });
  });

  describe('getStats', () => {
    it('returns null cachedAt and size 0 before any snapshot is created', () => {
      const repo = new ProtopediaInMemoryRepositoryImpl({}, {});

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

      const repo = new ProtopediaInMemoryRepositoryImpl({}, {});
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

      const repo = new ProtopediaInMemoryRepositoryImpl({}, {});
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

      const repo = new ProtopediaInMemoryRepositoryImpl({}, {});
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

      const repo = new ProtopediaInMemoryRepositoryImpl({ ttlMs: 1000 }, {});
      await repo.setupSnapshot({});

      const stats = repo.getStats();
      expect(stats.isExpired).toBe(false);
    });

    it('returns consistent stats when called multiple times', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [makePrototype({ id: 1 }), makePrototype({ id: 2 })],
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({}, {});
      await repo.setupSnapshot({});

      const stats1 = repo.getStats();
      const stats2 = repo.getStats();
      const stats3 = repo.getStats();

      expect(stats1.size).toBe(stats2.size);
      expect(stats2.size).toBe(stats3.size);
      expect(stats1.cachedAt).toBe(stats2.cachedAt);
      expect(stats2.cachedAt).toBe(stats3.cachedAt);
    });

    it('returns consistent cached state when empty', () => {
      const repo = new ProtopediaInMemoryRepositoryImpl({}, {});
      const stats = repo.getStats();

      expect(stats.cachedAt).toBeNull();
      expect(stats.size).toBe(0);
      expect(stats.isExpired).toBe(true);
    });
  });
});
