/**
 * Validation schemas for repository method parameters.
 *
 * This module provides Zod schemas for validating input parameters
 * to ensure type safety and data integrity at runtime.
 */
import { z } from 'zod';

/**
 * Validation schema for NormalizedPrototype.
 *
 * This schema validates the structure of a single prototype object.
 * Used internally for validating deserialized snapshot data.
 *
 * @remarks
 * This is a comprehensive schema covering all fields of NormalizedPrototype.
 * Optional fields are marked with .optional() and must be undefined (not null)
 * due to exactOptionalPropertyTypes: true.
 */
const normalizedPrototypeSchema = z.object({
  id: z.number().int().positive(),
  createDate: z.string(),
  updateDate: z.string().optional(),
  releaseDate: z.string().optional(),
  createId: z.number().int().optional(),
  updateId: z.number().int().optional(),
  releaseFlg: z.number().int(),
  status: z.number().int(),
  prototypeNm: z.string(),
  summary: z.string(),
  freeComment: z.string(),
  systemDescription: z.string(),
  users: z.array(z.string()),
  tags: z.array(z.string()),
  materials: z.array(z.string()),
  events: z.array(z.string()),
  awards: z.array(z.string()),
  teamNm: z.string(),
  officialLink: z.string().optional(),
  videoUrl: z.string().optional(),
  mainUrl: z.string(),
  relatedLink: z.string().optional(),
  relatedLink2: z.string().optional(),
  relatedLink3: z.string().optional(),
  relatedLink4: z.string().optional(),
  relatedLink5: z.string().optional(),
  viewCount: z.number().int(),
  goodCount: z.number().int(),
  commentCount: z.number().int(),
  uuid: z.string().optional(),
  nid: z.string().optional(),
  revision: z.number().int().optional(),
  licenseType: z.number().int().optional(),
  thanksFlg: z.number().int().optional(),
  slideMode: z.number().int().optional(),
});

/**
 * Validation schema for SerializableSnapshot.
 *
 * Validates the structure of snapshot data for import operations.
 * Ensures version compatibility and data integrity.
 *
 * @example
 * ```ts
 * const result = serializableSnapshotSchema.safeParse(data);
 * if (result.success) {
 *   // data is valid SerializableSnapshot
 *   console.log(`Version: ${result.data.version}`);
 * } else {
 *   // validation failed
 *   console.error(result.error);
 * }
 * ```
 */
export const serializableSnapshotSchema = z.object({
  version: z
    .string()
    .regex(
      /^\d+\.\d+\.\d+$/,
      'Version must be in semver format (e.g., "1.0.0")',
    ),
  serializedAt: z
    .string()
    .datetime({ message: 'serializedAt must be ISO-8601 UTC timestamp' }),
  prototypes: z.array(normalizedPrototypeSchema),
});

/**
 * Validation schema for prototype ID.
 * Must be a positive integer (1, 2, 3, ...).
 *
 * @example
 * ```ts
 * prototypeIdSchema.parse(123); // ✅ Valid
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
