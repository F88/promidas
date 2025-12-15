/**
 * @module protopedia/utils/errors/handler
 *
 * Error handling utilities for ProtoPedia API calls.
 *
 * This module provides the central error handler that transforms various
 * error scenarios (HTTP errors, timeouts, network errors, unexpected
 * exceptions) into a consistent {@link FetchPrototypesResult} failure shape.
 *
 * Key responsibilities:
 * - Detecting `AbortError` (timeout) and mapping it to network failure.
 * - Extracting metadata (status, statusText, code, url) from
 *   HTTP-like error objects.
 * - Preserving network error codes (ENOTFOUND, ECONNREFUSED, etc.) in
 *   result details.
 * - Logging diagnostic information for debugging and monitoring.
 * - Ensuring all API errors are normalized into {@link FetchPrototypesResult}
 *   without throwing exceptions.
 */
import { ProtoPediaApiError } from 'protopedia-api-v2-client';

/**
 * Standard error names used in error detection.
 */
const ERROR_NAMES = {
  ABORT: 'AbortError',
} as const;

/**
 * Standard error messages for common failure scenarios.
 */
const ERROR_MESSAGES = {
  TIMEOUT: 'Upstream request timed out',
  UNKNOWN: 'Failed to fetch prototypes',
} as const;

import type { NetworkFailure } from '../../types/prototype-api.types.js';
import type { FetchPrototypesResult } from '../../types/result.types.js';

/**
 * Type guard to check if an error is an AbortError.
 *
 * @param error - The error to check
 * @returns True if the error is a DOMException with name 'AbortError'
 */
function isAbortError(error: unknown): error is DOMException {
  return error instanceof DOMException && error.name === ERROR_NAMES.ABORT;
}

/**
 * Type guard to check if an error object has a status property (may need parsing).
 *
 * @param error - The error to check
 * @returns True if the error has a status property of any type
 */
function hasStatusProperty(error: unknown): error is { status: unknown } {
  return error !== null && typeof error === 'object' && 'status' in error;
}

/**
 * Type guard to check if an error has a code property.
 *
 * This intentionally uses a broad `error is object` type guard to handle
 * nested error structures flexibly. Node.js native fetch wraps network
 * error codes in `error.cause.code`:
 *
 * @example
 * ```ts
 * const error = new Error('fetch failed');
 * error.cause = { code: 'ENOTFOUND' };
 * // hasErrorCode(error) returns true, allowing us to check error.cause.code
 * ```
 *
 * A more specific type guard like `error is { code: string }` would reject
 * errors that only have `cause.code`, preventing extraction of nested codes.
 *
 * @param error - The error to check
 * @returns True if the error is an object that might contain code information
 */
function hasErrorCode(error: unknown): error is object {
  return error !== null && typeof error === 'object';
}

/**
 * Create a FetchPrototypesResult failure object.
 *
 * @param error - Error message string
 * @param details - Additional error details (always required, use {} if no metadata)
 * @param status - HTTP status code (undefined for network errors without server response)
 * @returns A FetchPrototypesResult with ok: false
 */
function createFailureResult(
  error: string,
  details: NetworkFailure['details'],
  status?: number,
): FetchPrototypesResult {
  const result: FetchPrototypesResult = {
    ok: false,
    error,
    details,
  };
  if (status !== undefined) {
    result.status = status;
  }
  return result;
}

