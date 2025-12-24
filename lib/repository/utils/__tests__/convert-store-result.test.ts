import { describe, expect, it } from 'vitest';

import type { SetResult } from '../../../store/index.js';
import type { SetFailure, SetSuccess } from '../../../store/types/index.js';
import { convertStoreResult } from '../convert-store-result.js';

const makeStoreSuccess = (overrides?: Partial<SetSuccess>): SetSuccess => ({
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

const makeStoreFailure = (overrides?: Partial<SetFailure>): SetFailure => ({
  ok: false,
  origin: 'store',
  kind: 'unknown',
  code: 'STORE_UNKNOWN',
  message: 'Store operation failed',
  dataState: 'UNKNOWN',
  ...overrides,
});

describe('convertStoreResult', () => {
  describe('Success case', () => {
    it('should pass through success result without modification', () => {
      const storeSuccess = makeStoreSuccess();

      const result = convertStoreResult(storeSuccess);

      expect(result).toBe(storeSuccess); // Same object reference
      expect(result).toStrictEqual(storeSuccess);
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

      expect(result).toBe(storeSuccess);
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
  });

  describe('Failure case', () => {
    it('should pass through failure result without modification', () => {
      const storeFailure = makeStoreFailure({
        kind: 'storage_limit',
        code: 'STORE_CAPACITY_EXCEEDED',
        message: 'Data size 15000 bytes exceeds maximum 10000 bytes',
        dataState: 'UNCHANGED',
      });

      const result = convertStoreResult(storeFailure);

      expect(result).toBe(storeFailure); // Same object reference
      expect(result).toStrictEqual(storeFailure);
    });

    it('should preserve ok: false property', () => {
      const storeFailure = makeStoreFailure();

      const result = convertStoreResult(storeFailure);

      expect(result.ok).toBe(false);
    });

    it('should preserve cause when present', () => {
      const cause = new Error('Serialization error');
      const storeFailure = makeStoreFailure({
        kind: 'serialization',
        code: 'STORE_SERIALIZATION_FAILED',
        message: 'Failed to estimate data size during serialization',
        dataState: 'UNCHANGED',
        cause,
      });

      const result = convertStoreResult(storeFailure);

      expect(result).toBe(storeFailure);
      expect(result).toStrictEqual(storeFailure);
    });

    it('should preserve all failure fields', () => {
      const storeFailure = makeStoreFailure({
        kind: 'storage_limit',
        code: 'STORE_CAPACITY_EXCEEDED',
        message: 'Capacity exceeded',
        dataState: 'UNCHANGED',
      });

      const result = convertStoreResult(storeFailure);

      expect(result).toBe(storeFailure);
      expect(result).toMatchObject({
        ok: false,
        origin: 'store',
        kind: 'storage_limit',
        code: 'STORE_CAPACITY_EXCEEDED',
        message: 'Capacity exceeded',
        dataState: 'UNCHANGED',
      });
    });
  });

  describe('Type discrimination', () => {
    it('should correctly discriminate success vs failure', () => {
      const successResult: SetResult = makeStoreSuccess();
      const failureResult: SetResult = makeStoreFailure();

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
