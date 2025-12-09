/**
 * Public entrypoint for the @f88/promidas library.
 *
 * This module re-exports the primary types and factories that most
 * consumers need:
 *
 * - {@link NormalizedPrototype} — the core normalized ProtoPedia
 *   prototype type used throughout the library.
 * - {@link createProtopediaApiCustomClient} — a standalone API client
 *   factory for fetching normalized prototypes.
 * - {@link PrototypeMapStore} — a low-level in-memory store for
 *   `NormalizedPrototype` snapshots.
 * - {@link PrototypeMapStoreConfig} — configuration options for
 *   `PrototypeMapStore`.
 * - {@link createProtopediaInMemoryRepository} — a higher-level
 *   convenience factory that creates a
 *   {@link ProtopediaInMemoryRepository} instance, combining
 *   `PrototypeMapStore` with the official ProtoPedia API client.
 *
 * @example
 * ```typescript
 * import { createProtopediaInMemoryRepository } from '@f88/promidas';
 *
 * const repo = createProtopediaInMemoryRepository(
 *   { ttlMs: 30 * 60 * 1000 },
 *   { token: process.env.PROTOPEDIA_API_V2_TOKEN }
 * );
 *
 * await repo.setupSnapshot({ offset: 0, limit: 100 });
 * const random = repo.getRandomPrototypeFromSnapshot();
 * ```
 *
 * @packageDocumentation
 */

// types
export type { NormalizedPrototype } from './types/index.js';

// Simple Store for ProtoPedia
export {
  PrototypeMapStore,
  type PrototypeMapStoreConfig,
} from './store/index.js';

// Fetcher (API client and utilities)
export {
  createProtopediaApiCustomClient,
  type ProtopediaApiCustomClient,
  type ProtoPediaApiClientOptions,
} from './fetcher/index.js';

// Protopedia In-Memory Repository
export type {
  ProtopediaInMemoryRepository,
  ProtopediaInMemoryRepositoryStats,
} from './repository/index.js';
export { createProtopediaInMemoryRepository } from './repository/index.js';
