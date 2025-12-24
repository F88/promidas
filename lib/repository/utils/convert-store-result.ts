import type { SnapshotOperationResult } from '../types/snapshot-operation.types.js';
import type { StoreOperationResult } from '../types/store-operation-result.types.js';

/**
 * Convert StoreOperationResult to SnapshotOperationResult.
 *
 * StoreOperationResult and SnapshotOperationResult are type-compatible,
 * so this function simply returns the input result without transformation.
 *
 * @param result - Store operation result to convert
 * @returns Snapshot operation result (same as input)
 *
 * @example
 * ```typescript
 * // Success case
 * const storeSuccess: StoreOperationResult = {
 *   ok: true,
 *   stats: { size: 100, cachedAt: new Date(), ... }
 * };
 * const snapshotResult = convertStoreResult(storeSuccess);
 * // { ok: true, stats: { size: 100, cachedAt: ..., ... } } - same object
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
 * // { ok: false, origin: 'store', kind: 'storage_limit', ... } - same object
 * ```
 */
export function convertStoreResult(
  result: StoreOperationResult,
): SnapshotOperationResult {
  return result;
}
