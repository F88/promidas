/**
 * Type definitions for the ProtoPedia in-memory repository interface.
 *
 * @module
 */
import type { EventEmitter } from 'events';

import type { ListPrototypesParams } from 'protopedia-api-v2-client';
import type { DeepReadonly } from 'ts-essentials';

import type { Logger, LogLevel } from '../../logger/index.js';
import type {
  PrototypeInMemoryStats,
  PrototypeInMemoryStoreConfig,
} from '../../store/index.js';
import type { NormalizedPrototype } from '../../types/index.js';

import type { PrototypeAnalysisResult } from './analysis.types.js';
import type { RepositoryEvents } from './repository-events.types.js';
import type { SnapshotOperationResult } from './snapshot-operation.types.js';

/**
 * Configuration options for the ProtoPedia in-memory repository.
 */
export type ProtopediaInMemoryRepositoryConfig = {
  /**
   * Custom logger instance for repository operations.
   *
   * @remarks
   * - If provided, the logger will be used as-is
   * - If provided with logLevel, the level will be updated if logger is mutable
   * - If not provided, creates a ConsoleLogger with the specified logLevel
   *
   * @default undefined (creates ConsoleLogger with 'info' level)
   */
  logger?: Logger;

  /**
   * Log level for creating a default ConsoleLogger.
   *
   * @remarks
   * - Only used when `logger` is NOT provided
   * - Creates a new ConsoleLogger with this level
   * - If logger is provided and mutable, updates its level property
   *
   * @default 'info'
   */
  logLevel?: LogLevel;

  /**
   * Enable event notifications for snapshot operations.
   *
   * When enabled, the repository will create an EventEmitter instance and
   * emit events during snapshot operations (snapshotStarted, snapshotCompleted, snapshotFailed).
   *
   * @remarks
   * - Events are disabled by default to minimize overhead for CLI/script users
   * - When enabled, access events via the `events` property
   * - Always call `dispose()` to clean up event listeners when done
   * - Designed primarily for WebApp/SPA scenarios
   *
   * @default false
   *
   * @see {@link RepositoryEvents} for available event types
   * @see {@link https://github.com/F88/promidas/issues/19 | Issue #19: Event Notification System}
   */
  enableEvents?: boolean;
};

/**
 * In-memory, snapshot-based repository for ProtoPedia prototypes.
 *
 * This repository hides HTTP and caching details behind a simple
 * snapshot API:
 *
 * - `setupSnapshot` / `refreshSnapshot` populate or update the snapshot
 *   by calling the ProtoPedia API under the hood.
 * - Read methods (`getPrototypeFromSnapshotById`,
 *   `getRandomPrototypeFromSnapshot`) access only the current in-memory
 *   snapshot and never perform HTTP calls.
 * - `getStats` exposes enough information (size, cachedAt, isExpired) to
 *   implement TTL-based refresh strategies in the calling code.
 */
export interface ProtopediaInMemoryRepository {
  /**
   * Event emitter for snapshot operation notifications.
   *
   * This property is only defined when `enableEvents: true` is set in the repository configuration.
   * Use optional chaining (`events?.on(...)`) to safely access event methods.
   *
   * @remarks
   * **Available Events:**
   * - `snapshotStarted` - Emitted when setupSnapshot or refreshSnapshot begins
   * - `snapshotCompleted` - Emitted when snapshot operation succeeds (includes stats)
   * - `snapshotFailed` - Emitted when snapshot operation fails (includes error details)
   *
   * **Cleanup:**
   * Always call `dispose()` to remove all event listeners and prevent memory leaks.
   *
   * @example
   * ```typescript
   * const repo = new PromidasRepositoryBuilder()
   *   .setRepositoryConfig({ enableEvents: true })
   *   .build();
   *
   * repo.events?.on('snapshotCompleted', (stats) => {
   *   console.log(`Updated: ${stats.size} prototypes`);
   * });
   *
   * // Cleanup
   * repo.dispose();
   * ```
   *
   * @see {@link RepositoryEvents} for event type definitions
   * @see {@link dispose} for cleanup method
   */
  readonly events?: EventEmitter;

  /**
   * Retrieve the configuration used to initialize the underlying store.
   *
   * Returns the TTL and maximum data size settings (logger is excluded).
   */
  getConfig(): Omit<Required<PrototypeInMemoryStoreConfig>, 'logger'>;

  /**
   * Stats for the current snapshot, including TTL-related information.
   *
   * Callers can use this to implement strategies such as:
   * - refreshing when `isExpired` is true, or
   * - refreshing when `cachedAt` is older than a given threshold.
   *
   * This method never throws due to ProtoPedia API failures; it only
   * reports the current in-memory state.
   */
  getStats(): PrototypeInMemoryStats;

