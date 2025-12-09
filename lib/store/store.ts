/**
 * @file In-memory store that keeps the most recent ProtoPedia snapshot and exposes
 * efficient lookup helpers (O(1) by id, random selection, stale detection, etc.).
 *
 * The store sits above upstream fetch logic, allowing server actions to reuse
 * canonical data without repeated API calls while still respecting TTL limits.
 */
import { createConsoleLogger } from '../lib/logger.js';
import type { Logger } from '../lib/logger.types.js';
import type { NormalizedPrototype } from '../types/index.js';

const DEFAULT_TTL_MS = 30 * 60 * 1_000; // 30 minutes
const DEFAULT_DATA_SIZE_BYTES = 10 * 1024 * 1024; // 10 MiB
const MAX_DATA_SIZE_BYTES = 30 * 1024 * 1024; // 30 MiB

/**
 * Configuration options for the PrototypeMapStore.
 */
export type PrototypeMapStoreConfig = {
  /** TTL in milliseconds after which the cached snapshot is considered expired. */
  ttlMs?: number;
  /** Maximum allowed data size in bytes for storing snapshots. */
  maxDataSizeBytes?: number;
  /** Custom logger instance. Defaults to console logger with 'info' level. */
  logger?: Logger;
};

/**
 * Statistics and metadata about the current state of the PrototypeMapStore.
 *
 * Provides information about cache health, configuration, and runtime state.
 */
export type PrototypeMapStats = {
  /** Number of prototypes currently stored in the cache. */
  size: number;
  /** Timestamp when the snapshot was last cached, or null if never cached. */
  cachedAt: Date | null;
  /** Whether the cached snapshot has exceeded its TTL. */
  isExpired: boolean;
  /** Remaining time in milliseconds until expiration. 0 if expired or no data cached. */
  remainingTtlMs: number;
  /** Exact size of the cached snapshot in bytes (JSON serialized). */
  dataSizeBytes: number;
  /** Whether a background refresh operation is currently in progress. */
  refreshInFlight: boolean;
};

type RefreshTask = () => Promise<void>;

type Snapshot = {
  data: NormalizedPrototype[];
  cachedAt: Date | null;
  isExpired: boolean;
};

/**
 * In-memory store that keeps the full set of normalized prototypes in a numbered map.
 *
 * The store accepts full snapshots (`setAll`) and exposes O(1) lookups by prototype id (`getById`).
 * When TTL expires, data remains readable while callers kick off background refresh tasks using
 * {@link runExclusive} to avoid redundant upstream calls.
 */
export class PrototypeMapStore {
  private readonly logger: Logger;

  private readonly ttlMs: number;

  private readonly maxDataSizeBytes: number;

  private prototypeMap = new Map<number, NormalizedPrototype>();

  private prototypes: NormalizedPrototype[] = [];

  private minPrototypeId: number | null = null;

  private maxPrototypeId: number | null = null;

  private cachedAt: Date | null = null;

  private dataSizeBytes = 0;

  private refreshPromise: Promise<void> | null = null;

  constructor({
    ttlMs = DEFAULT_TTL_MS,
    maxDataSizeBytes = DEFAULT_DATA_SIZE_BYTES,
    logger,
  }: PrototypeMapStoreConfig = {}) {
    // Throw if maxDataSizeBytes exceeds the hard limit
    if (maxDataSizeBytes > MAX_DATA_SIZE_BYTES) {
      const maxMiB = (MAX_DATA_SIZE_BYTES / (1024 * 1024)).toFixed(0);
      throw new Error(
        `PrototypeMapStore maxDataSizeBytes must be <= ${MAX_DATA_SIZE_BYTES} bytes (${maxMiB} MiB) to prevent oversized data`,
      );
    }

    this.ttlMs = ttlMs;
    this.maxDataSizeBytes = maxDataSizeBytes;
    this.logger = logger ?? createConsoleLogger('info');

    this.logger.info('PrototypeMapStore initialized', {
      ttlMs: this.ttlMs,
      maxDataSizeBytes: this.maxDataSizeBytes,
    });
  }

  /**
   * Store the provided snapshot if it fits within the configured payload limit.
   *
   * @param prototypes - Array of normalized prototypes to store
   * @returns Metadata about the stored snapshot including the exact data size in bytes,
   *          or null when the payload exceeded the configured maximum size limit.
   */
  setAll(prototypes: NormalizedPrototype[]): { dataSizeBytes: number } | null {
    const dataSizeBytes = this.estimateSize(prototypes);

    if (dataSizeBytes > this.maxDataSizeBytes) {
      this.logger.warn('Snapshot skipped: data exceeds maximum size', {
        dataSizeBytes,
        maxDataSizeBytes: this.maxDataSizeBytes,
        count: prototypes.length,
      });
      return null;
    }

    this.prototypeMap = new Map(
      prototypes.map((prototype) => [prototype.id, prototype]),
    );
    this.prototypes = prototypes;
    this.cachedAt = new Date();
    this.dataSizeBytes = dataSizeBytes;

    if (prototypes.length > 0) {
      const firstId = prototypes[0]!.id;
      const { min, max } = prototypes.reduce(
        (acc, prototype) => ({
          min: prototype.id < acc.min ? prototype.id : acc.min,
          max: prototype.id > acc.max ? prototype.id : acc.max,
        }),
        { min: firstId, max: firstId },
      );
      this.minPrototypeId = min;
      this.maxPrototypeId = max;
    } else {
      this.minPrototypeId = null;
      this.maxPrototypeId = null;
    }

    this.logger.info('PrototypeMapStore snapshot updated', {
      count: this.prototypeMap.size,
      dataSizeBytes,
    });

    return { dataSizeBytes };
  }

