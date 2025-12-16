/**
 * Repository module - Type definitions and implementation class.
 *
 * This module provides type definitions for the in-memory repository pattern
 * managing ProtoPedia prototype data with automatic TTL management.
 *
 * ## What This Module Exports
 *
 * - **Type definitions**: {@link ProtopediaInMemoryRepository}, {@link NormalizedPrototype}, etc.
 * - **Implementation class**: {@link ProtopediaInMemoryRepositoryImpl} (for advanced use)
 * - **Re-exported types**: Logger, LogLevel, StoreConfig for convenience
 *
 * ## Usage
 *
 * See [Getting Started Guide](https://f88.github.io/promidas/getting-started.html)
 * for usage examples and API documentation.
 *
 * @module
 * @see {@link ProtopediaInMemoryRepository} for the repository interface
 * @see https://f88.github.io/promidas/ for complete documentation
 */

/**
 * Core data type used by the repository.
 *
 * Re-exported from types module for convenience when using the repository standalone.
 *
 * @example
 * ```typescript
 * import type { NormalizedPrototype } from '@f88/promidas/repository';
 *
 * const prototypes: NormalizedPrototype[] = await repository.getAllFromSnapshot();
 * ```
 */
export type { NormalizedPrototype } from '../types/index.js';

/**
 * Logger types for custom logger configuration.
 *
 * Re-exported from logger module for convenience.
 *
 * @example
 * ```typescript
 * import type { Logger } from '@f88/promidas/repository';
 *
 * const customLogger: Logger = {
 *   debug: (msg) => console.debug(msg),
 *   info: (msg) => console.info(msg),
 *   warn: (msg) => console.warn(msg),
 *   error: (msg) => console.error(msg),
 * };
 * ```
 */
export type { Logger, LogLevel } from '../logger/index.js';

/**
 * Statistics about the current in-memory snapshot.
 *
 * Provides metadata about the snapshot including size, creation time,
 * expiration status, and TTL configuration.
 *
 * Re-exported from {@link PrototypeInMemoryStats} for convenience.
 *
 * @example
 * ```typescript
 * const stats = await repository.getStats();
 * console.log(`Snapshot contains ${stats.size} prototypes`);
 * console.log(`Expires: ${stats.expiresAt ? 'Yes' : 'Never'}`);
 * ```
 */
export type { PrototypeInMemoryStats as ProtopediaInMemoryRepositoryStats } from '../store/index.js';

/**
 * Configuration options for the in-memory store.
 *
 * Re-exported from the store module for convenience.
 *
 * @example
 * ```typescript
 * import type { PrototypeInMemoryStoreConfig } from '@f88/promidas/repository';
 *
 * const storeConfig: PrototypeInMemoryStoreConfig = {
 *   ttlMs: 30 * 60 * 1000,
 *   maxDataSizeBytes: 10 * 1024 * 1024,
 *   logLevel: 'info'
 * };
 * ```
 */
export type { PrototypeInMemoryStoreConfig } from '../store/index.js';

/**
 * Type definitions for repository operations and results.
 *
 * Exports all type definitions used by the repository interface:
 *
 * - {@link ProtopediaInMemoryRepository} - Main repository interface
 * - {@link ProtopediaInMemoryRepositoryConfig} - Repository configuration options
 * - {@link SnapshotOperationResult} - Result type for setup/refresh operations
 * - {@link SnapshotOperationSuccess} - Success variant with metadata
 * - {@link SnapshotOperationFailure} - Failure variant with error details
 * - {@link PrototypeAnalysisResult} - Statistical analysis result type
 */
export type {
  ProtopediaInMemoryRepository,
  ProtopediaInMemoryRepositoryConfig,
  PrototypeAnalysisResult,
  SnapshotOperationResult,
  SnapshotOperationSuccess,
  SnapshotOperationFailure,
} from './types/index.js';

/**
 * Implementation class for the in-memory repository.
 *
 * This is the concrete implementation of {@link ProtopediaInMemoryRepository}.
 * Exported for testing purposes and type inspection.
 *
 * **Note**: For normal usage, import from `@f88/promidas` instead.
 * See module documentation for usage examples.
 *
 * @see {@link ProtopediaInMemoryRepository} for the interface definition
 */
export { ProtopediaInMemoryRepositoryImpl } from './protopedia-in-memory-repository.js';
