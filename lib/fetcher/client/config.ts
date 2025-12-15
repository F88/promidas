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
};
