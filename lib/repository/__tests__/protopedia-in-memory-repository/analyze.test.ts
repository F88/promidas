/**
 * Tests for ProtopediaInMemoryRepositoryImpl analysis methods.
 *
 * Covers analyzePrototypes and related analysis functionality.
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

describe('ProtopediaInMemoryRepositoryImpl - analysis', () => {
  const { fetchPrototypesMock, resetMocks } = setupMocks();

  beforeEach(() => {
    resetMocks();
  });

  describe('analyzePrototypes', () => {
    it('returns null min/max when snapshot is empty', async () => {
      const repo = new ProtopediaInMemoryRepositoryImpl({}, {});

      const result = await repo.analyzePrototypes();

      expect(result.min).toBeNull();
      expect(result.max).toBeNull();
    });

    it('returns correct min/max for single prototype', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [makePrototype({ id: 42 })],
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({}, {});
      await repo.setupSnapshot({});

      const result = await repo.analyzePrototypes();

      expect(result.min).toBe(42);
      expect(result.max).toBe(42);
    });

    it('returns correct min/max for multiple prototypes', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [
          makePrototype({ id: 5 }),
          makePrototype({ id: 1 }),
          makePrototype({ id: 10 }),
          makePrototype({ id: 3 }),
        ],
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({}, {});
      await repo.setupSnapshot({});

      const result = await repo.analyzePrototypes();

      expect(result.min).toBe(1);
      expect(result.max).toBe(10);
    });
  });

  describe('private methods (via public interface)', () => {
    it('analyzePrototypesWithForLoop works correctly', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [
          makePrototype({ id: 100 }),
          makePrototype({ id: 1 }),
          makePrototype({ id: 50 }),
        ],
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({}, {});
      await repo.setupSnapshot({});

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

    it('analyzePrototypesWithReduce works correctly', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [
          makePrototype({ id: 100 }),
          makePrototype({ id: 1 }),
          makePrototype({ id: 50 }),
        ],
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({}, {});
      await repo.setupSnapshot({});

      const result = repo.analyzePrototypesWithReduce(
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
