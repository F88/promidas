import { describe, it, expect } from 'vitest';

import {
  ConfigurationError,
  DataSizeExceededError,
  SizeEstimationError,
  StoreError,
} from '../errors/store-error.js';

describe('Store Error Classes', () => {
  describe('DataSizeExceededError', () => {
    it('creates error with all parameters provided', () => {
      const error = new DataSizeExceededError('UNCHANGED', 5000, 1000);

      expect(error).toBeInstanceOf(DataSizeExceededError);
      expect(error).toBeInstanceOf(StoreError);
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('DataSizeExceededError');
      expect(error.dataState).toBe('UNCHANGED');
      expect(error.dataSizeBytes).toBe(5000);
      expect(error.maxDataSizeBytes).toBe(1000);
      expect(error.message).toContain('5000 bytes');
      expect(error.message).toContain('1000 bytes');
    });

    it('creates error with default dataState when first parameter is undefined', () => {
      const error = new DataSizeExceededError(undefined, 3000, 2000);

      expect(error.dataState).toBe('UNKNOWN');
      expect(error.dataSizeBytes).toBe(3000);
      expect(error.maxDataSizeBytes).toBe(2000);
    });
  });

  describe('SizeEstimationError', () => {
    it('creates error with cause', () => {
      const cause = new Error('JSON.stringify failed');
      const error = new SizeEstimationError('UNCHANGED', cause);

      expect(error).toBeInstanceOf(SizeEstimationError);
      expect(error).toBeInstanceOf(StoreError);
      expect(error.name).toBe('SizeEstimationError');
      expect(error.dataState).toBe('UNCHANGED');
      expect(error.cause).toBe(cause);
    });

    it('creates error with default dataState', () => {
      const error = new SizeEstimationError(undefined, new Error('test'));

      expect(error.dataState).toBe('UNKNOWN');
    });

    it('creates error without cause', () => {
      const error = new SizeEstimationError('UNKNOWN');

      expect(error.dataState).toBe('UNKNOWN');
      expect(error.cause).toBeUndefined();
    });
  });

  describe('ConfigurationError', () => {
    it('creates error with message', () => {
      const error = new ConfigurationError('Invalid TTL value');

      expect(error).toBeInstanceOf(ConfigurationError);
      expect(error).toBeInstanceOf(StoreError);
      expect(error.name).toBe('ConfigurationError');
      expect(error.message).toBe('Invalid TTL value');
      expect(error.dataState).toBe('UNKNOWN');
    });

    it('inherits from StoreError', () => {
      const error = new ConfigurationError('test');

      expect(error).toBeInstanceOf(StoreError);
      expect(error.dataState).toBe('UNKNOWN');
    });
  });

  describe('StoreError (base class)', () => {
    it('creates base error with dataState', () => {
      const error = new StoreError('Test error', 'UNCHANGED');

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('StoreError');
      expect(error.message).toBe('Test error');
      expect(error.dataState).toBe('UNCHANGED');
    });

    it('creates base error with default dataState', () => {
      const error = new StoreError('Test error');

      expect(error.dataState).toBe('UNKNOWN');
    });
  });
});
