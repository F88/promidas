/**
 * Builder for creating Promidas repository instances.
 *
 * This module provides a fluent builder interface for constructing
 * {@link ProtopediaInMemoryRepository} instances.
 *
 * @module
 */

// Import Store implementation

import type { ProtoPediaApiClientOptions } from 'protopedia-api-v2-client';

import {
  ProtopediaApiCustomClient,
  type ProtopediaApiCustomClientConfig,
} from './fetcher/index.js';
import type { Logger, LogLevel } from './logger/index.js';
import { ProtopediaInMemoryRepositoryImpl } from './repository/protopedia-in-memory-repository.js';
import type {
  ProtopediaInMemoryRepository,
  ProtopediaInMemoryRepositoryConfig,
} from './repository/types/index.js';
import {
  PrototypeInMemoryStore,
  type PrototypeInMemoryStats,
  type PrototypeInMemoryStoreConfig,
} from './store/index.js';

/**
 * Configuration options for the API client wrapper within the builder.
 */
export interface ApiClientWrapperConfig {
  logger?: Logger;
  logLevel?: LogLevel;
}

// Re-export types used in builder methods
export type {
  // Store
  PrototypeInMemoryStoreConfig,
  PrototypeInMemoryStats,

  // Custom API client
  ProtoPediaApiClientOptions,

  // Repository
  ProtopediaInMemoryRepository,
  ProtopediaInMemoryRepositoryConfig,
};

/**
 * A builder class for constructing {@link ProtopediaInMemoryRepository} instances.
 *
 * It allows for step-by-step configuration of Store, API Client, and Repository settings
 * through a fluent interface.
 *
 * @example
 * ```typescript
 * const repo = new PromidasRepositoryBuilder()
 *   .setStoreConfig({ ttlMs: 60000 })
 *   .setApiClientOptions({ token: 'my-token' })
 *   .build();
 * ```
 */
export class PromidasRepositoryBuilder {
  // Configs
  #storeConfig: PrototypeInMemoryStoreConfig = {};
  #apiClientConfig: ProtopediaApiCustomClientConfig = {};
  #repositoryConfig: ProtopediaInMemoryRepositoryConfig = {};

  /**
   * Set configuration for the in-memory store.
   *
   * @param config - Store configuration (TTL, max size, logger, etc.)
   */
  setStoreConfig(config: PrototypeInMemoryStoreConfig): this {
    this.#storeConfig = config;
    return this;
  }

  /**
   * Set configuration for the ProtopediaApiCustomClient wrapper.
   * Allows configuring the logger used by the client wrapper itself.
   *
   * @param config - Wrapper configuration (logger, logLevel)
   */
  setApiClientConfig(config: ProtopediaApiCustomClientConfig): this {
    this.#apiClientConfig = config;
    return this;
  }

  /**
   * Set configuration for the Repository itself.
   *
   * @param config - Repository configuration (logger, etc.)
   */
  setRepositoryConfig(config: ProtopediaInMemoryRepositoryConfig): this {
    this.#repositoryConfig = config;
    return this;
  }

  /**
   * Build and return a fully configured ProtopediaInMemoryRepository instance.
   *
   * This method creates new instances of dependencies (Store, API Client)
   * based on the accumulated configuration.
   *
   * @throws {Error} If any dependency fails to initialize.
   */
  build(): ProtopediaInMemoryRepository {
    try {
      const store = new PrototypeInMemoryStore(this.#storeConfig);

      const apiClient = new ProtopediaApiCustomClient(this.#apiClientConfig);

      return new ProtopediaInMemoryRepositoryImpl({
        store,
        apiClient,
        repositoryConfig: this.#repositoryConfig,
      });
    } catch (error) {
      // Log the error before re-throwing
      const logger = this.#repositoryConfig.logger ?? console;
      if (typeof logger.error === 'function') {
        logger.error('Failed to build ProtopediaInMemoryRepository', { error });
      }
      throw error;
    }
  }
}
