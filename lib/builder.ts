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
import { ConsoleLogger } from './logger/console-logger.js';
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
 * @remarks
 * **Shared Logger Pattern:**
 * When no explicit logger is provided in any configuration, a single shared ConsoleLogger
 * instance is created and used across all components (Store, API Client, Repository).
 * This improves memory efficiency and ensures consistent logging.
 *
 * **Log Level Priority:**
 * 1. Explicit logger instances (highest priority)
 * 2. Individual component logLevel (repository > store > apiClient)
 * 3. Default log level (set via {@link setDefaultLogLevel})
 * 4. 'info' (fallback)
 *
 * @example
 * ```typescript
 * // Basic usage with default settings
 * const repo = new PromidasRepositoryBuilder().build();
 *
 * // Configure store settings
 * const repo = new PromidasRepositoryBuilder()
 *   .setStoreConfig({ ttlMs: 60000 })
 *   .setApiClientConfig({
 *     protoPediaApiClientOptions: { token: 'my-token' }
 *   })
 *   .build();
 *
 * // Set default log level for all components
 * const repo = new PromidasRepositoryBuilder()
 *   .setDefaultLogLevel('debug')
 *   .build();
 *
 * // Mix default and individual log levels
 * const repo = new PromidasRepositoryBuilder()
 *   .setDefaultLogLevel('info')
 *   .setStoreConfig({ logLevel: 'error' })  // Store uses 'error'
 *   .build();  // ApiClient and Repository use 'info'
 * ```
 */
export class PromidasRepositoryBuilder {
  // Configs
  #storeConfig: PrototypeInMemoryStoreConfig = {};
  #apiClientConfig: ProtopediaApiCustomClientConfig = {};
  #repositoryConfig: ProtopediaInMemoryRepositoryConfig = {};

  /**
   * Default log level used when creating the shared logger.
   * This is used as a fallback when no explicit logLevel is specified in any config.
   */
  #defaultLogLevel?: LogLevel;

  /**
   * Shared logger instance used across all components when no explicit logger is provided.
   * Created lazily during build() to ensure consistent logging across Store, API Client, and Repository.
   */
  #sharedLogger?: Logger;

  /**
   * Set the default log level for all components.
   *
   * This sets the log level used when creating the shared logger instance.
   * Individual component logLevel settings take precedence over this default.
   *
   * @param level - The default log level to use
   * @returns This builder instance for method chaining
   *
   * @remarks
   * **Priority order:**
   * 1. Explicit logger instances (highest priority)
   * 2. Individual component logLevel (repository > store > apiClient)
   * 3. Default log level (set by this method)
   * 4. 'info' (fallback)
   *
   * @example
   * ```typescript
   * // Set default to 'debug' for all components
   * const repo = new PromidasRepositoryBuilder()
   *   .setDefaultLogLevel('debug')
   *   .build();
   *
   * // Store uses 'warn', others use default 'debug'
   * const repo = new PromidasRepositoryBuilder()
   *   .setDefaultLogLevel('debug')
   *   .setStoreConfig({ logLevel: 'warn' })
   *   .build();
   *
   * // Custom logger is used as-is (default is ignored)
   * const repo = new PromidasRepositoryBuilder()
   *   .setDefaultLogLevel('debug')
   *   .setStoreConfig({ logger: customLogger })
   *   .build();
   * ```
   */
  setDefaultLogLevel(level: LogLevel): this {
    this.#defaultLogLevel = level;
    return this;
  }

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
   * @remarks
   * **Shared Logger Pattern:**
   * When no explicit logger is provided in any configuration, a shared ConsoleLogger
   * instance is created and used across all components for consistent logging and
   * memory efficiency.
   *
   * **Log Level Priority:**
   * The log level for the shared logger is determined in this order:
   * 1. Repository config logLevel
   * 2. Store config logLevel
   * 3. API Client config logLevel
   * 4. Default log level (set via {@link setDefaultLogLevel})
   * 5. 'info' (fallback)
   *
   * **Configuration Immutability:**
   * Configurations are deep-merged to prevent external mutations from affecting
   * the builder's internal state.
   *
   * @returns A fully configured ProtopediaInMemoryRepository instance
   * @throws {Error} If any dependency fails to initialize
   *
   * @example
   * ```typescript
   * // Build with default settings
   * const repo = new PromidasRepositoryBuilder().build();
   *
   * // Build with custom log level
   * const repo = new PromidasRepositoryBuilder()
   *   .setDefaultLogLevel('debug')
   *   .build();
   *
   * // Build with mixed configuration
   * const repo = new PromidasRepositoryBuilder()
   *   .setDefaultLogLevel('info')
   *   .setStoreConfig({ ttlMs: 60000, logLevel: 'warn' })
   *   .setRepositoryConfig({ logLevel: 'debug' })
   *   .build();
   * // Result: Store and Repository share a logger with 'debug' level
   * // (repository logLevel has highest priority)
   * ```
   */
  build(): ProtopediaInMemoryRepository {
    try {
      // Ensure shared logger exists if it will be needed by any component.
      if (
        !this.#sharedLogger &&
        (!this.#storeConfig.logger ||
          !this.#apiClientConfig.logger ||
          !this.#repositoryConfig.logger)
      ) {
        // Determine log level priority: repository > store > apiClient > default > 'info'
        const logLevel =
          this.#repositoryConfig.logLevel ??
          this.#storeConfig.logLevel ??
          this.#apiClientConfig.logLevel ??
          this.#defaultLogLevel ??
          'info';
        this.#sharedLogger = new ConsoleLogger(logLevel);
      }

      // Inject shared logger into configs that don't have an explicit logger.
      const storeConfig: PrototypeInMemoryStoreConfig = {
        ...this.#storeConfig,
        logger: this.#storeConfig.logger ?? this.#sharedLogger!,
      };

      const apiClientConfig: ProtopediaApiCustomClientConfig = {
        ...this.#apiClientConfig,
        logger: this.#apiClientConfig.logger ?? this.#sharedLogger!,
      };

      const repositoryConfig: ProtopediaInMemoryRepositoryConfig = {
        ...this.#repositoryConfig,
        logger: this.#repositoryConfig.logger ?? this.#sharedLogger!,
      };

      const store = new PrototypeInMemoryStore(storeConfig);

      const apiClient = new ProtopediaApiCustomClient(apiClientConfig);

      return new ProtopediaInMemoryRepositoryImpl({
        store,
        apiClient,
        repositoryConfig,
      });
    } catch (error) {
      // Log the error before re-throwing, ensuring sensitive data is sanitized
      const logger =
        this.#repositoryConfig.logger ?? this.#sharedLogger ?? console;
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
