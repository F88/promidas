/**
 * Validation schemas for repository operations.
 *
 * This module provides Zod schemas for validating both method parameters
 * and data structures at runtime.
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

/**
 * Validation schema for semantic version strings.
 * Must follow semver format (e.g., "1.0.0").
 *
 * @example
 * ```ts
 * versionSchema.parse("1.0.0");   // ✅ Valid
 * versionSchema.parse("2.15.43"); // ✅ Valid
 * versionSchema.parse("v1.0.0");  // ❌ ZodError: invalid_string
 * versionSchema.parse("1.0");     // ❌ ZodError: invalid_string
 * ```
 */
export const versionSchema = z.string().regex(/^\d+\.\d+\.\d+$/, {
  message: 'Version must be in semver format (e.g., "1.0.0")',
});

/**
 * Validation schema for ISO-8601 UTC datetime strings.
 * Must follow format: "YYYY-MM-DDTHH:mm:ss.sssZ"
 *
 * @example
 * ```ts
 * serializedAtSchema.parse("2024-01-12T10:30:00.000Z"); // ✅ Valid
 * serializedAtSchema.parse("2024-01-12T10:30:00Z");     // ❌ Missing milliseconds
 * serializedAtSchema.parse("2024-01-12 10:30:00");      // ❌ Not ISO-8601
 * ```
 */
export const serializedAtSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/, {
    message: 'serializedAt must be ISO-8601 UTC timestamp',
  })
  .refine(
    (value) => {
      const date = new Date(value);
      return !isNaN(date.getTime()) && date.toISOString() === value;
    },
    {
      message: 'serializedAt must be a valid datetime',
    },
  );
