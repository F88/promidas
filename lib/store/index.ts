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
 * Type definitions are re-exported for convenience:
 * - {@link NormalizedPrototype} — The data type stored in the store.
 * - {@link Logger} — Logger interface for custom logging implementations.
 * - {@link LogLevel} — Log level type for controlling logger verbosity.
 *
 * @module
 */

export {
  LIMIT_DATA_SIZE_BYTES,
  PrototypeInMemoryStore,
  type PrototypeInMemoryStats,
  type PrototypeInMemoryStoreConfig,
  type Snapshot as PrototypeInMemorySnapshot,
} from './store.js';

export {
  StoreError,
  ConfigurationError,
  DataSizeExceededError,
  SizeEstimationError,
  type StoreDataState,
} from './errors/store-error.js';

export type {
  SetSuccess,
  SetFailure,
  SetResult,
  StoreErrorCode,
  StoreFailureKind,
} from './types/index.js';

export type { NormalizedPrototype } from '../types/index.js';

export type { Logger, LogLevel } from '../logger/index.js';
