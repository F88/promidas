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
 * - {@link fetchAndNormalizePrototypes} — a helper to fetch and normalize
 *   prototypes from any compatible client.
 * - {@link constructDisplayMessage} — a helper to format error messages for display.
 * - {@link PrototypeMapStore} — a low-level in-memory store for
 *   `NormalizedPrototype` snapshots.
 * - {@link PrototypeMapStoreConfig} — configuration options for
 *   `PrototypeMapStore`.
 * - {@link createProtopediaInMemoryRepository} — a higher-level
 *   convenience factory that creates a
 *   {@link ProtopediaInMemoryRepository} instance, combining
 *   `PrototypeMapStore` with the official ProtoPedia API client.
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
  constructDisplayMessage,
  createProtopediaApiCustomClient,
  fetchAndNormalizePrototypes,
  type FetchPrototypesResult,
  type ListPrototypesClient,
  type ProtoPediaApiClientOptions,
  type ProtopediaApiCustomClient,
} from './fetcher/index.js';

// Protopedia In-Memory Repository
export {
  createProtopediaInMemoryRepository,
  type ProtopediaInMemoryRepository,
  type ProtopediaInMemoryRepositoryStats,
} from './repository/index.js';
