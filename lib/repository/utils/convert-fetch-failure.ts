import type { FetchPrototypesFailure } from '../../fetcher/types/result.types.js';
import type { SnapshotOperationFailure } from '../types/snapshot-operation.types.js';

/**
 * Convert FetchPrototypesFailure to SnapshotOperationFailure.
 *
 * Extracts relevant error information (error message, status, code)
 * while omitting the details object that is specific to fetch operations.
 *
 * @param failure - Fetch failure result to convert
 * @returns Snapshot operation failure with extracted error information
 *
 * @example
 * ```typescript
 * const fetchFailure: FetchPrototypesFailure = {
 *   ok: false,
 *   error: 'Not Found',
 *   status: 404,
 *   details: { res: { code: 'RESOURCE_NOT_FOUND' } }
 * };
 *
 * const snapshotFailure = convertFetchFailure(fetchFailure);
 * // { ok: false, error: 'Not Found', status: 404, code: 'RESOURCE_NOT_FOUND' }
 * ```
 */
export function convertFetchFailure(
  failure: FetchPrototypesFailure,
): SnapshotOperationFailure {
  const ret = {
    ok: false,
    error: failure.error,
    ...(failure.status !== undefined && { status: failure.status }),
    ...(failure.details?.res?.code !== undefined && {
      code: failure.details.res.code,
    }),
  } satisfies SnapshotOperationFailure;
  return ret;
}
