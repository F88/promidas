/**
 * Custom fetch function factory with download progress tracking.
 *
 * This module provides a factory function that creates a custom fetch wrapper
 * which monitors download progress and provides callbacks/logging for UI updates.
 *
 * @module
 */

import type { Logger } from '../../logger/index.js';

/**
 * Check if the logger should output progress logs based on its current level.
 *
 * This function is used to control direct stderr output (process.stderr.write)
 * which bypasses the logger's internal level filtering. For logger.info() calls,
 * the logger itself handles level filtering.
 *
 * @param logger - Logger instance to check
 * @returns true if progress logs should be output, false otherwise
 *
 * @remarks
 * - Used only for process.stderr.write() calls, not for logger.info()
 * - If the logger has a 'level' property, checks if it's 'debug' or 'info'
 * - If no 'level' property exists, assumes logging should be enabled
 *
 * @example
 * ```typescript
 * const logger = new ConsoleLogger('warn');
 * shouldProgressLog(logger); // false (warn > info)
 *
 * const debugLogger = new ConsoleLogger('debug');
 * shouldProgressLog(debugLogger); // true (debug <= info)
 * ```
 */
export function shouldProgressLog(logger: Logger): boolean {
  if ('level' in logger && typeof logger.level === 'string') {
    const level = logger.level as string;
    return level === 'debug' || level === 'info';
  }
  return true;
}

/**
 * Configuration for creating a fetch function with progress tracking.
 *
 * @remarks
 * This interface defines all options needed to create a custom fetch wrapper
 * that monitors download progress. It supports both automatic logging (via logger)
 * and custom callbacks for UI integration.
 *
 * @example Basic usage with logging
 * ```typescript
 * const customFetch = createFetchWithProgress({
 *   logger: myLogger,
 *   enableProgressLog: true,
 * });
 * ```
 *
 * @example With callbacks for UI updates
 * ```typescript
 * const customFetch = createFetchWithProgress({
 *   logger: myLogger,
 *   enableProgressLog: false, // Disable automatic logging
 *   onProgress: (received, total, percentage) => {
 *     updateProgressBar(percentage);
 *   },
 * });
 * ```
 */
export interface FetchWithProgressConfig {
  /**
   * Logger instance for progress output.
   */
  logger: Logger;

  /**
   * Whether to log progress to the logger.
   */
  enableProgressLog: boolean;

  /**
   * Optional callback when download starts.
   *
   * @param estimatedTotal - Estimated total size in bytes
   * @param limit - Number of items being fetched
   * @param prepareTime - Time spent on request/headers in seconds
   */
  onProgressStart?: (
    estimatedTotal: number,
    limit: number,
    prepareTime: number,
  ) => void;

  /**
   * Optional callback for progress updates.
   *
   * @param received - Number of bytes received so far
   * @param total - Total number of bytes (estimated or from Content-Length)
   * @param percentage - Download progress percentage (0-100)
   */
  onProgress?: (received: number, total: number, percentage: number) => void;

  /**
   * Optional callback when download completes.
   *
   * @param received - Total number of bytes received
   * @param estimatedTotal - Estimated total size in bytes
   * @param downloadTime - Time spent downloading body in seconds
   * @param totalTime - Total time including preparation in seconds
   */
  onProgressComplete?: (
    received: number,
    estimatedTotal: number,
    downloadTime: number,
    totalTime: number,
  ) => void;
}

/**
 * Estimate total response size from URL parameters.
 *
 * Uses empirical data to estimate the total download size based on the
 * limit parameter in the query string.
 *
 * @param url - Request URL
 * @returns Estimated size in bytes and item count (both 0 if cannot estimate)
 */
function estimateTotalSize(url: string): {
  estimatedSize: number;
  itemCount: number;
} {
  try {
    const urlObj = new URL(url);
    const limitParam = urlObj.searchParams.get('limit');

    if (!limitParam) {
      return { estimatedSize: 0, itemCount: 0 };
    }

    const limit = parseInt(limitParam, 10);
    if (isNaN(limit) || limit <= 0) {
      return { estimatedSize: 0, itemCount: 0 };
    }

    // Average prototype size: approximately 2670 bytes per item
    // Based on 5,000 sample data from ProtoPedia API (13,350,369 bytes / 5,000 items)
    const AVERAGE_PROTOTYPE_SIZE = 2670;

    return {
      estimatedSize: limit * AVERAGE_PROTOTYPE_SIZE,
      itemCount: limit,
    };
  } catch (error) {
    return { estimatedSize: 0, itemCount: 0 };
  }
}

/**
 * Create a custom fetch function with download progress tracking.
 *
 * This factory function creates a fetch wrapper that monitors download progress
 * and provides real-time feedback through callbacks and/or logging. The returned
 * function is compatible with the standard fetch API signature.
 *
 * @param config - Configuration object containing logger and callback options
 * @returns A fetch-compatible function with progress tracking capabilities
 *
 * @remarks
 * The returned fetch function:
 * - Maintains the same signature as standard fetch
 * - Wraps response body with a ReadableStream that tracks bytes received
 * - Throttles progress updates to 500ms intervals to avoid overhead
 * - Automatically estimates download size based on URL parameters (limit × 2670 bytes)
 * - Works in both Node.js (using process.stderr for live updates) and browser environments
 *
 * Progress tracking behavior:
 * - If `enableProgressLog` is true and logger level is 'debug' or 'info', logs progress messages
 * - If callbacks are provided, calls them at appropriate times regardless of log level
 * - If neither logging nor callbacks are enabled, returns response without tracking overhead
 *
 * @example With progress logging
 * ```typescript
 * const customFetch = createFetchWithProgress({
 *   logger: myLogger,
 *   enableProgressLog: true,
 * });
 *
 * // Use like standard fetch
 * const response = await customFetch('https://api.example.com/data?limit=1000');
 * const data = await response.json();
 * ```
 *
 * @example With custom callbacks
 * ```typescript
 * let progressBar: ProgressBar;
 *
 * const customFetch = createFetchWithProgress({
 *   logger: myLogger,
 *   enableProgressLog: false,
 *   onProgressStart: (estimated, limit, prepareTime) => {
 *     progressBar = new ProgressBar({ total: estimated });
 *   },
 *   onProgress: (received, total, percentage) => {
 *     progressBar.update(percentage);
 *   },
 *   onProgressComplete: (received, estimated, downloadTime, totalTime) => {
 *     progressBar.complete();
 *     console.log(`Downloaded ${received} bytes in ${totalTime}s`);
 *   },
 * });
 * ```
 */
