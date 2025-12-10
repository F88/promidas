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

// Helper: Get memory usage (environment agnostic)
const getMemoryUsage = () => {
  if (
    typeof process !== 'undefined' &&
    typeof process.memoryUsage === 'function'
  ) {
    return process.memoryUsage();
  }
  return null;
};

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
   * Helper to measure execution time with warm-up and multiple iterations.
   */
  const measure = (fn: () => void, iterations: number = 5) => {
    // Warm-up (for JIT optimization)
    fn();

    const durations: number[] = [];
    for (let i = 0; i < iterations; i += 1) {
      const start = performance.now();
      fn();
      const end = performance.now();
      durations.push(end - start);
    }

    // Calculate average and median
    const sum = durations.reduce((a, b) => a + b, 0);
    const avg = sum / durations.length;
    const sorted = [...durations].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] ?? 0;

    return {
      avg,
      median,
      min: sorted[0] ?? 0,
      max: sorted[sorted.length - 1] ?? 0,
    };
  };

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

    // Measure setAll
    const setAllStats = measure(() => store.setAll(data));

    // Measure getByPrototypeId (lookup all items)
    const getByIdStats = measure(() => {
      for (let id = 1; id <= count; id += 1) {
        const prototype = store.getByPrototypeId(id);
        if (!prototype) {
          throw new Error('Missing prototype in performance test');
        }
      }
    });

    const memory = getMemoryUsage();

    // Log actual measurements for documentation and regression detection
    console.log(
      `PrototypeInMemoryStore perf (${count.toLocaleString()} items):`,
      {
        setAllMs: {
          avg: setAllStats.avg.toFixed(2),
          median: setAllStats.median.toFixed(2),
        },
        getByIdMs: {
          avg: getByIdStats.avg.toFixed(2),
          median: getByIdStats.median.toFixed(2),
        },
        memory: memory
          ? {
              rssMB: Math.round(memory.rss / 1024 / 1024),
              heapUsedMB: Math.round(memory.heapUsed / 1024 / 1024),
            }
          : 'N/A',
      },
    );

    // Loose thresholds to avoid flakiness across environments
    // Using median to be robust against outliers
    expect(setAllStats.median).toBeLessThan(1_000);
    expect(getByIdStats.median).toBeLessThan(1_000);
  };

  it.each([1_000, 3_000, 5_000, 10_000])(
    'handles %i items within reasonable time',
    (count: number) => {
      runPerfCase(count);
    },
  );
});
