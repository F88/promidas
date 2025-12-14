/**
 * @file Tests for concurrency control in ProtopediaInMemoryRepository.
 *
 * Verifies that concurrent calls to setupSnapshot and refreshSnapshot are
 * properly coalesced to prevent duplicate API requests and race conditions.
 */
import type { ProtoPediaApiClientOptions } from 'protopedia-api-v2-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProtopediaApiCustomClient } from '../../../fetcher/index.js';
import {
  PrototypeInMemoryStore,
  type PrototypeInMemoryStoreConfig,
} from '../../../store/index.js';
import { ProtopediaInMemoryRepositoryImpl } from '../../protopedia-in-memory-repository.js';

vi.mock('../../../fetcher/index', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../fetcher/index.js')>();
  return {
    ...actual,
    ProtopediaApiCustomClient: vi.fn(),
  };
});

vi.mock('../../../store/index', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../store/index.js')>();
  return {
    ...actual,
    PrototypeInMemoryStore: vi.fn(),
  };
});

import { createMockStore, makePrototype, setupMocks } from './test-helpers.js';

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

const createDeferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

describe('ProtopediaInMemoryRepositoryImpl - concurrency (coalescing)', () => {
  const createRepo = (fetchPrototypes: (params: any) => any) => {
    const store = createMockStore({ ttlMs: 30_000 });
    const apiClient = { fetchPrototypes };

    const logger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    return new ProtopediaInMemoryRepositoryImpl({
      store: store as any,
      apiClient: apiClient as any,
      repositoryConfig: { logger: logger as any },
    });
  };

  it('coalesces concurrent setupSnapshot calls into 1 request', async () => {
    const deferred = createDeferred<any>();
    const fetchPrototypesMock = vi
      .fn()
      .mockImplementation(() => deferred.promise);

    const repo = createRepo(fetchPrototypesMock);

    const pending = Promise.all([
      repo.setupSnapshot({} as any),
      repo.setupSnapshot({} as any),
      repo.setupSnapshot({} as any),
    ]);

    await Promise.resolve();
    expect(fetchPrototypesMock).toHaveBeenCalledTimes(1);

    deferred.resolve({
      ok: true,
      data: [makePrototype({ id: 1, prototypeNm: 'p1' })],
    });

    const [r1, r2, r3] = await pending;
    expect(r1).toEqual(r2);
    expect(r2).toEqual(r3);
  });

  it('coalesces setupSnapshot even with different params', async () => {
    const deferred = createDeferred<any>();
    const fetchPrototypesMock = vi
      .fn()
      .mockImplementation(() => deferred.promise);
    const repo = createRepo(fetchPrototypesMock);

    const pending = Promise.all([
      repo.setupSnapshot({ offset: 0, limit: 10 } as any),
      repo.setupSnapshot({ offset: 0, limit: 100 } as any),
    ]);

    await Promise.resolve();
    expect(fetchPrototypesMock).toHaveBeenCalledTimes(1);

    deferred.resolve({
      ok: true,
      data: [makePrototype({ id: 1, prototypeNm: 'p1' })],
    });

    const [r1, r2] = await pending;
    expect(r1).toEqual(r2);
  });

  it('coalesces concurrent refreshSnapshot calls into 1 request', async () => {
    const fetchPrototypesMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      data: [makePrototype({ id: 1, prototypeNm: 'initial' })],
    });

    const repo = createRepo(fetchPrototypesMock);
    await repo.setupSnapshot({ offset: 0, limit: 10 } as any);
    fetchPrototypesMock.mockClear();

    const deferred = createDeferred<any>();
    fetchPrototypesMock.mockImplementation(() => deferred.promise);

    const pending = Promise.all([
      repo.refreshSnapshot(),
      repo.refreshSnapshot(),
      repo.refreshSnapshot(),
    ]);

    await Promise.resolve();
    expect(fetchPrototypesMock).toHaveBeenCalledTimes(1);

    deferred.resolve({
      ok: true,
      data: [makePrototype({ id: 2, prototypeNm: 'refreshed' })],
    });

    const [r1, r2, r3] = await pending;
    expect(r1).toEqual(r2);
    expect(r2).toEqual(r3);
  });

  it('coalesces setupSnapshot and refreshSnapshot when overlapping', async () => {
    const deferred = createDeferred<any>();
    const fetchPrototypesMock = vi
      .fn()
      .mockImplementation(() => deferred.promise);
    const repo = createRepo(fetchPrototypesMock);

    const pending = Promise.all([
      repo.setupSnapshot({ offset: 0, limit: 10 } as any),
      repo.refreshSnapshot(),
    ]);

    await Promise.resolve();
    expect(fetchPrototypesMock).toHaveBeenCalledTimes(1);

    deferred.resolve({
      ok: true,
      data: [makePrototype({ id: 1, prototypeNm: 'p1' })],
    });

    const [r1, r2] = await pending;
    expect(r1).toEqual(r2);
  });
});
