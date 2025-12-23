import type {
  ConfigurationError,
  DataSizeExceededError,
  SizeEstimationError,
  StoreDataState,
  StoreError,
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

export type StoreFailure = {
  ok: false;
  /** Always 'store' to indicate the failure originated from the store */
  origin: 'store';
  /**
   * Coarse-grained classification of the failure cause.
   */
  kind: StoreFailureKind;
  /**
   *
   */
  code: StoreErrorCode;
  error:
    | StoreError
    | SizeEstimationError
    | DataSizeExceededError
    | ConfigurationError;
};
