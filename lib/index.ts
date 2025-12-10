/**
 * Public entrypoint for the @f88/promidas library.
 *
 * This module re-exports the primary types and factories:
 *
 * **Types:**
 * - {@link NormalizedPrototype} — Core normalized prototype type
 *
 * **Logger:**
 * - {@link Logger} — Logger interface for custom logging
 * - {@link LogLevel} — Log level type
 *
 * **Store (In-memory snapshot management):**
 * - {@link PrototypeInMemoryStore} — In-memory store with TTL and efficient lookups
 * - {@link PrototypeInMemoryStoreConfig} — Store configuration options
 * - {@link PrototypeInMemoryStats} — Store statistics and metadata
 *
 * **Fetcher (API client and normalization):**
 * - {@link createProtopediaApiCustomClient} — Standalone API client factory
 * - {@link fetchAndNormalizePrototypes} — Fetch and normalize helper
 * - {@link constructDisplayMessage} — Error message formatter
 *
 * **Repository (High-level data management):**
 * - {@link createProtopediaInMemoryRepository} — Repository factory
 * - {@link ProtopediaInMemoryRepository} — Repository interface with analysis methods
 * - {@link PrototypeAnalysisResult} — Result type for prototype ID range analysis
 *
 * @packageDocumentation
 */

// types
export type { NormalizedPrototype } from './types/index.js';

// Logger
export type { Logger, LogLevel } from './logger/index.js';

// Simple Store for ProtoPedia
export {
  PrototypeInMemoryStore,
  type PrototypeInMemoryStats,
  type PrototypeInMemoryStoreConfig,
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
  type PrototypeAnalysisResult,
} from './repository/index.js';
