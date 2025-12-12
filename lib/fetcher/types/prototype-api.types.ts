import type { ResultOfListPrototypesApiResponse } from 'protopedia-api-v2-client';

/**
 * Alias for the upstream prototype shape returned by the ProtoPedia SDK.
 *
 * This type represents a single prototype object as delivered by the
 * `listPrototypes` API response. It is the input to normalization functions.
 *
 * **Important:** This is a direct re-export of the SDK's response type.
 * If `protopedia-api-v2-client` changes its response shape in a future
 * version, this type will automatically reflect those changes. The
 * following areas may be affected:
 *
 * - Normalization function implementation (field mappings)
 * - {@link NormalizedPrototype} type definition (may need updates)
 * - Normalization tests (may need new test cases)
 * - Helper functions (pipe-separated string parsing, timestamp normalization)
 *
 * **When upgrading `protopedia-api-v2-client`:**
 * 1. Review the SDK's changelog for new or changed fields
 * 2. Run tests - field coverage tests will fail if new fields are not normalized
 * 3. Update normalization logic to handle new fields
 * 4. Update {@link NormalizedPrototype} type if needed
 * 5. Add test cases for new field transformations
 */
export type UpstreamPrototype = ResultOfListPrototypesApiResponse;

/**
 * Structure for network failure responses in Result-type patterns.
 *
 * This type represents error data for Result-type patterns (`{ ok: false, ... }`),
 * distinct from the {@link ProtoPediaApiError} exception class from
 * protopedia-api-v2-client. The structure is designed to be compatible with
 * {@link FetchPrototypesFailure} and maintains consistency with error
 * information from {@link ProtoPediaApiError}.
 *
 * ## Relationship with ProtoPediaApiError
 *
 * **NetworkFailure** is a plain data object, while **ProtoPediaApiError** is an
 * Error subclass:
 * - NetworkFailure: Used in Result types for functional error handling
 * - ProtoPediaApiError: Thrown as exceptions by protopedia-api-v2-client
 * - NetworkFailure: Can represent errors from any source (API, timeout, unexpected)
 * - ProtoPediaApiError: Specifically represents HTTP errors from ProtoPedia API
 *
 * The `details` structure mirrors request/response metadata from
 * {@link ProtoPediaApiError} (`req.url`, `req.method`, `statusText`) to maintain
 * compatibility when converting API exceptions to Result types.
 *
 * ## Details Field
 *
 * The `details` object is always present and may contain:
 * - Empty object `{}` for errors without metadata (AbortError, unexpected errors)
 * - `req` object with URL and HTTP method from the request
 * - `res` object with HTTP status text and optional error code
 *
 * @example
 * ```ts
 * // From ProtoPediaApiError (v2.0.0) - HTTP error with status
 * const failure: NetworkFailure = {
 *   status: 404,
 *   error: 'Prototype not found',
 *   details: {
 *     req: { url: 'https://protopedia.cc/api/prototypes/123', method: 'GET' },
 *     res: { statusText: 'Not Found' }
 *   }
 * };
 *
 * // Network error (ECONNREFUSED) - no status
 * const networkError: NetworkFailure = {
 *   error: 'connect ECONNREFUSED',
 *   details: {
 *     res: { code: 'ECONNREFUSED' }
 *   }
 * };
 * ```
 */
export type NetworkFailure = {
  /** Error message from Error.message or fallback string */
  error: unknown;
  /**
   * HTTP status code from server response (e.g., 404, 500).
   * Undefined for network errors where no server response was received
   * (e.g., ENOTFOUND, ECONNREFUSED, AbortError).
   */
  status?: number;
  /**
   * Additional error details from request and response.
   * Always present, but may be an empty object for errors without metadata.
   */
  details: {
    /** Request information (compatible with ProtoPediaApiError.req from v2.0.0) */
    req?: {
      /** HTTP method (e.g., "GET", "POST") */
      method?: string;
      /** Request URL */
      url?: string;
    };
    /** Response information (compatible with ProtoPediaApiError metadata) */
    res?: {
      /** HTTP status text (e.g., "Not Found", "Internal Server Error") */
      statusText?: string;
      /** Error code from the API (e.g., "RESOURCE_NOT_FOUND") */
      code?: string;
    };
  };
};
