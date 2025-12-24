import type {
  SnapshotOperationResult,
  SnapshotOperationSuccess,
  StoreSnapshotFailure,
} from '../types/snapshot-operation.types.js';
import type { StoreOperationResult } from '../types/store-operation-result.types.js';

/**
 * Convert StoreOperationResult to SnapshotOperationResult.
 *
 * Maps store operation results to snapshot operation results, preserving
 * all success stats or error information for use in the repository layer.
 *
 * @param result - Store operation result to convert
 * @returns Snapshot operation result with success stats or error information
 *
 * @example
 * ```typescript
 * // Success case
 * const storeSuccess: StoreOperationResult = {
 *   ok: true,
 *   stats: { size: 100, cachedAt: new Date(), ... }
 * };
 * const snapshotResult = convertStoreResult(storeSuccess);
 * // { ok: true, stats: { size: 100, cachedAt: ..., ... } }
 *
 * // Failure case
 * const storeFailure: StoreOperationResult = {
 *   ok: false,
 *   origin: 'store',
 *   kind: 'storage_limit',
 *   code: 'STORE_CAPACITY_EXCEEDED',
 *   message: 'Data size exceeds limit',
 *   dataState: 'UNCHANGED'
 * };
 * const snapshotFailure = convertStoreResult(storeFailure);
 * // { ok: false, origin: 'store', kind: 'storage_limit', ... }
 * ```
 */
export function convertStoreResult(
  result: StoreOperationResult,
): SnapshotOperationResult {
  if (result.ok) {
    const success: SnapshotOperationSuccess = {
      ok: true,
      stats: result.stats,
    };
    return success;
  }

  const failure: StoreSnapshotFailure = {
    ok: false,
    origin: 'store',
    kind: result.kind,
    code: result.code,
    message: result.message,
    dataState: result.dataState,
    ...(result.cause !== undefined && { cause: result.cause }),
  };
  return failure;
}
