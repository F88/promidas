import type {
  FetchPrototypesResult,
  FetchPrototypesSuccess,
} from '../../fetcher/types/result.types.js';
import type {
  FetcherSnapshotFailure,
  SnapshotOperationResult,
} from '../types/snapshot-operation.types.js';

/**
 * Convert FetchPrototypesResult to SnapshotOperationResult.
 *
 * For success cases, returns the result as-is (type-compatible).
 * For failure cases, preserves all error information (origin, kind, code, message, status, details)
 * from the fetcher layer for use in the repository layer.
 *
 * @param result - Fetch result to convert
 * @returns Snapshot operation result (success pass-through or converted failure)
 *
 * @example
 * ```typescript
 * // Success case - pass through
 * const fetchSuccess: FetchPrototypesSuccess = {
 *   ok: true,
 *   data: [{ id: 1, ... }]
 * };
 * const snapshotResult = convertFetchResult(fetchSuccess);
 * // { ok: true, data: [{ id: 1, ... }] } - same object
 *
 * // Failure case - convert
 * const fetchFailure: FetchPrototypesFailure = {
 *   ok: false,
 *   origin: 'fetcher',
 *   kind: 'http',
 *   error: 'Not Found',
 *   code: 'CLIENT_NOT_FOUND',
 *   status: 404,
 *   details: { res: { code: 'RESOURCE_NOT_FOUND' } }
 * };
 * const snapshotFailure = convertFetchResult(fetchFailure);
 * // {
 * //   ok: false,
 * //   origin: 'fetcher',
 * //   kind: 'http',
 * //   code: 'CLIENT_NOT_FOUND',
 * //   message: 'Not Found',
 * //   status: 404,
 * //   details: { res: { code: 'RESOURCE_NOT_FOUND' } }
 * // }
 * ```
 */
export function convertFetchResult(
  result: FetchPrototypesResult,
): SnapshotOperationResult {
  if (result.ok) {
    // Success case: FetchPrototypesSuccess is not a SnapshotOperationResult,
    // but the caller (fetchAndStore) will handle the data by calling storeSnapshot.
    // For type safety, we cast to any here as this is an internal implementation detail.
    return result as any as SnapshotOperationResult;
  }

  const failure: FetcherSnapshotFailure = {
    ok: false,
    origin: 'fetcher',
    kind: result.kind,
    code: result.code,
    message: result.error,
    ...(result.status !== undefined && { status: result.status }),
    details: result.details,
  };
  return failure;
}
