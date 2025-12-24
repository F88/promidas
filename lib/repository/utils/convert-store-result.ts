import type { SetResult } from '../../store/types/result.types.js';
import type { SnapshotOperationResult } from '../types/snapshot-operation.types.js';

/**
 * Convert SetResult to SnapshotOperationResult.
 *
 * SetResult and SnapshotOperationResult are type-compatible,
 * so this function simply returns the input result without transformation.
 *
 * @param result - Store operation result to convert
 * @returns Snapshot operation result (same as input)
 *
 * @example
 * ```typescript
 * // Success case
 * const storeSuccess: SetResult = {
 *   ok: true,
 *   stats: { size: 100, cachedAt: new Date(), ... }
 * };
 * const snapshotResult = convertStoreResult(storeSuccess);
 * // { ok: true, stats: { size: 100, cachedAt: ..., ... } } - same object
 *
 * // Failure case
 * const storeFailure: SetResult = {
 *   ok: false,
 *   origin: 'store',
 *   kind: 'storage_limit',
 *   code: 'STORE_CAPACITY_EXCEEDED',
 *   message: 'Data size exceeds limit',
 *   dataState: 'UNCHANGED'
 * };
 * const snapshotFailure = convertStoreResult(storeFailure);
 * // { ok: false, origin: 'store', kind: 'storage_limit', ... } - same object
 * ```
 */
export function convertStoreResult(result: SetResult): SnapshotOperationResult {
  return result;
}
