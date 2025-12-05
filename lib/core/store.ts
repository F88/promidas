/**
 * @file In-memory store that keeps the most recent ProtoPedia snapshot and exposes
 * efficient lookup helpers (O(1) by id, random selection, stale detection, etc.).
 *
 * The store sits above upstream fetch logic, allowing server actions to reuse
 * canonical data without repeated API calls while still respecting TTL limits.
 */
import { createConsoleLogger } from '../lib/logger';

import { NormalizedPrototype } from './types';

const THIRTY_MINUTES_IN_MS = 30 * 60 * 1_000;

/**
 * Configuration options for the PrototypeMapStore.
 */
export type PrototypeMapStoreConfig = {
  /** TTL in milliseconds after which the cached snapshot is considered expired. */
  ttlMs?: number;
  /** Maximum allowed payload size in bytes for storing snapshots. */
  maxPayloadSizeBytes?: number;
};

type PrototypeMapStats = {
  size: number;
  cachedAt: Date | null;
  ttlMs: number;
  isExpired: boolean;
  approxSizeBytes: number;
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
  private readonly logger = createConsoleLogger('info');

  private readonly ttlMs: number;

  private readonly maxPayloadSizeBytes: number;

  private prototypeMap = new Map<number, NormalizedPrototype>();

  private prototypes: NormalizedPrototype[] = [];

  private maxPrototypeId: number | null = null;

  private cachedAt: Date | null = null;

  private approxSizeBytes = 0;

  private refreshPromise: Promise<void> | null = null;

  constructor({
    ttlMs = THIRTY_MINUTES_IN_MS,
    maxPayloadSizeBytes = 30 * 1024 * 1024,
  }: PrototypeMapStoreConfig = {}) {
    if (maxPayloadSizeBytes > 30 * 1024 * 1024) {
      throw new Error(
        'PrototypeMapStore maxPayloadSizeBytes must be <= 30 MiB to prevent oversized payloads',
      );
    }

    this.ttlMs = ttlMs;
    this.maxPayloadSizeBytes = maxPayloadSizeBytes;

    this.logger.info('PrototypeMapStore initialized', {
      ttlMs: this.ttlMs,
      maxPayloadSizeBytes: this.maxPayloadSizeBytes,
    });
  }

  /**
   * Replaces the current prototype snapshot with the provided collection if within size limits.
   *
   * @returns Metadata about the stored snapshot, or null when the payload exceeded limits.
   */
  /**
   * Store the provided snapshot if it fits within the configured payload limit.
   *
   * Performs size estimation, replaces both the backing map and ordered array,
   * and refreshes metadata used for TTL enforcement.
   */
  setAll(
    prototypes: NormalizedPrototype[],
  ): { approxSizeBytes: number } | null {
    const approxSizeBytes = this.estimateSize(prototypes);

    if (approxSizeBytes > this.maxPayloadSizeBytes) {
      this.logger.warn('Snapshot skipped: payload exceeds maximum size', {
        approxSizeBytes,
        maxPayloadSizeBytes: this.maxPayloadSizeBytes,
        count: prototypes.length,
      });
      return null;
    }

    this.prototypeMap = new Map(
      prototypes.map((prototype) => [prototype.id, prototype]),
    );
    this.prototypes = prototypes;
    this.cachedAt = new Date();
    this.approxSizeBytes = approxSizeBytes;
    this.maxPrototypeId =
      prototypes.length > 0
        ? prototypes.reduce(
            (max, prototype) => (prototype.id > max ? prototype.id : max),
            prototypes[0].id,
          )
        : null;

    this.logger.info('PrototypeMapStore snapshot updated', {
      count: this.prototypeMap.size,
      approxSizeBytes,
    });

    return { approxSizeBytes };
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
  getById(id: number): NormalizedPrototype | undefined {
    return this.prototypeMap.get(id);
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

  /** Determine whether the snapshot is stale based on the configured TTL. */
  isExpired(): boolean {
    if (!this.cachedAt) {
      return true;
    }
    return Date.now() - this.cachedAt.getTime() > this.ttlMs;
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
    this.approxSizeBytes = 0;
    this.maxPrototypeId = null;
    this.logger.info('PrototypeMapStore cleared', { previousSize });
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

  /** Provide statistics describing cache health and configuration. */
  getStats(): PrototypeMapStats {
    return {
      size: this.prototypeMap.size,
      cachedAt: this.cachedAt,
      ttlMs: this.ttlMs,
      isExpired: this.isExpired(),
      approxSizeBytes: this.approxSizeBytes,
      refreshInFlight: this.isRefreshInFlight(),
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
