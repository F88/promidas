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
 * - Mapping `TimeoutError` (request timeout, e.g. the SDK's `timeoutMs`) to a TIMEOUT failure.
 * - Detecting `AbortError` (caller-driven abort) and mapping it to an ABORTED failure.
 * - Normalizing {@link ProtoPediaApiError} into HTTP failures with status/statusText.
 * - Preserving network error codes (ENOTFOUND, ECONNREFUSED, etc.) when available.
 * - Classifying Node.js fetch failures without a code as NETWORK_ERROR.
 * - Classifying failed reads of a response body as network failures.
 * - Classifying browser fetch failures that hide the cause (TypeError with well-known messages) as BROWSER_FETCH_FAILED.
 * - Ensuring all API errors are normalized into {@link FetchPrototypesResult}
 *   without throwing exceptions.
 */
import {
  ProtoPediaApiError,
  ResponseBodyReadError,
} from 'protopedia-api-v2-client';

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
  TIMEOUT: 'TimeoutError',
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
 * a more specific code.
 */
const DEFAULT_NETWORK_ERROR_CODE = 'NETWORK_ERROR' as const;

/**
 * Network error codes exposed as {@link FetcherErrorCode}.
 */
const KNOWN_NETWORK_ERROR_CODES = [
  DEFAULT_NETWORK_ERROR_CODE,
  'ECONNREFUSED',
  'ENOTFOUND',
  'ETIMEDOUT',
] as const satisfies readonly FetcherErrorCode[];

/**
 * Messages of a failed browser fetch.
 *
 * Browsers give JavaScript the same TypeError for a CORS block, an auth error
 * without CORS headers, and a failed connection, so the cause cannot be told.
 */
const BROWSER_FETCH_FAILURE_MESSAGES = new Set<string>([
  'Failed to fetch',
  'Load failed',
  'NetworkError when attempting to fetch resource.',
]);

/**
 * Message of a failed Node.js fetch. Node.js has no CORS, so this is always a
 * network failure, even without a structured error code.
 */
const NODE_FETCH_FAILURE_MESSAGE = 'fetch failed';

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
 * Type guard to check if an error is a TimeoutError.
 *
 * protopedia-api-v2-client aborts with this error when its `timeoutMs`
 * elapses; `AbortSignal.timeout()` in a custom fetch produces the same.
 *
 * @param error - The error to check
 * @returns True if the error is a DOMException with name 'TimeoutError'
 */
function isTimeoutError(error: unknown): error is DOMException {
  return error instanceof DOMException && error.name === ERROR_NAMES.TIMEOUT;
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
    ...(status !== undefined && { status }),
  };
  return result;
}

