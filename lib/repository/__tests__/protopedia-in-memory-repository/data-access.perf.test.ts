/**
 * Performance tests for ProtopediaInMemoryRepository data access operations.
 *
 * This test suite measures the performance characteristics of the
 * ProtopediaInMemoryRepositoryImpl class with various dataset sizes
 * to ensure acceptable response times and memory usage.
 *
 * @remarks
 * These tests are designed to validate performance rather than correctness.
 * They verify that operations remain efficient as the dataset grows,
 * measuring:
 * - Read operation latency (getByPrototypeId, getRandomPrototypeFromSnapshot)
 * - Random sampling performance with different sizes
 * - Memory footprint with large datasets
 * - Algorithm efficiency comparisons (reduce vs for-loop)
 *
 * @module
 */
import type { ResultOfListPrototypesApiResponse } from 'protopedia-api-v2-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createProtopediaApiCustomClient } from '../../../fetcher/index.js';
import { ProtopediaInMemoryRepositoryImpl } from '../../protopedia-in-memory-repository.js';

vi.mock('../../../fetcher/index', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../fetcher/index.js')>();
  return {
    ...actual,
    createProtopediaApiCustomClient: vi.fn(),
  };
});

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

describe('ProtopediaInMemoryRepositoryImpl - data access performance', () => {
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

  /**
   * Helper to measure execution time with warm-up and multiple iterations.
   * Supports both synchronous and asynchronous functions.
   */
  const measure = async (
    fn: () => Promise<void> | void,
    iterations: number = 5,
  ) => {
    // Warm-up (for JIT optimization)
    await fn();

    const durations: number[] = [];
    for (let i = 0; i < iterations; i += 1) {
      const start = performance.now();
      await fn();
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

  const runPerfCase = async (count: number): Promise<void> => {
    const data = Array.from({ length: count }, (_, index) =>
      makePrototype({ id: index + 1, prototypeNm: `Prototype ${index + 1}` }),
    );

    fetchPrototypesMock.mockResolvedValueOnce({ ok: true, data });

    const repo = new ProtopediaInMemoryRepositoryImpl();

    // Setup snapshot (excluded from perf measurement)
    await repo.setupSnapshot({});

    // 1. Measure getPrototypeFromSnapshotByPrototypeId performance
    const getByIdStats = await measure(async () => {
      for (let id = 1; id <= count; id += 1) {
        const prototype = await repo.getPrototypeFromSnapshotByPrototypeId(id);
        if (!prototype) {
          throw new Error(`Missing prototype id=${id} in performance test`);
        }
      }
    });

    // 2. Measure getRandomPrototypeFromSnapshot performance
    const randomStats = await measure(async () => {
      for (let i = 0; i < count; i += 1) {
        const prototype = await repo.getRandomPrototypeFromSnapshot();
        if (!prototype) {
          throw new Error('Missing random prototype in performance test');
        }
      }
    });

    // 3. Measure getRandomSampleFromSnapshot performance
    const sampleSize = Math.min(10, count);
    const sampleIterations = 100;
    const sampleStats = await measure(async () => {
      for (let i = 0; i < sampleIterations; i += 1) {
        const samples = await repo.getRandomSampleFromSnapshot(sampleSize);
        if (samples.length !== sampleSize) {
          throw new Error(
            `Expected ${sampleSize} samples, got ${samples.length}`,
          );
        }
      }
    });

    const memory = getMemoryUsage();

    console.log(
      `Repository data access perf (${count.toLocaleString()} items):`,
      {
        getByIdMs: {
          avg: `${getByIdStats.avg.toFixed(2)}ms`,
          median: `${getByIdStats.median.toFixed(2)}ms`,
          perItem: `${(getByIdStats.median / count).toFixed(4)}ms`,
        },
        randomMs: {
          avg: `${randomStats.avg.toFixed(2)}ms`,
          median: `${randomStats.median.toFixed(2)}ms`,
          perCall: `${(randomStats.median / count).toFixed(4)}ms`,
        },
        sampleMs: {
          avg: `${sampleStats.avg.toFixed(2)}ms`,
          median: `${sampleStats.median.toFixed(2)}ms`,
          perCall: `${(sampleStats.median / sampleIterations).toFixed(4)}ms (size=${sampleSize})`,
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
    expect(getByIdStats.median).toBeLessThan(1_000);
    expect(randomStats.median).toBeLessThan(1_000);
    expect(sampleStats.median).toBeLessThan(2_000);
  };

  it.each([1_000, 3_000, 5_000, 10_000])(
    'handles %i items within reasonable time',
    async (count: number) => {
      await runPerfCase(count);
    },
  );
});
