/**
 * Public entrypoint for the promidas library.
 *
 * ## Quick Start
 *
 * For most use cases, use the Builder to create a Repository:
 *
 * @example
 * ```typescript
 * import { PromidasRepositoryBuilder } from 'promidas';
 *
 * const repo = new PromidasRepositoryBuilder()
 *   .setStoreConfig({ ttlMs: 30 * 60 * 1000 })
 *   .setApiClientConfig({
 *     protoPediaApiClientOptions: { token: process.env.PROTOPEDIA_API_V2_TOKEN }
 *   })
 *   .build();
 *
 * await repo.setupSnapshot({ limit: 100 });
 * const prototype = await repo.getRandomPrototypeFromSnapshot();
 * ```
 *
 * ## Standalone Module Usage
 *
 * For advanced use cases or when you need specific modules independently,
 * use subpath imports:
 *
 * @example
 * ```typescript
 * // Type definitions
 * import type { NormalizedPrototype } from 'promidas/types';
 *
 * // Utility functions and converters
 * import {
 *   parseProtoPediaTimestamp,
 *   getPrototypeStatusLabel
 * } from 'promidas/utils';
 *
 * // Logger interface and implementations
 * import { createConsoleLogger } from 'promidas/logger';
 *
 * // API client and data fetching
 * import {
 *   ProtopediaApiCustomClient
 * } from 'promidas/fetcher';
 *
 * // In-memory store
 * import { PrototypeInMemoryStore } from 'promidas/store';
 *
 * // Repository builder
 * import { PromidasRepositoryBuilder } from 'promidas';
 * ```
 *
 * ## Available Subpath Exports
 *
 * - `promidas/types` — Type definitions (NormalizedPrototype)
 * - `promidas/utils` — Utility functions and converters
 * - `promidas/logger` — Logger interface and implementations
 * - `promidas/fetcher` — API client and data fetching utilities
 * - `promidas/store` — In-memory store implementation
 *
 * @packageDocumentation
 */

// Builder for creating repository instances
export {
  // Builder for advanced use cases
  PromidasRepositoryBuilder,

  // Re-exported from Store module for convenience
  type PrototypeInMemoryStoreConfig,
  type PrototypeInMemoryStats,

  // Re-exported from Logger module for convenience
  // type Logger,
  // type LogLevel,

  // Re-exported from Fetcher module for convenience
  type ProtoPediaApiClientOptions,

  // Re-exported from Repository module for convenience
  type ProtopediaInMemoryRepository,
  type ProtopediaInMemoryRepositoryConfig,
} from './builder.js';

// Factory functions for common use cases
export { createPromidasForLocal, createPromidasForServer } from './factory.js';
