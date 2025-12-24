import type {
  PrototypeInMemoryStats,
  StoreDataState,
} from '../../store/index.js';

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
  | 'STORE_CAPACITY_EXCEEDED'
  | 'STORE_SERIALIZATION_FAILED'
  | 'STORE_UNKNOWN';

/**
 * Re-export StoreDataState from store module for convenience.
 */
export type { StoreDataState };

/**
 * Successful result from storeSnapshot operation.
 */
export type StoreOperationSuccess = {
  /** Indicates successful operation. */
  ok: true;
  /** Statistics about the current snapshot after storing. */
  stats: PrototypeInMemoryStats;
};

/**
 * Failed result from storeSnapshot operation.
 *
 * Contains store-specific error information.
 */
export type StoreOperationFailure = {
  /** Indicates failed operation. */
  ok: false;
  /** Always store-originated. */
  origin: 'store';
  /** Coarse-grained classification of the failure cause. */
  kind: StoreFailureKind;
  /** Canonical error code from the store. */
  code: StoreErrorCode;
  /** Human-readable error message. */
  message: string;
  /** State of the store's data when the error occurred. */
  dataState: StoreDataState;
  /** Underlying cause of the error (for serialization failures). */
  cause?: unknown;
};

/**
 * Result from storeSnapshot operation.
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
export type StoreOperationResult =
  | StoreOperationSuccess
  | StoreOperationFailure;
