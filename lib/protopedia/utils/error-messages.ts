/**
 * @module protopedia/utils/error-messages
 *
 * Message formatting utilities for ProtoPedia API errors.
 *
 * This module provides helpers to extract and format error messages
 * from various error types into user-friendly display strings.
 */
import type { NetworkFailure } from '../types/prototype-api.types.js';

/**
 * Resolve an unknown error value into a readable string message.
 *
 * This helper provides a safe way to extract error messages from various
 * error types that may be thrown by network calls or API clients.
 *
 * @param value - The error value to resolve. Can be an `Error`, a string,
 *   or any other value.
 * @returns A string message. If `value` is an `Error`, returns its
 *   `message` property. If `value` is a non-empty string, returns it as-is.
 *   Otherwise, returns a generic fallback message.
 *
 * @example
 * ```ts
 * resolveErrorMessage(new Error('Network timeout'));
 * // => 'Network timeout'
 *
 * resolveErrorMessage('Custom error');
 * // => 'Custom error'
 *
 * resolveErrorMessage(null);
 * // => 'Unknown error occurred.'
 * ```
 */
export const resolveErrorMessage = (value: unknown): string => {
  if (value instanceof Error) {
    return value.message;
  }

  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  return 'Unknown error occurred.';
};

/**
 * Construct a user-friendly display message from a network failure object.
 *
 * This function builds a comprehensive error message by combining:
 * 1. A prefix from `details.statusText` (e.g., "Not Found") or
 *    `details.code` (e.g., "ENOTFOUND").
 * 2. The resolved error message from {@link resolveErrorMessage}.
 * 3. The HTTP status code appended in parentheses (e.g., "(404)").
 *
 * The result is suitable for displaying to users or logging.
 *
 * @param failure - The {@link NetworkFailure} object containing status,
 *   error, and optional details.
 * @returns A formatted error message string.
 *
 * @example
 * ```ts
 * const failure: NetworkFailure = {
 *   status: 404,
 *   error: new Error('Resource not found'),
 *   details: { res: { statusText: 'Not Found' } },
 * };
 *
 * constructDisplayMessage(failure);
 * // => 'Not Found: Resource not found (404)'
 * ```
 */
export const constructDisplayMessage = (failure: NetworkFailure): string => {
  const { error, status, details } = failure;
  const statusText = details?.res?.statusText;
  const code = details?.res?.code;
  let message = resolveErrorMessage(error);

  const prefix = statusText || code;

  if (prefix) {
    // Prepend prefix if not already present
    if (!message.startsWith(prefix)) {
      message = `${prefix}: ${message}`;
    }
  }

  return `${message} (${status})`;
};
