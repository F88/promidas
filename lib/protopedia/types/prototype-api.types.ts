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
 * // From ProtoPediaApiError (v2.0.0)
 * const failure: NetworkFailure = {
 *   status: 404,
 *   error: 'Prototype not found',
 *   details: {
 *     req: { url: 'https://protopedia.cc/api/prototypes/123', method: 'GET' },
 *     res: { statusText: 'Not Found' }
 *   }
 * };
 *
 * // From AbortError (timeout)
 * const timeout: NetworkFailure = {
 *   status: 504,
 *   error: 'Upstream request timed out',
 *   details: {}
 * };
 * ```
 */
export type NetworkFailure = {
  /** HTTP status code from the response (e.g., 404, 500, 504) */
  status: number;
  /** Error message from Error.message or fallback string */
  error: unknown;
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
