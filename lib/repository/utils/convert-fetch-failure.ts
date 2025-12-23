import type { FetchPrototypesFailure } from '../../fetcher/types/result.types.js';
import type { FetcherSnapshotFailure } from '../types/snapshot-operation.types.js';

/**
 * Convert FetchPrototypesFailure to FetcherSnapshotFailure.
 *
 * Preserves all error information (origin, kind, code, message, status, details)
 * from the fetcher layer for use in the repository layer.
 *
 * @param failure - Fetch failure result to convert
 * @returns Fetcher snapshot failure with all error information
 *
 * @example
 * ```typescript
 * const fetchFailure: FetchPrototypesFailure = {
 *   ok: false,
 *   origin: 'fetcher',
 *   kind: 'http',
 *   error: 'Not Found',
 *   code: 'CLIENT_NOT_FOUND',
 *   status: 404,
 *   details: { res: { code: 'RESOURCE_NOT_FOUND' } }
 * };
 *
 * const snapshotFailure = convertFetchFailure(fetchFailure);
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
export function convertFetchFailure(
  failure: FetchPrototypesFailure,
): FetcherSnapshotFailure {
  return {
    ok: false,
    origin: 'fetcher',
    kind: failure.kind,
    code: failure.code,
    message: failure.error,
    ...(failure.status !== undefined && { status: failure.status }),
    details: failure.details,
  };
}
