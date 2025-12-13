/**
 * High-level helpers for fetching and normalizing ProtoPedia
 * prototypes.
 *
 * This module defines a minimal client interface,
 * {@link ListPrototypesClient}, and helper functions for safe,
 * normalized data retrieval:
 *
 * - {@link fetchAndNormalizePrototypes} — calls an upstream
 *   `listPrototypes`-compatible client, normalizes the results into
 *   {@link NormalizedPrototype} objects, and returns a
 *   {@link FetchPrototypesResult} discriminated union.
 *
 * These helpers are intentionally decoupled from any particular
 * ProtoPedia client library (like `protopedia-api-v2-client`) so that
 * they can operate against any client that implements {@link ListPrototypesClient}.
 * Error handling is delegated
 * to {@link handleApiError} from `./utils/errors/handler`, which
 * converts exceptions into structured failure results with appropriate
 * status codes and messages.
 *
 * @module
 */
import type { ListPrototypesParams } from 'protopedia-api-v2-client';

import type { Logger } from '../logger/index.js';
import type { NormalizedPrototype } from '../types/index.js';

import type { FetchPrototypesResult } from './types/result.types.js';
import { handleApiError } from './utils/errors/handler.js';
import { normalizePrototype } from './utils/normalize-prototype.js';

/**
 * Minimal interface for clients that can list ProtoPedia prototypes.
 *
 * @deprecated This interface is deprecated along with {@link fetchAndNormalizePrototypes}.
 * Use {@link ProtopediaApiCustomClient} instead, which provides the same functionality
 * with better encapsulation.
 *
 * This abstraction allows {@link fetchAndNormalizePrototypes} to work
 * with different underlying implementations (for example, the official
 * `protopedia-api-v2-client` or a test double) as long as they expose
 * a compatible `listPrototypes` method.
 *
 * The returned object must have a `results` property that, when present,
 * contains an array of raw prototype data from the upstream API.
 */
export type ListPrototypesClient = {
  /**
   * Fetch a list of prototypes from the ProtoPedia API.
   *
   * @param params - Query parameters controlling which prototypes to
   *   retrieve (offset, limit, prototypeId, etc.).
   * @returns A promise resolving to an object with an optional
   *   `results` array containing raw prototype data.
   */
  listPrototypes: (params: ListPrototypesParams) => Promise<{
    results?: unknown[];
  }>;
};

/**
 * Fetch and normalize ProtoPedia prototypes.
 *
 * @deprecated This standalone function is deprecated. Use {@link ProtopediaApiCustomClient.fetchPrototypes} instead.
 * The class-based approach provides better encapsulation and eliminates the need for explicit logger parameter passing.
 *
 * @example
 * ```typescript
 * // ❌ Old approach (deprecated):
 * import { fetchAndNormalizePrototypes } from '@f88/promidas/fetcher';
 * const result = await fetchAndNormalizePrototypes(client, params, logger);
 *
 * // ✅ New approach (recommended):
 * import { createProtopediaApiCustomClient } from '@f88/promidas/fetcher';
 * const client = createProtopediaApiCustomClient({ logger, logLevel: 'info' });
 * const result = await client.fetchPrototypes(params);
 * ```
 *
 * This helper calls the provided {@link ListPrototypesClient},
 * normalizes each item into a {@link NormalizedPrototype} via
 * {@link normalizePrototype}, and wraps the result in a
 * {@link FetchPrototypesResult} discriminated union:
 *
 * - On success: `{ ok: true, data: NormalizedPrototype[] }`.
 * - On failure: the result of {@link handleApiError}, which provides
 *   structured error information including status codes and messages.
 *
 * This function never throws; all errors are caught and converted into
 * failure results by {@link handleApiError}.
 *
 * @param client - A client capable of listing prototypes.
 * @param params - Query parameters for the upstream `listPrototypes`
 *   call (offset, limit, prototypeId).
 * @param logger - Logger instance for error diagnostic output.
 * @returns A {@link FetchPrototypesResult} representing either a
 *   normalized data set or a failure description.
 */
export const fetchAndNormalizePrototypes = async (
  client: ListPrototypesClient,
  params: ListPrototypesParams,
  logger: Logger,
): Promise<FetchPrototypesResult> => {
  try {
    const upstream = await client.listPrototypes(params);

    const data: NormalizedPrototype[] = Array.isArray(upstream.results)
      ? upstream.results.map((value) => normalizePrototype(value as any))
      : [];

    return { ok: true, data };
  } catch (error) {
    return handleApiError(error, logger);
  }
};
