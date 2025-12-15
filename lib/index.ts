/**
 * Public entrypoint for the @f88/promidas library.
 *
 * ## Quick Start
 *
 * For most use cases, use the Builder to create a Repository:
 *
 * @example
 * ```typescript
 * import { PromidasRepositoryBuilder } from '@f88/promidas';
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
 * import type { NormalizedPrototype } from '@f88/promidas/types';
 *
 * // Utility functions and converters
 * import {
 *   parseProtoPediaTimestamp,
 *   getPrototypeStatusLabel
 * } from '@f88/promidas/utils';
 *
 * // Logger interface and implementations
 * import { createConsoleLogger } from '@f88/promidas/logger';
 *
 * // API client and data fetching
 * import {
 *   createProtopediaApiCustomClient
 * } from '@f88/promidas/fetcher';
 *
 * // In-memory store
 * import { PrototypeInMemoryStore } from '@f88/promidas/store';
 *
 * // Repository builder
 * import { PromidasRepositoryBuilder } from '@f88/promidas';
 * ```
 *
 * ## Available Subpath Exports
 *
 * - `@f88/promidas/types` — Type definitions (NormalizedPrototype)
 * - `@f88/promidas/utils` — Utility functions and converters
 * - `@f88/promidas/logger` — Logger interface and implementations
 * - `@f88/promidas/fetcher` — API client and data fetching utilities
 * - `@f88/promidas/store` — In-memory store implementation
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
