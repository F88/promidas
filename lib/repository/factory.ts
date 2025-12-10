/**
 * Factory function for creating ProtoPedia in-memory repository instances.
 *
 * This module provides the public API for instantiating repositories.
 * The factory creates a {@link ProtopediaInMemoryRepositoryImpl} instance
 * with the provided configuration.
 *
 * @module
 */
import type { ProtoPediaApiClientOptions } from 'protopedia-api-v2-client';

import type { PrototypeInMemoryStoreConfig } from '../store/index.js';

import { ProtopediaInMemoryRepositoryImpl } from './protopedia-in-memory-repository.js';

import type { ProtopediaInMemoryRepository } from './index.js';

/**
 * Create an in-memory repository for ProtoPedia prototypes.
 *
 * This is the public factory function that creates a repository instance.
 *
 * @param storeConfig - Configuration for the underlying in-memory store
 * @param protopediaApiClientOptions - Optional HTTP client configuration
 * @returns A configured repository instance
 *
 * @example
 * ```typescript
 * const repository = createProtopediaInMemoryRepository(
 *   { maxSize: 10000 },
 *   { timeout: 5000 }
 * );
 *
 * await repository.setupSnapshot({ offset: 0, limit: 100 });
 * const prototype = await repository.getPrototypeFromSnapshotByPrototypeId(42);
 * ```
 */
export const createProtopediaInMemoryRepository = (
  storeConfig: PrototypeInMemoryStoreConfig,
  protopediaApiClientOptions?: ProtoPediaApiClientOptions,
): ProtopediaInMemoryRepository => {
  return new ProtopediaInMemoryRepositoryImpl(
    storeConfig,
    protopediaApiClientOptions,
  );
};
