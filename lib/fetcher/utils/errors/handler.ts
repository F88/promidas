/**
 * @module protopedia/utils/errors/handler
 *
 * Error handling utilities for ProtoPedia API calls.
 *
 * This module provides the central error handler that transforms various
 * error scenarios into a consistent {@link FetchPrototypesResult} failure
 * shape. HTTP normalization is limited to ProtoPedia API errors; all other
 * errors are classified as network/timeout/abort/unknown.
 *
 * Key responsibilities:
 * - Mapping `PromidasTimeoutError` (timeout) to a TIMEOUT failure.
 * - Detecting `AbortError` (caller-driven abort) and mapping it to an ABORTED failure.
 * - Normalizing {@link ProtoPediaApiError} into HTTP failures with status/statusText.
 * - Preserving network error codes (ENOTFOUND, ECONNREFUSED, etc.) when available.
 * - Classifying opaque fetch failures (TypeError with well-known messages) as CORS_BLOCKED.
 * - Ensuring all API errors are normalized into {@link FetchPrototypesResult}
 *   without throwing exceptions.
 */
import { ProtoPediaApiError } from 'protopedia-api-v2-client';

import { PromidasTimeoutError } from '../../errors/fetcher-error.js';
import type { NetworkFailure } from '../../types/prototype-api.types.js';
import type {
  FetchFailureKind,
  FetchPrototypesFailure,
  FetchPrototypesResult,
  FetcherErrorCode,
} from '../../types/result.types.js';

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
  ABORTED: 'Upstream request aborted',
  TIMEOUT: 'Upstream request timed out',
  UNKNOWN: 'Failed to fetch prototypes',
} as const;

/**
 * Default error code for network failures where the runtime does not provide
 * a more specific code (e.g. browser fetch TypeError("Failed to fetch")).
 */
const DEFAULT_NETWORK_ERROR_CODE = 'NETWORK_ERROR' as const;

/**
 * A small set of well-known fetch network error messages.
 *
 * Browsers commonly surface CORS/network failures as a generic TypeError with
 * a short message (e.g. "Failed to fetch"), without any structured error code.
 */
const KNOWN_FETCH_NETWORK_ERROR_MESSAGES = new Set<string>([
  'Failed to fetch',
  'fetch failed',
  'Load failed',
  'NetworkError when attempting to fetch resource.',
]);

const STATUS_CODE_MAP: Record<number, FetcherErrorCode> = {
  400: 'CLIENT_BAD_REQUEST',
  401: 'CLIENT_UNAUTHORIZED',
  403: 'CLIENT_FORBIDDEN',
  404: 'CLIENT_NOT_FOUND',
  405: 'CLIENT_METHOD_NOT_ALLOWED',
  408: 'CLIENT_TIMEOUT',
  429: 'CLIENT_RATE_LIMITED',
  500: 'SERVER_INTERNAL_ERROR',
  502: 'SERVER_BAD_GATEWAY',
  503: 'SERVER_SERVICE_UNAVAILABLE',
  504: 'SERVER_GATEWAY_TIMEOUT',
};

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

type FetchPrototypesFailureBase = Omit<FetchPrototypesFailure, 'kind' | 'code'>;

/**
 * Create the common portion of a FetchPrototypesFailure.
 *
 * @param error - Error message string
 * @param details - Additional error details (always required, use {} if no metadata)
 * @param status - HTTP status code (undefined for network errors without server response)
 * @returns A partial FetchPrototypesFailure without kind/code
 */
function createFailureResult(
  error: string,
  details: NetworkFailure['details'],
  status?: number,
): FetchPrototypesFailureBase {
  const result: FetchPrototypesFailureBase = {
    ok: false,
    origin: 'fetcher',
    error,
    details,
  };
  if (status !== undefined) {
    result.status = status;
  }
  return result;
}

function mapHttpStatusToCode(status: number | undefined): FetcherErrorCode {
  if (status === undefined) return 'UNKNOWN';

  const mapped = STATUS_CODE_MAP[status];
  if (mapped !== undefined) {
    return mapped;
  }

  if (status >= 500) return 'SERVER_ERROR';
  if (status >= 400 && status < 500) return 'CLIENT_ERROR';
  return 'UNKNOWN';
}

