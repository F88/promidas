/**
 * Tests for ProtopediaInMemoryRepositoryImpl setup and initialization.
 *
 * Covers constructor, setupSnapshot, and refreshSnapshot operations.
 *
 * @module
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Logger } from '../../../logger/index.js';
import { ProtopediaInMemoryRepositoryImpl } from '../../protopedia-in-memory-repository.js';

vi.mock('../../../fetcher/index', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../fetcher/index.js')>();
  return {
    ...actual,
    ProtopediaApiCustomClient: vi.fn(),
  };
});

import { makePrototype, setupMocks } from './test-helpers.js';

describe('ProtopediaInMemoryRepositoryImpl - setup and initialization', () => {
  const { fetchPrototypesMock, resetMocks } = setupMocks();

  beforeEach(() => {
    resetMocks();
  });

  describe('constructor', () => {
    it('creates instance with store config', () => {
      const repo = new ProtopediaInMemoryRepositoryImpl({
        storeConfig: { ttlMs: 60_000 },
      });

      expect(repo).toBeInstanceOf(ProtopediaInMemoryRepositoryImpl);
      expect(repo.getConfig().ttlMs).toBe(60_000);
    });

    it('creates instance with minimal config', () => {
      const repo = new ProtopediaInMemoryRepositoryImpl({});

      expect(repo).toBeInstanceOf(ProtopediaInMemoryRepositoryImpl);
    });

    it('creates instance without API client options', () => {
      const repo = new ProtopediaInMemoryRepositoryImpl({});

      expect(repo).toBeInstanceOf(ProtopediaInMemoryRepositoryImpl);
    });

    it('masks token in logs when apiClientOptions with token is provided', () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      } as unknown as Logger;

      new ProtopediaInMemoryRepositoryImpl({
        repositoryConfig: { logger: mockLogger },
        apiClientOptions: { token: 'secret-token' },
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'ProtopediaInMemoryRepository constructor called',
        expect.objectContaining({
          apiClientOptions: expect.objectContaining({
            token: '***',
          }),
        }),
      );
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
        storeConfig: { ttlMs: 60_000 },
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

      const repo = new ProtopediaInMemoryRepositoryImpl({});

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
        storeConfig: { ttlMs: 60_000 },
      });

      const result = await repo.setupSnapshot({});

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('Internal server error');
        expect(result.status).toBe(500);
        expect(result.code).toBe('INTERNAL_ERROR');
      }

      const stats = repo.getStats();
      expect(stats.size).toBe(0);
    });

    it('applies default limit when only offset is provided', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [makePrototype({ id: 50 })],
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({});
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

      const repo = new ProtopediaInMemoryRepositoryImpl({});
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

      const repo = new ProtopediaInMemoryRepositoryImpl({});
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

      const repo = new ProtopediaInMemoryRepositoryImpl({
        storeConfig: { ttlMs: 60_000 },
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

      const repo = new ProtopediaInMemoryRepositoryImpl({});

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

      const repo = new ProtopediaInMemoryRepositoryImpl({
        storeConfig: { ttlMs: 60_000 },
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

      const repo = new ProtopediaInMemoryRepositoryImpl({});

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
