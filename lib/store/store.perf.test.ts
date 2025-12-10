import { describe, expect, it } from 'vitest';

import type { NormalizedPrototype } from '../types/index.js';

import { PrototypeInMemoryStore } from './store.js';

/**
 * Create a test prototype with realistic field values.
 *
 * @param id - Prototype ID
 * @returns A complete NormalizedPrototype object
 */
const createPrototype = (id: number): NormalizedPrototype => ({
  id,
  prototypeNm: `Prototype ${id}`,
  teamNm: 'Team',
  users: ['User'],
  status: 1,
  releaseFlg: 1,
  createDate: '2024-01-01',
  updateDate: '2024-01-02',
  releaseDate: '2024-01-03',
  revision: 1,
  freeComment: '',
  viewCount: 0,
  goodCount: 0,
  commentCount: 0,
  mainUrl: 'https://example.com',
  licenseType: 1,
  thanksFlg: 0,
});

/**
 * Performance test suite for PrototypeInMemoryStore.
 *
 * These tests measure actual performance characteristics with realistic data volumes
 * (1,000 to 10,000 items) to validate design assumptions documented in DESIGN.md.
 *
 * Key metrics:
 * - setAll: Time to store a complete snapshot
 * - getByPrototypeId: O(1) lookup performance across all items
 * - Memory usage: Heap consumption in Node.js environments
 *
 * Thresholds are intentionally loose (< 1 second) to avoid flakiness across
 * different hardware and CI environments. Actual performance is typically
 * much better (see console output for real measurements).
 */
describe('PrototypeInMemoryStore performance (non-strict)', () => {
  /**
   * Run a performance test case with a specific number of items.
   *
   * Measures:
   * 1. setAll() - Time to replace entire snapshot
   * 2. getByPrototypeId() - Sequential lookup of all items
   * 3. Memory usage - Node.js heap metrics (when available)
   *
   * @param count - Number of prototype items to test with
   */
  const runPerfCase = (count: number): void => {
    const data = Array.from({ length: count }, (_, index) =>
      createPrototype(index + 1),
    );

    const store = new PrototypeInMemoryStore({
      maxDataSizeBytes: 30 * 1024 * 1024,
    });

    const startSetAll = performance.now();
    store.setAll(data);
    const endSetAll = performance.now();

    const startGetById = performance.now();
    for (let id = 1; id <= count; id += 1) {
      const prototype = store.getByPrototypeId(id);
      if (!prototype) {
        throw new Error('Missing prototype in performance test');
      }
    }
    const endGetById = performance.now();

    const setAllMs = endSetAll - startSetAll;
    const getByIdMs = endGetById - startGetById;

    // Collect memory metrics in Node.js environments
    const usage =
      typeof globalThis.process !== 'undefined' &&
      typeof globalThis.process.memoryUsage === 'function'
        ? globalThis.process.memoryUsage()
        : undefined;

    // Log actual measurements for documentation and regression detection
    console.log(
      `PrototypeInMemoryStore perf (${count.toLocaleString()} items):`,
      {
        setAllMs,
        getByIdMs,
        memory: usage
          ? {
              rss: usage.rss,
              heapTotal: usage.heapTotal,
              heapUsed: usage.heapUsed,
              external: usage.external,
            }
          : 'memoryUsage not available',
      },
    );

    // Loose thresholds to avoid flakiness across environments
    // Actual performance is typically 5-50ms for setAll, <1ms for getById
    expect(setAllMs).toBeLessThan(1_000);
    expect(getByIdMs).toBeLessThan(1_000);
  };

  it.each([1_000, 3_000, 5_000, 10_000])(
    'handles %i items within reasonable time',
    (count: number) => {
      runPerfCase(count);
    },
  );
});
