/**
 * Tests for ProtopediaInMemoryRepositoryImpl event system.
 *
 * Covers event emission, opt-in behavior, and event lifecycle.
 *
 * @module
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProtopediaApiCustomClient } from '../../../fetcher/index.js';
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
  makePrototype,
  setupMocks,
} from './test-helpers.js';

describe('ProtopediaInMemoryRepositoryImpl - event system', () => {
  const { fetchPrototypesMock, resetMocks } = setupMocks();

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
      setAll: vi.fn().mockReturnValue({ dataSizeBytes: 1000 }),
      getStats: vi.fn().mockReturnValue({
        size: 1,
        cachedAt: new Date(),
        isExpired: false,
        remainingTtlMs: 50_000,
        dataSizeBytes: 1000,
        refreshInFlight: false,
      }),
    });

    mockStoreInstance = testContext.mockStoreInstance;
    mockApiClientInstance = testContext.mockApiClientInstance;
    vi.mocked(mockApiClientInstance.fetchPrototypes).mockImplementation(
      fetchPrototypesMock,
    );
  });

  describe('opt-in behavior', () => {
    it('events should be undefined when enableEvents is false (default)', () => {
      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {
          enableEvents: false,
        },
      });

      expect(repo.events).toBeUndefined();
    });

    it('events should be undefined when enableEvents is not provided', () => {
      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });

      expect(repo.events).toBeUndefined();
    });

    it('events should be defined when enableEvents is true', () => {
      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {
          enableEvents: true,
        },
      });

      expect(repo.events).toBeDefined();
      expect(typeof repo.events?.on).toBe('function');
      expect(typeof repo.events?.emit).toBe('function');
      expect(typeof repo.events?.removeAllListeners).toBe('function');
    });
  });

  describe('snapshotStarted event', () => {
    it('emits snapshotStarted with "setup" when setupSnapshot is called', async () => {
      vi.mocked(mockApiClientInstance.fetchPrototypes).mockResolvedValue({
        ok: true,
        data: [makeNormalizedPrototype({ id: 1 })],
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {
          enableEvents: true,
        },
      });

      const snapshotStartedMock = vi.fn();
      repo.events?.on('snapshotStarted', snapshotStartedMock);

      await repo.setupSnapshot({});

      expect(snapshotStartedMock).toHaveBeenCalledTimes(1);
      expect(snapshotStartedMock).toHaveBeenCalledWith('setup');
    });

    it('emits snapshotStarted with "refresh" when refreshSnapshot is called', async () => {
      vi.mocked(mockApiClientInstance.fetchPrototypes).mockResolvedValue({
        ok: true,
        data: [makeNormalizedPrototype({ id: 1 })],
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {
          enableEvents: true,
        },
      });

      await repo.setupSnapshot({});

      const snapshotStartedMock = vi.fn();
      repo.events?.on('snapshotStarted', snapshotStartedMock);

      await repo.refreshSnapshot();

      expect(snapshotStartedMock).toHaveBeenCalledTimes(1);
      expect(snapshotStartedMock).toHaveBeenCalledWith('refresh');
    });

    it('does not emit when events are disabled', async () => {
      vi.mocked(mockApiClientInstance.fetchPrototypes).mockResolvedValue({
        ok: true,
        data: [makeNormalizedPrototype({ id: 1 })],
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {
          enableEvents: false,
        },
      });

      const snapshotStartedMock = vi.fn();

      // events is undefined, so we can't attach a listener
      expect(repo.events).toBeUndefined();

      await repo.setupSnapshot({});

      expect(snapshotStartedMock).not.toHaveBeenCalled();
    });
  });

  describe('snapshotCompleted event', () => {
    it('emits snapshotCompleted with stats on successful setupSnapshot', async () => {
      vi.mocked(mockApiClientInstance.fetchPrototypes).mockResolvedValue({
        ok: true,
        data: [
          makeNormalizedPrototype({ id: 1 }),
          makeNormalizedPrototype({ id: 2 }),
        ],
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {
          enableEvents: true,
        },
      });

      const snapshotCompletedMock = vi.fn();
      repo.events?.on('snapshotCompleted', snapshotCompletedMock);

      const result = await repo.setupSnapshot({});

      expect(result.ok).toBe(true);
      expect(snapshotCompletedMock).toHaveBeenCalledTimes(1);
      if (result.ok) {
        expect(snapshotCompletedMock).toHaveBeenCalledWith(result.stats);
      }
    });

    it('emits snapshotCompleted with stats on successful refreshSnapshot', async () => {
      vi.mocked(mockApiClientInstance.fetchPrototypes).mockResolvedValue({
        ok: true,
        data: [makeNormalizedPrototype({ id: 1 })],
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {
          enableEvents: true,
        },
      });

      await repo.setupSnapshot({});

      const snapshotCompletedMock = vi.fn();
      repo.events?.on('snapshotCompleted', snapshotCompletedMock);

      const result = await repo.refreshSnapshot();

      expect(result.ok).toBe(true);
      expect(snapshotCompletedMock).toHaveBeenCalledTimes(1);
      if (result.ok) {
        expect(snapshotCompletedMock).toHaveBeenCalledWith(result.stats);
      }
    });
  });

  describe('snapshotFailed event', () => {
    it('emits snapshotFailed on setupSnapshot error', async () => {
      const testError = new Error('API error during setup');
      vi.mocked(mockApiClientInstance.fetchPrototypes).mockRejectedValue(
        testError,
      );

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {
          enableEvents: true,
        },
      });

      const snapshotFailedMock = vi.fn();
      repo.events?.on('snapshotFailed', snapshotFailedMock);

      const result = await repo.setupSnapshot({});

      expect(result.ok).toBe(false);
      expect(snapshotFailedMock).toHaveBeenCalledTimes(1);
      if (!result.ok) {
        expect(snapshotFailedMock).toHaveBeenCalledWith(result);
      }
    });

    it('emits snapshotFailed on refreshSnapshot error', async () => {
      // First setup succeeds
      vi.mocked(mockApiClientInstance.fetchPrototypes).mockResolvedValueOnce({
        ok: true,
        data: [makeNormalizedPrototype({ id: 1 })],
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {
          enableEvents: true,
        },
      });

      await repo.setupSnapshot({});

      // Then refresh fails
      const testError = new Error('API error during refresh');
      vi.mocked(mockApiClientInstance.fetchPrototypes).mockRejectedValueOnce(
        testError,
      );

      const snapshotFailedMock = vi.fn();
      repo.events?.on('snapshotFailed', snapshotFailedMock);

      const result = await repo.refreshSnapshot();

      expect(result.ok).toBe(false);
      expect(snapshotFailedMock).toHaveBeenCalledTimes(1);
      if (!result.ok) {
        expect(snapshotFailedMock).toHaveBeenCalledWith(result);
      }
    });
  });

  describe('event coalescing with concurrent calls', () => {
    it('emits events only once when multiple setupSnapshot calls are coalesced', async () => {
      vi.mocked(mockApiClientInstance.fetchPrototypes).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                data: [makeNormalizedPrototype({ id: 1 })],
              });
            }, 50);
          }),
      );

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {
          enableEvents: true,
        },
      });

      const snapshotStartedMock = vi.fn();
      const snapshotCompletedMock = vi.fn();

      repo.events?.on('snapshotStarted', snapshotStartedMock);
      repo.events?.on('snapshotCompleted', snapshotCompletedMock);

      // Make 3 concurrent calls
      const [result1, result2, result3] = await Promise.all([
        repo.setupSnapshot({}),
        repo.setupSnapshot({}),
        repo.setupSnapshot({}),
      ]);

      // All should succeed
      expect(result1.ok).toBe(true);
      expect(result2.ok).toBe(true);
      expect(result3.ok).toBe(true);

      // snapshotStarted fires for each call (not coalesced)
      expect(snapshotStartedMock).toHaveBeenCalledTimes(3);
      expect(snapshotStartedMock).toHaveBeenCalledWith('setup');

      // snapshotCompleted fires only once (coalesced)
      expect(snapshotCompletedMock).toHaveBeenCalledTimes(1);

      // API should be called only once
      expect(mockApiClientInstance.fetchPrototypes).toHaveBeenCalledTimes(1);
    });

    it('emits events only once when multiple refreshSnapshot calls are coalesced', async () => {
      // First setup
      vi.mocked(mockApiClientInstance.fetchPrototypes).mockResolvedValueOnce({
        ok: true,
        data: [makeNormalizedPrototype({ id: 1 })],
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {
          enableEvents: true,
        },
      });

      await repo.setupSnapshot({});
      vi.clearAllMocks();

      // Then make refresh slow to test coalescing
      vi.mocked(mockApiClientInstance.fetchPrototypes).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                data: [
                  makeNormalizedPrototype({ id: 1 }),
                  makeNormalizedPrototype({ id: 2 }),
                ],
              });
            }, 50);
          }),
      );

      const snapshotStartedMock = vi.fn();
      const snapshotCompletedMock = vi.fn();

      repo.events?.on('snapshotStarted', snapshotStartedMock);
      repo.events?.on('snapshotCompleted', snapshotCompletedMock);

      // Make 3 concurrent calls
      const [result1, result2, result3] = await Promise.all([
        repo.refreshSnapshot(),
        repo.refreshSnapshot(),
        repo.refreshSnapshot(),
      ]);

      // All should succeed
      expect(result1.ok).toBe(true);
      expect(result2.ok).toBe(true);
      expect(result3.ok).toBe(true);

      // snapshotStarted fires for each call (not coalesced)
      expect(snapshotStartedMock).toHaveBeenCalledTimes(3);
      expect(snapshotStartedMock).toHaveBeenCalledWith('refresh');

      // snapshotCompleted fires only once (coalesced)
      expect(snapshotCompletedMock).toHaveBeenCalledTimes(1);

      // API should be called only once
      expect(mockApiClientInstance.fetchPrototypes).toHaveBeenCalledTimes(1);
    });
  });

  describe('dispose method', () => {
    it('removes all listeners when dispose is called', async () => {
      vi.mocked(mockApiClientInstance.fetchPrototypes).mockResolvedValue({
        ok: true,
        data: [makeNormalizedPrototype({ id: 1 })],
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {
          enableEvents: true,
        },
      });

      const snapshotStartedMock = vi.fn();
      const snapshotCompletedMock = vi.fn();

      repo.events?.on('snapshotStarted', snapshotStartedMock);
      repo.events?.on('snapshotCompleted', snapshotCompletedMock);

      // Verify listeners are attached
      await repo.setupSnapshot({});
      expect(snapshotStartedMock).toHaveBeenCalledTimes(1);
      expect(snapshotCompletedMock).toHaveBeenCalledTimes(1);

      // Call dispose
      repo.dispose();

      // Reset mocks
      snapshotStartedMock.mockClear();
      snapshotCompletedMock.mockClear();

      // Events should not fire after dispose
      await repo.setupSnapshot({});
      expect(snapshotStartedMock).not.toHaveBeenCalled();
      expect(snapshotCompletedMock).not.toHaveBeenCalled();
    });

    it('dispose does nothing when events are disabled', () => {
      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {
          enableEvents: false,
        },
      });

      // Should not throw
      expect(() => repo.dispose()).not.toThrow();
    });
  });

  describe('multiple listeners', () => {
    it('supports multiple listeners for the same event', async () => {
      vi.mocked(mockApiClientInstance.fetchPrototypes).mockResolvedValue({
        ok: true,
        data: [makeNormalizedPrototype({ id: 1 })],
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {
          enableEvents: true,
        },
      });

      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const listener3 = vi.fn();

      repo.events?.on('snapshotStarted', listener1);
      repo.events?.on('snapshotStarted', listener2);
      repo.events?.on('snapshotStarted', listener3);

      await repo.setupSnapshot({});

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener1).toHaveBeenCalledWith('setup');
      expect(listener2).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledWith('setup');
      expect(listener3).toHaveBeenCalledTimes(1);
      expect(listener3).toHaveBeenCalledWith('setup');
    });

    it('supports removing individual listeners', async () => {
      vi.mocked(mockApiClientInstance.fetchPrototypes).mockResolvedValue({
        ok: true,
        data: [makeNormalizedPrototype({ id: 1 })],
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {
          enableEvents: true,
        },
      });

      const listener1 = vi.fn();
      const listener2 = vi.fn();

      repo.events?.on('snapshotStarted', listener1);
      repo.events?.on('snapshotStarted', listener2);

      await repo.setupSnapshot({});

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);

      // Remove listener1
      repo.events?.off('snapshotStarted', listener1);

      listener1.mockClear();
      listener2.mockClear();

      await repo.refreshSnapshot();

      // Only listener2 should be called
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalledTimes(1);
    });
  });
});
