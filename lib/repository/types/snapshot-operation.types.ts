import type {
  FetcherErrorCode,
  FetchFailureKind,
  FetchPrototypesFailure,
} from '../../fetcher/types/index.js';
import type { PrototypeInMemoryStats } from '../../store/index.js';

import type {
  StoreDataState,
  StoreErrorCode,
  StoreFailureKind,
} from './store-failure.types.js';

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
  ok: true;
  /** Statistics about the current snapshot after the operation. */
  stats: PrototypeInMemoryStats;
};

/**
 * Base type for all snapshot operation failures.
 *
 * Contains common fields shared by all failure types in the discriminated union.
 */
export type SnapshotOperationFailureBase = {
  /** Indicates failed operation. */
  ok: false;
  /** Origin layer where the failure occurred. */
  origin: 'fetcher' | 'store' | 'unknown';
  /** Human-readable error message. */
  message: string;
};

/**
 * Unknown/unexpected failure during snapshot operations.
 *
 * Fallback for errors that cannot be classified into fetcher or store failures.
 */
export type UnknownSnapshotFailure = SnapshotOperationFailureBase & {
  /** Indicates failure with unknown origin. */
  origin: 'unknown';
};

/**
 * Failure from the fetcher layer during snapshot operations.
 *
 * Includes detailed error information from network/HTTP operations.
 */
export type FetcherSnapshotFailure = SnapshotOperationFailureBase & {
  /** Indicates failure originated from fetcher layer. */
  origin: 'fetcher';
  /** Coarse-grained classification of the failure cause. */
  kind: FetchFailureKind;
  /** Canonical error code from the fetcher. */
  code: FetcherErrorCode;
  /** HTTP status code if applicable. */
  status?: number;
  /** Additional error details from request and response. */
  details: FetchPrototypesFailure['details'];
};

/**
 * Failure from the store layer during snapshot operations.
 *
 * Occurs when snapshot data cannot be stored in memory due to size limits
 * or serialization issues.
 */
export type StoreSnapshotFailure = SnapshotOperationFailureBase & {
  /** Indicates failure originated from store layer. */
  origin: 'store';
  /** Coarse-grained classification of the failure cause. */
  kind: StoreFailureKind;
  /** Canonical error code from the store. */
  code: StoreErrorCode;
  /** State of the store's data when the error occurred. */
  dataState: StoreDataState;
  /** Underlying cause of the error (for serialization failures). */
  cause?: unknown;
};

// export type ERR_CODE = StoreErrorCode | FetcherErrorCode;
// export type ERR_KIND = StoreFailureKind | FetchFailureKind;

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
  | UnknownSnapshotFailure;

// Legacy type kept for backward compatibility during migration
// TODO: Remove once all code is updated to use discriminated union
/**
 * @deprecated Use SnapshotOperationFailure discriminated union instead
 */
type LegacySnapshotOperationFailure = {
  /** Indicates failed operation. */
  ok: false;
  /** Human-readable error message. */
  error: string;
  /** HTTP status code if the error came from an HTTP response. */
  status?: number | undefined;
  /** Error code from the upstream API response (e.g., 'NOT_FOUND', 'UNAUTHORIZED'). */
  code?: string | undefined;
};

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
  | SnapshotOperationSuccess
  | SnapshotOperationFailure;
