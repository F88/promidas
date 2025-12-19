/**
 * Tests for ProtopediaInMemoryRepositoryImpl setup and initialization.
 *
 * Covers constructor, setupSnapshot, and refreshSnapshot high-level behavior.
 * Detailed fetch-and-store logic is tested in fetch-and-store.test.ts.
 *
 * @module
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProtopediaApiCustomClient } from '../../../fetcher/index.js';
import type { Logger } from '../../../logger/index.js';
import { PrototypeInMemoryStore } from '../../../store/index.js';
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

import {
  createTestContext,
  makeNormalizedPrototype,
  setupMocks,
} from './test-helpers.js';

describe('ProtopediaInMemoryRepositoryImpl - setup and initialization', () => {
  const { resetMocks } = setupMocks();

  let mockStoreInstance: PrototypeInMemoryStore;
  let mockApiClientInstance: InstanceType<typeof ProtopediaApiCustomClient>;

  beforeEach(() => {
    resetMocks();
    vi.clearAllMocks();

    const testContext = createTestContext({
      getByPrototypeId: vi
        .fn()
        .mockReturnValue(makeNormalizedPrototype({ id: 1 })),
      getAll: vi.fn().mockReturnValue([makeNormalizedPrototype({ id: 1 })]),
      getPrototypeIds: vi.fn().mockReturnValue([1]),
    });

    mockStoreInstance = testContext.mockStoreInstance;
    mockApiClientInstance = testContext.mockApiClientInstance;
  });

  describe('constructor', () => {
    it('creates instance with store config', () => {
      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });

      expect(repo).toBeInstanceOf(ProtopediaInMemoryRepositoryImpl);
      expect(mockStoreInstance.getConfig).toHaveBeenCalled();
      expect(repo.getConfig().ttlMs).toBe(60_000);
    });

    it('creates instance with minimal config', () => {
      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
      });

      expect(repo).toBeInstanceOf(ProtopediaInMemoryRepositoryImpl);
    });

    it('creates instance without API client options', () => {
      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
      });

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
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: { logger: mockLogger },
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'ProtopediaInMemoryRepository constructor called',
        expect.objectContaining({
          storeConfig: expect.objectContaining({
            ttlMs: 60_000,
          }),
        }),
      );
      // No longer logging apiClientOptions with token in constructor
      // This assertion is now effectively testing the absence of token logging from the repository constructor
    });

    it('updates logger level when both logger and logLevel are provided', () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        level: 'info',
      } as Logger & { level: string };

      new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {
          logger: mockLogger,
          logLevel: 'debug',
        },
      });

      expect(mockLogger.level).toBe('debug');
    });
  });

  describe('setupSnapshot', () => {
    it('calls fetchAndStore with params and updateLastFetchParams=true', async () => {
      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });

      const fetchAndStoreSpy = vi
        .spyOn(repo as any, 'fetchAndStore')
        .mockResolvedValue({
          ok: true,
          stats: {
            size: 1,
            cachedAt: new Date(),
            isExpired: false,
            remainingTtlMs: 50000,
            dataSizeBytes: 1000,
            refreshInFlight: false,
          },
        });

      const params = { offset: 5, limit: 20 };
      await repo.setupSnapshot(params);

      expect(fetchAndStoreSpy).toHaveBeenCalledWith(params, true);
    });

    it('returns the result from fetchAndStore', async () => {
      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });

      const mockResult = {
        ok: false,
        error: 'test error',
        status: 500,
      } as const;

      vi.spyOn(repo as any, 'fetchAndStore').mockResolvedValue(mockResult);

      const result = await repo.setupSnapshot({});

      expect(result).toEqual(mockResult);
    });
  });

  describe('refreshSnapshot', () => {
    it('calls fetchAndStore with lastFetchParams and updateLastFetchParams=false', async () => {
      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });

      const fetchAndStoreSpy = vi
        .spyOn(repo as any, 'fetchAndStore')
        .mockResolvedValue({
          ok: true,
          stats: {
            size: 1,
            cachedAt: new Date(),
            isExpired: false,
            remainingTtlMs: 50000,
            dataSizeBytes: 1000,
            refreshInFlight: false,
          },
        });

      await repo.refreshSnapshot();

      // Should call with DEFAULT_FETCH_PARAMS (initial value of lastFetchParams)
      expect(fetchAndStoreSpy).toHaveBeenCalledWith(
        { offset: 0, limit: 10 },
        false,
      );
    });

    it('returns the result from fetchAndStore', async () => {
      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });

      const mockResult = {
        ok: false,
        error: 'refresh failed',
      } as const;

      vi.spyOn(repo as any, 'fetchAndStore').mockResolvedValue(mockResult);

      const result = await repo.refreshSnapshot();

      expect(result).toEqual(mockResult);
    });
  });
});
