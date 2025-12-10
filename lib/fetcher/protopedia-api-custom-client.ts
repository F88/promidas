/**
 * ProtoPedia API client integration layer.
 *
 * This module provides a thin wrapper around the official
 * `protopedia-api-v2-client` package. It:
 *
 * - Uses the SDK's client options type
 *   {@link ProtoPediaApiClientOptions} directly.
 * - Defines {@link ProtopediaApiCustomClient}, which extends the
 *   official {@link ProtoPediaApiClient} with memorystore-oriented
 *   helper methods.
 * - Exposes {@link createProtopediaApiCustomClient} to construct a
 *   configured client instance that also offers a higher-level
 *   {@link ProtopediaApiCustomClient.fetchPrototypes | fetchPrototypes}
 *   helper returning a {@link FetchPrototypesResult}.
 *
 * The goal is to keep integration with the official SDK explicit while
 * adding just enough convenience for `ProtopediaInMemoryRepository` and
 * other callers in this library.
 */
import {
  createProtoPediaClient,
  type ListPrototypesParams,
  ProtoPediaApiClient,
  type ProtoPediaApiClientOptions,
} from 'protopedia-api-v2-client';

import { fetchAndNormalizePrototypes } from './fetch-prototypes.js';
import type { FetchPrototypesResult } from './types/result.types.js';

/**
 * Re-export the SDK's client options type used by
 * {@link createProtopediaApiCustomClient}.
 *
 * Consumers configure the memorystore's API client with the same
 * shape as the official SDK client, including custom `fetch`
 * implementations, timeouts, and log levels.
 */
export type { ProtoPediaApiClientOptions };

/**
 * Extension of the official ProtoPedia SDK client with convenience
 * helpers used by this memorystore.
 *
 * The underlying instance is a {@link ProtoPediaApiClient}, augmented
 * with a `fetchPrototypes` helper that:
 *
 * - Accepts {@link ListPrototypesParams}.
 * - Delegates to the SDK's `listPrototypes` under the hood.
 * - Normalizes the response into {@link FetchPrototypesResult}, using
 *   this library's normalization and error-handling rules.
 */
export type ProtopediaApiCustomClient = ProtoPediaApiClient & {
  fetchPrototypes: (
    params: ListPrototypesParams,
  ) => Promise<FetchPrototypesResult>;
};

/**
 * Create an extended ProtoPedia API client tailored for this
 * memorystore.
 *
 * Internally this function calls the official
 * {@link createProtoPediaClient} factory from
 * `protopedia-api-v2-client`, passing through the provided
 * {@link ProtoPediaApiClientOptions}. The resulting
 * {@link ProtoPediaApiClient} instance is then augmented with a
 * higher-level {@link ProtopediaApiCustomClient.fetchPrototypes |
 * fetchPrototypes} helper that:
 *
 * - Calls the SDK client's `listPrototypes` method.
 * - Normalizes the upstream response into
 *   {@link FetchPrototypesResult}.
 * - Encodes network / API errors into a stable failure shape.
 * - Uses the same logger instance for both SDK operations and error
 *   handling, ensuring consistent diagnostic output.
 *
 * This is the primary entry point for code within this library that
 * needs a ready-to-use ProtoPedia client.
 *
 * @param config - Configuration options forwarded to the official
 *   SDK client factory. If omitted, an empty configuration object is
 *   used, and the SDK's own defaults apply. The `logger` property, if
 *   provided, will be used by both the SDK client and this library's
 *   error handler for consistent logging.
 * @returns A {@link ProtopediaApiCustomClient} instance that behaves
 *   like the official client but also exposes `fetchPrototypes`.
 */
export const createProtopediaApiCustomClient = (
  config: ProtoPediaApiClientOptions = {},
): ProtopediaApiCustomClient => {
  const protopediaApiClient = createProtoPediaClient(config);
  const logger = config?.logger;

  const client: ProtopediaApiCustomClient = Object.assign(protopediaApiClient, {
    fetchPrototypes(
      params: ListPrototypesParams,
    ): Promise<FetchPrototypesResult> {
      return fetchAndNormalizePrototypes(protopediaApiClient, params, logger);
    },
  });

  return client;
};
