/**
 * ProtoPedia API Client and Data Fetching Utilities.
 *
 * This module provides a complete fetcher layer for interacting with the
 * ProtoPedia API, including client creation, data fetching, normalization,
 * and error handling. It can be used as a standalone module for custom
 * data pipelines or integrated with the repository layer.
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
 * - {@link UpstreamPrototype} — Raw API response type from protopedia-api-v2-client.
 * - {@link NormalizedPrototype} — Standardized, type-safe prototype data model.
 *
 * ### Utilities
 *
 * - {@link normalizeProtoPediaTimestamp} — Convert ProtoPedia JST timestamps to UTC ISO 8601.
 * - {@link splitPipeSeparatedString} — Parse pipe-separated strings into arrays.
 *
 * ### Error Handling
 *
 * - {@link constructDisplayMessage} — Format error messages for user display.
 * - {@link resolveErrorMessage} — Extract error messages from various error types.
 *
 * ### Logging
 *
 * - {@link Logger} — Logger interface compatible with protopedia-api-v2-client.
 * - {@link LogLevel} — Log level type for controlling logger verbosity.
 *
 * ## Standalone Usage
 *
 * This module is designed to work independently, allowing you to:
 * - Create custom API clients with specific configurations
 * - Build custom data processing pipelines
 * - Integrate with different runtime environments (Node.js, Next.js, etc.)
 *
 * ## API Client Version Compatibility
 *
 * This library supports `protopedia-api-v2-client` v3.0.0 and later.
 *
 * @example
 * ```typescript
 * import {
 *   createProtopediaApiCustomClient,
 *   fetchAndNormalizePrototypes,
 * } from '@f88/promidas/fetcher';
 *
 * const client = createProtopediaApiCustomClient({
 *   token: process.env.PROTOPEDIA_API_TOKEN,
 * });
 *
 * const result = await fetchAndNormalizePrototypes(client, { limit: 10 });
 *
 * if (result.ok) {
 *   console.log(`Fetched ${result.data.length} prototypes`);
 * }
 * ```
 *
 * @module
 * @see {@link ../repository/index.js} for high-level repository integration
 */

// Core Types
export type { NormalizedPrototype } from '../types/index.js';
export type { Logger, LogLevel } from '../logger/index.js';

// API Client
export {
  createProtopediaApiCustomClient,
  type ProtoPediaApiClientOptions,
  type ProtopediaApiCustomClient,
} from './protopedia-api-custom-client.js';

// Fetching & Normalization
export {
  fetchAndNormalizePrototypes,
  type ListPrototypesClient,
} from './fetch-prototypes.js';
export type { FetchPrototypesResult } from './types/result.types.js';

// Data Types
export type { UpstreamPrototype } from './types/prototype-api.types.js';

// Utilities
export {
  normalizePrototype,
  normalizeProtoPediaTimestamp,
  splitPipeSeparatedString,
} from './utils/index.js';

// Error Handling
export { resolveErrorMessage, constructDisplayMessage } from './utils/index.js';