export function createFetchWithProgress(
  config: FetchWithProgressConfig,
): typeof fetch {
  const {
    logger,
    enableProgressLog,
    onProgressStart,
    onProgress,
    onProgressComplete,
  } = config;

  return async (url, init) => {
    // State for this request (reset for each request)
    let lastLoggedPercentage = -1;
    let lastLoggedReceived = 0;
    let lastLoggedTime = 0;
    let isEstimatedSize = false;
    let estimatedItemCount = 0;

    // Start timing before fetch call
    const downloadStartTime = Date.now();

    const response = await fetch(url, init);

    // Calculate preparation time (request + response headers)
    const bodyStartTime = Date.now();
    const prepareTime = ((bodyStartTime - downloadStartTime) / 1000).toFixed(2);

    // If no progress tracking is needed, return response as-is
    if (!enableProgressLog && !onProgress) {
      return response;
    }

    // Get Content-Length header to calculate progress
    const contentLength = response.headers.get('Content-Length');
    let total = contentLength ? parseInt(contentLength, 10) : 0;

    // Estimate item count from URL parameters for callbacks
    const estimation = estimateTotalSize(url.toString());
    estimatedItemCount = estimation.itemCount;

    // If Content-Length is not available, use estimation for total
    if (total === 0) {
      total = estimation.estimatedSize;
      isEstimatedSize = total > 0; // Mark as estimated if we got a value
    }

    // If no body, return response as-is
    if (!response.body) {
      return response;
    }

    // Log initial progress if estimated size is available
    if (
      enableProgressLog &&
      isEstimatedSize &&
      total > 0 &&
      shouldProgressLog(logger)
    ) {
      logger.info(
        `Download starting (limit=${estimatedItemCount}, estimated ~${total} bytes) (prepared in ${prepareTime}s)`,
      );
      // Don't set lastLoggedTime here - let first chunk log immediately
    }

    // Call progress start callback if provided (always call when we have info)
    if (onProgressStart && total > 0) {
      onProgressStart(total, estimatedItemCount, parseFloat(prepareTime));
    }

    // Create a new ReadableStream that monitors progress
    const reader = response.body.getReader();
    let received = 0;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              // Finish progress logging
              const totalElapsedMs = Date.now() - downloadStartTime;
              const totalElapsedSeconds = (totalElapsedMs / 1000).toFixed(2);
              const bodyElapsedMs = Date.now() - bodyStartTime;
              const bodyElapsedSeconds = (bodyElapsedMs / 1000).toFixed(2);

              if (enableProgressLog && shouldProgressLog(logger)) {
                // Show final progress (always output, regardless of time)
                const message = isEstimatedSize
                  ? `Download complete: ${received} bytes received (estimated ${total} bytes) in ${bodyElapsedSeconds}s (total: ${totalElapsedSeconds}s)`
                  : `Download complete: ${received} / ${total} bytes received in ${bodyElapsedSeconds}s (total: ${totalElapsedSeconds}s)`;

                // In Node.js, overwrite the progress line with \r; in browsers, use logger
                if (typeof process !== 'undefined' && process.stderr?.write) {
                  process.stderr.write(`\r${message}\n`);
                } else {
                  logger.info(message);
                }
              }

              // Call progress complete callback if provided
              onProgressComplete?.(
                received,
                total,
                parseFloat(bodyElapsedSeconds),
                parseFloat(totalElapsedSeconds),
              );

              controller.close();
              break;
            }

            received += value.length;

            // Notify progress with time-based throttling (500ms)
            const percentage = total > 0 ? (received / total) * 100 : 0;
            const now = Date.now();
            const timeElapsed = now - lastLoggedTime;
            const isFirstLog = lastLoggedTime === 0;

            if (isFirstLog || timeElapsed >= 500) {
              // Log progress if enabled
              if (enableProgressLog && shouldProgressLog(logger)) {
                const delta = received - lastLoggedReceived;
                const estimatedNote =
                  isEstimatedSize && isFirstLog ? ' (estimated)' : '';
                const message = `Download progress: ${percentage.toFixed(1)}%${estimatedNote} (${received} / ${total} bytes, +${delta})`;

                // Write to stderr with \r to overwrite the same line (Node.js only)
                if (typeof process !== 'undefined' && process.stderr?.write) {
                  process.stderr.write(`\r${message}`);
                } else {
                  logger.info(message);
                }
              }

              // Call progress callback if provided
              onProgress?.(received, total, percentage);

              lastLoggedPercentage = percentage;
              lastLoggedReceived = received;
              lastLoggedTime = now;
            }

            controller.enqueue(value);
          }
        } catch (error) {
          controller.error(error);
        }
      },
    });

    // Create new response with monitored stream
    return new Response(stream, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  };
}
