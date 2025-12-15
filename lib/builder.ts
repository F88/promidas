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

// Logger types
import {
  ProtopediaApiCustomClient,
  type ProtopediaApiCustomClientConfig,
} from './fetcher/index.js';
import type { Logger, LogLevel } from './logger/index.js';
import { ProtopediaInMemoryRepositoryImpl } from './repository/protopedia-in-memory-repository.js';
import type {
  ProtopediaInMemoryRepository,
  ProtopediaInMemoryRepositoryConfig,
  PrototypeAnalysisResult,
} from './repository/types/index.js';
import {
  PrototypeInMemoryStore,
  type PrototypeInMemoryStats,
  type PrototypeInMemoryStoreConfig,
} from './store/index.js';
import { deepMerge, sanitizeDataForLogging } from './utils/index.js';

// Re-export types used in builder methods
export type {
  // Store
  PrototypeInMemoryStoreConfig,
  PrototypeInMemoryStats,

  // API Client
  ProtopediaApiCustomClient,
  ProtopediaApiCustomClientConfig,
  // Custom API client
  ProtoPediaApiClientOptions,

  // Repository
  ProtopediaInMemoryRepository,
  ProtopediaInMemoryRepositoryConfig,
  PrototypeAnalysisResult,
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
 *   .setApiClientConfig({
 *     protoPediaApiClientOptions: { token: 'my-token' }
 *   })
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
   * Multiple calls will merge configurations (later values override earlier ones).
   * Configuration is deeply merged to prevent external mutations while preserving
   * function references (e.g., logger methods).
   *
   * @param config - Store configuration (TTL, max size, logger, etc.)
   */
  setStoreConfig(config: PrototypeInMemoryStoreConfig): this {
    this.#storeConfig = deepMerge(this.#storeConfig, config);
    return this;
  }

  /**
   * Set configuration for the ProtopediaApiCustomClient wrapper.
   * Allows configuring the logger used by the client wrapper itself.
   *
   * Multiple calls will merge configurations (later values override earlier ones).
   * Configuration is deeply merged to prevent external mutations while preserving
   * function references (e.g., logger methods).
   *
   * @param config - Wrapper configuration (logger, logLevel)
   */
  setApiClientConfig(config: ProtopediaApiCustomClientConfig): this {
    this.#apiClientConfig = deepMerge(this.#apiClientConfig, config);
    return this;
  }

  /**
   * Set configuration for the Repository itself.
   *
   * Multiple calls will merge configurations (later values override earlier ones).
   * Configuration is deeply merged to prevent external mutations while preserving
   * function references (e.g., logger methods).
   *
   * @param config - Repository configuration (logger, etc.)
   */
  setRepositoryConfig(config: ProtopediaInMemoryRepositoryConfig): this {
    this.#repositoryConfig = deepMerge(this.#repositoryConfig, config);
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
      // Log the error before re-throwing, ensuring sensitive data is sanitized
      const logger = this.#repositoryConfig.logger ?? console;
      if (typeof logger.error === 'function') {
        logger.error(
          'Failed to build ProtopediaInMemoryRepository',
          sanitizeDataForLogging({ error }),
        );
      }
      throw error;
    }
  }
}
