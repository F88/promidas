import { describe, expect, it } from 'vitest';

import { PrototypeMapStore } from './store';
import type { NormalizedPrototype } from './types';

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

describe('PrototypeMapStore performance (non-strict)', () => {
  const runPerfCase = (count: number): void => {
    const data = Array.from({ length: count }, (_, index) =>
      createPrototype(index + 1),
    );

    const store = new PrototypeMapStore({
      maxPayloadSizeBytes: 30 * 1024 * 1024,
    });

    const startSetAll = performance.now();
    store.setAll(data);
    const endSetAll = performance.now();

    const startGetById = performance.now();
    for (let id = 1; id <= count; id += 1) {
      const prototype = store.getById(id);
      if (!prototype) {
        throw new Error('Missing prototype in performance test');
      }
    }
    const endGetById = performance.now();

    const startRandom = performance.now();
    for (let index = 0; index < count; index += 1) {
      const prototype = store.getRandom();
      if (!prototype) {
        throw new Error('Missing random prototype in performance test');
      }
    }
    const endRandom = performance.now();

    const setAllMs = endSetAll - startSetAll;
    const getByIdMs = endGetById - startGetById;
    const randomMs = endRandom - startRandom;

    const usage =
      typeof globalThis.process !== 'undefined' &&
      typeof globalThis.process.memoryUsage === 'function'
        ? globalThis.process.memoryUsage()
        : undefined;

    console.log(`PrototypeMapStore perf (${count.toLocaleString()} items):`, {
      setAllMs,
      getByIdMs,
      randomMs,
      memory: usage
        ? {
            rss: usage.rss,
            heapTotal: usage.heapTotal,
            heapUsed: usage.heapUsed,
            external: usage.external,
          }
        : 'memoryUsage not available',
    });

    // Loose thresholds to avoid flakiness across environments.
    expect(setAllMs).toBeLessThan(1_000);
    expect(getByIdMs).toBeLessThan(1_000);
    expect(randomMs).toBeLessThan(1_000);
  };

  it.each([1_000, 3_000, 5_000, 10_000])(
    'handles %i items within reasonable time',
    (count: number) => {
      runPerfCase(count);
    },
  );
});
