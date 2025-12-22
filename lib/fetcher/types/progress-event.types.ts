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
  type: 'request-start';
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
  type: 'response-received';
  /**
   * Time spent from request start to header reception (milliseconds).
   */
  prepareTimeMs: number;
  /**
   * Estimated total download size in bytes.
   * Derived from Content-Length header or URL parameters.
   */
  estimatedTotal: number;
  /**
   * Number of items being fetched (from URL limit parameter).
   * 0 if limit parameter is not present.
   */
  limit: number;
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
  type: 'download-progress';
  /**
   * Number of bytes received so far.
   */
  received: number;
  /**
   * Total number of bytes to download.
   * May be 0 if Content-Length header is missing.
   */
  total: number;
  /**
   * Download progress as a percentage (0-100).
   * 0 if total is unknown.
   */
  percentage: number;
};

/**
 * Event fired when download completes successfully.
 *
 * This event marks the successful completion of the entire request lifecycle,
 * including both preparation and download phases.
 *
 * @example
 * ```typescript
 * if (event.type === 'complete') {
 *   console.log(`Downloaded ${event.received} bytes`);
 *   console.log(`Total time: ${event.totalTimeMs}ms`);
 *   console.log(`Download time: ${event.downloadTimeMs}ms`);
 * }
 * ```
 */
export type FetchProgressCompleteEvent = {
  type: 'complete';
  /**
   * Total number of bytes actually received.
   */
  received: number;
  /**
   * Estimated total size in bytes (from headers or URL parameters).
   */
  estimatedTotal: number;
  /**
   * Time spent downloading the response body (milliseconds).
   */
  downloadTimeMs: number;
  /**
   * Total time from request start to completion (milliseconds).
   * Includes both preparation and download time.
   */
  totalTimeMs: number;
};

/**
 * Discriminated union of all fetch progress events.
 *
 * This type represents all possible events that can occur during
 * a fetch request lifecycle. TypeScript's discriminated union feature
 * enables type-safe event handling based on the `type` property.
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
  | FetchProgressCompleteEvent;
