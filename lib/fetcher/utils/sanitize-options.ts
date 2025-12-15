/**
 * Utilities for sanitizing API client options.
 *
 * @module
 */
import type { ProtoPediaApiClientOptions } from 'protopedia-api-v2-client';

/**
 * Sanitizes ProtopediaApiClientOptions for logging by redacting the token.
 *
 * @param options The options object to sanitize.
 * @returns A new options object with the token redacted.
 */
export function sanitizeProtopediaApiClientOptions(
  options: ProtoPediaApiClientOptions | undefined,
): ProtoPediaApiClientOptions | undefined {
  if (!options) {
    return undefined;
  }
  if (options.token) {
    return { ...options, token: '***' };
  }
  return options;
}
