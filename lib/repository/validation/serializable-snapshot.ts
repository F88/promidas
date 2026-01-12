/**
 * Repository data validators.
 *
 * This module provides validation utilities for repository operations,
 * primarily for validating external data before processing (e.g., snapshot imports).
 *
 * These validators return Result types (ValidationResult) instead of throwing errors.
 * For parameter validation at repository API boundaries, use ValidationError with Zod schemas.
 */
import type { Logger } from '../../logger/logger.types.js';
import { validateNormalizedPrototypeArray } from '../../utils/validation/index.js';
import type { ValidationResult } from '../../utils/validation/types.js';
import type { SerializableSnapshot } from '../types/index.js';

import { serializedAtSchema, versionSchema } from './schemas.js';

/**
 * Serializable snapshot validation error code.
 */
type SerializableSnapshotValidationErrorCode =
  'SERIALIZABLE_SNAPSHOT_VALIDATION_ERROR';

/**
 * Check if value is a plain object.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validate a SerializableSnapshot object.
 *
 * Validates the structure of snapshot data for import operations,
 * ensuring version compatibility and data integrity.
 *
 * Validation steps:
 * 1. Check data is a plain object
 * 2. Validate version field (semver format: x.y.z)
 * 3. Validate serializedAt field (ISO-8601 UTC timestamp)
 * 4. Validate prototypes array using {@link validateNormalizedPrototypeArray}
 *
 * @param data - Data to validate
 * @param logger - Optional logger for validation events
 * @returns Validation result with typed data or error details
 *
 * @example
 * ```ts
 * const result = validateSerializableSnapshot(data, logger);
 * if (result.ok) {
 *   // data is SerializableSnapshot
 *   console.log(`Version: ${result.data.version}`);
 *   console.log(`Prototypes: ${result.data.prototypes.length}`);
 * } else {
 *   console.error(`Invalid snapshot: ${result.message}`);
 * }
 * ```
 */
export function validateSerializableSnapshot(
  data: unknown,
  logger?: Logger,
): ValidationResult<
  SerializableSnapshot,
  SerializableSnapshotValidationErrorCode
> {
  // Step 1: Check data is a plain object
  if (!isPlainObject(data)) {
    logger?.warn('Snapshot data validation failed', {
      reason: 'not a plain object',
      type: typeof data,
    });

    return {
      ok: false,
      code: 'SERIALIZABLE_SNAPSHOT_VALIDATION_ERROR',
      message: 'Invalid input: expected object, received ' + typeof data,
    };
  }

  // Step 2: Validate version field using Zod schema
  const versionValidation = versionSchema.safeParse(data.version);
  if (!versionValidation.success) {
    logger?.warn('Snapshot data validation failed', {
      reason: 'invalid version format',
      version: data.version,
    });

    return {
      ok: false,
      code: 'SERIALIZABLE_SNAPSHOT_VALIDATION_ERROR',
      message:
        data.version === undefined
          ? 'version: Invalid input: expected string, received undefined'
          : 'version: ' + versionValidation.error.issues[0]!.message,
    };
  }

  // Step 3: Validate serializedAt field using Zod schema
  const serializedAtValidation = serializedAtSchema.safeParse(
    data.serializedAt,
  );
  if (!serializedAtValidation.success) {
    logger?.warn('Snapshot data validation failed', {
      reason: 'invalid serializedAt format',
      serializedAt: data.serializedAt,
    });

    return {
      ok: false,
      code: 'SERIALIZABLE_SNAPSHOT_VALIDATION_ERROR',
      message:
        data.serializedAt === undefined
          ? 'serializedAt: Invalid input: expected string, received undefined'
          : 'serializedAt: ' + serializedAtValidation.error.issues[0]!.message,
    };
  }

  // Step 4: Validate prototypes array using shared validation
  const prototypesValidation = validateNormalizedPrototypeArray(
    data.prototypes,
    logger,
  );

  if (!prototypesValidation.ok) {
    // Logger already called by validateNormalizedPrototypeArray
    return {
      ok: false,
      code: 'SERIALIZABLE_SNAPSHOT_VALIDATION_ERROR',
      message: 'prototypes: ' + prototypesValidation.message,
    };
  }

  logger?.info('Snapshot data validated successfully', {
    version: versionValidation.data,
    serializedAt: serializedAtValidation.data,
    prototypeCount: prototypesValidation.data.length,
  });

  return {
    ok: true,
    data: {
      version: versionValidation.data,
      serializedAt: serializedAtValidation.data,
      prototypes: prototypesValidation.data,
    },
  };
}
