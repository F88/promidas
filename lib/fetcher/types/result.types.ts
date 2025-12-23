import type { NormalizedPrototype } from '../../types/index.js';

import type { NetworkFailure } from './prototype-api.types.js';

/**
 * Coarse-grained discriminant for fetcher failures.
 *
 * - http: HTTP response was received (status is available)
 * - cors: Browser returned an opaque response (no status/code observable)
 * - network: Network/socket error without HTTP response (ENOTFOUND, ECONNREFUSED, etc.)
 * - timeout: Fetcher-level timeout (no HTTP response)
 * - abort: Caller-driven abort (AbortController)
 * - unknown: Classification failed; fall back to code UNKNOWN
 */
export type FetchFailureKind =
  | 'http'
  | 'cors'
  | 'network'
  | 'timeout'
  | 'abort'
  | 'unknown';

/**
 * Canonical error codes exposed by the fetcher.
 *
 * HTTP: UNAUTHORIZED / FORBIDDEN / NOT_FOUND / RATE_LIMITED / INTERNAL_ERROR
 * Network: NETWORK_ERROR / ECONNREFUSED / ENOTFOUND / ETIMEDOUT
 * Control: TIMEOUT (fetcher timeout), ABORTED (AbortController)
 * CORS: CORS_BLOCKED (opaque response; status/code not observable)
 * Fallback: UNKNOWN
 *
 * `string` is kept as a final fallback for backward compatibility so that
 * existing custom codes are not broken during migration.
 */
export type FetcherErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'NETWORK_ERROR'
  | 'ECONNREFUSED'
  | 'ENOTFOUND'
  | 'ETIMEDOUT'
  | 'TIMEOUT'
  | 'ABORTED'
  | 'CORS_BLOCKED'
  | 'UNKNOWN'
  | string;

/**
 * Successful response from fetchPrototypes containing an array of prototypes.
 */
export type FetchPrototypesSuccess = {
  ok: true;
  data: NormalizedPrototype[];
};

/**
 * Failed response from fetchPrototypes with error details.
 */
export type FetchPrototypesFailure = {
  ok: false;
  /** Always fetcher-originated. */
  origin: 'fetcher';
  /** Coarse-grained classification of the failure cause. */
  kind: FetchFailureKind;
  error: string;
  /** Canonicalized error code (in addition to details.res.code). */
  code: FetcherErrorCode;
} & Omit<NetworkFailure, 'error'>;

/**
 * Result type for fetchPrototypes function - either success with data or failure with error.
 */
export type FetchPrototypesResult =
  | FetchPrototypesSuccess
  | FetchPrototypesFailure;

/**
 * Successful response from fetchRandomPrototype containing a single prototype.
 */
export type FetchRandomPrototypeSuccess = {
  ok: true;
  data: NormalizedPrototype;
};

/**
 * Failed response from fetchRandomPrototype (same as FetchPrototypesFailure).
 */
export type FetchRandomPrototypeFailure = FetchPrototypesFailure;

/**
 * Result type for fetchRandomPrototype function - either success with single prototype or failure.
 */
export type FetchRandomPrototypeResult =
  | FetchRandomPrototypeSuccess
  | FetchRandomPrototypeFailure;

/**
 * Result type for fetchPrototypeById function - either success with single prototype or failure.
 */
export type FetchPrototypeByIdResult =
  | { ok: true; data: NormalizedPrototype }
  | FetchPrototypesFailure;
