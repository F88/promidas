/**
 * Unit tests for RepositoryParamsValidator class.
 */
import { describe, expect, it } from 'vitest';

import { ValidationError } from '../../errors/validation-error.js';
import { RepositoryParamsValidator } from '../params-validators.js';

describe('RepositoryParamsValidator', () => {
  describe('validatePrototypeId', () => {
    it('should accept positive integers', () => {
      expect(() =>
        RepositoryParamsValidator.validatePrototypeId(1),
      ).not.toThrow();
      expect(() =>
        RepositoryParamsValidator.validatePrototypeId(123),
      ).not.toThrow();
      expect(() =>
        RepositoryParamsValidator.validatePrototypeId(999999),
      ).not.toThrow();
    });

    it('should reject zero', () => {
      expect(() => RepositoryParamsValidator.validatePrototypeId(0)).toThrow(
        ValidationError,
      );
      try {
        RepositoryParamsValidator.validatePrototypeId(0);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        if (error instanceof ValidationError) {
          expect(error.field).toBe('prototypeId');
        }
      }
    });

    it('should reject negative integers', () => {
      expect(() => RepositoryParamsValidator.validatePrototypeId(-1)).toThrow(
        ValidationError,
      );
      expect(() => RepositoryParamsValidator.validatePrototypeId(-100)).toThrow(
        ValidationError,
      );
    });

    it('should reject non-integer numbers', () => {
      expect(() => RepositoryParamsValidator.validatePrototypeId(1.5)).toThrow(
        ValidationError,
      );
      expect(() => RepositoryParamsValidator.validatePrototypeId(3.14)).toThrow(
        ValidationError,
      );
    });
  });

  describe('validateSampleSize', () => {
    it('should accept positive integers', () => {
      expect(() =>
        RepositoryParamsValidator.validateSampleSize(1),
      ).not.toThrow();
      expect(() =>
        RepositoryParamsValidator.validateSampleSize(10),
      ).not.toThrow();
      expect(() =>
        RepositoryParamsValidator.validateSampleSize(1000),
      ).not.toThrow();
    });

    it('should accept zero', () => {
      expect(() =>
        RepositoryParamsValidator.validateSampleSize(0),
      ).not.toThrow();
    });

    it('should accept negative integers', () => {
      expect(() =>
        RepositoryParamsValidator.validateSampleSize(-1),
      ).not.toThrow();
      expect(() =>
        RepositoryParamsValidator.validateSampleSize(-5),
      ).not.toThrow();
    });

    it('should reject non-integer numbers', () => {
      expect(() => RepositoryParamsValidator.validateSampleSize(1.5)).toThrow(
        ValidationError,
      );
      expect(() => RepositoryParamsValidator.validateSampleSize(3.14)).toThrow(
        ValidationError,
      );
    });
  });
});
