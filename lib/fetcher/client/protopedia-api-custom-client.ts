/**
 * ProtopediaApiCustomClient class implementation.
 *
 * This module provides a class-based wrapper around the official
 * protopedia-api-v2-client with integrated logger management and
 * high-level helper methods for this library.
 *
 * @module
 */
import {
  createProtoPediaClient,
  type ListPrototypesParams,
  type ProtoPediaApiClient,
} from 'protopedia-api-v2-client';

import {
  ConsoleLogger,
  type Logger,
  type LogLevel,
} from '../../logger/index.js';
import { fetchAndNormalizePrototypes } from '../fetch-prototypes.js';
import type { FetchPrototypesResult } from '../types/result.types.js';

import type { ProtopediaApiCustomClientConfig } from './config.js';

/**
 * Custom API client that wraps protopedia-api-v2-client with logger management
 * and convenience methods.
 *
 * This class manages:
 * - Logger configuration (Fastify-style with logger + logLevel)
 * - Integration with protopedia-api-v2-client
 * - High-level fetchPrototypes helper with normalization and error handling
 *
 * @example
 * ```typescript
 * const client = new ProtopediaApiCustomClient({
 *   protoPediaApiClientOptions: {
 *     token: process.env.PROTOPEDIA_API_TOKEN,
 *   },
 *   logLevel: 'debug',
 * });
 *
 * const result = await client.fetchPrototypes({ limit: 10 });
 * if (result.ok) {
 *   console.log(result.data);
 * }
 * ```
 */
export class ProtopediaApiCustomClient {
  readonly #client: ProtoPediaApiClient;

  readonly #logger: Logger;

  readonly #logLevel: LogLevel;

  /**
   * Create a new ProtopediaApiCustomClient instance.
   *
   * @param config - Configuration options for the client
   * @param config.protoPediaApiClientOptions - Options for protopedia-api-v2-client
   * @param config.logger - Custom logger instance
   * @param config.logLevel - Log level for default logger
   *
   * @throws {Error} If the underlying protopedia-api-v2-client initialization fails
   */
  constructor(config?: ProtopediaApiCustomClientConfig | null) {
    const { protoPediaApiClientOptions = {}, logger, logLevel } = config ?? {};

    // Fastify-style logger configuration
    if (logger) {
      this.#logger = logger;
      this.#logLevel = logLevel ?? 'info';
      // If logLevel is specified, update logger's level property (if mutable)
      if (logLevel !== undefined && 'level' in logger) {
        (logger as { level: LogLevel }).level = logLevel;
      }
    } else {
      const resolvedLogLevel = logLevel ?? 'info';
      this.#logger = new ConsoleLogger(resolvedLogLevel);
      this.#logLevel = resolvedLogLevel;
    }

    this.#logger.info('ProtopediaApiCustomClient constructor called', config);

    // Create underlying protopedia-api-v2-client
    // Note: SDK client logging is controlled via protoPediaApiClientOptions
    this.#client = createProtoPediaClient(protoPediaApiClientOptions ?? {});
  }

  /**
   * Fetch prototypes using the configured client, normalize them,
   * and return a structured result.
   *
   * This high-level helper combines API fetching, normalization, and
   * error handling into a single call. It uses the logger configured
   * during construction for error diagnostics.
   *
   * @param params - Query parameters for listing prototypes
   * @returns A {@link FetchPrototypesResult} with normalized data or error details
   *
   * @example
   * ```typescript
   * const result = await client.fetchPrototypes({ offset: 0, limit: 100 });
   * if (result.ok) {
   *   console.log(`Fetched ${result.data.length} prototypes`);
   * } else {
   *   console.error(result.error, result.status);
   * }
   * ```
   */
  async fetchPrototypes(
    params: ListPrototypesParams,
  ): Promise<FetchPrototypesResult> {
    return fetchAndNormalizePrototypes(this.#client, params, this.#logger);
  }

  /**
   * Direct access to the underlying protopedia-api-v2-client's listPrototypes method.
   *
   * Use this when you need the raw API response without normalization.
   *
   * @param params - Query parameters for listing prototypes
   * @returns Raw API response from protopedia-api-v2-client
   *
   * @example
   * ```typescript
   * const rawResult = await client.listPrototypes({ limit: 10 });
   * console.log(rawResult.results);
   * ```
   */
  async listPrototypes(params: ListPrototypesParams) {
    return this.#client.listPrototypes(params);
  }
}