  /**
   * Fetch prototypes from ProtoPedia and populate the in-memory snapshot.
   *
   * Typical usage: call once on startup, or before the first read. The
   * concrete fetch strategy (all vs partial, page size, filters, etc.) is
   * an implementation detail of this repository.
   *
   * Returns a Result type indicating success with stats or failure with error details.
   * In case of failure, any existing in-memory snapshot remains unchanged.
   *
   * @returns SnapshotOperationResult with ok: true and stats on success,
   *          or ok: false with error details on failure
   */
  setupSnapshot(params: ListPrototypesParams): Promise<SnapshotOperationResult>;

  /**
   * Refresh the snapshot using the same strategy as the last
   * {@link ProtopediaInMemoryRepository.setupSnapshot | setupSnapshot}
   * call, or a reasonable default strategy when `setupSnapshot` has not
   * been called yet.
   *
   * Returns a Result type indicating success with stats or failure with error details.
   * In case of failure, the current in-memory snapshot is preserved.
   *
   * @returns SnapshotOperationResult with ok: true and stats on success,
   *          or ok: false with error details on failure
   */
  refreshSnapshot(): Promise<SnapshotOperationResult>;

  /**
   * Analyze prototypes from the current snapshot to extract ID range.
   *
   * Returns the minimum and maximum prototype IDs from the current snapshot.
   * This method does NOT perform HTTP calls.
   *
   * @returns {@link PrototypeAnalysisResult} containing min and max IDs, or null values if snapshot is empty
   */
  analyzePrototypes(): Promise<PrototypeAnalysisResult>;

  /**
   * Get all prototypes from the current in-memory snapshot.
   *
   * Returns all prototypes currently cached in the snapshot.
   * The returned data is read-only and reflects the state at the time of the call.
   *
   * This method does NOT perform HTTP calls.
   * It does not throw due to ProtoPedia API failures; it only reflects
   * the current in-memory state of the snapshot.
   *
   * @returns Read-only array of all prototypes
   */
  getAllFromSnapshot(): Promise<readonly DeepReadonly<NormalizedPrototype>[]>;

  /**
   * Get all prototype IDs from the current in-memory snapshot.
   *
   * Returns an array of all prototype IDs currently cached in the snapshot.
   * Useful for operations that only need IDs, such as:
   * - Exporting available prototype IDs to clients
   * - ID-based filtering or statistics
   * - Checking if specific IDs exist without loading full objects
   *
   * This method does NOT perform HTTP calls.
   * It does not throw due to ProtoPedia API failures; it only reflects
   * the current in-memory state of the snapshot.
   *
   * @returns Read-only array of prototype IDs
   */
  getPrototypeIdsFromSnapshot(): Promise<readonly number[]>;

  /**
   * Get a prototype from the current in-memory snapshot by id.
   *
   * Returns the prototype when it exists in the snapshot, or null when
   * the id is not present in the current snapshot.
   *
   * This method does NOT perform HTTP calls.
   * It does not throw due to ProtoPedia API failures; it only reflects
   * the current in-memory state of the snapshot.
   */
  getPrototypeFromSnapshotByPrototypeId(
    prototypeId: number,
  ): Promise<DeepReadonly<NormalizedPrototype> | null>;

  /**
   * Get a random prototype from the current in-memory snapshot.
   *
   * Returns a random prototype when the snapshot is not empty, or null
   * when the snapshot is empty.
   *
   * This method does NOT perform HTTP calls.
   * It does not throw due to ProtoPedia API failures; it only reflects
   * the current in-memory state of the snapshot.
   */
  getRandomPrototypeFromSnapshot(): Promise<DeepReadonly<NormalizedPrototype> | null>;

  /**
   * Get random samples from the current in-memory snapshot.
   *
   * Returns up to `size` random prototypes without duplicates.
   * If `size` exceeds the available data, returns all prototypes in random order.
   * Returns an empty array when `size <= 0` or when the snapshot is empty.
   *
   * This method does NOT perform HTTP calls.
   * It does not throw due to ProtoPedia API failures; it only reflects
   * the current in-memory state of the snapshot.
   *
   * @param size - Maximum number of random samples to return
   */
  getRandomSampleFromSnapshot(
    size: number,
  ): Promise<readonly DeepReadonly<NormalizedPrototype>[]>;

  /**
   * Clean up event listeners and release resources.
   *
   * This method removes all event listeners from the internal EventEmitter.
   * Always call this method in cleanup paths to prevent memory leaks.
   *
   * @remarks
   * **When to call:**
   * - Test cleanup (`afterEach` in test suites)
   * - Component unmounting (React `useEffect` cleanup)
   * - Before creating a new repository instance
   * - When the repository is no longer needed
   *
   * **Safety:**
   * - Safe to call even when events are disabled (`enableEvents: false`)
   * - Safe to call multiple times
   * - Does nothing if no event listeners exist
   *
   * @example
   * ```typescript
   * // In tests
   * afterEach(() => {
   *   repo.dispose();
   * });
   *
   * // In React components
   * useEffect(() => {
   *   repo.events?.on('snapshotCompleted', handleComplete);
   *   return () => repo.dispose();
   * }, []);
   * ```
   *
   * @see {@link events} for event emitter property
   */
  dispose(): void;
}
