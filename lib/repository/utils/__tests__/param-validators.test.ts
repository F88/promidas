import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';

import { prototypeIdSchema, sampleSizeSchema } from '../param-validators.js';

describe('param-validators', () => {
  describe('prototypeIdSchema', () => {
    describe('valid inputs', () => {
      it('should accept positive integers', () => {
        expect(prototypeIdSchema.parse(1)).toBe(1);
        expect(prototypeIdSchema.parse(123)).toBe(123);
        expect(prototypeIdSchema.parse(999999)).toBe(999999);
      });
    });

    describe('invalid inputs', () => {
      it('should reject zero', () => {
        expect(() => prototypeIdSchema.parse(0)).toThrow(ZodError);
        try {
          prototypeIdSchema.parse(0);
        } catch (error) {
          expect(error).toBeInstanceOf(ZodError);
          const zodError = error as ZodError;
          const issue = zodError.issues[0];
          expect(issue).toBeDefined();
          expect(issue!.code).toBe('too_small');
          if (issue!.code === 'too_small') {
            expect(issue.minimum).toBe(0);
            expect(issue.inclusive).toBe(false);
          }
        }
      });

      it('should reject negative integers', () => {
        expect(() => prototypeIdSchema.parse(-1)).toThrow(ZodError);
        expect(() => prototypeIdSchema.parse(-100)).toThrow(ZodError);
        try {
          prototypeIdSchema.parse(-1);
        } catch (error) {
          expect(error).toBeInstanceOf(ZodError);
          const zodError = error as ZodError;
          expect(zodError.issues[0]).toBeDefined();
          expect(zodError.issues[0]!.code).toBe('too_small');
        }
      });

      it('should reject non-integer numbers', () => {
        expect(() => prototypeIdSchema.parse(1.5)).toThrow(ZodError);
        expect(() => prototypeIdSchema.parse(3.14)).toThrow(ZodError);
        try {
          prototypeIdSchema.parse(1.5);
        } catch (error) {
          expect(error).toBeInstanceOf(ZodError);
          const zodError = error as ZodError;
          expect(zodError.issues[0]).toBeDefined();
          expect(zodError.issues[0]!.code).toBe('invalid_type');
        }
      });

      it('should reject NaN', () => {
        expect(() => prototypeIdSchema.parse(Number.NaN)).toThrow(ZodError);
        try {
          prototypeIdSchema.parse(Number.NaN);
        } catch (error) {
          expect(error).toBeInstanceOf(ZodError);
          const zodError = error as ZodError;
          expect(zodError.issues[0]).toBeDefined();
          expect(zodError.issues[0]!.code).toBe('invalid_type');
        }
      });

      it('should reject Infinity', () => {
        expect(() => prototypeIdSchema.parse(Number.POSITIVE_INFINITY)).toThrow(
          ZodError,
        );
        expect(() => prototypeIdSchema.parse(Number.NEGATIVE_INFINITY)).toThrow(
          ZodError,
        );
      });

      it('should reject non-number types', () => {
        expect(() => prototypeIdSchema.parse('123')).toThrow(ZodError);
        expect(() => prototypeIdSchema.parse(null)).toThrow(ZodError);
        expect(() => prototypeIdSchema.parse(undefined)).toThrow(ZodError);
        expect(() => prototypeIdSchema.parse({})).toThrow(ZodError);
        expect(() => prototypeIdSchema.parse([])).toThrow(ZodError);
      });
    });

    describe('safeParse', () => {
      it('should return success for valid input', () => {
        const result = prototypeIdSchema.safeParse(123);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(123);
        }
      });

      it('should return error for invalid input', () => {
        const result = prototypeIdSchema.safeParse(0);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeInstanceOf(ZodError);
        }
      });
    });
  });

  describe('sampleSizeSchema', () => {
    describe('valid inputs', () => {
      it('should accept positive integers', () => {
        expect(sampleSizeSchema.parse(1)).toBe(1);
        expect(sampleSizeSchema.parse(10)).toBe(10);
        expect(sampleSizeSchema.parse(1000)).toBe(1000);
      });

      it('should accept zero', () => {
        expect(sampleSizeSchema.parse(0)).toBe(0);
      });

      it('should accept negative integers', () => {
        expect(sampleSizeSchema.parse(-1)).toBe(-1);
        expect(sampleSizeSchema.parse(-5)).toBe(-5);
        expect(sampleSizeSchema.parse(-100)).toBe(-100);
      });
    });

    describe('invalid inputs', () => {
      it('should reject non-integer numbers', () => {
        expect(() => sampleSizeSchema.parse(1.5)).toThrow(ZodError);
        expect(() => sampleSizeSchema.parse(3.14)).toThrow(ZodError);
        expect(() => sampleSizeSchema.parse(0.1)).toThrow(ZodError);
        try {
          sampleSizeSchema.parse(1.5);
        } catch (error) {
          expect(error).toBeInstanceOf(ZodError);
          const zodError = error as ZodError;
          expect(zodError.issues[0]).toBeDefined();
          expect(zodError.issues[0]!.code).toBe('invalid_type');
        }
      });

      it('should reject NaN', () => {
        expect(() => sampleSizeSchema.parse(Number.NaN)).toThrow(ZodError);
        try {
          sampleSizeSchema.parse(Number.NaN);
        } catch (error) {
          expect(error).toBeInstanceOf(ZodError);
          const zodError = error as ZodError;
          expect(zodError.issues[0]).toBeDefined();
          expect(zodError.issues[0]!.code).toBe('invalid_type');
        }
      });

      it('should reject Infinity', () => {
        expect(() => sampleSizeSchema.parse(Number.POSITIVE_INFINITY)).toThrow(
          ZodError,
        );
        expect(() => sampleSizeSchema.parse(Number.NEGATIVE_INFINITY)).toThrow(
          ZodError,
        );
      });

      it('should reject non-number types', () => {
        expect(() => sampleSizeSchema.parse('10')).toThrow(ZodError);
        expect(() => sampleSizeSchema.parse(null)).toThrow(ZodError);
        expect(() => sampleSizeSchema.parse(undefined)).toThrow(ZodError);
        expect(() => sampleSizeSchema.parse({})).toThrow(ZodError);
        expect(() => sampleSizeSchema.parse([])).toThrow(ZodError);
      });
    });

    describe('safeParse', () => {
      it('should return success for valid positive input', () => {
        const result = sampleSizeSchema.safeParse(10);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(10);
        }
      });

      it('should return success for zero', () => {
        const result = sampleSizeSchema.safeParse(0);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(0);
        }
      });

      it('should return success for negative input', () => {
        const result = sampleSizeSchema.safeParse(-5);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(-5);
        }
      });

      it('should return error for invalid input', () => {
        const result = sampleSizeSchema.safeParse(1.5);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeInstanceOf(ZodError);
        }
      });
    });
  });
});
