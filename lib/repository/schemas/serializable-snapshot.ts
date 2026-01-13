/**
 * Validation schemas for serializable snapshot data.
 *
 * This module provides Zod schemas for validating snapshot serialization
 * metadata fields (version and timestamp).
 */
import { z } from 'zod';

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
