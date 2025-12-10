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

/**
 * Statistics about the current in-memory snapshot for ProtoPedia.
 *
 * Re-exported from {@link PrototypeInMemoryStats} for convenience.
 */
export type { PrototypeInMemoryStats as ProtopediaInMemoryRepositoryStats } from '../store/index.js';

/**
 * Type definitions for repository operations and results.
 */
export type {
  CreateProtopediaInMemoryRepository,
  ProtopediaInMemoryRepository,
  PrototypeAnalysisResult,
  SnapshotOperationResult,
  SnapshotOperationSuccess,
  SnapshotOperationFailure,
} from './types/index.js';

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
 */
export { createProtopediaInMemoryRepository } from './protopedia-in-memory-repository.js';