function mapHttpStatusToCode(status: number | undefined): FetcherErrorCode {
  if (status === undefined) return 'UNKNOWN';

  const mapped = STATUS_CODE_MAP[status];
  if (mapped !== undefined) {
    return mapped;
  }

  if (status >= 500 && status < 600) return 'SERVER_ERROR';
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
 * Convert a runtime error code into a {@link FetcherErrorCode}.
 *
 * Runtimes have many more codes (e.g. UND_ERR_SOCKET in Node.js). Those stay
 * available in `details.causeCode`.
 *
 * @param code - The runtime error code
 * @returns The code itself if it is a known network code, otherwise NETWORK_ERROR
 */
function toNetworkErrorCode(code: string): FetcherErrorCode {
  return (
    KNOWN_NETWORK_ERROR_CODES.find((known) => known === code) ??
    DEFAULT_NETWORK_ERROR_CODE
  );
}

/**
 * Find the code of an error.
 *
 * Node.js native fetch keeps it in `cause.code`, and a failed body read in
 * `cause.cause.code`. Only strings count: a DOMException has a legacy numeric
 * `code`.
 *
 * @param error - The error to check
 * @returns The code, or undefined when the error has none
 */
function findCauseCode(error: unknown): string | undefined {
  const { code, cause } = (error ?? {}) as { code?: unknown; cause?: unknown };
  if (typeof code === 'string') {
    return code;
  }
  const { code: causeCode, cause: nestedCause } = (cause ?? {}) as {
    code?: unknown;
    cause?: { code?: unknown };
  };
  if (typeof causeCode === 'string') {
    return causeCode;
  }
  const nestedCode = nestedCause?.code;
  return typeof nestedCode === 'string' ? nestedCode : undefined;
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
 * - TimeoutError → timeout/TIMEOUT (request timeout, no HTTP status)
 * - AbortError → abort/ABORTED (caller-driven abort, no HTTP status)
 * - ResponseBodyReadError → network/<code> or network/NETWORK_ERROR
 * - Errors with a code → network/<code> or network/NETWORK_ERROR
 * - Node.js fetch failure without a code → network/NETWORK_ERROR
 * - Browser fetch failure (known TypeError messages) → browser_fetch/BROWSER_FETCH_FAILED
 * - Fallback → unknown/UNKNOWN
 *
 * Notes:
 * - Do not trust arbitrary error.status; do not treat non-ProtoPedia errors as HTTP.
 * - `details.causeCode` only holds a code found on the error.
 */
export function handleNotProtoPediaApiError(
  error: unknown,
): FetchPrototypesResult {
  // Handle TimeoutError (request timeout, distinguishable from AbortError).
  // Checked before the generic code extraction below: DOMException carries a
  // legacy numeric `code` (23 for TimeoutError) that must not be mistaken for
  // a network error code (Issue #134). Not an HTTP 408 response.
  if (isTimeoutError(error)) {
    const result = createFailureResult(ERROR_MESSAGES.TIMEOUT, {});

    return finalize(result, 'timeout', 'TIMEOUT');
  }

  // Handle AbortError (caller-driven abort) - network error, no status
  if (isAbortError(error)) {
    const result = createFailureResult(ERROR_MESSAGES.ABORTED, {});

    return finalize(result, 'abort', 'ABORTED');
  }

  const causeCode = findCauseCode(error);
  const details: NetworkFailure['details'] =
    causeCode === undefined ? {} : { causeCode };

  // The response was received, so the browser did not hide it. Checked before the
  // message check below, because the cause differs by runtime (Issue #152).
  if (error instanceof ResponseBodyReadError) {
    const result = createFailureResult(error.message, details);
    const code =
      causeCode === undefined
        ? DEFAULT_NETWORK_ERROR_CODE
        : toNetworkErrorCode(causeCode);
    return finalize(result, 'network', code);
  }

  const message =
    error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN;
  const result = createFailureResult(message, details);

  if (causeCode !== undefined) {
    return finalize(result, 'network', toNetworkErrorCode(causeCode));
  }

  if (error instanceof TypeError && message === NODE_FETCH_FAILURE_MESSAGE) {
    return finalize(result, 'network', DEFAULT_NETWORK_ERROR_CODE);
  }

  if (
    error instanceof TypeError &&
    BROWSER_FETCH_FAILURE_MESSAGES.has(message)
  ) {
    return finalize(result, 'browser_fetch', 'BROWSER_FETCH_FAILED');
  }

  return finalize(result, 'unknown', 'UNKNOWN');
}

/**
 * Normalize any error thrown during ProtoPedia API calls into a
 * {@link FetchPrototypesResult} failure object.
 *
 * Delegation:
 * - ProtoPediaApiError → {@link handleProtoPediaApiError} (HTTP, preserves status/statusText)
 * - Others → {@link handleNotProtoPediaApiError} (timeout/abort/network/browser_fetch/unknown)
 *
 * Notes:
 * - Only ProtoPediaApiError is treated as trusted HTTP (status/statusText retained).
 * - If the error has a code, store it in details.causeCode and return kind 'network'.
 * - Known browser fetch messages (TypeError) are classified as BROWSER_FETCH_FAILED.
 */
export function handleApiError(error: unknown): FetchPrototypesResult {
  // Handle ProtoPediaApiError specifically - HTTP error with status
  if (error instanceof ProtoPediaApiError) {
    return handleProtoPediaApiError(error);
  }

  // Handle all non-ProtoPediaApiError cases (network/abort/timeout/unknown)
  return handleNotProtoPediaApiError(error);
}