function finalize(
  base: FetchPrototypesFailureBase,
  kind: FetchFailureKind,
  code: FetcherErrorCode,
): FetchPrototypesResult {
  return {
    ...base,
    kind,
    code,
  } satisfies FetchPrototypesResult;
}

/**
 * Normalize a {@link ProtoPediaApiError} into a fetcher HTTP failure result.
 *
 * @param error - ProtoPedia API client error containing status and metadata
 * @returns Failure result with kind 'http' and mapped FetcherErrorCode
 */
export function handleProtoPediaApiError(
  error: ProtoPediaApiError,
): FetchPrototypesResult {
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

  return finalize(result, 'http', mapHttpStatusToCode(error.status));
}

/**
 * Normalize non-ProtoPedia errors into fetcher failure results.
 *
 * Paths:
 * - PromidasTimeoutError → timeout/TIMEOUT (no HTTP status)
 * - AbortError → abort/ABORTED (caller-driven abort, no HTTP status)
 * - Network-ish errors with code → network/<code>
 * - Opaque fetch (known TypeError messages) → cors/CORS_BLOCKED
 * - Fallback → unknown/UNKNOWN
 *
 * Notes:
 * - Do not trust arbitrary error.status; do not treat non-ProtoPedia errors as HTTP.
 * - If details.res.code exists, classify as network; otherwise choose cors/unknown.
 */
export function handleNotProtoPediaApiError(
  error: unknown,
): FetchPrototypesResult {
  /**
   * Handle explicit timeout errors (distinguishable from AbortError).
   * These are fetcher-level timeouts, not HTTP 408 responses.
   */
  // Handle explicit timeout errors (distinguishable from AbortError)
  if (error instanceof PromidasTimeoutError) {
    const result = createFailureResult(ERROR_MESSAGES.TIMEOUT, {
      res: {
        code: 'TIMEOUT',
      },
    });

    return finalize(result, 'timeout', 'TIMEOUT');
  }

  // Handle AbortError (caller-driven abort) - network error, no status
  if (isAbortError(error)) {
    const result = createFailureResult(ERROR_MESSAGES.ABORTED, {
      res: {
        code: 'ABORTED',
      },
    });

    return finalize(result, 'abort', 'ABORTED');
  }

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
      details.res ??= {};
      details.res.code = code;
    }
  }

  const isOpaqueFetchError =
    error instanceof TypeError &&
    KNOWN_FETCH_NETWORK_ERROR_MESSAGES.has(message);

  if (details.res?.code === undefined && isOpaqueFetchError) {
    // Keep diagnostics (use generic network code) but classify as CORS_BLOCKED.
    details.res ??= {};
    details.res.code = DEFAULT_NETWORK_ERROR_CODE;
    const result = createFailureResult(message, details);
    return finalize(result, 'cors', 'CORS_BLOCKED');
  }

  if (details.res?.code !== undefined) {
    const result = createFailureResult(message, details);
    const code = details.res.code as FetcherErrorCode;
    return finalize(result, 'network', code);
  }

  const result = createFailureResult(message, details);
  return finalize(result, 'unknown', 'UNKNOWN');
}

/**
 * Normalize any error thrown during ProtoPedia API calls into a
 * {@link FetchPrototypesResult} failure object.
 *
 * Delegation:
 * - ProtoPediaApiError → {@link handleProtoPediaApiError} (HTTP, preserves status/statusText)
 * - Others → {@link handleNotProtoPediaApiError} (timeout/abort/network/cors/unknown)
 *
 * Notes:
 * - Only ProtoPediaApiError is treated as trusted HTTP (status/statusText retained).
 * - If a network code is available, store it in details.res.code and return kind 'network'.
 * - Known opaque fetch messages (TypeError) are classified as CORS_BLOCKED.
 */
export function handleApiError(error: unknown): FetchPrototypesResult {
  // Handle ProtoPediaApiError specifically - HTTP error with status
  if (error instanceof ProtoPediaApiError) {
    return handleProtoPediaApiError(error);
  }

  // Handle all non-ProtoPediaApiError cases (network/abort/timeout/unknown)
  return handleNotProtoPediaApiError(error);
}
