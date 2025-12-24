/**
 * In-Memory Prototype Storage Module.
 *
 * This module provides a complete storage layer for managing in-memory snapshots
 * of prototype data, including TTL-based expiration, size limits, and efficient
 * ID-based lookups. It can be used as a standalone module for custom caching
 * solutions or integrated with the repository layer.
 *
 * ## Core Components
 *
 * - {@link PrototypeInMemoryStore} — Main store class with snapshot management, TTL expiration, and ID-based lookups.
 * - {@link PrototypeInMemoryStoreConfig} — Configuration options including TTL and max data size.
 * - {@link PrototypeInMemoryStats} — Statistics and metadata about the current store state.
 *
 * ### Storage Operations & Result Types
 *
 * - {@link SetResult} — Discriminated union result type for `setAll` operations.
 * - {@link StoreErrorCode} — Error codes for precise error classification.
 * - {@link StoreFailureKind} — Failure kinds: `'storage_limit'`, `'serialization'`, or `'unknown'`.
 *
 * ### Error Handling
 *
 * The store throws exceptions by default, but also provides Result types for
 * consumers who prefer explicit error handling:
 *
 * - {@link StoreError} — Base error class for all store errors.
 * - {@link ConfigurationError} — Configuration validation errors.
 * - {@link DataSizeExceededError} — Data size limit exceeded.
 * - {@link SizeEstimationError} — Size estimation failures.
 * - {@link StoreDataState} — Data state after operation: `'UNCHANGED'`, `'CLEARED'`, or `'UNKNOWN'`.
 *
 * ### Dependencies
 *
 * - {@link NormalizedPrototype} — The data type stored in the store.
 * - {@link Logger} — Logger interface for custom logging implementations.
 * - {@link LogLevel} — Log level type for controlling logger verbosity.
 *
 * ## Standalone Usage
 *
 * This module is designed to work independently, allowing you to:
 * - Create custom in-memory caching solutions
 * - Build data snapshot management systems
 * - Integrate with different runtime environments (Node.js, Next.js, etc.)
 *
 * ## Design Philosophy
 *
 * - **Exception-based**: Store operations throw exceptions on errors
 * - **Result types available**: Optional Result pattern for consumers who prefer it
 * - **TTL-based expiration**: Automatic data invalidation after configured time
 * - **Size limits**: Prevents memory overflow with configurable limits
 * - **Type-safe**: Full TypeScript support with discriminated unions
 *
 * @example
 * ```typescript
 * import { PrototypeInMemoryStore } from '@f88/promidas/store';
 *
 * const store = new PrototypeInMemoryStore({
 *   ttlMs: 30 * 60 * 1000, // 30 minutes
 *   maxDataSizeBytes: 50 * 1024 * 1024, // 50MB
 * });
 *
 * // Store data (throws on error)
 * const snapshot = store.setAll(prototypes);
 * console.log(`Stored ${snapshot.count} prototypes`);
 *
 * // Check if data is fresh
 * if (!store.isExpired()) {
 *   const prototype = store.getByPrototypeId('proto-123');
 * }
 *
 * // Get statistics
 * const stats = store.getStats();
 * console.log(`Store size: ${stats.dataSizeBytes} bytes`);
 * ```
 *
 * @module
 * @see {@link ../repository/index.js} for high-level repository integration
 */

// Core Store
export {
  LIMIT_DATA_SIZE_BYTES,
  PrototypeInMemoryStore,
  type PrototypeInMemoryStats,
  type PrototypeInMemoryStoreConfig,
  type Snapshot as PrototypeInMemorySnapshot,
} from './store.js';

// Errors
export {
  StoreError,
  ConfigurationError,
  DataSizeExceededError,
  SizeEstimationError,
  type StoreDataState,
} from './errors/store-error.js';

// Result Types
export type {
  SetResult,
  StoreErrorCode,
  StoreFailureKind,
} from './types/index.js';

// Core Types (re-exported for convenience)
export type { NormalizedPrototype } from '../types/index.js';

// Logging
export type { Logger, LogLevel } from '../logger/index.js';
