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
import type { ProtopediaInMemoryRepository } from './types/index.js';

/**
 * Create an in-memory repository for ProtoPedia prototypes.
 *
 * This is the public factory function that creates a repository instance.
 * The store and API client can have independent logger configurations.
 *
 * @param storeConfig - Configuration for the underlying in-memory store.
 *   Use storeConfig.logger to configure logging for store operations.
 * @param protopediaApiClientOptions - Optional HTTP client configuration.
 *   Use apiClientOptions.logger to configure logging for API operations.
 * @returns A configured repository instance
 *
 * @example
 * ```typescript
 * // Use the same logger for both store and API client
 * const logger = createConsoleLogger('debug');
 * const repository = createProtopediaInMemoryRepository(
 *   { ttlMs: 30000, logger },
 *   { token: 'xxx', logger }
 * );
 *
 * // Use different loggers
 * const repository = createProtopediaInMemoryRepository(
 *   { ttlMs: 30000, logger: storeLogger },
 *   { token: 'xxx', logger: apiLogger }
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
