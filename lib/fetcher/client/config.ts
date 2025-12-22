/**
 * Configuration types for ProtopediaApiCustomClient.
 *
 * @module
 */
import type { ProtoPediaApiClientOptions } from 'protopedia-api-v2-client';

import type { Logger, LogLevel } from '../../logger/index.js';
import type { FetchProgressEvent } from '../types/progress-event.types.js';

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
   * Download progress callback.
   *
   * Receives events for all phases of the fetch request lifecycle:
   * - `request-start`: Fired when fetch() is called
   * - `response-received`: Fired when response headers are received
   * - `download-progress`: Fired periodically during body download (throttled to 500ms)
   * - `complete`: Fired when download completes successfully
   *
   * @remarks
   * - All events are fired regardless of progressLog setting
   * - Use TypeScript's discriminated union for type-safe event handling
   * - Events are fired in order: request-start → response-received → download-progress (0+) → complete
   *
   * @example Complete lifecycle handling
   * ```typescript
   * const client = new ProtopediaApiCustomClient({
   *   progressCallback: (event) => {
   *     switch (event.type) {
   *       case 'request-start':
   *         console.log('🚀 Request initiated...');
   *         break;
   *       case 'response-received':
   *         console.log(`✓ Headers received (${event.prepareTimeMs}ms)`);
   *         console.log(`  Estimated: ${event.estimatedTotal} bytes`);
   *         break;
   *       case 'download-progress':
   *         console.log(`📥 ${event.percentage.toFixed(1)}%`);
   *         break;
   *       case 'complete':
   *         console.log(`✅ Complete (${event.totalTimeMs}ms total)`);
   *         break;
   *     }
   *   },
   * });
   * ```
   *
   * @example Progress bar integration
   * ```typescript
   * let progressBar: ProgressBar | null = null;
   *
   * const client = new ProtopediaApiCustomClient({
   *   progressCallback: (event) => {
   *     if (event.type === 'response-received') {
   *       progressBar = new ProgressBar({ total: event.estimatedTotal });
   *     } else if (event.type === 'download-progress' && progressBar) {
   *       progressBar.update(event.percentage);
   *     } else if (event.type === 'complete' && progressBar) {
   *       progressBar.finish();
   *     }
   *   },
   * });
   * ```
   */
  progressCallback?: (event: FetchProgressEvent) => void;
};
