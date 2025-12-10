/**
 * ProtoPedia API Client and Utilities.
 *
 * This module provides a standalone client for interacting with the ProtoPedia API.
 * It includes:
 *
 * - {@link createProtopediaApiCustomClient} — Factory to create a configured API client.
 * - {@link ProtopediaApiCustomClient} — The client interface with helper methods.
 * - {@link ProtoPediaApiClientOptions} — Configuration options for the API client.
 * - {@link fetchAndNormalizePrototypes} — Helper to fetch and normalize prototypes from any compatible client.
 * - {@link ListPrototypesClient} — Interface for clients that can list prototypes.
 * - {@link constructDisplayMessage} — Helper to format error messages for display.
 * - {@link FetchPrototypesResult} — The result type for fetch operations.
 *
 * Logger types are re-exported for convenience when configuring error handling:
 * - {@link Logger} — Logger interface compatible with protopedia-api-v2-client.
 * - {@link LogLevel} — Log level type for controlling logger verbosity.
 *
 * @module
 */

export {
  createProtopediaApiCustomClient,
  type ProtopediaApiCustomClient,
  type ProtoPediaApiClientOptions,
} from './protopedia-api-custom-client.js';

export {
  fetchAndNormalizePrototypes,
  type ListPrototypesClient,
} from './fetch-prototypes.js';

export { constructDisplayMessage } from './utils/errors/messages.js';

export type { FetchPrototypesResult } from './types/result.types.js';

export type { Logger, LogLevel } from '../logger/index.js';
