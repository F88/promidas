/**
 * ProtoPedia API Client and Utilities.
 *
 * This module provides a standalone client for interacting with the ProtoPedia API.
 * It includes:
 *
 * - {@link createProtopediaApiCustomClient} — Factory to create a configured API client.
 * - {@link ProtopediaApiCustomClient} — The client interface with helper methods.
 * - {@link NormalizedPrototype} — The normalized data structure for prototypes.
 * - {@link FetchPrototypesResult} — The result type for fetch operations.
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
