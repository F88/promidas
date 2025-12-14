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
 * - {@link ProtopediaApiCustomClient} — Class-based client with managed logger and high-level methods.
 * - {@link ProtopediaApiCustomClientConfig} — Configuration options including logger and SDK client settings.
 * - {@link ProtoPediaApiClientOptions} — SDK client options (re-exported from protopedia-api-v2-client).
 * - {@link ListPrototypesParams} — Query parameters for listing prototypes (re-exported from protopedia-api-v2-client).
 *
 * ### Data Fetching & Normalization
 *
 * - {@link FetchPrototypesResult} — Discriminated union result type for fetch operations.
 * - {@link normalizePrototype} — Transform raw API data to {@link NormalizedPrototype}.
 * - {@link UpstreamPrototype} — Raw API response type from protopedia-api-v2-client.
 * - {@link NormalizedPrototype} — Standardized, type-safe prototype data model.
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
 * import { createProtopediaApiCustomClient } from '@f88/promidas/fetcher';
 *
 * const client = createProtopediaApiCustomClient({
 *   protoPediaApiClientOptions: {
 *     token: process.env.PROTOPEDIA_API_TOKEN,
 *   },
 *   logLevel: 'debug',
 * });
 *
 * const result = await client.fetchPrototypes({ limit: 10 });
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
export { createProtopediaApiCustomClient } from './client/factory.js';
export { ProtopediaApiCustomClient } from './client/protopedia-api-custom-client.js';
export type { ProtopediaApiCustomClientConfig } from './client/config.js';

// Re-export protopedia-api-v2-client types for convenience
export type { ProtoPediaApiClientOptions } from 'protopedia-api-v2-client';
export type { ListPrototypesParams } from 'protopedia-api-v2-client';

// Result Types
export type { FetchPrototypesResult } from './types/result.types.js';
