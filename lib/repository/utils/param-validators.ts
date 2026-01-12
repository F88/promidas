/**
 * Parameter validation schemas for repository methods.
 *
 * This module provides Zod schemas for validating method parameters
 * at runtime, ensuring type safety for public API boundaries.
 *
 * @remarks
 * These schemas are used for parameter validation (throwing ValidationError).
 * For data structure validation (returning Result types), see validators.ts.
 */
import { z } from 'zod';

/**
 * Validation schema for prototype ID.
 * Must be a positive integer (1, 2, 3, ...).
 *
 * @remarks
 * ID 0 is not valid for ProtoPedia prototypes. All valid prototype IDs
 * are positive integers starting from 1.
 *
 * @example
 * ```ts
 * prototypeIdSchema.parse(123); // ✅ Valid
 * prototypeIdSchema.parse(1);   // ✅ Valid
 * prototypeIdSchema.parse(0);   // ❌ ZodError: too_small
 * prototypeIdSchema.parse(-1);  // ❌ ZodError: too_small
 * prototypeIdSchema.parse(1.5); // ❌ ZodError: invalid_type
 * ```
 */
export const prototypeIdSchema = z.number().int().positive();

/**
 * Validation schema for sample size.
 * Must be an integer (can be negative, zero, or positive).
 *
 * Negative values are handled by the caller logic as returning empty array.
 * This allows for flexible API usage where negative sizes are semantically
 * equivalent to zero (no samples).
 *
 * @example
 * ```ts
 * sampleSizeSchema.parse(10);  // ✅ Valid
 * sampleSizeSchema.parse(0);   // ✅ Valid
 * sampleSizeSchema.parse(-5);  // ✅ Valid (handled as 0 by caller)
 * sampleSizeSchema.parse(1.5); // ❌ ZodError: invalid_type
 * sampleSizeSchema.parse(NaN); // ❌ ZodError: invalid_type
 * ```
 */
export const sampleSizeSchema = z.number().int();
