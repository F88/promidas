/**
 * In-memory snapshot store module.
 *
 * This module provides the generic storage engine used by the repository:
 *
 * - {@link PrototypeMapStore} — The main store class handling in-memory snapshots,
 *   TTL expiration, and efficient lookups.
 * - {@link PrototypeMapStoreConfig} — Configuration options for the store
 *   (TTL, max payload size).
 * - {@link PrototypeMapStats} — Statistics and metadata about the current state
 *   of the store, returned by `getStats()`.
 * - {@link Logger} — Logger interface for custom logging implementations.
 * - {@link LogLevel} — Log level type for controlling logger verbosity.
 *
 * @module
 */

export {
  PrototypeMapStore,
  type PrototypeMapStats,
  type PrototypeMapStoreConfig,
} from './store.js';

export type { Logger, LogLevel } from '../lib/logger.types.js';
