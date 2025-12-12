/**
 * Factory function for creating ProtoPedia in-memory repository instances.
 *
 * This module provides the **recommended entry point** for creating repository
 * instances. It encapsulates the instantiation logic and provides better
 * dependency injection than direct class construction.
 *
 * ## Design Benefits
 *
 * ### 1. Abstraction
 * Hides implementation details ({@link ProtopediaInMemoryRepositoryImpl})
 * behind a clean functional interface.
 *
 * ### 2. Future-Proofing
 * Factory pattern allows internal implementation changes without breaking
 * client code. For example, we could add:
 * - Connection pooling
 * - Instance caching
 * - Dependency validation
 * - Alternative implementations
 *
 * ### 3. Configuration Simplicity
 * Single function call with clear parameter semantics, rather than
 * managing constructors and dependencies manually.
 *
 * ### 4. Type Safety
 * Returns interface type ({@link ProtopediaInMemoryRepository}) rather than
 * concrete class, enforcing programming to interfaces.
 *
 * ## Usage Patterns
 *
 * ### Basic Usage
 * ```typescript
 * const repo = createProtopediaInMemoryRepository({});
 * await repo.setupSnapshot({});
 * ```
 *
 * ### Production Setup
 * ```typescript
 * const repo = createProtopediaInMemoryRepository({
 *   storeConfig: {
 *     ttlSeconds: 3600,           // 1 hour TTL
 *     maxDataSizeBytes: 10485760, // 10MB limit
 *   },
 *   apiClientOptions: {
 *     baseURL: 'https://protopedia.example.com',
 *   },
 * });
 * ```
 *
 * ### Independent Logging
 * ```typescript
 * const storeLogger = createLogger({ prefix: '[Store]' });
 * const apiLogger = createLogger({ prefix: '[API]' });
 *
 * const repo = createProtopediaInMemoryRepository({
 *   storeConfig: { logger: storeLogger },
 *   apiClientOptions: { logger: apiLogger },
 * });
 * ```
 *
 * @module
 * @see {@link createProtopediaInMemoryRepository} for the factory function
 * @see {@link ProtopediaInMemoryRepository} for the interface contract
 */
import type { ProtoPediaApiClientOptions } from 'protopedia-api-v2-client';

import type { PrototypeInMemoryStoreConfig } from '../store/index.js';

import { ProtopediaInMemoryRepositoryImpl } from './protopedia-in-memory-repository.js';
import type { ProtopediaInMemoryRepository } from './types/index.js';

/**
 * Options for creating a ProtoPedia in-memory repository.
 */
export interface CreateProtopediaInMemoryRepositoryOptions {
  /**
   * Configuration for the underlying in-memory store.
   *
   * - `ttlSeconds` - Time-to-live for automatic snapshot expiration (optional)
   * - `maxDataSizeBytes` - Memory guard to prevent excessive data storage (optional)
   * - `logger` - Custom logger instance for store operations (optional)
   * - Defaults to `{}` for sensible defaults
   */
  storeConfig?: PrototypeInMemoryStoreConfig;

  /**
   * Configuration for the ProtoPedia HTTP client.
   *
   * - `baseURL` - API endpoint URL (optional, uses client default if omitted)
   * - `logger` - Custom logger instance for API operations (optional)
   * - Additional HTTP client options (headers, timeout, etc.)
   */
  apiClientOptions?: ProtoPediaApiClientOptions;
}

/**
 * Create an in-memory repository for ProtoPedia prototypes.
 *
 * This is the **recommended way** to instantiate a repository. It provides
 * a clean, functional interface with proper dependency injection and
 * configuration management.
 *
 * @param options - Configuration options for the repository
 * @param options.storeConfig - Configuration for the underlying in-memory store (optional)
 * @param options.apiClientOptions - Configuration for the ProtoPedia HTTP client (optional)
 *
 * @returns A fully configured {@link ProtopediaInMemoryRepository} instance
 *   ready for snapshot operations and data access.
 *
 * @remarks
 * ### Logger Independence
 * The store and API client can have separate loggers, allowing granular
 * control over logging verbosity for different concerns:
 * - Store logger: Data management, TTL, memory usage
 * - API logger: HTTP requests, network errors, retries
 *
 * ### Configuration Flexibility
 * Both parameters are optional with sensible defaults. Start minimal and
 * add configuration as needed for production requirements.
 *
 * @example
 * **Minimal setup with defaults**
 * ```typescript
 * const repo = createProtopediaInMemoryRepository({});
 * await repo.setupSnapshot({});
 * const prototype = await repo.getPrototypeFromSnapshotByPrototypeId(42);
 * ```
 *
 * @example
 * **Production setup with TTL and memory limits**
 * ```typescript
 * const repo = createProtopediaInMemoryRepository({
 *   storeConfig: {
 *     ttlSeconds: 3600,           // Expire after 1 hour
 *     maxDataSizeBytes: 10485760, // Max 10MB in memory
 *   },
 *   apiClientOptions: {
 *     baseURL: 'https://protopedia.example.com/api/v2',
 *   },
 * });
 *
 * const result = await repo.setupSnapshot({ limit: 1000 });
 * if (!result.ok) {
 *   console.error('Setup failed:', result.error);
 * }
 * ```
 *
 * @example
 * **Shared logger for both components**
 * ```typescript
 * import { createLogger } from './logger';
 *
 * const logger = createLogger({ minLevel: 'debug' });
 * const repo = createProtopediaInMemoryRepository({
 *   storeConfig: { logger },
 *   apiClientOptions: { logger },
 * });
 * ```
 *
 * @example
 * **Independent loggers for granular control**
 * ```typescript
 * const storeLogger = createLogger({
 *   minLevel: 'debug',
 *   prefix: '[Store]'
 * });
 * const apiLogger = createLogger({
 *   minLevel: 'info',
 *   prefix: '[API]'
 * });
 *
 * const repo = createProtopediaInMemoryRepository({
 *   storeConfig: { logger: storeLogger },
 *   apiClientOptions: { logger: apiLogger },
 * });
 *
 * // Store logs will be more verbose (debug level)
 * // API logs will be less verbose (info level only)
 * await repo.setupSnapshot({ offset: 0, limit: 100 });
 * ```
 *
 * @example
 * **Full production configuration**
 * ```typescript
 * const repo = createProtopediaInMemoryRepository({
 *   storeConfig: {
 *     ttlSeconds: 7200,              // 2 hours
 *     maxDataSizeBytes: 52428800,    // 50MB
 *     logger: productionStoreLogger,
 *   },
 *   apiClientOptions: {
 *     baseURL: process.env.PROTOPEDIA_API_URL,
 *     logger: productionApiLogger,
 *     timeout: 30000,                 // 30s timeout
 *   },
 * });
 *
 * // Setup with error handling
 * const setupResult = await repo.setupSnapshot({
 *   offset: 0,
 *   limit: 5000,
 * });
 *
 * if (!setupResult.ok) {
 *   throw new Error(`Failed to setup repository: ${setupResult.error}`);
 * }
 *
 * console.log(`Loaded ${setupResult.size} prototypes`);
 * ```
 *
 * @see {@link ProtopediaInMemoryRepository} for available operations
 * @see {@link PrototypeInMemoryStoreConfig} for store configuration details
 * @see {@link ProtoPediaApiClientOptions} for API client options
 */
export const createProtopediaInMemoryRepository = ({
  storeConfig = {},
  apiClientOptions,
}: CreateProtopediaInMemoryRepositoryOptions = {}): ProtopediaInMemoryRepository => {
  return new ProtopediaInMemoryRepositoryImpl(storeConfig, apiClientOptions);
};