/**
 * Normalize errors thrown during ProtoPedia API calls into a
 * {@link FetchPrototypesResult} failure object.
 *
 * This is the central error handler for all ProtoPedia API interactions.
 * It ensures that:
 *
 * - `AbortError` (typically from `AbortController` timeout) is treated as a
 *   network error with no `status` (no server response received).
 * - {@link ProtoPediaApiError} from protopedia-api-v2-client is normalized
 *   with HTTP `status` and request/response metadata preserved.
 * - HTTP-like errors with a `status` property are normalized with their
 *   metadata (statusText, code, url) preserved in the `details` field.
 * - Network errors (ENOTFOUND, ECONNREFUSED, etc.) have no `status` but
 *   preserve the error `code` in `details.res.code`.
 * - All cases produce a {@link FetchPrototypesResult} with `ok: false`
 *   and a consistent `details` object.
 * - Never throws exceptions - all errors are converted to Result types.
 * - The complete result object is logged for monitoring and debugging.
 *
 * @param error - The error value thrown by an upstream API call. Can be
 *   a {@link ProtoPediaApiError}, a DOMException, an HTTP-like object
 *   with a `status` property, or any other value.
 * @param logger - Optional logger instance for diagnostic output. Defaults
 *   to console logger with 'info' level if not provided.
 * @returns A {@link FetchPrototypesResult} with `ok: false`, an error
 *   message, a `details` object, and optionally a `status` code (only
 *   present for HTTP errors, not network errors).
 *
 * @example
 * ```ts
 * // AbortError (timeout) - no status
 * const abortError = new DOMException('Aborted', 'AbortError');
 * handleApiError(abortError);
 * // => { ok: false, error: 'Upstream request timed out', details: {} }
 *
 * // ProtoPediaApiError - with status
 * const apiError = new ProtoPediaApiError({
 *   message: 'Prototype not found',
 *   req: { url: 'https://protopedia.cc/api/prototypes', method: 'GET' },
 *   status: 404,
 *   statusText: 'Not Found',
 * });
 * handleApiError(apiError);
 * // => {
 * //   ok: false,
 * //   status: 404,
 * //   error: 'Prototype not found',
 * //   details: {
 * //     req: { url: 'https://protopedia.cc/api/prototypes', method: 'GET' },
 * //     res: { statusText: 'Not Found' }
 * //   }
 * // }
 *
 * // Network error (ECONNREFUSED) - no status, code in details
 * const networkError = Object.assign(new Error('connect ECONNREFUSED'), {
 *   code: 'ECONNREFUSED'
 * });
 * handleApiError(networkError);
 * // => {
 * //   ok: false,
 * //   error: 'connect ECONNREFUSED',
 * //   details: { res: { code: 'ECONNREFUSED' } }
 * // }
 * ```
 */
export function handleApiError(error: unknown): FetchPrototypesResult {
  // Handle AbortError (timeout) - network error, no status
  if (isAbortError(error)) {
    const result = createFailureResult(ERROR_MESSAGES.TIMEOUT, {});

    return result;
  }

  // Handle ProtoPediaApiError specifically - HTTP error with status
  if (error instanceof ProtoPediaApiError) {
    const result = createFailureResult(
      error.message,
      {
        req: {
          url: error.req.url,
          method: error.req.method,
        },
        res: {
          statusText: error.statusText,
        },
      },
      error.status,
    );

    return result;
  }

  // Handle HTTP-like errors with a `status` property
  if (hasStatusProperty(error)) {
    const rawStatus = (error as { status?: unknown }).status;
    const parsedStatus =
      typeof rawStatus === 'number' ? rawStatus : Number(rawStatus);
    const status =
      Number.isFinite(parsedStatus) && rawStatus != null ? parsedStatus : 500;
    const errorObj = error as {
      statusText?: string;
      code?: string;
      req?: {
        url?: string;
        method?: string;
      };
    };
    const { statusText, code, req } = errorObj;

    const message =
      error instanceof Error ? error.message : 'Failed to fetch prototypes';

    const details: NetworkFailure['details'] = {};
    if (req?.url !== undefined || req?.method !== undefined) {
      details.req = {};
      if (req.url !== undefined) {
        details.req.url = req.url;
      }
      if (req.method !== undefined) {
        details.req.method = req.method;
      }
    }
    if (statusText !== undefined || code !== undefined) {
      details.res = {};
      if (statusText !== undefined) {
        details.res.statusText = statusText;
      }
      if (code !== undefined) {
        details.res.code = code;
      }
    }

    const result = createFailureResult(message, details, status);

    return result;
  }

  // Handle unexpected errors (including network errors from fetch)
  // Network errors do not have HTTP status codes
  const message =
    error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN;

  const details: NetworkFailure['details'] = {};
  // Extract network error code from error.code or error.cause.code
  // (Node.js native fetch wraps ENOTFOUND etc. in error.cause)
  if (hasErrorCode(error)) {
    const errorObj = error as {
      code?: string;
      cause?: { code?: string };
    };
    const code = errorObj.code ?? errorObj.cause?.code;
    if (code !== undefined) {
      details.res = { code };
    }
  }

  const result = createFailureResult(message, details);

  return result;
}
