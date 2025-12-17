/**
 * Event type definitions for the ProtoPedia in-memory repository.
 *
 * This module defines the event interface for repository state change notifications
 * during snapshot operations.
 *
 * @module
 * @see {@link https://github.com/F88/promidas/issues/19 | Issue #19: Event Notification System}
 */
import type { PrototypeInMemoryStats } from '../../store/index.js';

import type { SnapshotOperationFailure } from './snapshot-operation.types.js';

/**
 * Event types emitted by the repository during snapshot operations.
 *
 * @remarks
 * Events are only available when `enableEvents: true` is set in the repository configuration.
 * The repository exposes an optional `events` property of type `TypedEmitter<RepositoryEvents>`.
 *
 * @example
 * ```typescript
 * import { PromidasRepositoryBuilder } from '@f88/promidas';
 *
 * const repo = new PromidasRepositoryBuilder()
 *   .setRepositoryConfig({ enableEvents: true })
 *   .build();
 *
 * repo.events?.on('snapshotStarted', (operation) => {
 *   console.log(`${operation} started`);
 * });
 *
 * repo.events?.on('snapshotCompleted', (stats) => {
 *   console.log(`Snapshot updated: ${stats.size} prototypes`);
 * });
 *
 * repo.events?.on('snapshotFailed', (error) => {
 *   console.error('Snapshot failed:', error.error);
 * });
 * ```
 *
 * @see {@link ProtopediaInMemoryRepositoryConfig.enableEvents}
 */
export interface RepositoryEvents {
  /**
   * Emitted when a snapshot operation starts.
   *
   * This event is fired at the beginning of `setupSnapshot` or `refreshSnapshot`
   * operations, before any network requests are made.
   *
   * @param operation - Type of operation ('setup' or 'refresh')
   *
   * @example
   * ```typescript
   * repo.events?.on('snapshotStarted', (operation) => {
   *   if (operation === 'setup') {
   *     console.log('Initial setup started');
   *   } else {
   *     console.log('Refreshing snapshot');
   *   }
   *   setLoading(true);
   * });
   * ```
   */
  snapshotStarted: (operation: 'setup' | 'refresh') => void;

  /**
   * Emitted when a snapshot operation completes successfully.
   *
   * This event includes the complete snapshot statistics, eliminating the need
   * for an additional `getStats()` call.
   *
   * @param stats - Current snapshot statistics including size, cachedAt, and TTL info
   *
   * @example
   * ```typescript
   * repo.events?.on('snapshotCompleted', (stats) => {
   *   console.log(`Snapshot updated: ${stats.size} prototypes`);
   *   console.log(`Cached at: ${stats.cachedAt}`);
   *   setLoading(false);
   *   updateUI(stats);
   * });
   * ```
   */
  snapshotCompleted: (stats: PrototypeInMemoryStats) => void;

  /**
   * Emitted when a snapshot operation fails.
   *
   * This event includes complete error information including HTTP status codes
   * and API error codes when available.
   *
   * @param error - Error details including message, status, and code
   *
   * @example
   * ```typescript
   * repo.events?.on('snapshotFailed', (error) => {
   *   console.error('Snapshot failed:', error.error);
   *   if (error.status) {
   *     console.error('HTTP status:', error.status);
   *   }
   *   if (error.code) {
   *     console.error('API error code:', error.code);
   *   }
   *   setLoading(false);
   *   showError(error.error);
   * });
   * ```
   */
  snapshotFailed: (error: SnapshotOperationFailure) => void;
}