  /** Count of prototypes currently kept in the in-memory map. */
  get size(): number {
    return this.prototypeMap.size;
  }

  /** Retrieve the latest fetched prototypes in their original order. */
  getAll(): NormalizedPrototype[] {
    return this.prototypes;
  }

  /** Retrieve a single prototype by its numeric identifier. */
  getByPrototypeId(prototypeId: number): NormalizedPrototype | null {
    return this.prototypeMap.get(prototypeId) ?? null;
  }

  /**
   * Select a random prototype from the cached snapshot.
   *
   * Returns null when the store is empty, allowing callers to fall back to
   * alternative fetch paths.
   */
  getRandom(): NormalizedPrototype | null {
    if (this.prototypes.length === 0) {
      return null;
    }

    const index = Math.floor(Math.random() * this.prototypes.length);
    return this.prototypes[index] ?? null;
  }

  /** Timestamp representing when the snapshot was last refreshed. */
  getCachedAt(): Date | null {
    return this.cachedAt;
  }

  /**
   * Calculate elapsed time in milliseconds since the snapshot was cached.
   * Returns 0 if no data is cached.
   */
  private getElapsedTime(): number {
    if (!this.cachedAt) {
      return 0;
    }
    return Date.now() - this.cachedAt.getTime();
  }

  /**
   * Calculate remaining time in milliseconds until expiration.
   * Returns 0 if already expired or no data is cached.
   */
  private getRemainingTtl(): number {
    if (!this.cachedAt) {
      return 0;
    }
    const elapsed = this.getElapsedTime();
    const remaining = this.ttlMs - elapsed;
    return Math.max(0, remaining);
  }

  /** Determine whether the snapshot is stale based on the configured TTL. */
  isExpired(): boolean {
    if (!this.cachedAt) {
      return true;
    }
    return this.getElapsedTime() > this.ttlMs;
  }

  /**
   * Return a lightweight structure containing the cached data and metadata.
   *
   * Useful for callers that want to inspect expiry state without mutating the store.
   */
  getSnapshot(): Snapshot {
    return {
      data: this.getAll(),
      cachedAt: this.cachedAt,
      isExpired: this.isExpired(),
    };
  }

  /** Reset the store to an empty state and clear all metadata. */
  clear(): void {
    const previousSize = this.prototypeMap.size;
    this.prototypeMap.clear();
    this.prototypes = [];
    this.cachedAt = null;
    this.dataSizeBytes = 0;
    this.minPrototypeId = null;
    this.maxPrototypeId = null;
    this.logger.info('PrototypeMapStore cleared', { previousSize });
  }
  /** Return the lowest prototype id cached in the store, or null when empty. */
  getMinId(): number | null {
    return this.minPrototypeId;
  }

  /** Return the highest prototype id cached in the store, or null when empty. */
  getMaxId(): number | null {
    return this.maxPrototypeId;
  }

  /**
   * Execute a refresh task while preventing concurrent execution.
   *
   * @returns Promise resolved when the task completes; callers may ignore it for background refreshes.
   */
  runExclusive(task: RefreshTask): Promise<void> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        await task();
      } catch (error) {
        this.logger.error('PrototypeMapStore refresh task failed', { error });
        throw error;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /** Report whether a background refresh is currently in flight. */
  isRefreshInFlight(): boolean {
    return this.refreshPromise !== null;
  }

  /**
   * Provide statistics describing cache health and runtime state.
   *
   * Returns metadata about the current snapshot including size, expiration status,
   * and refresh state. For configuration values like TTL, use {@link getConfig}.
   */
  getStats(): PrototypeMapStats {
    return {
      size: this.prototypeMap.size,
      cachedAt: this.cachedAt,
      isExpired: this.isExpired(),
      remainingTtlMs: this.getRemainingTtl(),
      dataSizeBytes: this.dataSizeBytes,
      refreshInFlight: this.isRefreshInFlight(),
    };
  }

  /**
   * Retrieve the configuration used to initialize this store.
   *
   * Returns the resolved configuration values (TTL and max payload size) that were
   * set during instantiation. These values are immutable after construction.
   */
  getConfig(): Omit<Required<PrototypeMapStoreConfig>, 'logger'> {
    return {
      ttlMs: this.ttlMs,
      maxDataSizeBytes: this.maxDataSizeBytes,
    };
  }

  /** Estimate JSON payload size for logging and guardrails. */
  private estimateSize(data: NormalizedPrototype[]): number {
    try {
      const serialized = JSON.stringify(data);
      if (typeof Buffer !== 'undefined') {
        return Buffer.byteLength(serialized, 'utf8');
      }
      if (typeof TextEncoder !== 'undefined') {
        return new TextEncoder().encode(serialized).length;
      }
    } catch (error) {
      this.logger.warn('Failed to estimate payload size, defaulting to 0', {
        error,
      });
    }
    return 0;
  }
}
