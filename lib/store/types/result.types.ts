import type { StoreDataState } from '../errors/store-error.js';

import type { PrototypeInMemoryStats } from './stats.types.js';

/**
 * Failure kinds specific to store operations.
 *
 * - `storage_limit`: Store capacity exceeded
 * - `serialization`: JSON serialization failed during size estimation
 * - `unknown`: Unexpected store error
 */
export type StoreFailureKind = 'storage_limit' | 'serialization' | 'unknown';

/**
 * Error codes for store-originated failures.
 *
 * - `STORE_CAPACITY_EXCEEDED`: Data size exceeds configured limit
 * - `STORE_SERIALIZATION_FAILED`: Failed to serialize data for size estimation
 * - `STORE_UNKNOWN`: Unexpected error from store
 */
export type StoreErrorCode =
  'STORE_CAPACITY_EXCEEDED' | 'STORE_SERIALIZATION_FAILED' | 'STORE_UNKNOWN';

/**
 * Successful result from setAll operation.
 */
export type SetSuccess = {
  /** Indicates successful operation. */
  readonly ok: true;
  /** Statistics about the current snapshot after storing. */
  readonly stats: PrototypeInMemoryStats;
};

/**
 * Failed result from setAll operation.
 *
 * Contains store-specific error information.
 */
export type SetFailure = {
  /** Indicates failed operation. */
  readonly ok: false;
  /** Always store-originated. */
  readonly origin: 'store';
  /** Coarse-grained classification of the failure cause. */
  readonly kind: StoreFailureKind;
  /** Canonical error code from the store. */
  readonly code: StoreErrorCode;
  /** Human-readable error message. */
  readonly message: string;
  /** State of the store's data when the error occurred. */
  readonly dataState: StoreDataState;
  /** Underlying cause of the error (for serialization failures). */
  readonly cause?: unknown;
};

/**
 * Result from setAll operation.
 *
 * Returns either success with stats or failure with store-specific error details.
 * This type maintains symmetry with FetchPrototypesResult at the operation boundary,
 * allowing fetchAndStore to handle both fetch and store operations uniformly.
 *
 * @example
 * ```typescript
 * const result = storeSnapshot(data);
 * if (result.ok) {
 *   console.log('Stored:', result.stats.size);
 * } else {
 *   console.error('Store failed:', result.kind, result.code);
 * }
 * ```
 */
export type SetResult = SetSuccess | SetFailure;
