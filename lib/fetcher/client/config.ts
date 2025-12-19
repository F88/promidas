/**
 * Configuration types for ProtopediaApiCustomClient.
 *
 * @module
 */
import type { ProtoPediaApiClientOptions } from 'protopedia-api-v2-client';

import type { Logger, LogLevel } from '../../logger/index.js';

/**
 * Configuration options for ProtopediaApiCustomClient.
 *
 * @example
 * ```typescript
 * // Pattern 1: logLevel only (creates ConsoleLogger internally)
 * const config1: ProtopediaApiCustomClientConfig = {
 *   protoPediaApiClientOptions: {
 *     token: process.env.PROTOPEDIA_API_TOKEN,
 *   },
 *   logLevel: 'debug',
 * };
 *
 * // Pattern 2: Custom logger with logLevel
 * import { createConsoleLogger } from '@f88/promidas/logger';
 * const config2: ProtopediaApiCustomClientConfig = {
 *   protoPediaApiClientOptions: {
 *     token: process.env.PROTOPEDIA_API_TOKEN,
 *   },
 *   logger: createConsoleLogger(),
 *   logLevel: 'warn', // Updates logger's level if mutable
 * };
 *
 * // Pattern 3: Custom logger only
 * const config3: ProtopediaApiCustomClientConfig = {
 *   protoPediaApiClientOptions: {
 *     token: process.env.PROTOPEDIA_API_TOKEN,
 *   },
 *   logger: createConsoleLogger(), // Uses logger's existing level
 * };
 * ```
 */
export type ProtopediaApiCustomClientConfig = {
  /**
   * Options passed to the underlying protopedia-api-v2-client.
   *
   * @remarks
   * This allows full control over the official client's configuration,
   * including token, baseUrl, fetch implementation, and timeout settings.
   */
  protoPediaApiClientOptions?: ProtoPediaApiClientOptions;

  /**
   * Custom logger instance.
   *
   * @remarks
   * - If provided, the logger will be used as-is
   * - If provided with logLevel, the level will be updated if logger is mutable
   * - If not provided, creates a ConsoleLogger with the specified logLevel
   *
   * @default undefined (creates ConsoleLogger with 'info' level)
   */
  logger?: Logger;

  /**
   * Log level for creating a default ConsoleLogger.
   *
   * @remarks
   * - Only used when `logger` is NOT provided
   * - Creates a new ConsoleLogger with this level
   * - If logger is provided and mutable, updates its level property
   *
   * @default 'info'
   */
  logLevel?: LogLevel;

  /**
   * Enable download progress logging.
   *
   * @remarks
   * - When enabled, logs download progress to logger
   * - Requires logger to be configured to show info level logs
   * - Useful for monitoring large data downloads on slow connections
   * - Works independently of progressCallback
   *
   * @default true
   */
  progressLog?: boolean;

  /**
   * Download progress callbacks.
   *
   * @remarks
   * - All callbacks are optional and work independently
   * - onStart: Called once when download begins (after HTTP headers received)
   * - onProgress: Called periodically during download (throttled to 500ms intervals)
   * - onComplete: Called once when download completes successfully
   * - Useful for updating UI progress indicators or custom logging
   * - Works independently of progressLog setting
   *
   * @example
   * ```typescript
   * const client = new ProtopediaApiCustomClient({
   *   progressCallback: {
   *     onStart: (estimatedTotal, limit, prepareTime) => {
   *       console.log(`Starting: ${estimatedTotal} bytes (estimated)`);
   *     },
   *     onProgress: (received, total, percentage) => {
   *       updateProgressBar(percentage);
   *     },
   *     onComplete: (received, estimatedTotal, downloadTime, totalTime) => {
   *       console.log(`Complete: ${received} bytes (${estimatedTotal} bytes estimated) in ${downloadTime}s (total ${totalTime}s)`);
   *     },
   *   },
   * });
   * ```
   */
  progressCallback?: {
    /**
     * Called when download starts, after HTTP headers are received.
     *
     * @param estimatedTotal - Estimated total bytes (limit × 2670)
     * @param limit - The limit parameter from the request
     * @param prepareTime - Time spent preparing (request + response headers) in seconds
     */
    onStart?: (
      estimatedTotal: number,
      limit: number,
      prepareTime: number,
    ) => void;

    /**
     * Called periodically during data download (throttled to 500ms intervals).
     *
     * @param received - Number of bytes received so far
     * @param total - Total number of bytes (0 if Content-Length header is missing)
     * @param percentage - Download percentage (0-100, 0 if total is unknown)
     */
    onProgress?: (received: number, total: number, percentage: number) => void;

    /**
     * Called when download completes successfully.
     *
     * @param received - Actual number of bytes received
     * @param estimatedTotal - Estimated total bytes (same as onStart)
     * @param downloadTime - Time spent downloading body in seconds
     * @param totalTime - Total time (prepare + download) in seconds
     */
    onComplete?: (
      received: number,
      estimatedTotal: number,
      downloadTime: number,
      totalTime: number,
    ) => void;
  };
};
