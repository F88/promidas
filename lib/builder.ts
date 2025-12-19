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
  ConfigurationError,
  DataSizeExceededError,
  PrototypeInMemoryStore,
  SizeEstimationError,
  StoreError,
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
 * **Logger Configuration:**
 * Each component (Store, API Client, Repository) receives an independent logger instance.
 * - If you provide a custom logger, it will be used as-is
 * - If you don't provide a logger, a new ConsoleLogger is created with the specified logLevel (default: 'info')
 * - Each component can have different loggers and log levels for maximum flexibility
 *
 * @example
 * ```typescript
 * // Basic usage with default settings (each component gets independent logger)
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
 * // Different log levels for each component
 * const repo = new PromidasRepositoryBuilder()
 *   .setStoreConfig({ logLevel: 'error' })
 *   .setApiClientConfig({ logLevel: 'warn' })
 *   .setRepositoryConfig({ logLevel: 'debug' })
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
   * @remarks
   * **Logger Creation:**
   * When no explicit logger is provided in a component's configuration, Builder
   * creates a new ConsoleLogger instance with the specified logLevel (default: 'info').
   * Each component receives an independent logger instance unless you explicitly
   * share a logger by passing the same logger instance to multiple configs.
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
   * // Build with default settings (each component gets independent logger with 'info' level)
   * const repo = new PromidasRepositoryBuilder().build();
   *
   * // Build with different log levels
   * const repo = new PromidasRepositoryBuilder()
   *   .setStoreConfig({ ttlMs: 60000, logLevel: 'warn' })
   *   .setRepositoryConfig({ logLevel: 'debug' })
   *   .build();
   * // Result: Store gets ConsoleLogger('warn'), Repository gets ConsoleLogger('debug')
   * ```
   */
  build(): ProtopediaInMemoryRepository {
    // Design Decision: Builder ensures logger instance exists
    //
    // Why Builder creates loggers instead of delegating to modules:
    // 1. Responsibility clarity: Builder guarantees logger presence
    // 2. Loose coupling: Reduces dependency on module's logger creation logic
    // 3. Consistency: Uniform logger creation strategy across all components
    //
    // Alternative (simpler but more coupled):
    //   Just pass config as-is: new PrototypeInMemoryStore(this.#storeConfig)
    //   Modules would handle logger creation internally
    //   Trade-off: Tighter coupling to module implementation details
    const storeConfig: PrototypeInMemoryStoreConfig = {
      ...this.#storeConfig,
      logger:
        this.#storeConfig.logger ??
        new ConsoleLogger(this.#storeConfig.logLevel ?? 'info'),
    };

    const apiClientConfig: ProtopediaApiCustomClientConfig = {
      ...this.#apiClientConfig,
      logger:
        this.#apiClientConfig.logger ??
        new ConsoleLogger(this.#apiClientConfig.logLevel ?? 'info'),
    };

    // Ensure logger exists before constructing repository config
    const repositoryLogger =
      this.#repositoryConfig.logger ??
      new ConsoleLogger(this.#repositoryConfig.logLevel ?? 'info');

    const repositoryConfig: ProtopediaInMemoryRepositoryConfig = {
      ...this.#repositoryConfig,
      logger: repositoryLogger,
    };

    // Build Store and API Client
    const store = this.buildStore(storeConfig, repositoryLogger);
    const apiClient = this.buildApiClient(apiClientConfig, repositoryLogger);

    // Build Repository
    try {
      return new ProtopediaInMemoryRepositoryImpl({
        store,
        apiClient,
        repositoryConfig,
      });
    } catch (error) {
      // Handle Repository construction errors
      if (typeof repositoryLogger.error === 'function') {
        repositoryLogger.error(
          'Failed to create ProtopediaInMemoryRepositoryImpl',
          sanitizeDataForLogging({ error }),
        );
      }
      throw error;
    }
  }

  /**
   * Creates a PrototypeInMemoryStore instance with detailed error handling.
   *
   * @param config - Store configuration
   * @param repositoryLogger - Logger instance for error reporting
   * @returns Initialized store instance
   * @throws {ConfigurationError} When store configuration is invalid
   * @throws {StoreError} When other store-related errors occur
   *
   * @internal This method is private and intended for internal use and testing only
   */
  private buildStore(
    config: PrototypeInMemoryStoreConfig,
    repositoryLogger: Logger | Console,
  ): PrototypeInMemoryStore {
    try {
      return new PrototypeInMemoryStore(config);
    } catch (error) {
      // Handle Store construction errors (e.g., ConfigurationError)
      if (typeof repositoryLogger.error === 'function') {
        // Build detailed error information based on error type
        let errorDetails: Record<string, unknown>;

        if (error instanceof StoreError) {
          errorDetails = { error, dataState: error.dataState };
          if (error instanceof DataSizeExceededError) {
            errorDetails.dataSizeBytes = error.dataSizeBytes;
            errorDetails.maxDataSizeBytes = error.maxDataSizeBytes;
          } else if (error instanceof SizeEstimationError) {
            errorDetails.cause = error.cause;
          }
        } else {
          errorDetails = { error };
        }

        repositoryLogger.error(
          'Failed to create PrototypeInMemoryStore',
          sanitizeDataForLogging(errorDetails),
        );
      }
      throw error;
    }
  }

  /**
   * Creates a ProtopediaApiCustomClient instance with detailed error handling.
   *
   * @param config - API client configuration
   * @param repositoryLogger - Logger instance for error reporting
   * @returns Initialized API client instance
   * @throws When API client construction fails
   *
   * @internal This method is private and intended for internal use and testing only
   */
  private buildApiClient(
    config: ProtopediaApiCustomClientConfig,
    repositoryLogger: Logger | Console,
  ): ProtopediaApiCustomClient {
    try {
      return new ProtopediaApiCustomClient(config);
    } catch (error) {
      // Handle API client construction errors
      if (typeof repositoryLogger.error === 'function') {
        repositoryLogger.error(
          'Failed to create ProtopediaApiCustomClient',
          sanitizeDataForLogging({ error }),
        );
      }
      throw error;
    }
  }
}
