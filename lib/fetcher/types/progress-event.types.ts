/**
 * Progress event types for fetch operations.
 *
 * This module defines event types for tracking the complete lifecycle
 * of HTTP requests, from initiation to completion.
 *
 * @module
 */

/**
 * Event fired when a fetch request starts.
 *
 * This event occurs immediately before the `fetch()` call is made,
 * marking the beginning of the request lifecycle.
 *
 * @example
 * ```typescript
 * if (event.type === 'request-start') {
 *   console.log('Request initiated...');
 * }
 * ```
 */
export type FetchProgressRequestStartEvent = {
  readonly type: 'request-start';
};

/**
 * Event fired when response headers are received.
 *
 * This event occurs after the server responds with headers but before
 * the response body download begins. It includes timing information
 * for the preparation phase and estimated download size.
 *
 * @example
 * ```typescript
 * if (event.type === 'response-received') {
 *   console.log(`Headers received in ${event.prepareTimeMs}ms`);
 *   console.log(`Estimated download: ${event.estimatedTotal} bytes`);
 * }
 * ```
 */
export type FetchProgressResponseReceivedEvent = {
  readonly type: 'response-received';
  /**
   * HTTP status code of the response (e.g., 200, 401, 404).
   *
   * This event fires for any response whose headers arrived, including
   * 4xx/5xx errors. Consumers should check this value before presenting
   * the download as a successful fetch.
   */
  readonly status: number;
  /**
   * Time spent from request start to header reception (milliseconds).
   */
  readonly prepareTimeMs: number;
  /**
   * Estimated total download size in bytes.
   * Derived from Content-Length header or URL parameters.
   */
  readonly estimatedTotal: number;
  /**
   * Number of items being fetched (from URL limit parameter).
   * 0 if limit parameter is not present.
   */
  readonly limit: number;
};

/**
 * Event fired during response body download.
 *
 * This event provides real-time progress updates as data is received.
 * Events are throttled to occur at most once every 500ms to avoid overhead.
 *
 * @example
 * ```typescript
 * if (event.type === 'download-progress') {
 *   console.log(`Progress: ${event.percentage.toFixed(1)}%`);
 *   console.log(`${event.received} / ${event.total} bytes`);
 * }
 * ```
 */
export type FetchProgressDownloadProgressEvent = {
  readonly type: 'download-progress';
  /**
   * HTTP status code of the response being downloaded (e.g., 200, 401).
   *
   * Progress events fire for 4xx/5xx error bodies too; consumers can
   * use this to adjust or suppress progress display for error responses.
   */
  readonly status: number;
  /**
   * Number of bytes received so far.
   */
  readonly received: number;
  /**
   * Total number of bytes to download.
   * May be 0 if Content-Length header is missing.
   */
  readonly total: number;
  /**
   * Download progress as a percentage (0-100).
   * 0 if total is unknown.
   */
  readonly percentage: number;
};

/**
 * Event fired when the response body transfer finishes.
 *
 * `complete` is a fact report: the response body transfer finished.
 * It makes no claim about HTTP success - mirroring WHATWG `fetch`,
 * which resolves on 401/404 and rejects only on transport failures,
 * this event also fires after draining the body of a 4xx/5xx error
 * response. Check `status` before presenting it as a success.
 *
 * @example
 * ```typescript
 * if (event.type === 'complete') {
 *   if (event.status >= 200 && event.status < 300) {
 *     console.log(`Downloaded ${event.received} bytes`);
 *     console.log(`Total time: ${event.totalTimeMs}ms`);
 *   } else {
 *     // e.g., the body was an error payload; let the caller's
 *     // error handling speak instead of reporting success
 *   }
 * }
 * ```
 */
export type FetchProgressCompleteEvent = {
  readonly type: 'complete';
  /**
   * HTTP status code of the response (e.g., 200, 401, 404).
   *
   * `complete` means the transfer finished, not that the request
   * succeeded - check this value to distinguish the two.
   */
  readonly status: number;
  /**
   * Total number of bytes actually received.
   */
  readonly received: number;
  /**
   * Estimated total size in bytes (from headers or URL parameters).
   */
  readonly estimatedTotal: number;
  /**
   * Time spent downloading the response body (milliseconds).
   */
  readonly downloadTimeMs: number;
  /**
   * Total time from request start to completion (milliseconds).
   * Includes both preparation and download time.
   */
  readonly totalTimeMs: number;
};

