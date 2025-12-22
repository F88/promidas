/**
 * ProtopediaApiCustomClient class implementation.
 *
 * This module provides a class-based wrapper around the official
 * protopedia-api-v2-client with integrated logger management,
 * event-driven progress tracking, and high-level helper methods.
 *
 * Features:
 * - Fastify-style logger configuration (logger + logLevel)
 * - Event-driven progress tracking with type-safe discriminated unions
 * - Automatic data normalization and validation
 * - Result type for type-safe error handling
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
import type { NormalizedPrototype } from '../../types/index.js';
import { sanitizeDataForLogging } from '../../utils/index.js';
import { VERSION } from '../../version.js';
import type {
  NetworkFailure,
  UpstreamPrototype,
} from '../types/prototype-api.types.js';
import type { FetchPrototypesResult } from '../types/result.types.js';
import { createClientFetch } from '../utils/create-client-fetch.js';
import { handleApiError } from '../utils/errors/handler.js';
import { logTimestampNormalizationWarnings } from '../utils/log-timestamp-normalization-warnings.js';
import { normalizePrototype } from '../utils/normalize-prototype.js';

import type { ProtopediaApiCustomClientConfig } from './config.js';

/**
 * Custom API client that wraps protopedia-api-v2-client with enhanced features.
 *
 * This class manages:
 * - Logger configuration (Fastify-style with logger + logLevel)
 * - Integration with protopedia-api-v2-client
 * - Event-driven progress tracking for download operations
 * - High-level fetchPrototypes helper with normalization and error handling
 *
 * @example Basic usage
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
 *
 * @example With progress tracking
 * ```typescript
 * const client = new ProtopediaApiCustomClient({
 *   protoPediaApiClientOptions: {
 *     token: process.env.PROTOPEDIA_API_TOKEN,
 *   },
 *   progressCallback: (event) => {
 *     switch (event.type) {
 *       case 'request-start':
 *         console.log('Starting request...');
 *         break;
 *       case 'download-progress':
 *         console.log(`Progress: ${event.percentage.toFixed(1)}%`);
 *         break;
 *       case 'complete':
 *         console.log(`Complete in ${event.totalTimeMs}ms`);
 *         break;
 *     }
 *   },
 * });
 * ```
 */
export class ProtopediaApiCustomClient {
  /**
   * Underlying protopedia-api-v2-client instance.
   */
  readonly #client: ProtoPediaApiClient;

  /**
   * Logger instance for this client.
   */
  readonly #logger: Logger;

  /**
   * Log level for this client.
   */
  readonly #logLevel: LogLevel;

  /**
   * Create a new ProtopediaApiCustomClient instance.
   *
   * @param config - Configuration options for the client
   * @param config.protoPediaApiClientOptions - Options for protopedia-api-v2-client
   * @param config.protoPediaApiClientOptions.timeoutMs - Optional request timeout in milliseconds
   * @param config.protoPediaApiClientOptions.fetch - Optional custom fetch implementation
   * @param config.logger - Custom logger instance
   * @param config.logLevel - Log level for default logger or to update existing logger
   * @param config.progressLog - Enable download progress logging (default: true)
   * @param config.progressCallback - Event handler for download progress lifecycle events
   *
   * @throws {unknown} If the underlying protopedia-api-v2-client initialization fails
   *
   * @example Basic usage with progress logging
   * ```typescript
   * const client = new ProtopediaApiCustomClient({
   *   protoPediaApiClientOptions: { token: process.env.TOKEN },
   *   logLevel: 'info', // Shows progress logs
   * });
   * ```
   *
   * @example With custom event handler
   * ```typescript
   * const client = new ProtopediaApiCustomClient({
   *   protoPediaApiClientOptions: { token: process.env.TOKEN },
   *   progressLog: false, // Disable automatic logging
   *   progressCallback: (event) => {
   *     if (event.type === 'download-progress') {
   *       updateProgressBar(event.percentage);
   *     }
   *   },
   * });
   * ```
   */
  constructor(config?: ProtopediaApiCustomClientConfig | null) {
    const {
      protoPediaApiClientOptions = {},
      logger,
      logLevel,
      progressLog = true,
      progressCallback,
    } = config ?? {};

    const {
      timeoutMs,
      fetch: providedFetch,
      ...sdkOptions
    } = protoPediaApiClientOptions;

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

    this.#logger.info(
      'ProtopediaApiCustomClient constructor called',
      sanitizeDataForLogging(config),
    );

    const hasWindow =
      typeof (globalThis as { window?: unknown }).window !== 'undefined';
    const hasDocument =
      typeof (globalThis as { document?: unknown }).document !== 'undefined';
    const isBrowserRuntime = hasWindow && hasDocument;

    // Determine User-Agent header
    const userAgent =
      sdkOptions.userAgent ?? `ProtopediaApiCustomClient/${VERSION} (promidas)`;

    // Issue #55 (browser CORS): `protopedia-api-v2-client` adds
    // `x-client-user-agent` by design. In browsers, custom request headers
    // trigger a CORS preflight and the request may be blocked because the
    // server may not allow that header.
    //
    // Mitigation (promidas-side): In browser runtimes, strip
    // `x-client-user-agent` from the outgoing request in our fetch wrapper.
    // Server-side Node.js execution is not affected.

    // Determine headers to strip based on runtime environment
    const stripHeaders = isBrowserRuntime ? ['x-client-user-agent'] : undefined;

    const customFetch = createClientFetch({
      logger: this.#logger,
      enableProgressLog: progressLog,
      progressCallback,
      timeoutMs,
      providedFetch: providedFetch as typeof fetch | undefined,
      stripHeaders,
    });

    // Create underlying protopedia-api-v2-client
    // Note: SDK client logging is controlled via protoPediaApiClientOptions
    this.#client = createProtoPediaClient({
      ...sdkOptions,
      userAgent,
      ...(customFetch !== undefined && { fetch: customFetch }),
    });
  }

  /**
   * Fetch and normalize ProtoPedia prototypes.
   *
   * This helper calls the underlying client's listPrototypes method,
   * normalizes each item into a {@link NormalizedPrototype}, and wraps
   * the result in a {@link FetchPrototypesResult} discriminated union.
   *
   * This method never throws; all errors are caught and converted into
   * failure results by {@link handleApiError}.
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

          logTimestampNormalizationWarnings({
            logger: this.#logger,
            original,
            normalized,
            index,
          });

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
        const sanitizedError = sanitizeDataForLogging(errorResult);
        if (errorResult.status === undefined || errorResult.status >= 500) {
          this.#logger.error(errorResult.error, sanitizedError);
        } else {
          this.#logger.warn(errorResult.error, sanitizedError);
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
