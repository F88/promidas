/**
 * Public entrypoint for the @f88/promidas library.
 *
 * ## Quick Start
 *
 * For most use cases, use the high-level Repository:
 *
 * @example
 * ```typescript
 * import { createPromidasRepository } from '@f88/promidas';
 *
 * const repo = createPromidasRepository({
 *   storeConfig: { ttlMs: 30 * 60 * 1000 },
 *   apiClientOptions: { token: process.env.PROTOPEDIA_API_V2_TOKEN },
 * });
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
 * // Repository (same as root import)
 * import { createPromidasRepository } from '@f88/promidas/repository';
 * ```
 *
 * ## Available Subpath Exports
 *
 * - `@f88/promidas/types` — Type definitions (NormalizedPrototype)
 * - `@f88/promidas/utils` — Utility functions and converters
 * - `@f88/promidas/logger` — Logger interface and implementations
 * - `@f88/promidas/fetcher` — API client and data fetching utilities
 * - `@f88/promidas/store` — In-memory store implementation
 * - `@f88/promidas/repository` — High-level repository factory
 *
 * @packageDocumentation
 */

// High-level Repository (most common use case)
export {
  createPromidasRepository,
  type CreatePromidasRepositoryOptions,
  type ProtopediaInMemoryRepository,
  type ProtopediaInMemoryRepositoryStats,
  type PrototypeAnalysisResult,
  type PrototypeInMemoryStoreConfig,
} from './factory.js';
