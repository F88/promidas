import { describe, expect, it } from 'vitest';

import type {
  StoreOperationFailure,
  StoreOperationResult,
  StoreOperationSuccess,
} from '../../types/store-operation-result.types.js';
import { convertStoreResult } from '../convert-store-result.js';

const makeStoreSuccess = (
  overrides?: Partial<StoreOperationSuccess>,
): StoreOperationSuccess => ({
  ok: true,
  stats: {
    size: 100,
    cachedAt: new Date('2025-12-24T00:00:00.000Z'),
    isExpired: false,
    remainingTtlMs: 3600000,
    dataSizeBytes: 1024,
    refreshInFlight: false,
  },
  ...overrides,
});

const makeStoreFailure = (
  overrides?: Partial<StoreOperationFailure>,
): StoreOperationFailure => ({
  ok: false,
  origin: 'store',
  kind: 'unknown',
  code: 'STORE_UNKNOWN',
  message: 'Store operation failed',
  dataState: 'UNKNOWN',
  ...overrides,
});

describe('convertStoreResult', () => {
  describe('Success conversion', () => {
    it('should convert success result with stats', () => {
      const storeSuccess = makeStoreSuccess();

      const result = convertStoreResult(storeSuccess);

      expect(result).toStrictEqual({
        ok: true,
        stats: {
          size: 100,
          cachedAt: new Date('2025-12-24T00:00:00.000Z'),
          isExpired: false,
          remainingTtlMs: 3600000,
          dataSizeBytes: 1024,
          refreshInFlight: false,
        },
      });
    });

    it('should preserve ok: true property', () => {
      const storeSuccess = makeStoreSuccess();

      const result = convertStoreResult(storeSuccess);

      expect(result.ok).toBe(true);
    });

    it('should preserve all stats fields', () => {
      const storeSuccess = makeStoreSuccess({
        stats: {
          size: 500,
          cachedAt: new Date('2025-12-25T12:00:00.000Z'),
          isExpired: true,
          remainingTtlMs: 0,
          dataSizeBytes: 5120,
          refreshInFlight: true,
        },
      });

      const result = convertStoreResult(storeSuccess);

      expect(result).toMatchObject({
        ok: true,
        stats: {
          size: 500,
          cachedAt: new Date('2025-12-25T12:00:00.000Z'),
          isExpired: true,
          remainingTtlMs: 0,
          dataSizeBytes: 5120,
          refreshInFlight: true,
        },
      });
    });

    it('should not mutate the input object', () => {
      const storeSuccess = makeStoreSuccess();
      const original = JSON.parse(
        JSON.stringify(storeSuccess, (_, value) => {
          if (value instanceof Date) return value.toISOString();
          return value;
        }),
      );

      convertStoreResult(storeSuccess);

      expect(
        JSON.parse(
          JSON.stringify(storeSuccess, (_, value) => {
            if (value instanceof Date) return value.toISOString();
            return value;
          }),
        ),
      ).toStrictEqual(original);
    });
  });

  describe('Failure conversion', () => {
    it('should convert failure with all required fields', () => {
      const storeFailure = makeStoreFailure({
        kind: 'storage_limit',
        code: 'STORE_CAPACITY_EXCEEDED',
        message: 'Data size 15000 bytes exceeds maximum 10000 bytes',
        dataState: 'UNCHANGED',
      });

      const result = convertStoreResult(storeFailure);

      expect(result).toStrictEqual({
        ok: false,
        origin: 'store',
        kind: 'storage_limit',
        code: 'STORE_CAPACITY_EXCEEDED',
        message: 'Data size 15000 bytes exceeds maximum 10000 bytes',
        dataState: 'UNCHANGED',
      });
    });

    it('should preserve ok: false property', () => {
      const storeFailure = makeStoreFailure();

      const result = convertStoreResult(storeFailure);

      expect(result.ok).toBe(false);
    });

    it('should include cause when present', () => {
      const cause = new Error('Serialization error');
      const storeFailure = makeStoreFailure({
        kind: 'serialization',
        code: 'STORE_SERIALIZATION_FAILED',
        message: 'Failed to estimate data size during serialization',
        dataState: 'UNCHANGED',
        cause,
      });

      const result = convertStoreResult(storeFailure);

      expect(result).toStrictEqual({
        ok: false,
        origin: 'store',
        kind: 'serialization',
        code: 'STORE_SERIALIZATION_FAILED',
        message: 'Failed to estimate data size during serialization',
        dataState: 'UNCHANGED',
        cause,
      });
    });

    it('should omit cause when undefined', () => {
      const storeFailure = makeStoreFailure({
        kind: 'storage_limit',
        code: 'STORE_CAPACITY_EXCEEDED',
        message: 'Capacity exceeded',
        dataState: 'UNCHANGED',
      });

      const result = convertStoreResult(storeFailure);

      expect(result).not.toHaveProperty('cause');
    });

    it('should not mutate the input object', () => {
      const storeFailure = makeStoreFailure({
        kind: 'storage_limit',
        code: 'STORE_CAPACITY_EXCEEDED',
        message: 'Capacity exceeded',
        dataState: 'UNCHANGED',
      });
      const original = JSON.parse(
        JSON.stringify(storeFailure),
      ) as StoreOperationFailure;

      convertStoreResult(storeFailure);

      expect(storeFailure).toStrictEqual(original);
    });
  });

  describe('Different failure kinds', () => {
    it('should handle storage_limit failure', () => {
      const storeFailure = makeStoreFailure({
        kind: 'storage_limit',
        code: 'STORE_CAPACITY_EXCEEDED',
        message: 'Data size exceeds limit',
        dataState: 'UNCHANGED',
      });

      const result = convertStoreResult(storeFailure);

      expect(result).toMatchObject({
        ok: false,
        origin: 'store',
        kind: 'storage_limit',
        code: 'STORE_CAPACITY_EXCEEDED',
      });
    });

    it('should handle serialization failure', () => {
      const storeFailure = makeStoreFailure({
        kind: 'serialization',
        code: 'STORE_SERIALIZATION_FAILED',
        message: 'Serialization failed',
        dataState: 'UNCHANGED',
        cause: { type: 'TypeError' },
      });

      const result = convertStoreResult(storeFailure);

      expect(result).toMatchObject({
        ok: false,
        origin: 'store',
        kind: 'serialization',
        code: 'STORE_SERIALIZATION_FAILED',
        cause: { type: 'TypeError' },
      });
    });

    it('should handle unknown failure', () => {
      const storeFailure = makeStoreFailure({
        kind: 'unknown',
        code: 'STORE_UNKNOWN',
        message: 'Unexpected error',
        dataState: 'UNKNOWN',
      });

      const result = convertStoreResult(storeFailure);

      expect(result).toMatchObject({
        ok: false,
        origin: 'store',
        kind: 'unknown',
        code: 'STORE_UNKNOWN',
        dataState: 'UNKNOWN',
      });
    });
  });

  describe('Data state handling', () => {
    it('should preserve UNCHANGED data state', () => {
      const storeFailure = makeStoreFailure({
        dataState: 'UNCHANGED',
      });

      const result = convertStoreResult(storeFailure);

      expect(result).toMatchObject({
        dataState: 'UNCHANGED',
      });
    });

    it('should preserve UNKNOWN data state', () => {
      const storeFailure = makeStoreFailure({
        dataState: 'UNKNOWN',
      });

      const result = convertStoreResult(storeFailure);

      expect(result).toMatchObject({
        dataState: 'UNKNOWN',
      });
    });
  });

  describe('Type discrimination', () => {
    it('should correctly discriminate success vs failure', () => {
      const successResult: StoreOperationResult = makeStoreSuccess();
      const failureResult: StoreOperationResult = makeStoreFailure();

      const convertedSuccess = convertStoreResult(successResult);
      const convertedFailure = convertStoreResult(failureResult);

      if (convertedSuccess.ok) {
        expect(convertedSuccess.stats).toBeDefined();
      } else {
        expect.fail('Success result should have ok: true');
      }

      if (!convertedFailure.ok) {
        expect(convertedFailure.message).toBeDefined();
        expect(convertedFailure.origin).toBe('store');
        if (convertedFailure.origin === 'store') {
          expect(convertedFailure.code).toBeDefined();
        }
      } else {
        expect.fail('Failure result should have ok: false');
      }
    });
  });
});
