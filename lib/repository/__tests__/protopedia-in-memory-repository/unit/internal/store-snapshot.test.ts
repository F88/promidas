/**
 * Tests for ProtopediaInMemoryRepositoryImpl storeSnapshot method.
 *
 * Covers the store snapshot logic including:
 * - Successful storage operations
 * - DataSizeExceededError handling (storage_limit)
 * - SizeEstimationError handling (serialization)
 * - Unexpected error handling (unknown)
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

describe('ProtopediaInMemoryRepositoryImpl - storeSnapshot', () => {
  const { resetMocks } = setupMocks();

  let mockStoreInstance: PrototypeInMemoryStore;
  let mockApiClientInstance: InstanceType<typeof ProtopediaApiCustomClient>;

  beforeEach(() => {
    resetMocks();
    vi.clearAllMocks();

    const testContext = createTestContext();
    mockStoreInstance = testContext.mockStoreInstance;
    mockApiClientInstance = testContext.mockApiClientInstance;
  });

  describe('successful storage', () => {
    it('should store data and return stats on success', () => {
      const mockStats = {
        size: 3,
        dataSizeBytes: 1500,
        maxDataSizeBytes: 10000,
        cachedAt: new Date('2024-01-01T00:00:00Z'),
        ttlMs: 30000,
        expiresAt: new Date('2024-01-01T00:00:30Z'),
        isExpired: false,
        remainingTtlMs: 30000,
        refreshInFlight: false,
      };

      vi.mocked(mockStoreInstance.setAll).mockReturnValue({
        dataSizeBytes: 1500,
      });
      vi.mocked(mockStoreInstance.getStats).mockReturnValue(mockStats);

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
      });

      const testData = [
        makeNormalizedPrototype({ id: 1 }),
        makeNormalizedPrototype({ id: 2 }),
        makeNormalizedPrototype({ id: 3 }),
      ];

      const result = (repo as any).storeSnapshot(testData);

      expect(result).toEqual({
        ok: true,
        stats: mockStats,
      });
      expect(mockStoreInstance.setAll).toHaveBeenCalledWith(testData);
      expect(mockStoreInstance.setAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('DataSizeExceededError handling', () => {
    it('should return StoreSnapshotFailure with storage_limit kind when dataState is UNCHANGED', () => {
      const error = new DataSizeExceededError('UNCHANGED', 15000, 10000);

      vi.mocked(mockStoreInstance.setAll).mockImplementation(() => {
        throw error;
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
      });

      const testData = [makeNormalizedPrototype({ id: 1 })];
      const result = (repo as any).storeSnapshot(testData);

      expect(result).toEqual({
        ok: false,
        origin: 'store',
        kind: 'storage_limit',
        code: 'STORE_CAPACITY_EXCEEDED',
        dataState: 'UNCHANGED',
        message: 'Data size 15000 bytes exceeds maximum 10000 bytes',
      });
    });

    it('should return StoreSnapshotFailure with storage_limit kind when dataState is UNKNOWN', () => {
      const error = new DataSizeExceededError('UNKNOWN', 20000, 10000);

      vi.mocked(mockStoreInstance.setAll).mockImplementation(() => {
        throw error;
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
      });

      const testData = [makeNormalizedPrototype({ id: 1 })];
      const result = (repo as any).storeSnapshot(testData);

      expect(result).toEqual({
        ok: false,
        origin: 'store',
        kind: 'storage_limit',
        code: 'STORE_CAPACITY_EXCEEDED',
        dataState: 'UNKNOWN',
        message: 'Data size 20000 bytes exceeds maximum 10000 bytes',
      });
    });
  });

  describe('SizeEstimationError handling', () => {
    it('should return StoreSnapshotFailure with serialization kind when dataState is UNCHANGED', () => {
      const circularRef: any = {};
      circularRef.self = circularRef;

      const error = new SizeEstimationError(
        'UNCHANGED',
        new TypeError('Converting circular structure to JSON'),
      );

      vi.mocked(mockStoreInstance.setAll).mockImplementation(() => {
        throw error;
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
      });

      const testData = [makeNormalizedPrototype({ id: 1 })];
      const result = (repo as any).storeSnapshot(testData);

      expect(result.ok).toBe(false);
      expect(result.origin).toBe('store');
      expect(result.kind).toBe('serialization');
      expect(result.code).toBe('STORE_SERIALIZATION_FAILED');
      expect(result.dataState).toBe('UNCHANGED');
      expect(result.message).toBe(
        'Failed to estimate data size during serialization',
      );
      expect(result.cause).toBeDefined();
      // Cause is sanitized, so check it's a serializable object
      expect(typeof result.cause).toBe('object');
    });

    it('should return StoreSnapshotFailure with serialization kind when dataState is UNKNOWN', () => {
      const error = new SizeEstimationError(
        'UNKNOWN',
        new Error('JSON.stringify failed'),
      );

      vi.mocked(mockStoreInstance.setAll).mockImplementation(() => {
        throw error;
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
      });

      const testData = [makeNormalizedPrototype({ id: 1 })];
      const result = (repo as any).storeSnapshot(testData);

      expect(result.ok).toBe(false);
      expect(result.origin).toBe('store');
      expect(result.kind).toBe('serialization');
      expect(result.code).toBe('STORE_SERIALIZATION_FAILED');
      expect(result.dataState).toBe('UNKNOWN');
      expect(result.message).toBe(
        'Failed to estimate data size during serialization',
      );
      expect(result.cause).toBeDefined();
      expect(typeof result.cause).toBe('object');
    });

    it('should sanitize non-Error cause values', () => {
      const error = new SizeEstimationError('UNCHANGED', {
        someComplexObject: 'with circular ref',
      } as any);

      vi.mocked(mockStoreInstance.setAll).mockImplementation(() => {
        throw error;
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
      });

      const testData = [makeNormalizedPrototype({ id: 1 })];
      const result = (repo as any).storeSnapshot(testData);

      expect(result.ok).toBe(false);
      expect(result.origin).toBe('store');
      expect(result.kind).toBe('serialization');
      expect(result.code).toBe('STORE_SERIALIZATION_FAILED');
      expect(result.cause).toBeDefined();
      // Cause should be sanitized to a safe object
      expect(typeof result.cause).toBe('object');
    });
  });

  describe('unexpected error handling', () => {
    it('should return StoreOperationFailure with unknown kind for unexpected Error instances', () => {
      const error = new Error('Unexpected storage error');

      vi.mocked(mockStoreInstance.setAll).mockImplementation(() => {
        throw error;
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
      });

      const testData = [makeNormalizedPrototype({ id: 1 })];
      const result = (repo as any).storeSnapshot(testData);

      expect(result.ok).toBe(false);
      expect(result.origin).toBe('store');
      expect(result.kind).toBe('unknown');
      expect(result.code).toBe('STORE_UNKNOWN');
      expect(result.message).toBe('Unexpected storage error');
      expect(result.dataState).toBe('UNKNOWN');
      expect(result.cause).toBeDefined();
    });

    it('should return StoreOperationFailure with unknown kind for non-Error thrown values', () => {
      vi.mocked(mockStoreInstance.setAll).mockImplementation(() => {
        throw 'String error message';
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
      });

      const testData = [makeNormalizedPrototype({ id: 1 })];
      const result = (repo as any).storeSnapshot(testData);

      expect(result.ok).toBe(false);
      expect(result.origin).toBe('store');
      expect(result.kind).toBe('unknown');
      expect(result.code).toBe('STORE_UNKNOWN');
      expect(result.message).toBe('String error message');
      expect(result.dataState).toBe('UNKNOWN');
      expect(result.cause).toBe('String error message');
    });

    it('should handle null/undefined thrown values', () => {
      vi.mocked(mockStoreInstance.setAll).mockImplementation(() => {
        throw null;
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
      });

      const testData = [makeNormalizedPrototype({ id: 1 })];
      const result = (repo as any).storeSnapshot(testData);

      expect(result.ok).toBe(false);
      expect(result.origin).toBe('store');
      expect(result.kind).toBe('unknown');
      expect(result.code).toBe('STORE_UNKNOWN');
      expect(result.message).toBe('null');
      expect(result.dataState).toBe('UNKNOWN');
      expect(result.cause).toBe(null);
    });
  });
});