/**
 * Event fired when an error occurs during stream reading.
 *
 * This event is emitted when an error is thrown while reading the
 * response body stream, such as network errors or timeout errors.
 *
 * Note: HTTP error responses (4xx/5xx) do NOT fire this event. Their
 * body transfer completes normally, so they fire `complete` instead;
 * check `status` on that event to detect them. This event is reserved
 * for transport-level failures.
 *
 * @example
 * ```typescript
 * if (event.type === 'error') {
 *   console.error(`Download failed: ${event.error}`);
 *   console.log(`Received ${event.received} bytes before error`);
 *   console.log(`Failed after ${event.totalTimeMs}ms`);
 * }
 * ```
 */
export type FetchProgressErrorEvent = {
  readonly type: 'error';
  /**
   * HTTP status code of the response whose body was being read.
   *
   * Always available: this event only fires after response headers
   * have arrived (pre-response failures such as DNS errors reject
   * the fetch call itself and emit no event).
   */
  readonly status: number;
  /**
   * Error message describing what went wrong.
   */
  readonly error: string;
  /**
   * Number of bytes successfully received before the error occurred.
   */
  readonly received: number;
  /**
   * Estimated total size in bytes (from headers or URL parameters).
   */
  readonly estimatedTotal: number;
  /**
   * Time spent on download attempt before error (milliseconds).
   */
  readonly downloadTimeMs: number;
  /**
   * Total time from request start to error (milliseconds).
   * Includes both preparation and download time.
   */
  readonly totalTimeMs: number;
};

/**
 * Discriminated union of all fetch progress events.
 *
 * This type represents all possible events that can occur during
 * a fetch request lifecycle. TypeScript's discriminated union feature
 * enables type-safe event handling based on the `type` property.
 *
 * ## Event Lifecycle
 *
 * **Success flow:**
 * 1. `request-start` → Request initiated
 * 2. `response-received` → Headers received
 * 3. `download-progress` (multiple, throttled) → Body streaming
 * 4. `complete` → Body transfer finished
 *
 * **HTTP error flow (4xx/5xx):** same as the success flow. The error
 * body is still a body, so its transfer ends with `complete`, not
 * `error`. Check `status` on `response-received` / `complete` to
 * distinguish this case.
 *
 * **Error flow (stream reading failure):**
 * 1. `request-start` → Request initiated
 * 2. `response-received` → Headers received
 * 3. `download-progress` (optional) → Partial data received
 * 4. `error` → Stream reading failed (e.g., network error)
 *
 * Note: `download-progress` events may occur before `error` if some chunks
 * were successfully read before the failure.
 *
 * @example Basic usage
 * ```typescript
 * function handleProgressEvent(event: FetchProgressEvent) {
 *   switch (event.type) {
 *     case 'request-start':
 *       console.log('Starting request...');
 *       break;
 *     case 'response-received':
 *       console.log(`Headers received (${event.prepareTimeMs}ms)`);
 *       break;
 *     case 'download-progress':
 *       console.log(`Progress: ${event.percentage}%`);
 *       break;
 *     case 'complete':
 *       console.log(`Complete (${event.totalTimeMs}ms)`);
 *       break;
 *     case 'error':
 *       console.error(`Error: ${event.error}`);
 *       break;
 *   }
 * }
 * ```
 *
 * @example Type narrowing
 * ```typescript
 * function handleEvent(event: FetchProgressEvent) {
 *   if (event.type === 'download-progress') {
 *     // TypeScript knows event has percentage, received, total properties
 *     updateProgressBar(event.percentage);
 *   }
 * }
 * ```
 */
export type FetchProgressEvent =
  | FetchProgressRequestStartEvent
  | FetchProgressResponseReceivedEvent
  | FetchProgressDownloadProgressEvent
  | FetchProgressCompleteEvent
  | FetchProgressErrorEvent;
