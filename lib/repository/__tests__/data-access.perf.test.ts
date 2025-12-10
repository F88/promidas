import type { ResultOfListPrototypesApiResponse } from 'protopedia-api-v2-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createProtopediaApiCustomClient } from '../../fetcher/index.js';
import { createProtopediaInMemoryRepositoryImpl } from '../protopedia-in-memory-repository.js';

vi.mock('../../fetcher/index', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../fetcher/index.js')>();
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

describe('ProtopediaInMemoryRepository data access performance', () => {
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

  const runPerfCase = async (count: number): Promise<void> => {
    const data = Array.from({ length: count }, (_, index) =>
      makePrototype({ id: index + 1, prototypeNm: `Prototype ${index + 1}` }),
    );

    fetchPrototypesMock.mockResolvedValueOnce({ ok: true, data });

    const repo = createProtopediaInMemoryRepositoryImpl({}, {});

    // Setup snapshot (excluded from perf measurement)
    await repo.setupSnapshot({});

    // 1. getPrototypeFromSnapshotByPrototypeId performance
    const startGetById = performance.now();
    for (let id = 1; id <= count; id++) {
      const prototype = await repo.getPrototypeFromSnapshotByPrototypeId(id);
      if (!prototype) {
        throw new Error(`Missing prototype id=${id} in performance test`);
      }
    }
    const endGetById = performance.now();

    // 2. getRandomPrototypeFromSnapshot performance
    const startRandom = performance.now();
    for (let i = 0; i < count; i++) {
      const prototype = await repo.getRandomPrototypeFromSnapshot();
      if (!prototype) {
        throw new Error('Missing random prototype in performance test');
      }
    }
    const endRandom = performance.now();

    // 3. getRandomSampleFromSnapshot performance
    const sampleSize = Math.min(10, count);
    const sampleIterations = 100;
    const startSample = performance.now();
    for (let i = 0; i < sampleIterations; i++) {
      const samples = await repo.getRandomSampleFromSnapshot(sampleSize);
      if (samples.length !== sampleSize) {
        throw new Error(
          `Expected ${sampleSize} samples, got ${samples.length}`,
        );
      }
    }
    const endSample = performance.now();

    const getByIdMs = endGetById - startGetById;
    const randomMs = endRandom - startRandom;
    const sampleMs = endSample - startSample;

    const usage =
      typeof globalThis.process !== 'undefined' &&
      typeof globalThis.process.memoryUsage === 'function'
        ? globalThis.process.memoryUsage()
        : undefined;

    console.log(
      `Repository data access perf (${count.toLocaleString()} items):`,
      {
        getByIdMs: `${getByIdMs.toFixed(2)}ms (${(getByIdMs / count).toFixed(4)}ms/item)`,
        randomMs: `${randomMs.toFixed(2)}ms (${(randomMs / count).toFixed(4)}ms/call)`,
        sampleMs: `${sampleMs.toFixed(2)}ms (${(sampleMs / sampleIterations).toFixed(4)}ms/call, size=${sampleSize})`,
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
    expect(getByIdMs).toBeLessThan(1_000);
    expect(randomMs).toBeLessThan(1_000);
    expect(sampleMs).toBeLessThan(2_000);
  };

  it.each([1_000, 3_000, 5_000, 10_000])(
    'handles %i items within reasonable time',
    async (count: number) => {
      await runPerfCase(count);
    },
  );
});
