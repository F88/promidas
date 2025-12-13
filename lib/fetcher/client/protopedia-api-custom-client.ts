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
import type { NetworkFailure } from '../types/prototype-api.types.js';
import type { FetchPrototypesResult } from '../types/result.types.js';
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

    this.#logger.info('ProtopediaApiCustomClient constructor called', config);

    // Create underlying protopedia-api-v2-client
    // Note: SDK client logging is controlled via protoPediaApiClientOptions
    this.#client = createProtoPediaClient(protoPediaApiClientOptions ?? {});
  }

  /**
   * Normalize errors thrown during ProtoPedia API calls into a
   * {@link FetchPrototypesResult} failure object.
   *
   * This is the central error handler for all ProtoPedia API interactions.
   * It ensures that:
   *
   * - `AbortError` (typically from `AbortController` timeout) is treated as a
   *   network error with no `status` (no server response received).
   * - {@link ProtoPediaApiError} from protopedia-api-v2-client is normalized
   *   with HTTP `status` and request/response metadata preserved.
   * - HTTP-like errors with a `status` property are normalized with their
   *   metadata (statusText, code, url) preserved in the `details` field.
   * - Network errors (ENOTFOUND, ECONNREFUSED, etc.) have no `status` but
   *   preserve the error `code` in `details.res.code`.
   * - All cases produce a {@link FetchPrototypesResult} with `ok: false`
   *   and a consistent `details` object.
   * - Never throws exceptions - all errors are converted to Result types.
   * - The complete result object is logged for monitoring and debugging.
   *
   * @param error - The error value thrown by an upstream API call
   * @returns A {@link FetchPrototypesResult} with `ok: false`
   *
   * @private
   */
  #handleApiError(error: unknown): FetchPrototypesResult {
    // Standard error names and messages
    const ERROR_NAMES = {
      ABORT: 'AbortError',
    } as const;
    const ERROR_MESSAGES = {
      TIMEOUT: 'Upstream request timed out',
      UNKNOWN: 'Failed to fetch prototypes',
    } as const;

    // Type guards
    const isAbortError = (err: unknown): err is DOMException =>
      err instanceof DOMException && err.name === ERROR_NAMES.ABORT;
    const hasStatusProperty = (err: unknown): err is { status: unknown } =>
      err !== null && typeof err === 'object' && 'status' in err;
    const hasErrorCode = (err: unknown): err is object =>
      err !== null && typeof err === 'object';

    // Helper to create failure results
    const createFailureResult = (
      errorMessage: string,
      details: NetworkFailure['details'],
      status?: number,
    ): FetchPrototypesResult => {
      const result: FetchPrototypesResult = {
        ok: false,
        error: errorMessage,
        details,
      };
      if (status !== undefined) {
        result.status = status;
      }
      return result;
    };

    // Handle AbortError (timeout) - network error, no status
    if (isAbortError(error)) {
      const result = createFailureResult(ERROR_MESSAGES.TIMEOUT, {});
      this.#logger.warn('Upstream request aborted (timeout)', result);
      return result;
    }

    // Handle ProtoPediaApiError specifically - HTTP error with status
    if (error instanceof ProtoPediaApiError) {
      const result = createFailureResult(
        error.message,
        {
          req: {
            url: error.req.url,
            method: error.req.method,
          },
          res: {
            statusText: error.statusText,
          },
        },
        error.status,
      );
      this.#logger.warn('HTTP error when calling ProtoPedia API', result);
      return result;
    }

    // Handle HTTP-like errors with a `status` property
    if (hasStatusProperty(error)) {
      const rawStatus = (error as { status?: unknown }).status;
      const parsedStatus =
        typeof rawStatus === 'number' ? rawStatus : Number(rawStatus);
      const status =
        Number.isFinite(parsedStatus) && rawStatus != null ? parsedStatus : 500;
      const errorObj = error as {
        statusText?: string;
        code?: string;
        req?: {
          url?: string;
          method?: string;
        };
      };
      const { statusText, code, req } = errorObj;

      const message =
        error instanceof Error ? error.message : 'Failed to fetch prototypes';

      const details: NetworkFailure['details'] = {};
      if (req?.url !== undefined || req?.method !== undefined) {
        details.req = {};
        if (req.url !== undefined) {
          details.req.url = req.url;
        }
        if (req.method !== undefined) {
          details.req.method = req.method;
        }
      }
      if (statusText !== undefined || code !== undefined) {
        details.res = {};
        if (statusText !== undefined) {
          details.res.statusText = statusText;
        }
        if (code !== undefined) {
          details.res.code = code;
        }
      }

      const result = createFailureResult(message, details, status);
      this.#logger.warn('HTTP error when calling ProtoPedia API', result);
      return result;
    }

    // Handle unexpected errors (including network errors from fetch)
    const message =
      error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN;

    const details: NetworkFailure['details'] = {};
    if (hasErrorCode(error)) {
      const errorObj = error as {
        code?: string;
        cause?: { code?: string };
      };
      const code = errorObj.code ?? errorObj.cause?.code;
      if (code !== undefined) {
        details.res = { code };
      }
    }

    const result = createFailureResult(message, details);
    this.#logger.error('Unexpected error while calling ProtoPedia API', result);
    return result;
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

      const data: NormalizedPrototype[] = Array.isArray(upstream.results)
        ? upstream.results.map((value) => normalizePrototype(value as any))
        : [];

      return { ok: true, data };
    } catch (error) {
      return this.#handleApiError(error);
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
