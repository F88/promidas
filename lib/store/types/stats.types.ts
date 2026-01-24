/**
 * Statistics and metadata about the current state of the PrototypeInMemoryStore.
 *
 * Provides information about cache health, configuration, and runtime state.
 */
export type PrototypeInMemoryStats = {
  /** Number of prototypes currently stored in the cache. */
  readonly size: number;
  /** Timestamp when the snapshot was last cached, or null if never cached. */
  readonly cachedAt: Date | null;
  /** Whether the cached snapshot has exceeded its TTL. */
  readonly isExpired: boolean;
  /** Remaining time in milliseconds until expiration. 0 if expired or no data cached. */
  readonly remainingTtlMs: number;
  /** Exact size of the cached snapshot in bytes (JSON serialized). */
  readonly dataSizeBytes: number;
  /** Whether a background refresh operation is currently in progress. */
  readonly refreshInFlight: boolean;
};
