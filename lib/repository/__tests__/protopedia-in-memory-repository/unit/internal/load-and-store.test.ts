/**
 * Tests for ProtopediaInMemoryRepositoryImpl loadAndStore method.
 *
 * Covers the core validation-and-store logic for setupSnapshotFromSerializedData.
 *
 * @module
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProtopediaApiCustomClient } from '../../../../../fetcher/index.js';
import {
  DataSizeExceededError,
  SizeEstimationError,
  PrototypeInMemoryStore,
} from '../../../../../store/index.js';
import { ProtopediaInMemoryRepositoryImpl } from '../../../../protopedia-in-memory-repository.js';
import type { SerializableSnapshot } from '../../../../types/index.js';
import {
  createTestContext,
  makeNormalizedPrototype,
  setupMocks,
} from '../../test-helpers.js';

vi.mock('../../../../../fetcher/index', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../../../fetcher/index.js')>();
  return {
    ...actual,
    ProtopediaApiCustomClient: vi.fn(),
  };
});

vi.mock('../../../../../store/index', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../../../store/index.js')>();
  return {
    ...actual,
    PrototypeInMemoryStore: vi.fn(),
  };
});

describe('ProtopediaInMemoryRepositoryImpl - loadAndStore', () => {
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

  describe('validation and store operations', () => {
    it('validates data and stores successfully with valid snapshot', () => {
      const validSnapshot: SerializableSnapshot = {
        version: '1.0.0',
        serializedAt: new Date().toISOString(),
        prototypes: [
          makeNormalizedPrototype({ id: 1, prototypeNm: 'Test Proto' }),
        ],
      };

      vi.mocked(mockStoreInstance.setAll).mockReturnValueOnce({
        dataSizeBytes: 500,
      });
      vi.mocked(mockStoreInstance.getStats).mockReturnValueOnce({
        size: 1,
        cachedAt: new Date(),
        isExpired: false,
        remainingTtlMs: 60000,
        dataSizeBytes: 500,
        refreshInFlight: false,
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });

      const result = (repo as any).loadAndStore(validSnapshot);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.stats.size).toBe(1);
        expect(result.stats.dataSizeBytes).toBe(500);
      }
      expect(mockStoreInstance.setAll).toHaveBeenCalledWith(
        validSnapshot.prototypes,
      );
    });

    it('handles empty prototypes array', () => {
      const emptySnapshot: SerializableSnapshot = {
        version: '1.0.0',
        serializedAt: new Date().toISOString(),
        prototypes: [],
      };

      vi.mocked(mockStoreInstance.setAll).mockReturnValueOnce({
        dataSizeBytes: 2,
      });
      vi.mocked(mockStoreInstance.getStats).mockReturnValueOnce({
        size: 0,
        cachedAt: new Date(),
        isExpired: false,
        remainingTtlMs: 60000,
        dataSizeBytes: 2,
        refreshInFlight: false,
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });

      const result = (repo as any).loadAndStore(emptySnapshot);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.stats.size).toBe(0);
      }
    });

    it('handles multiple prototypes', () => {
      const snapshot: SerializableSnapshot = {
        version: '1.0.0',
        serializedAt: new Date().toISOString(),
        prototypes: [
          makeNormalizedPrototype({ id: 1, prototypeNm: 'Proto 1' }),
          makeNormalizedPrototype({ id: 2, prototypeNm: 'Proto 2' }),
          makeNormalizedPrototype({ id: 3, prototypeNm: 'Proto 3' }),
        ],
      };

      vi.mocked(mockStoreInstance.setAll).mockReturnValueOnce({
        dataSizeBytes: 1500,
      });
      vi.mocked(mockStoreInstance.getStats).mockReturnValueOnce({
        size: 3,
        cachedAt: new Date(),
        isExpired: false,
        remainingTtlMs: 60000,
        dataSizeBytes: 1500,
        refreshInFlight: false,
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });

      const result = (repo as any).loadAndStore(snapshot);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.stats.size).toBe(3);
      }
      expect(mockStoreInstance.setAll).toHaveBeenCalledWith(
        snapshot.prototypes,
      );
    });
  });

  describe('validation errors', () => {
    it('returns failure for invalid version format', () => {
      const invalidSnapshot = {
        version: 'not-semver',
        serializedAt: new Date().toISOString(),
        prototypes: [makeNormalizedPrototype({ id: 1 })],
      };

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });

      const result = (repo as any).loadAndStore(invalidSnapshot);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.origin).toBe('repository');
        expect(result.message).toContain('Version must be in semver format');
      }
    });

    it('returns failure for missing version field', () => {
      const invalidSnapshot = {
        serializedAt: new Date().toISOString(),
        prototypes: [makeNormalizedPrototype({ id: 1 })],
      };

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });

      const result = (repo as any).loadAndStore(invalidSnapshot);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.origin).toBe('repository');
        expect(result.message).toContain('expected string, received undefined');
      }
    });

    it('returns failure for missing serializedAt field', () => {
      const invalidSnapshot = {
        version: '1.0.0',
        prototypes: [makeNormalizedPrototype({ id: 1 })],
      };

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });

      const result = (repo as any).loadAndStore(invalidSnapshot);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.origin).toBe('repository');
        expect(result.message).toContain('serializedAt');
      }
    });

    it('returns failure for invalid serializedAt format', () => {
      const invalidSnapshot = {
        version: '1.0.0',
        serializedAt: 'not-iso-date',
        prototypes: [makeNormalizedPrototype({ id: 1 })],
      };

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });

      const result = (repo as any).loadAndStore(invalidSnapshot);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.origin).toBe('repository');
        expect(result.message).toContain('ISO-8601 UTC timestamp');
      }
    });

    it('returns failure for missing prototypes field', () => {
      const invalidSnapshot = {
        version: '1.0.0',
        serializedAt: new Date().toISOString(),
      };

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });

      const result = (repo as any).loadAndStore(invalidSnapshot);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.origin).toBe('repository');
        expect(result.message).toContain('prototypes');
      }
    });

    it('returns failure for non-array prototypes field', () => {
      const invalidSnapshot = {
        version: '1.0.0',
        serializedAt: new Date().toISOString(),
        prototypes: 'not-an-array',
      };

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });

      const result = (repo as any).loadAndStore(invalidSnapshot);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.origin).toBe('repository');
        expect(result.message).toContain('expected array, received string');
      }
    });

    it('returns failure for invalid prototype structure in array', () => {
      const invalidSnapshot = {
        version: '1.0.0',
        serializedAt: new Date().toISOString(),
        prototypes: [{ id: 'not-a-number' }],
      };

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });

      const result = (repo as any).loadAndStore(invalidSnapshot);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.origin).toBe('repository');
        expect(result.message).toContain('Invalid input');
      }
    });
  });

  describe('store errors', () => {
    it('returns failure when DataSizeExceededError is thrown', () => {
      const validSnapshot: SerializableSnapshot = {
        version: '1.0.0',
        serializedAt: new Date().toISOString(),
        prototypes: [makeNormalizedPrototype({ id: 1 })],
      };

      vi.mocked(mockStoreInstance.setAll).mockImplementationOnce(() => {
        throw new DataSizeExceededError('UNCHANGED', 20000, 10000);
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });

      const result = (repo as any).loadAndStore(validSnapshot);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.origin).toBe('store');
        expect(result.kind).toBe('storage_limit');
        expect(result.code).toBe('STORE_CAPACITY_EXCEEDED');
      }
    });

    it('returns failure when SizeEstimationError is thrown', () => {
      const validSnapshot: SerializableSnapshot = {
        version: '1.0.0',
        serializedAt: new Date().toISOString(),
        prototypes: [makeNormalizedPrototype({ id: 1 })],
      };

      const circularError = new Error('Circular structure');
      vi.mocked(mockStoreInstance.setAll).mockImplementationOnce(() => {
        throw new SizeEstimationError('UNCHANGED', circularError);
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });

      const result = (repo as any).loadAndStore(validSnapshot);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.origin).toBe('store');
        expect(result.kind).toBe('serialization');
        expect(result.code).toBe('STORE_SERIALIZATION_FAILED');
      }
    });

    it('returns failure for unexpected Error thrown by store', () => {
      const validSnapshot: SerializableSnapshot = {
        version: '1.0.0',
        serializedAt: new Date().toISOString(),
        prototypes: [makeNormalizedPrototype({ id: 1 })],
      };

      vi.mocked(mockStoreInstance.setAll).mockImplementationOnce(() => {
        throw new Error('Unexpected store error');
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });

      const result = (repo as any).loadAndStore(validSnapshot);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.origin).toBe('store');
        expect(result.kind).toBe('unknown');
        expect(result.message).toBe('Unexpected store error');
      }
    });

    it('returns failure for non-Error thrown by store', () => {
      const validSnapshot: SerializableSnapshot = {
        version: '1.0.0',
        serializedAt: new Date().toISOString(),
        prototypes: [makeNormalizedPrototype({ id: 1 })],
      };

      vi.mocked(mockStoreInstance.setAll).mockImplementationOnce(() => {
        throw 'String error';
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
        repositoryConfig: {},
      });

      const result = (repo as any).loadAndStore(validSnapshot);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.origin).toBe('store');
        expect(result.kind).toBe('unknown');
        expect(result.message).toBe('String error');
      }
    });
  });
});
