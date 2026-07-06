import type {
  FetcherErrorCode,
  FetchFailureKind,
  FetchPrototypesFailure,
} from '../../fetcher/types/index.js';
import type { PrototypeInMemoryStats } from '../../store/index.js';
import type { SetFailure } from '../../store/types/index.js';

import type {
  RepositoryErrorCode,
  RepositoryFailureKind,
} from './result.types.js';

/**
 * Successful response from setupSnapshot or refreshSnapshot operations.
 *
 * Contains statistics about the newly created or refreshed snapshot.
 *
 * @example
 * ```typescript
 * const result = await repo.setupSnapshot({ limit: 100 });
 * if (result.ok) {
 *   console.log('Cached prototypes:', result.stats.size);
 *   console.log('Cached at:', result.stats.cachedAt);
 * }
 * ```
 */
export type SnapshotOperationSuccess = {
  /** Indicates successful operation. */
  readonly ok: true;
  /** Statistics about the current snapshot after the operation. */
  readonly stats: PrototypeInMemoryStats;
};

/**
 * Base type for all snapshot operation failures.
 *
 * Contains common fields shared by all failure types in the discriminated union.
 */
export type SnapshotOperationFailureBase = {
  /** Indicates failed operation. */
  readonly ok: false;
  /** Origin layer where the failure occurred. */
  readonly origin: 'fetcher' | 'store' | 'repository' | 'unknown';
  /** Human-readable error message. */
  readonly message: string;
};

/**
 * Unknown/unexpected failure during snapshot operations.
 *
 * Fallback for errors that cannot be classified into fetcher or store failures.
 */
export type UnknownSnapshotFailure = SnapshotOperationFailureBase & {
  /** Indicates failure with unknown origin. */
  readonly origin: 'unknown';
};

/**
 * Failure from the fetcher layer during snapshot operations.
 *
 * Includes detailed error information from network/HTTP operations.
 */
export type FetcherSnapshotFailure = SnapshotOperationFailureBase & {
  /** Indicates failure originated from fetcher layer. */
  readonly origin: 'fetcher';
  /** Coarse-grained classification of the failure cause. */
  readonly kind: FetchFailureKind;
  /** Canonical error code from the fetcher. */
  readonly code: FetcherErrorCode;
  /** HTTP status code if applicable. */
  readonly status?: number;
  /** Additional error details from request and response. */
  readonly details: FetchPrototypesFailure['details'];
};

/**
 * Failure from the store layer during snapshot operations.
 *
 * Type alias for SetFailure when used in snapshot operation context.
 * Occurs when snapshot data cannot be stored in memory due to size limits
 * or serialization issues.
 */
export type StoreSnapshotFailure = SetFailure;

/**
 * Failure from the repository layer during snapshot operations.
 *
 * Occurs when input data validation fails during setupSnapshotFromSerializedData
 * or when size estimation fails for snapshots.
 * This indicates that the provided snapshot data does not conform to the
 * expected schema (e.g., invalid version format, missing fields, incorrect types)
 * or that size calculation encountered an error.
 */
export type RepositorySnapshotFailure = SnapshotOperationFailureBase & {
  /** Indicates failure originated from repository layer. */
  readonly origin: 'repository';
  /** Coarse-grained classification of the failure cause. */
  readonly kind: RepositoryFailureKind;
  /** Canonical error code from the repository. */
  readonly code: RepositoryErrorCode;
};

/**
 * Failed response from setupSnapshot or refreshSnapshot operations.
 *
 * Discriminated union of all possible snapshot failure types.
 * Use the 'origin' field to determine which specific failure type it is.
 *
 * @example
 * ```typescript
 * const result = await repo.setupSnapshot({ limit: 100 });
 * if (!result.ok) {
 *   switch (result.origin) {
 *     case 'fetcher':
 *       console.error('Fetch failed:', result.kind, result.code);
 *       if (result.status === 401) {
 *         console.error('Authentication error');
 *       }
 *       break;
 *     case 'store':
 *       console.error('Store failed:', result.kind, result.code);
 *       break;
 *     case 'repository':
 *       console.error('Validation failed:', result.message);
 *       break;
 *     case 'unknown':
 *       console.error('Unknown error:', result.message);
 *       break;
 *   }
 * }
 * ```
 */
export type SnapshotOperationFailure =
  | FetcherSnapshotFailure
  | StoreSnapshotFailure
  | RepositorySnapshotFailure
  | UnknownSnapshotFailure;

/**
 * Result type for setupSnapshot and refreshSnapshot operations.
 *
 * Discriminated union that allows type-safe error handling without exceptions.
 * Follows the same pattern as the fetcher module's Result types.
 *
 * @example
 * ```typescript
 * const result = await repo.setupSnapshot({ limit: 100 });
 *
 * if (result.ok) {
 *   // TypeScript knows result has 'stats' property
 *   console.log('Success:', result.stats.size);
 * } else {
 *   // TypeScript knows result has 'error', 'status', 'code' properties
 *   console.error('Failed:', result.error, result.status);
 * }
 * ```
 */
export type SnapshotOperationResult =
  SnapshotOperationSuccess | SnapshotOperationFailure;
