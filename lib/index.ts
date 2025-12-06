/**
 * Public entrypoint for the @f88/promidas library.
 *
 * This module re-exports the primary types and factories that most
 * consumers need:
 *
 * - {@link NormalizedPrototype} — the core normalized ProtoPedia
 *   prototype type used throughout the library.
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
export type { NormalizedPrototype } from './core/types.js';
export type {
  PrototypeMapStore,
  PrototypeMapStoreConfig,
} from './core/store.js';
export type {
  ProtopediaInMemoryRepository,
  ProtopediaInMemoryRepositoryStats,
} from './simple-store-for-protopedia/index.js';
export { createProtopediaInMemoryRepository } from './simple-store-for-protopedia/index.js';
