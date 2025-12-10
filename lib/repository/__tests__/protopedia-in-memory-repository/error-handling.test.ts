/**
 * Tests for ProtopediaInMemoryRepositoryImpl error handling and recovery.
 *
 * Covers error scenarios, snapshot replacement, and resilience.
 *
 * @module
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

describe('ProtopediaInMemoryRepositoryImpl - error handling', () => {
  const { fetchPrototypesMock, resetMocks } = setupMocks();

  beforeEach(() => {
    resetMocks();
  });

  describe('error handling', () => {
    it('returns failure result with 404 status code details', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        error: 'Not found',
        details: {
          res: { code: 'NOT_FOUND' },
        },
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({}, {});

      const result = await repo.setupSnapshot({});

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('Not found');
        expect(result.status).toBe(404);
        expect(result.code).toBe('NOT_FOUND');
      }
    });

    it('returns failure result with 401 status code details', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        error: 'Unauthorized',
        details: {
          res: { code: 'UNAUTHORIZED' },
        },
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({}, {});

      const result = await repo.setupSnapshot({});

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('Unauthorized');
        expect(result.status).toBe(401);
        expect(result.code).toBe('UNAUTHORIZED');
      }
    });

    it('returns failure result for network exceptions during setupSnapshot', async () => {
      fetchPrototypesMock.mockRejectedValueOnce(
        new Error('ECONNREFUSED: Connection refused'),
      );

      const repo = new ProtopediaInMemoryRepositoryImpl({}, {});

      const result = await repo.setupSnapshot({});

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('ECONNREFUSED: Connection refused');
      }
    });

    it('allows successful setup after a failed attempt', async () => {
      fetchPrototypesMock
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce({
          ok: true,
          data: [makePrototype({ id: 1, prototypeNm: 'success' })],
        });

      const repo = new ProtopediaInMemoryRepositoryImpl({}, {});

      const failResult = await repo.setupSnapshot({});
      expect(failResult.ok).toBe(false);
      if (!failResult.ok) {
        expect(failResult.error).toBe('First attempt failed');
      }

      let stats = repo.getStats();
      expect(stats.size).toBe(0);

      const successResult = await repo.setupSnapshot({});
      expect(successResult.ok).toBe(true);

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

      const repo = new ProtopediaInMemoryRepositoryImpl({}, {});
      await repo.setupSnapshot({});

      const failResult = await repo.refreshSnapshot();
      expect(failResult.ok).toBe(false);
      if (!failResult.ok) {
        expect(failResult.error).toBe('Temporary network issue');
      }

      const oldProto = await repo.getPrototypeFromSnapshotByPrototypeId(1);
      expect(oldProto?.prototypeNm).toBe('initial');

      const successResult = await repo.refreshSnapshot();
      expect(successResult.ok).toBe(true);

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

      const repo = new ProtopediaInMemoryRepositoryImpl({}, {});
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
});
