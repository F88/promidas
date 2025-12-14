/**
 * Tests for ProtopediaInMemoryRepositoryImpl configuration and statistics.
 *
 * This test suite validates configuration management and runtime statistics
 * reporting for the in-memory repository.
 *
 * ## Test Coverage
 *
 * ### Configuration Tests (`getConfig`)
 * - Custom TTL configuration retrieval
 * - Custom memory limit configuration
 * - Default value handling
 * - Configuration immutability
 *
 * ### Statistics Tests (`getStats`)
 * - Initial state (empty snapshot)
 *   - `cachedAt` is null before first fetch
 *   - `size` is 0 before population
 * - Post-fetch state
 *   - `cachedAt` timestamp is set
 *   - `size` reflects actual data count
 * - Snapshot updates
 *   - `cachedAt` updates after refresh
 *   - Timestamp ordering (newer > older)
 * - TTL and expiration
 *   - `isExpired` reflects current state
 *   - Immediate post-setup is not expired
 * - Consistency
 *   - Multiple `getStats()` calls return consistent values
 *   - Empty state consistency
 *
 * ## Implementation Notes
 *
 * Statistics are read from the underlying {@link PrototypeInMemoryStore}
 * and represent the current snapshot state, not historical data.
 *
 * @module
 * @see {@link ProtopediaInMemoryRepositoryImpl.getConfig} for configuration access
 * @see {@link ProtopediaInMemoryRepositoryImpl.getStats} for statistics access
 */
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

import { makePrototype, setupMocks } from './test-helpers.js';

