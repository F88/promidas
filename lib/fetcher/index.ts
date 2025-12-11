/**
 * ProtoPedia API Client and Data Fetching Utilities.
 *
 * This module provides a complete fetcher layer for interacting with the
 * ProtoPedia API, including client creation, data fetching, normalization,
 * and error handling.
 *
 * ## Core Components
 *
 * ### API Client
 *
 * - {@link createProtopediaApiCustomClient} — Factory to create a configured API client.
 * - {@link ProtopediaApiCustomClient} — The client interface with helper methods.
 * - {@link ProtoPediaApiClientOptions} — Configuration options for the API client.
 *
 * ### Data Fetching & Normalization
 *
 * - {@link fetchAndNormalizePrototypes} — Fetch and normalize prototypes from any compatible client.
 * - {@link ListPrototypesClient} — Interface for clients that can list prototypes.
 * - {@link FetchPrototypesResult} — Discriminated union result type for fetch operations.
 * - {@link normalizePrototype} — Transform raw API data to {@link NormalizedPrototype}.
 *
 * ### Error Handling & Utilities
 *
 * - {@link constructDisplayMessage} — Format error messages for user display.
 * - {@link Logger} — Logger interface compatible with protopedia-api-v2-client.
 * - {@link LogLevel} — Log level type for controlling logger verbosity.
 *
 * ### Time & Date Utilities
 *
 * - {@link normalizeProtoPediaTimestamp} — Convert JST timestamps to UTC ISO 8601.
 * - {@link parseAsProtoPediaTimestamp} — Parse date strings as JST timestamps.
 * - {@link parseDateString} — General purpose date string parser.
 * - {@link JST_OFFSET_MS} — JST timezone offset constant (9 hours in milliseconds).
 *
 * ## API Client Version Compatibility
 *
 * This library supports `protopedia-api-v2-client` v3.0.0 and later.
 *
 * @module
 */
export type { Logger, LogLevel } from '../logger/index.js';

export {
  fetchAndNormalizePrototypes,
  type ListPrototypesClient,
} from './fetch-prototypes.js';
export type { FetchPrototypesResult } from './types/result.types.js';

export {
  createProtopediaApiCustomClient,
  type ProtoPediaApiClientOptions,
  type ProtopediaApiCustomClient,
} from './protopedia-api-custom-client.js';

export {
  JST_OFFSET_MS,
  normalizeProtoPediaTimestamp,
  parseAsProtoPediaTimestamp,
  parseDateString,
} from './utils/time.js';

export { constructDisplayMessage } from './utils/errors/messages.js';
