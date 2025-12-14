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
  ProtoPediaApiError,
  type ProtoPediaApiClient,
} from 'protopedia-api-v2-client';

import {
  ConsoleLogger,
  type Logger,
  type LogLevel,
} from '../../logger/index.js';
import type { NormalizedPrototype } from '../../types/index.js';
import type {
  NetworkFailure,
  UpstreamPrototype,
} from '../types/prototype-api.types.js';
import type { FetchPrototypesResult } from '../types/result.types.js';
import { handleApiError } from '../utils/errors/handler.js';
import { normalizePrototype } from '../utils/normalize-prototype.js';

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

    // Sanitize config for logging to avoid exposing tokens
    const sanitizedConfig = config ? { ...config } : config;
    if (sanitizedConfig?.protoPediaApiClientOptions?.token) {
      sanitizedConfig.protoPediaApiClientOptions = {
        ...sanitizedConfig.protoPediaApiClientOptions,
        token: '***',
      };
    }

    this.#logger.info(
      'ProtopediaApiCustomClient constructor called',
      sanitizedConfig,
    );

    // Create underlying protopedia-api-v2-client
    // Note: SDK client logging is controlled via protoPediaApiClientOptions
    this.#client = createProtoPediaClient(protoPediaApiClientOptions ?? {});
  }

  /**
   * Fetch and normalize ProtoPedia prototypes.
   *
   * This helper calls the underlying client's listPrototypes method,
   * normalizes each item into a {@link NormalizedPrototype}, and wraps
   * the result in a {@link FetchPrototypesResult} discriminated union.
   *
   * This method never throws; all errors are caught and converted into
   * failure results by {@link #handleApiError}.
   *
   * @param params - Query parameters for the upstream listPrototypes call
   * @returns A {@link FetchPrototypesResult} with normalized data or error details
   *
   * @private
   */
  async #fetchAndNormalizePrototypes(
    params: ListPrototypesParams,
  ): Promise<FetchPrototypesResult> {
    try {
      const upstream = await this.#client.listPrototypes(params);

      let data: NormalizedPrototype[] = [];
      if (!Array.isArray(upstream.results)) {
        this.#logger.warn(
          'Upstream API response "results" is not an array. Returning empty data.',
          {
            upstreamResults: upstream.results,
            params,
          },
        );
        // data remains empty array as initialized
      } else {
        data = upstream.results.map((value, index) => {
          const original = value as UpstreamPrototype;
          const normalized = normalizePrototype(original);

          // Check for date normalization failures
          // If the normalized value is the same as the original (and not null/undefined)
          // but doesn't look like a normalized UTC ISO string (ending in 'Z'), it likely failed parsing.
          const context = { prototypeId: original.id, index };

          if (
            original.createDate &&
            normalized.createDate === original.createDate &&
            !normalized.createDate.endsWith('Z')
          ) {
            this.#logger.warn('Failed to parse and normalize createDate', {
              ...context,
              originalValue: original.createDate,
            });
          }

          if (
            original.updateDate &&
            normalized.updateDate === original.updateDate &&
            !normalized.updateDate.endsWith('Z')
          ) {
            this.#logger.warn('Failed to parse and normalize updateDate', {
              ...context,
              originalValue: original.updateDate,
            });
          }

          if (
            original.releaseDate &&
            normalized.releaseDate === original.releaseDate &&
            !normalized.releaseDate.endsWith('Z')
          ) {
            this.#logger.warn('Failed to parse and normalize releaseDate', {
              ...context,
              originalValue: original.releaseDate,
            });
          }

          return normalized;
        });
      }

      this.#logger.debug(`Successfully fetched ${data.length} prototypes.`, {
        params,
      });

      return { ok: true, data };
    } catch (error) {
      const errorResult = handleApiError(error);
      // Log based on the errorResult (always an error result from handleApiError)
      if (!errorResult.ok) {
        if (errorResult.status === undefined || errorResult.status >= 500) {
          this.#logger.error(errorResult.error, errorResult);
        } else {
          this.#logger.warn(errorResult.error, errorResult);
        }
      }
      return errorResult;
    }
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
    return this.#fetchAndNormalizePrototypes(params);
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
