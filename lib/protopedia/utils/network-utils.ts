/**
 * @module protopedia/utils/network-utils
 *
 * Network error handling utilities for ProtoPedia API calls.
 *
 * This module provides helpers to transform various error scenarios
 * (HTTP errors, timeouts, unexpected exceptions) into a consistent
 * {@link FetchPrototypesResult} failure shape.
 *
 * Key responsibilities:
 * - Detecting `AbortError` (timeout) and mapping it to HTTP 504.
 * - Extracting metadata (status, statusText, code, url, requestId) from
 *   HTTP-like error objects.
 * - Constructing user-friendly error messages with status codes and
 *   context.
 * - Logging diagnostic information for debugging and monitoring.
 * - Ensuring all API errors are normalized into {@link FetchPrototypesResult}
 *   without throwing exceptions.
 */
import { createConsoleLogger } from '../../lib/logger.js';
import type { NetworkFailure } from '../types/prototype-api.types.js';
import type { FetchPrototypesResult } from '../types/result.types.js';

const logger = createConsoleLogger('info');

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
 *   details: { statusText: 'Not Found', code: undefined },
 * };
 *
 * constructDisplayMessage(failure);
 * // => 'Not Found: Resource not found (404)'
 * ```
 */
export const constructDisplayMessage = (failure: NetworkFailure): string => {
  const { error, status, details } = failure;
  const statusText = details?.statusText;
  const code = details?.code;
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

/**
 * Normalize errors thrown during ProtoPedia API calls into a
 * {@link FetchPrototypesResult} failure object.
 *
 * This is the central error handler for all ProtoPedia API interactions.
 * It ensures that:
 *
 * - `AbortError` (typically from `AbortController` timeout) is mapped
 *   to HTTP 504 Gateway Timeout.
 * - HTTP-like errors with a `status` property are normalized with their
 *   metadata (statusText, code, url, requestId) preserved in the `details`
 *   field.
 * - Unexpected errors (no `status` property) are mapped to HTTP 500
 *   Internal Server Error.
 * - All cases produce a {@link FetchPrototypesResult} with `ok: false`,
 *   never throwing an exception.
 * - Diagnostic logs are emitted for monitoring and debugging.
 *
 * @param error - The error value thrown by an upstream API call. Can be
 *   an `Error`, a DOMException, an HTTP-like object with a `status`
 *   property, or any other value.
 * @returns A {@link FetchPrototypesResult} with `ok: false`, a status
 *   code, and an error message. May include a `details` object with
 *   additional context.
 *
 * @example
 * ```ts
 * // AbortError (timeout)
 * const abortError = new DOMException('Aborted', 'AbortError');
 * handleApiError(abortError);
 * // => { ok: false, status: 504, error: 'Upstream request timed out' }
 *
 * // HTTP error with metadata
 * const httpError = {
 *   status: 404,
 *   statusText: 'Not Found',
 *   code: 'RESOURCE_NOT_FOUND',
 *   url: 'https://protopedia.cc/api/prototypes',
 *   message: 'Prototype not found',
 * };
 * handleApiError(httpError);
 * // => {
 * //   ok: false,
 * //   status: 404,
 * //   error: 'Prototype not found',
 * //   details: { statusText: 'Not Found', code: 'RESOURCE_NOT_FOUND', ... }
 * // }
 *
 * // Unexpected error
 * handleApiError(new Error('Unexpected crash'));
 * // => { ok: false, status: 500, error: 'Unexpected crash' }
 * ```
 */
export function handleApiError(error: unknown): FetchPrototypesResult {
  if (error instanceof DOMException && error.name === 'AbortError') {
    logger.warn('Upstream request aborted (timeout)', {
      errorType: 'AbortError',
    });

    return {
      ok: false,
      status: 504,
      error: 'Upstream request timed out',
    };
  }

  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = Number((error as { status?: number }).status ?? 500);
    const errorObj = error as {
      statusText?: string;
      code?: string;
      url?: string;
      requestId?: string;
    };
    const { statusText, code, url, requestId } = errorObj;

    logger.warn('HTTP error when calling ProtoPedia API', {
      status,
      statusText,
      code,
      url,
      requestId,
    });

    const message =
      error instanceof Error ? error.message : 'Failed to fetch prototypes';

    const details: NetworkFailure['details'] = {};
    if (statusText !== undefined) details.statusText = statusText;
    if (code !== undefined) details.code = code;
    if (url !== undefined) details.url = url;
    if (requestId !== undefined) details.requestId = requestId;

    return {
      ok: false,
      status,
      error: message,
      details,
    };
  }

  logger.error('Unexpected error while calling ProtoPedia API', {
    error: error instanceof Error ? error.message : String(error),
  });

  return {
    ok: false,
    status: 500,
    error:
      error instanceof Error ? error.message : 'Failed to fetch prototypes',
  };
}
