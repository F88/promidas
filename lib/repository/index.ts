/**
 * Simple in-memory repository for ProtoPedia prototypes.
 *
 * This module exposes a snapshot-based repository interface that is backed
 * by the generic {@link PrototypeInMemoryStore}. It is designed to be
 * easy to use from server-side or other long-lived processes that want to:
 *
 * - fetch prototypes from the ProtoPedia HTTP API,
 * - keep a snapshot of them in memory for fast lookups, and
 * - decide when to refresh that snapshot using TTL or custom policies.
 *
 * All read operations work only against the current in-memory snapshot.
 * Network calls are performed only by setup/refresh operations.
 *
 * @module
 */
import type {
  ListPrototypesParams,
  ProtoPediaApiClientOptions,
} from 'protopedia-api-v2-client';
import type { DeepReadonly } from 'ts-essentials';

import type {
  PrototypeInMemoryStats,
  PrototypeInMemoryStoreConfig,
} from '../store/index.js';
import type { NormalizedPrototype } from '../types/index.js';

import { createProtopediaInMemoryRepositoryImpl } from './protopedia-in-memory-repository.js';
import type { PrototypeAnalysisResult } from './types.js';


/**
 * Statistics about the current in-memory snapshot for ProtoPedia.
 *
 * Re-exported from {@link PrototypeInMemoryStats} for convenience.
 */
export type { PrototypeInMemoryStats as ProtopediaInMemoryRepositoryStats } from '../store/index.js';

/**
 * Result of analyzing prototypes to extract ID range.
 */
export type { PrototypeAnalysisResult } from './types.js';

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
   * Fetch prototypes from ProtoPedia and populate the in-memory snapshot.
   *
   * Typical usage: call once on startup, or before the first read. The
   * concrete fetch strategy (all vs partial, page size, filters, etc.) is
   * an implementation detail of this repository.
   *
   * @throws {Error} When the underlying ProtoPedia API call fails
   * (for example, due to network issues, invalid credentials, or
   * unexpected upstream errors). In case of failure, any existing
   * in-memory snapshot remains unchanged.
   */
  setupSnapshot(params: ListPrototypesParams): Promise<void>;

  /**
   * Refresh the snapshot using the same strategy as the last
   * {@link ProtopediaInMemoryRepository.setupSnapshot | setupSnapshot}
   * call, or a reasonable default strategy when `setupSnapshot` has not
   * been called yet.
   *
   * @throws {Error} When the underlying ProtoPedia API call fails
   * (for example, due to network issues, invalid credentials, or
   * unexpected upstream errors). In case of failure, the current
   * in-memory snapshot is preserved.
   */
  refreshSnapshot(): Promise<void>;

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
   *
   * @example
   * ```typescript
   * const repo = createProtopediaInMemoryRepository({});
   * await repo.setupSnapshot({ limit: 100 });
   *
   * // Get all available IDs
   * const ids = await repo.getPrototypeIdsFromSnapshot();
   * console.log(`Available prototypes: ${ids.length}`);
   *
   * // Return to client
   * return { availableIds: ids };
   * ```
   */
  getPrototypeIdsFromSnapshot(): Promise<readonly number[]>;

  /**
   * Analyze prototypes from the current snapshot to extract ID range.
   *
   * Returns the minimum and maximum prototype IDs from the current snapshot.
   * This method does NOT perform HTTP calls.
   *
   * @returns Object containing min and max IDs, or null values if snapshot is empty
   *
   * @example
   * ```typescript
   * const repo = createProtopediaInMemoryRepository({});
   * await repo.setupSnapshot({ limit: 1000 });
   *
   * const { min, max } = await repo.analyzePrototypes();
   * console.log(`ID range: ${min} - ${max}`);
   * ```
   */
  analyzePrototypes(): Promise<{ min: number | null; max: number | null }>;

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
   * Retrieve the configuration used to initialize the underlying store.
   *
   * Returns the TTL and maximum data size settings (logger is excluded).
   */
  getConfig(): Omit<Required<PrototypeInMemoryStoreConfig>, 'logger'>;
}

/**
 * Create an in-memory repository for ProtoPedia prototypes.
 *
 * This factory wires together:
 * - a {@link PrototypeInMemoryStoreConfig} for the underlying in-memory store
 *   (TTL, memory guard, etc.), and
 * - options for the ProtoPedia HTTP client used to fetch prototypes.
 *
 * The returned {@link ProtopediaInMemoryRepository} exposes a
 * snapshot-based API: it uses the configured client to populate a snapshot
 * in memory, and then serves read operations from that snapshot only.
 *
 * NOTE: The concrete implementation is provided elsewhere; this type only
 * defines the public interface surface for consumers.
 */
export type CreateProtopediaInMemoryRepository = (
  storeConfig: PrototypeInMemoryStoreConfig,
  protopediaApiClientOptions?: ProtoPediaApiClientOptions,
) => ProtopediaInMemoryRepository;

export const createProtopediaInMemoryRepository: CreateProtopediaInMemoryRepository =
  (storeConfig, protopediaApiClientOptions) => {
    return createProtopediaInMemoryRepositoryImpl(
      storeConfig,
      protopediaApiClientOptions,
    );
  };
