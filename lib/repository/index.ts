/**
 * Simple in-memory repository for ProtoPedia prototypes.
 *
 * This module provides a snapshot-based repository pattern for managing
 * ProtoPedia prototype data in memory with automatic TTL management and
 * efficient data access patterns.
 *
 * ## Core Concepts
 *
 * - **Snapshot-based**: All read operations work against an in-memory snapshot
 * - **Network isolation**: HTTP calls only occur during setup/refresh operations
 * - **TTL management**: Automatic expiration tracking with configurable policies
 * - **Type-safe**: Full TypeScript support with runtime validation (Zod)
 * - **Performance optimized**: O(1) lookups, efficient sampling algorithms
 *
 * ## Key Features
 *
 * ### Data Access
 * - `getAllFromSnapshot()` - Retrieve all prototypes for transformations
 * - `getPrototypeFromSnapshotByPrototypeId()` - Fast O(1) ID lookup
 * - `getRandomSampleFromSnapshot()` - Efficient sampling (hybrid algorithm)
 * - `getPrototypeIdsFromSnapshot()` - Get all IDs without full data
 *
 * ### Analysis
 * - `analyzePrototypes()` - Statistical analysis (min/max ID)
 * - `getStats()` - Snapshot metadata (size, timestamps, TTL)
 *
 * ### Lifecycle
 * - `setupSnapshot()` - Initial data fetch and population
 * - `refreshSnapshot()` - Update snapshot with fresh API data
 *
 * ## Usage Example
 *
 * ```typescript
 * import { createPromidasRepository } from '@f88/promidas';
 *
 * // Create repository with TTL and memory limits
 * const repository = createPromidasRepository({
 *   storeConfig: {
 *     ttlMs: 60 * 60 * 1000,      // 1 hour TTL
 *     maxDataSizeBytes: 10485760, // 10MB limit
 *   },
 *   apiClientOptions: {
 *     baseURL: 'https://protopedia.example.com',
 *   },
 * });
 *
 * // Fetch initial snapshot
 * const setupResult = await repository.setupSnapshot({ limit: 1000 });
 * if (!setupResult.ok) {
 *   throw new Error(setupResult.error);
 * }
 *
 * // Fast lookups from memory
 * const prototype = await repository.getPrototypeFromSnapshotByPrototypeId(42);
 *
 * // Data transformation
 * const allPrototypes = await repository.getAllFromSnapshot();
 * const names = allPrototypes.map(p => p.prototypeNm);
 *
 * // Random sampling
 * const sample = await repository.getRandomSampleFromSnapshot(10);
 * ```
 *
 * ## Design Decisions
 *
 * This repository is backed by {@link PrototypeInMemoryStore} and provides:
 *
 * 1. **Immutable snapshots** - Data is read-only after fetch
 * 2. **Validation** - Runtime parameter validation with Zod schemas
 * 3. **Logging** - Independent logger configuration for store and API client
 * 4. **Performance** - Hybrid sampling (Set-based vs Fisher-Yates)
 *
 * @module
 * @see {@link ProtopediaInMemoryRepository} for the complete interface
 * @see https://f88.github.io/promidas/getting-started.html for usage with factory functions
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
 * Re-exported from logger module for convenience when configuring the repository.
 *
 * @example
 * ```typescript
 * import { PromidasRepositoryBuilder, type Logger } from '@f88/promidas';
 *
 * const customLogger: Logger = {
 *   debug: (msg) => console.debug(msg),
 *   info: (msg) => console.info(msg),
 *   warn: (msg) => console.warn(msg),
 *   error: (msg) => console.error(msg),
 * };
 *
 * const repo = new PromidasRepositoryBuilder()
 *   .setSharedLogger(customLogger)
 *   .setDefaultLogLevel('debug')
 *   .setApiClientConfig({
 *     protoPediaApiClientOptions: { token: 'xxx' },
 *   })
 *   .build();
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
 * Re-exported from the store module as it's a required parameter for
 * {@link createPromidasRepository}.
 *
 * @example
 * ```typescript
 * const storeConfig: PrototypeInMemoryStoreConfig = {
 *   ttlMs: 30 * 60 * 1000,
 *   logger: createConsoleLogger(),
 *   logLevel: 'info'
 * };
 * const repo = createPromidasRepository({ storeConfig });
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
 *
 * Note: Factory function {@link createPromidasRepository} is now in ../factory.js
 *
 * @see {@link ProtopediaInMemoryRepository} for usage examples
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
 * Factory function documentation moved to ../factory.ts
 *
 * This module re-exports the factory for backward compatibility.
 * Users can import from either '@f88/promidas' or '@f88/promidas/repository'.
 *
 * @see {@link createPromidasRepository} in ../factory.ts for full documentation
 * @see {@link ProtopediaInMemoryRepository} for available operations
 * @see {@link PrototypeInMemoryStoreConfig} for store configuration options
 */

/**
 * Re-export factory function from the top-level factory module.
 *
 * This allows backward compatibility for users importing from '@f88/promidas/repository'.
 *
 * @example
 * ```typescript
 * // Both work (recommended: use top-level import)
 * import { createPromidasRepository } from '@f88/promidas';
 * import { createPromidasRepository } from '@f88/promidas/repository';
 * ```
 */
// Factory export removed - use PromidasRepositoryBuilder from root instead

/**
 * Implementation class for the in-memory repository.
 *
 * This is the concrete implementation of {@link ProtopediaInMemoryRepository}.
 * It is exported primarily for:
 *
 * - **Testing purposes** - Direct instantiation in test suites
 * - **Advanced use cases** - When you need more control than the factory provides
 * - **Type inspection** - Access to the implementation's type information
 *
 * ## When to Use
 *
 * - ✅ **Use the factory** ({@link createPromidasRepository}) for normal usage
 * - ⚠️ **Use this class** only when you need direct control over construction
 *
 * @example
 * ```typescript
 * // Normal usage: Use factory (recommended)
 * const repo = createPromidasRepository({
 *   storeConfig: { ttlMs: 3600000 },
 *   apiClientOptions: { token: 'xxx' }
 * });
 *
 * // Advanced: Direct instantiation (for testing or special cases)
 * import { ProtopediaInMemoryRepositoryImpl } from '@your-org/promidas';
 *
 * const repo = new ProtopediaInMemoryRepositoryImpl(
 *   { ttlMs: 3600000 },
 *   { token: 'xxx' }
 * );
 * ```
 *
 * @see {@link createPromidasRepository} for the recommended factory function
 * @see {@link ProtopediaInMemoryRepository} for the interface definition
 */
export { ProtopediaInMemoryRepositoryImpl } from './protopedia-in-memory-repository.js';
