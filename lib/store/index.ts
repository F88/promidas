/**
 * In-memory snapshot store module.
 *
 * This module provides the generic storage engine used by the repository:
 *
 * - {@link PrototypeInMemoryStore} — The main store class handling in-memory snapshots,
 *   TTL expiration, and efficient ID-based lookups.
 * - {@link PrototypeInMemoryStoreConfig} — Configuration options for the store
 *   (TTL, max data size).
 * - {@link PrototypeInMemoryStats} — Statistics and metadata about the current state
 *   of the store, returned by `getStats()`.
 *
 * Logger types are re-exported for convenience when configuring the store:
 * - {@link Logger} — Logger interface for custom logging implementations.
 * - {@link LogLevel} — Log level type for controlling logger verbosity.
 *
 * @module
 */

export {
  PrototypeInMemoryStore,
  type PrototypeInMemoryStats,
  type PrototypeInMemoryStoreConfig,
} from './store.js';

export type { Logger, LogLevel } from '../logger/index.js';
