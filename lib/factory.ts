/**
 * Factory functions for creating {@link ProtopediaInMemoryRepository} instances.
 *
 * This module provides convenience factory functions that simplify the setup
 * of ProtopediaInMemoryRepository for common use cases.
 *
 * ## About This Implementation
 *
 * These factory functions serve as **sample implementations** and are intentionally
 * verbose to demonstrate the pattern. Users are encouraged to create their own
 * custom factory functions optimized for their specific use cases.
 *
 * The current implementations are simple wrappers around {@link PromidasRepositoryBuilder},
 * but can be extended with environment-specific defaults (e.g., different TTL values,
 * log levels, or API client configurations).
 *
 * @example Creating a custom factory
 * ```typescript
 * import { PromidasRepositoryBuilder } from '@f88/promidas';
 * import type { ProtopediaInMemoryRepository } from '@f88/promidas';
 *
 * export function createMyCustomRepository(): ProtopediaInMemoryRepository {
 *   return new PromidasRepositoryBuilder()
 *     .setStoreConfig({ ttlMs: 60 * 60 * 1000, logLevel: 'warn' }) // 1 hour TTL
 *     .build();
 * }
 * ```
 *
 * @module
 */

import { PromidasRepositoryBuilder } from './builder.js';
import type { ProtopediaApiCustomClientConfig } from './fetcher/index.js';
import { ConsoleLogger } from './logger/console-logger.js';
import type { LogLevel } from './logger/index.js';
import type {
  ProtopediaInMemoryRepository,
  ProtopediaInMemoryRepositoryConfig,
} from './repository/types/index.js';
import { LIMIT_DATA_SIZE_BYTES as STORE_MAX_DATA_SIZE_BYTES_LIMIT } from './store/index.js';
import type { PrototypeInMemoryStoreConfig } from './store/index.js';
import { VERSION } from './version.js';

/**
 * Creates a PromidasRepository instance optimized for local execution environments.
 *
 * This factory function is designed for personal computers, local scripts,
 * and development environments where the TOKEN can be safely stored.
 *
 * ## Pre-configured Settings
 *
 * This function automatically configures the following settings:
 *
 * **Logger:**
 * - Log Level: `'info'` (records normal operations for development monitoring)
 *
 * **Store:**
 * - TTL: 30 minutes (1,800,000 ms)
 * - Max Data Size: 30 MiB (hard limit)
 *
 * **API Client:**
 * - Timeout: 90 seconds (accommodates 1-2 Mbps connections)
 * - User-Agent: `PromidasForLocal/{version}`
 *
 * ## Use Cases
 *
 * - Local development and testing
 * - Command-line scripts
 * - Personal automation tools
 * - Data analysis scripts
 *
 * @param config - Configuration options
 * @param config.protopediaApiToken - ProtoPedia API v2 token
 * @param config.logLevel - Log level for all components (optional, default: 'info')
 * @returns A configured PromidasRepository instance
 *
 * @example Basic usage
 * ```typescript
 * import { createPromidasForLocal } from "promidas";
 *
 * const repository = createPromidasForLocal({
 *   protopediaApiToken: 'your-api-token',
 * });
 *
 * // Setup snapshot with 100 prototypes
 * await repository.setupSnapshot({ limit: 100 });
 *
 * // Get random prototype
 * const prototype = await repository.getRandomPrototypeFromSnapshot();
 * console.log(prototype?.prototypeNm);
 * ```
 *
 * @example With custom log level
 * ```typescript
 * const repository = createPromidasForLocal({
 *   protopediaApiToken: process.env.PROTOPEDIA_API_V2_TOKEN!,
 *   logLevel: 'warn', // Only show warnings and errors
 * });
 * ```
 */
export function createPromidasForLocal(config: {
  protopediaApiToken: string;
  logLevel?: LogLevel;
}): ProtopediaInMemoryRepository {
  // Create a builder instance
  const builder = new PromidasRepositoryBuilder();

  // Determine log level
  // Note: 'info' level records normal operations for development monitoring
  const logLevel: LogLevel = config.logLevel ?? 'info';

  // Create a shared logger instance for memory efficiency
  //
  // Design Decision: We create one ConsoleLogger and share it across all components
  // instead of passing logLevel to each component's config. This reduces memory
  // footprint and ensures consistent logging behavior across the repository.
  const logger = new ConsoleLogger(logLevel);

  // Configure store with default TTL for local development
  const storeConfig: PrototypeInMemoryStoreConfig = {
    ttlMs: 30 * 60 * 1000, // 30 minutes
    maxDataSizeBytes: STORE_MAX_DATA_SIZE_BYTES_LIMIT, // 30 MiB
    logger, // Shared logger - logLevel is NOT set because logger already contains it
  };
  builder.setStoreConfig(storeConfig);

  // Configure API client wrapper
  const apiClientConfig: ProtopediaApiCustomClientConfig = {
    protoPediaApiClientOptions: {
      token: config.protopediaApiToken,
      // Timeout for API requests (SDK default: 15000ms = 15s)
      // Reference: 20MB download time by connection speed:
      //   - 10 Mbps: ~16s
      //   - 5 Mbps: ~32s
      //   - 1 Mbps: ~160s (2m40s)
      //   - 0.5 Mbps: ~320s (5m20s)
      timeoutMs: 90 * 1_000, // 90 seconds (accommodates 1-2 Mbps)
      userAgent: `PromidasForLocal/${VERSION}`,
    },
    logger, // Shared logger - logLevel is NOT set because logger already contains it
  };
  builder.setApiClientConfig(apiClientConfig);

  // Configure repository
  const repositoryConfig: ProtopediaInMemoryRepositoryConfig = {
    logger, // Shared logger - logLevel is NOT set because logger already contains it
  };
  builder.setRepositoryConfig(repositoryConfig);

  // Build and return the repository instance
  return builder.build();
}

