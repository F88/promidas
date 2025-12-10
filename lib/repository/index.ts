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
 * import { createProtopediaInMemoryRepository } from '@your-org/promidas';
 *
 * // Create repository with TTL and memory limits
 * const repository = createProtopediaInMemoryRepository(
 *   {
 *     ttlSeconds: 3600,           // 1 hour TTL
 *     maxDataSizeBytes: 10485760, // 10MB limit
 *   },
 *   {
 *     baseURL: 'https://protopedia.example.com',
 *   }
 * );
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
 * @see {@link createProtopediaInMemoryRepository} for the factory function
 */

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
 * Type definitions for repository operations and results.
 *
 * Exports all type definitions used by the repository interface:
 *
 * - {@link ProtopediaInMemoryRepository} - Main repository interface
 * - {@link CreateProtopediaInMemoryRepository} - Factory function signature
 * - {@link SnapshotOperationResult} - Result type for setup/refresh operations
 * - {@link SnapshotOperationSuccess} - Success variant with metadata
 * - {@link SnapshotOperationFailure} - Failure variant with error details
 * - {@link PrototypeAnalysisResult} - Statistical analysis result type
 *
 * @see {@link ProtopediaInMemoryRepository} for usage examples
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
 * This factory function is the recommended way to instantiate a repository.
 * It wires together the in-memory store and HTTP API client with proper
 * configuration and dependency injection.
 *
 * @param storeConfig - Configuration for the underlying in-memory store
 *   - `ttlSeconds` - Time-to-live for snapshot expiration
 *   - `maxDataSizeBytes` - Memory guard to prevent excessive data
 *   - `logger` - Custom logger for store operations (optional)
 *
 * @param apiClientOptions - Configuration for the ProtoPedia HTTP client
 *   - `baseURL` - API endpoint URL
 *   - `logger` - Custom logger for API operations (optional)
 *   - Other client-specific options
 *
 * @returns A fully configured {@link ProtopediaInMemoryRepository} instance
 *
 * @example
 * ```typescript
 * // Minimal setup with defaults
 * const repo = createProtopediaInMemoryRepository({}, {});
 *
 * // Production setup with TTL and memory limits
 * const repo = createProtopediaInMemoryRepository(
 *   {
 *     ttlSeconds: 3600,           // 1 hour
 *     maxDataSizeBytes: 10485760, // 10MB
 *   },
 *   {
 *     baseURL: 'https://protopedia.example.com',
 *   }
 * );
 *
 * // Advanced: Independent loggers for store and API
 * import { createLogger } from './logger';
 *
 * const storeLogger = createLogger({ minLevel: 'debug', prefix: '[Store]' });
 * const apiLogger = createLogger({ minLevel: 'info', prefix: '[API]' });
 *
 * const repo = createProtopediaInMemoryRepository(
 *   { logger: storeLogger },
 *   { logger: apiLogger }
 * );
 * ```
 *
 * @see {@link ProtopediaInMemoryRepository} for available operations
 * @see {@link PrototypeInMemoryStoreConfig} for store configuration options
 */
export { createProtopediaInMemoryRepository } from './factory.js';

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
 * - ✅ **Use the factory** ({@link createProtopediaInMemoryRepository}) for normal usage
 * - ⚠️ **Use this class** only when you need direct control over construction
 *
 * @example
 * ```typescript
 * // Normal usage: Use factory (recommended)
 * const repo = createProtopediaInMemoryRepository(config, options);
 *
 * // Advanced: Direct instantiation (for testing or special cases)
 * import { ProtopediaInMemoryRepositoryImpl } from '@your-org/promidas';
 *
 * const repo = new ProtopediaInMemoryRepositoryImpl(
 *   { ttlSeconds: 3600 },
 *   { baseURL: 'https://api.example.com' }
 * );
 * ```
 *
 * @see {@link createProtopediaInMemoryRepository} for the recommended factory function
 * @see {@link ProtopediaInMemoryRepository} for the interface definition
 */
export { ProtopediaInMemoryRepositoryImpl } from './protopedia-in-memory-repository.js';
