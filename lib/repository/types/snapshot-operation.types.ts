import type { PrototypeInMemoryStats } from '../../store/index.js';

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
 * Failed response from setupSnapshot or refreshSnapshot operations.
 *
 * Contains error details including optional HTTP status code and error code
 * from the upstream API.
 *
 * @example
 * ```typescript
 * const result = await repo.setupSnapshot({ limit: 100 });
 * if (!result.ok) {
 *   console.error('Setup failed:', result.error);
 *   if (result.status === 401) {
 *     console.error('Authentication error');
 *   }
 * }
 * ```
 */
export type SnapshotOperationFailure = {
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
