/**
 * Public entrypoint for the memorystore-for-pp library.
 *
 * This module re-exports the primary types and factories that most
 * consumers need:
 *
 * - {@link NormalizedPrototype} — the core normalized ProtoPedia
 *   prototype type used throughout the library.
 * - {@link PrototypeMapStore} — a low-level in-memory store for
 *   `NormalizedPrototype` snapshots.
 * - {@link createProtopediaInMemoryRepository} — a higher-level
 *   convenience factory that wires a `PrototypeMapStore` together with
 *   the official ProtoPedia API client.
 */
export type { NormalizedPrototype } from './core/types';
export type { PrototypeMapStore, PrototypeMapStoreConfig } from './core/store';
export { createProtopediaInMemoryRepository } from './simple-store-for-protopedia';