describe('ProtopediaInMemoryRepositoryImpl - configuration and statistics', () => {
  const { fetchPrototypesMock, resetMocks } = setupMocks();

  let mockStoreInstance: PrototypeInMemoryStore;
  let mockApiClientInstance: InstanceType<typeof ProtopediaApiCustomClient>;

  beforeEach(() => {
    resetMocks();
    vi.clearAllMocks();

    mockStoreInstance = {
      getConfig: vi.fn().mockReturnValue({
        // Default config for store
        ttlMs: 1800000,
        maxDataSizeBytes: 10485760,
        logLevel: 'info',
      }),
      setAll: vi.fn().mockReturnValue({ dataSizeBytes: 100 }),
      getStats: vi.fn().mockReturnValue({
        // Default stats for store
        size: 0,
        cachedAt: null,
        isExpired: true,
        remainingTtlMs: 0,
        dataSizeBytes: 0,
        refreshInFlight: false,
      }),
      getByPrototypeId: vi.fn().mockReturnValue(null),
      getAll: vi.fn().mockReturnValue([]),
      getPrototypeIds: vi.fn().mockReturnValue([]),
    } as unknown as PrototypeInMemoryStore;

    // mockImplementation for PrototypeInMemoryStore constructor
    vi.mocked(PrototypeInMemoryStore).mockImplementation(
      () => mockStoreInstance,
    );

    mockApiClientInstance = {
      fetchPrototypes: vi.fn(),
    } as unknown as InstanceType<typeof ProtopediaApiCustomClient>;

    vi.mocked(ProtopediaApiCustomClient).mockImplementation(
      () => mockApiClientInstance,
    );
    vi.mocked(mockApiClientInstance.fetchPrototypes).mockImplementation(
      fetchPrototypesMock,
    );
  });

  describe('getConfig', () => {
    it('returns store configuration with custom TTL', () => {
      vi.mocked(mockStoreInstance.getConfig).mockReturnValue({
        ttlMs: 120_000,
        maxDataSizeBytes: 10485760, // Default value
        logLevel: 'info', // Default value
      });
      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });

      const config = repo.getConfig();
      expect(config.ttlMs).toBe(120_000);
    });

    it('returns configuration with custom maxDataSizeBytes', () => {
      vi.mocked(mockStoreInstance.getConfig).mockReturnValue({
        ttlMs: 1800000, // Default value
        maxDataSizeBytes: 5_000_000,
        logLevel: 'info', // Default value
      });
      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });

      const config = repo.getConfig();
      expect(config.maxDataSizeBytes).toBe(5_000_000);
    });

    it('returns configuration with default values', () => {
      // beforeEach で設定されたデフォルト値がそのまま使用される
      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });

      const config = repo.getConfig();
      expect(config.ttlMs).toBeDefined();
      expect(config.maxDataSizeBytes).toBeDefined();
    });
  });

  describe('getStats', () => {
    it('returns null cachedAt and size 0 before any snapshot is created', () => {
      vi.mocked(mockStoreInstance.getStats).mockReturnValueOnce({
        size: 0,
        cachedAt: null,
        isExpired: true,
        remainingTtlMs: 0,
        dataSizeBytes: 0,
        refreshInFlight: false,
      });
      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });

      const stats = repo.getStats();
      expect(stats.cachedAt).toBeNull();
      expect(stats.size).toBe(0);
    });

    it('returns cachedAt as a number after a successful fetch', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [
          makePrototype({
            id: 11,
          }),
        ],
      });

      vi.mocked(mockStoreInstance.setAll).mockReturnValueOnce({
        dataSizeBytes: 100,
      });
      vi.mocked(mockStoreInstance.getStats)
        .mockReturnValueOnce({
          // For initial setupSnapshot call
          size: 1,
          cachedAt: new Date(),
          isExpired: false,
          remainingTtlMs: 50000,
          dataSizeBytes: 100,
          refreshInFlight: false,
        })
        .mockReturnValueOnce({
          // For subsequent getStats call
          size: 1,
          cachedAt: new Date(), // Set to a Date object
          isExpired: false,
          remainingTtlMs: 50000,
          dataSizeBytes: 100,
          refreshInFlight: false,
        });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });
      await repo.setupSnapshot({});

      const stats = repo.getStats();
      expect(stats.cachedAt).toBeInstanceOf(Date);
      expect(stats.cachedAt).not.toBeNull();
      expect(stats.size).toBe(1);
    });

    it('reflects the correct size for multiple prototypes', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [
          makePrototype({ id: 1 }),
          makePrototype({ id: 2 }),
          makePrototype({ id: 3 }),
          makePrototype({ id: 4 }),
          makePrototype({ id: 5 }),
        ],
      });

      vi.mocked(mockStoreInstance.setAll).mockReturnValueOnce({
        dataSizeBytes: 500,
      });
      vi.mocked(mockStoreInstance.getStats).mockReturnValueOnce({
        // For initial setupSnapshot call
        size: 5,
        cachedAt: new Date(),
        isExpired: false,
        remainingTtlMs: 50000,
        dataSizeBytes: 500,
        refreshInFlight: false,
      });
      vi.mocked(mockStoreInstance.getStats).mockReturnValueOnce({
        // For subsequent getStats call
        size: 5, // Expected size
        cachedAt: new Date(),
        isExpired: false,
        remainingTtlMs: 50000,
        dataSizeBytes: 500,
        refreshInFlight: false,
      });
      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });
      await repo.setupSnapshot({});

      const stats = repo.getStats();
      expect(stats.size).toBe(5);
    });

    it('updates cachedAt after refresh', async () => {
      fetchPrototypesMock
        .mockResolvedValueOnce({
          ok: true,
          data: [makePrototype({ id: 1 })],
        })
        .mockResolvedValueOnce({
          ok: true,
          data: [makePrototype({ id: 2 })],
        });

      // Mock getStats calls for various stages of the test
      // getStats is called 4 times: after each setAll (2x) and by test (2x)
      vi.mocked(mockStoreInstance.setAll).mockReturnValue({
        dataSizeBytes: 100,
      });
      vi.mocked(mockStoreInstance.getStats)
        .mockReturnValueOnce({
          // After first setAll in setupSnapshot
          size: 1,
          cachedAt: new Date(2023, 0, 1),
          isExpired: false,
          remainingTtlMs: 50000,
          dataSizeBytes: 100,
          refreshInFlight: false,
        })
        .mockReturnValueOnce({
          // Test calls getStats() - return same value
          size: 1,
          cachedAt: new Date(2023, 0, 1),
          isExpired: false,
          remainingTtlMs: 50000,
          dataSizeBytes: 100,
          refreshInFlight: false,
        })
        .mockReturnValueOnce({
          // After second setAll in refreshSnapshot (updated timestamp)
          size: 1,
          cachedAt: new Date(2023, 0, 2),
          isExpired: false,
          remainingTtlMs: 50000,
          dataSizeBytes: 100,
          refreshInFlight: false,
        })
        .mockReturnValueOnce({
          // Test calls getStats() again - return updated value
          size: 1,
          cachedAt: new Date(2023, 0, 2),
          isExpired: false,
          remainingTtlMs: 50000,
          dataSizeBytes: 100,
          refreshInFlight: false,
        });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });
      await repo.setupSnapshot({});

      const stats1 = repo.getStats();
      const firstCachedAt = stats1.cachedAt;

      // Small delay to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      await repo.refreshSnapshot();

      const stats2 = repo.getStats();
      const secondCachedAt = stats2.cachedAt;

      expect(firstCachedAt).not.toBeNull();
      expect(secondCachedAt).not.toBeNull();
      expect(secondCachedAt!.getTime()).toBeGreaterThan(
        firstCachedAt!.getTime(),
      );
    });

    it('reports isExpired as false immediately after setup with short TTL', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [makePrototype({ id: 1 })],
      });

      vi.mocked(mockStoreInstance.getConfig).mockReturnValueOnce({
        // For repo.getConfig()
        ttlMs: 1000,
        maxDataSizeBytes: 10485760,
        logLevel: 'info',
      });
      vi.mocked(mockStoreInstance.setAll).mockReturnValueOnce({
        dataSizeBytes: 100,
      });
      // getStats is called twice: once after setAll, once by test
      vi.mocked(mockStoreInstance.getStats)
        .mockReturnValueOnce({
          // After setAll in setupSnapshot
          size: 1,
          cachedAt: new Date(),
          isExpired: false,
          remainingTtlMs: 50000,
          dataSizeBytes: 100,
          refreshInFlight: false,
        })
        .mockReturnValueOnce({
          // Test calls getStats()
          size: 1,
          cachedAt: new Date(),
          isExpired: false,
          remainingTtlMs: 50000,
          dataSizeBytes: 100,
          refreshInFlight: false,
        });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });
      await repo.setupSnapshot({});

      const stats = repo.getStats();
      expect(stats.isExpired).toBe(false);
    });

    it('returns consistent stats when called multiple times', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [makePrototype({ id: 1 }), makePrototype({ id: 2 })],
      });

      vi.mocked(mockStoreInstance.setAll).mockReturnValueOnce({
        dataSizeBytes: 200,
      });
      const currentStats = {
        size: 2,
        cachedAt: new Date(),
        isExpired: false,
        remainingTtlMs: 50000,
        dataSizeBytes: 200,
        refreshInFlight: false,
      };
      vi.mocked(mockStoreInstance.getStats).mockReturnValue(currentStats); // Return same stats object

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });
      await repo.setupSnapshot({});

      const stats1 = repo.getStats();
      const stats2 = repo.getStats();
      const stats3 = repo.getStats();

      expect(stats1.size).toBe(stats2.size);
      expect(stats2.size).toBe(stats3.size);
      expect(stats1.cachedAt).toEqual(stats2.cachedAt);
      expect(stats2.cachedAt).toEqual(stats3.cachedAt);
    });

    it('returns consistent cached state when empty', () => {
      // beforeEach のデフォルトモック設定で十分
      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });
      const stats = repo.getStats();

      expect(stats.cachedAt).toBeNull();
      expect(stats.size).toBe(0);
      expect(stats.isExpired).toBe(true);
    });
  });
});