/**
 * Creates a PromidasRepository instance optimized for server backend environments.
 *
 * This factory function is designed for Node.js server applications
 * where the TOKEN is managed securely via environment variables.
 *
 * ## Pre-configured Settings
 *
 * This function automatically configures the following settings:
 *
 * **Environment Variable:**
 * - Token Source: `PROTOPEDIA_API_V2_TOKEN` (required)
 *
 * **Logger:**
 * - Log Level: `'warn'` (production-ready, warnings and errors only)
 *
 * **Store:**
 * - TTL: 10 minutes (600,000 ms)
 * - Max Data Size: 30 MiB (hard limit)
 *
 * **API Client:**
 * - Timeout: 30 seconds (server-grade connection)
 * - User-Agent: `PromidasForServer/{version}`
 *
 * ## Use Cases
 *
 * - REST API servers
 * - Background job processors
 * - Serverless functions (AWS Lambda, Cloud Functions)
 * - Microservices
 *
 * @param config - Configuration options
 * @param config.logLevel - Log level for all components (optional, default: 'warn')
 * @returns A configured PromidasRepository instance
 * @throws {Error} If PROTOPEDIA_API_V2_TOKEN environment variable is not set
 *
 * @example Basic usage
 * ```typescript
 * import { createPromidasForServer } from "promidas";
 *
 * // TOKEN is read from PROTOPEDIA_API_V2_TOKEN environment variable
 * const repository = createPromidasForServer();
 *
 * // Setup snapshot with 1000 prototypes
 * await repository.setupSnapshot({ limit: 1000 });
 *
 * // Get prototype by ID
 * const prototype = await repository.getPrototypeFromSnapshotByPrototypeId(123);
 * ```
 *
 * @example With custom log level
 * ```typescript
 * const repository = createPromidasForServer({
 *   logLevel: 'error', // Only show errors in production
 * });
 * ```
 */
export function createPromidasForServer(config?: {
  logLevel?: LogLevel;
}): ProtopediaInMemoryRepository {
  // Read TOKEN from environment variable
  const protopediaApiToken = process.env.PROTOPEDIA_API_V2_TOKEN;
  if (!protopediaApiToken) {
    throw new Error(
      'PROTOPEDIA_API_V2_TOKEN environment variable is required for server environments',
    );
  }

  // Create a builder instance
  const builder = new PromidasRepositoryBuilder();

  // Determine log level for server environment
  // Note: 'warn' level is recommended for server environments to reduce log volume
  const logLevel: LogLevel = config?.logLevel ?? 'warn';

  // Create a shared logger instance for memory efficiency
  //
  // Design Decision: We create one ConsoleLogger and share it across all components
  // instead of passing logLevel to each component's config. This reduces memory
  // footprint and ensures consistent logging behavior across the repository.
  const logger = new ConsoleLogger(logLevel);

  // Configure store for server environments (shorter TTL for memory efficiency)
  const storeConfig: PrototypeInMemoryStoreConfig = {
    ttlMs: 10 * 60 * 1000, // 10 minutes
    maxDataSizeBytes: STORE_MAX_DATA_SIZE_BYTES_LIMIT, // 30 MiB
    logger, // Shared logger - logLevel is NOT set because logger already contains it
  };
  builder.setStoreConfig(storeConfig);

  // Configure API client for server environments (stable, high-speed connections)
  const apiClientConfig: ProtopediaApiCustomClientConfig = {
    protoPediaApiClientOptions: {
      token: protopediaApiToken,
      timeoutMs: 30 * 1_000, // 30 seconds
      userAgent: `PromidasForServer/${VERSION}`,
    },
    logger, // Shared logger - logLevel is NOT set because logger already contains it
  };
  builder.setApiClientConfig(apiClientConfig);

  // Configure repository
  const repositoryConfig: ProtopediaInMemoryRepositoryConfig = {
    logger, // Shared logger - logLevel is NOT set because logger already contains it
  };
  builder.setRepositoryConfig(repositoryConfig);

  // Build and return the repository instance
  return builder.build();
}
