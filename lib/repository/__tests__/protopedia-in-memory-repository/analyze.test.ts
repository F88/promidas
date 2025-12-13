/**
 * Tests for ProtopediaInMemoryRepositoryImpl analysis methods.
 *
 * This test suite validates the statistical analysis capabilities of the repository,
 * focusing on prototype ID range analysis (min/max) and algorithm correctness.
 *
 * ## Test Coverage
 *
 * ### Public API Tests
 * - `analyzePrototypes()` - Statistical analysis of prototype IDs
 *   - Empty snapshot handling (null min/max)
 *   - Single prototype analysis
 *   - Multiple prototypes analysis (min/max detection)
 *
 * ### Private Method Tests (via public interface)
 * - `analyzePrototypesWithForLoop()` - For-loop based analysis
 * - `analyzePrototypesWithReduce()` - Reduce-based analysis
 *
 * ## Design Philosophy
 *
 * ### Intentional Test Patterns
 * Tests for private methods (`analyzePrototypesWithForLoop`, `analyzePrototypesWithReduce`)
 * intentionally use a **verbose data retrieval pattern**:
 *
 * 1. `getPrototypeIdsFromSnapshot()` - Fetch all IDs
 * 2. Map each ID to `getPrototypeFromSnapshotByPrototypeId()` - Individual lookups
 * 3. `Promise.all()` - Wait for all lookups
 *
 * This pattern validates that **individual lookup methods compose correctly**,
 * which is a different code path than `getAllFromSnapshot()`.
 *
 * **Do NOT simplify these tests** - the verbosity is intentional and necessary.
 *
 * @module
 * @see {@link ProtopediaInMemoryRepositoryImpl.analyzePrototypes} for the main analysis method
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
      const repo = new ProtopediaInMemoryRepositoryImpl({});

      const result = await repo.analyzePrototypes();

      expect(result.min).toBeNull();
      expect(result.max).toBeNull();
    });

    it('returns correct min/max for single prototype', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [makePrototype({ id: 42 })],
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({});
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

      const repo = new ProtopediaInMemoryRepositoryImpl({});
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
     * This validates that the individual lookup methods work correctly when composed,
     * which is a different code path than getAllFromSnapshot().
     * Do NOT simplify this to use getAllFromSnapshot() - that would bypass the test's purpose.
     */
    it('analyzePrototypesWithForLoop works correctly', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [
          makePrototype({ id: 100 }),
          makePrototype({ id: 1 }),
          makePrototype({ id: 50 }),
        ],
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({});
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

    /**
     * Tests analyzePrototypesWithReduce by manually reconstructing the prototype array.
     *
     * This test intentionally uses the verbose pattern of:
     * 1. getPrototypeIdsFromSnapshot() - get all IDs
     * 2. map each ID to getPrototypeFromSnapshotByPrototypeId() - individual lookups
     * 3. Promise.all() - wait for all lookups
     *
     * This validates that the individual lookup methods work correctly when composed,
     * which is a different code path than getAllFromSnapshot().
     * Do NOT simplify this to use getAllFromSnapshot() - that would bypass the test's purpose.
     */
    it('analyzePrototypesWithReduce works correctly', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [
          makePrototype({ id: 100 }),
          makePrototype({ id: 1 }),
          makePrototype({ id: 50 }),
        ],
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({});
      await repo.setupSnapshot({});

      // NOTE: Intentionally verbose pattern - DO NOT refactor to getAllFromSnapshot()
      // This tests the composition of individual lookup methods (different code path)
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
