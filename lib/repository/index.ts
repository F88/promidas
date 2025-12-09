/**
 * Simple in-memory repository for ProtoPedia prototypes.
 *
 * This module exposes a snapshot-based repository interface that is backed
 * by the generic {@link PrototypeMapStore}. It is designed to be
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

import type { PrototypeMapStoreConfig } from '../store/index.js';
import type { NormalizedPrototype } from '../types/index.js';

import { createProtopediaInMemoryRepositoryImpl } from './protopedia-in-memory-repository.js';

/**
 * Basic statistics about the current in-memory snapshot for ProtoPedia.
 *
 * These values are derived from the underlying PrototypeMapStore and are
 * useful to drive TTL-based refresh policies.
 */
export interface ProtopediaInMemoryRepositoryStats {
  /** Number of prototypes currently in the in-memory snapshot. */
  size: number;

  /**
   * When the current snapshot was fetched, in milliseconds since epoch.
   * Null means the snapshot has never been populated.
   */
  cachedAt: number | null;

  /**
   * Whether the underlying store considers the snapshot expired according
   * to its TTL configuration.
   */
  isExpired: boolean;
}

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
   * Returns:
   * - the prototype when it exists in the snapshot, or
   * - `undefined` when the id is not present in the current snapshot.
   *
   * This method does NOT perform HTTP calls.
   * It does not throw due to ProtoPedia API failures; it only reflects
   * the current in-memory state of the snapshot.
   */
  getPrototypeFromSnapshotById(
    id: number,
  ): Promise<NormalizedPrototype | undefined>;

  /**
   * Get a random prototype from the current in-memory snapshot.
   *
   * Returns:
   * - a random prototype when the snapshot is not empty, or
   * - `undefined` when the snapshot is empty.
   *
   * This method does NOT perform HTTP calls.
   * It does not throw due to ProtoPedia API failures; it only reflects
   * the current in-memory state of the snapshot.
   */
  getRandomPrototypeFromSnapshot(): Promise<NormalizedPrototype | undefined>;

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
  getStats(): ProtopediaInMemoryRepositoryStats;
}

/**
 * Create an in-memory repository for ProtoPedia prototypes.
 *
 * This factory wires together:
 * - a {@link PrototypeMapStoreConfig} for the underlying in-memory store
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
  storeConfig: PrototypeMapStoreConfig,
  protopediaApiClientOptions?: ProtoPediaApiClientOptions,
) => ProtopediaInMemoryRepository;

export const createProtopediaInMemoryRepository: CreateProtopediaInMemoryRepository =
  (storeConfig, protopediaApiClientOptions) => {
    return createProtopediaInMemoryRepositoryImpl(
      storeConfig,
      protopediaApiClientOptions,
    );
  };
