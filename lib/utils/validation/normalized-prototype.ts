/**
 * Common data validators.
 *
 * This module provides validation utilities for common data structures
 * used across multiple modules (fetcher, repository, store).
 *
 * These validators are for data validation (returning Result types).
 * For parameter validation (throwing errors), use inline validation with ValidationError.
 */
import type { Logger } from '../../logger/logger.types.js';
import { normalizedPrototypeSchema } from '../../schemas/index.js';
import type { NormalizedPrototype } from '../../types/index.js';

import type { ValidationErrorCode, ValidationResult } from './types.js';

/**
 * Validate a NormalizedPrototype object.
 *
 * Validates that the data conforms to the NormalizedPrototype schema,
 * including field types, required properties, and ID constraints.
 *
 * @param data - Data to validate
 * @param logger - Optional logger for validation events
 * @returns Validation result with typed data or error details
 *
 * @example
 * ```ts
 * const result = validateNormalizedPrototype(data);
 * if (result.ok) {
 *   // data is NormalizedPrototype
 *   console.log(`Prototype ID: ${result.data.id}`);
 * } else {
 *   console.error(result.message);
 * }
 * ```
 */
export function validateNormalizedPrototype(
  data: unknown,
  logger?: Logger,
): ValidationResult<NormalizedPrototype, ValidationErrorCode> {
  const validationResult = normalizedPrototypeSchema.safeParse(data);

  if (!validationResult.success) {
    logger?.warn('Prototype data validation failed', {
      errors: validationResult.error.issues,
    });

    return {
      ok: false,
      code: 'VALIDATION_ERROR',
      message: validationResult.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; '),
    };
  }

  logger?.info('Prototype data validated successfully', {
    id: validationResult.data.id,
    prototypeNm: validationResult.data.prototypeNm,
  });

  return {
    ok: true,
    data: validationResult.data,
  };
}

/**
 * Validate an array of NormalizedPrototype objects.
 *
 * Validates that the data is an array and each element conforms to
 * the NormalizedPrototype schema. Uses Zod's fail-fast behavior,
 * stopping at the first validation error.
 *
 * @param data - Data to validate (should be an array)
 * @param logger - Optional logger for validation events
 * @returns Validation result with typed data array or error details
 *
 * @example
 * ```ts
 * const result = validateNormalizedPrototypeArray(data);
 * if (result.ok) {
 *   // data is NormalizedPrototype[]
 *   console.log(`Validated ${result.data.length} prototypes`);
 * } else {
 *   console.error(result.message);
 * }
 * ```
 *
 * @remarks
 * - Uses Zod's default fail-fast behavior (stops at first error)
 * - For large datasets (5000+ items), this is more efficient than
 *   validating each item individually
 * - Memory usage: ~2x input size at peak due to Zod's immutable design
 */
export function validateNormalizedPrototypeArray(
  data: unknown,
  logger?: Logger,
): ValidationResult<NormalizedPrototype[], ValidationErrorCode> {
  const arraySchema = normalizedPrototypeSchema.array();
  const validationResult = arraySchema.safeParse(data);

  if (!validationResult.success) {
    logger?.warn('Prototype array validation failed', {
      errors: validationResult.error.issues,
    });

    return {
      ok: false,
      code: 'VALIDATION_ERROR',
      message: validationResult.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; '),
    };
  }

  logger?.info('Prototype array validated successfully', {
    count: validationResult.data.length,
  });

  return {
    ok: true,
    data: validationResult.data,
  };
}
