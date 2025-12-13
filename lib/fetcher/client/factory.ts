/**
 * Factory function for creating ProtopediaApiCustomClient instances.
 *
 * @module
 */
import type { ProtopediaApiCustomClientConfig } from './config.js';
import { ProtopediaApiCustomClient } from './protopedia-api-custom-client.js';

/**
 * Create a new ProtopediaApiCustomClient instance.
 *
 * This factory function provides a convenient way to create API client
 * instances with full configuration support for logger management and
 * protopedia-api-v2-client options.
 *
 * @param config - Configuration options for the client
 * @returns A new ProtopediaApiCustomClient instance
 *
 * @example
 * ```typescript
 * // Simple usage with token
 * const client = createProtopediaApiCustomClient({
 *   protoPediaApiClientOptions: {
 *     token: process.env.PROTOPEDIA_API_TOKEN,
 *   },
 * });
 *
 * // With custom logger and log level
 * const client = createProtopediaApiCustomClient({
 *   protoPediaApiClientOptions: {
 *     token: process.env.PROTOPEDIA_API_TOKEN,
 *     baseUrl: 'https://custom.protopedia.cc',
 *   },
 *   logLevel: 'debug',
 * });
 *
 * // With custom logger instance
 * import { createConsoleLogger } from '@f88/promidas/logger';
 *
 * const logger = createConsoleLogger();
 * const client = createProtopediaApiCustomClient({
 *   protoPediaApiClientOptions: { token: 'my-token' },
 *   logger,
 *   logLevel: 'warn',
 * });
 * ```
 */
export function createProtopediaApiCustomClient(
  config?: ProtopediaApiCustomClientConfig | null,
): ProtopediaApiCustomClient {
  return new ProtopediaApiCustomClient(config);
}
