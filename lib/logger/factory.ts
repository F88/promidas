/**
 * Logger factory functions.
 *
 * This module provides factory functions for creating logger instances:
 * - {@link createConsoleLogger} — Creates a console-based logger with default 'info' level
 * - {@link createNoopLogger} — Creates a no-op logger for testing/production
 *
 * @module
 */

import { ConsoleLogger } from './console-logger.js';
import type { Logger } from './logger.types.js';

/**
 * Create a console-based logger with default 'info' level.
 *
 * @returns ConsoleLogger instance with 'info' level
 *
 * @remarks
 * **When to use each approach:**
 * 1. `createConsoleLogger()` - Best for most cases, especially with Repository/Store
 * 2. `new ConsoleLogger(level)` - When you need a specific level at creation
 * 3. `logger.level = level` - When you need to change level dynamically
 *
 * @example
 * ```typescript
 * // Recommended: Use with Repository/Store
 * const logger = createConsoleLogger();
 * const repo = new PromidasRepositoryBuilder()
 *   .setSharedLogger(logger)
 *   .setDefaultLogLevel('debug')
 *   .setApiClientConfig({
 *     protoPediaApiClientOptions: { token: process.env.PROTOPEDIA_API_V2_TOKEN }
 *   })
 *   .build();
 * ```
 *
 * @example
 * ```typescript
 * // Default level ('info')
 * const logger = createConsoleLogger();
 * logger.info('Application started'); // Logged
 * logger.debug('Debug info'); // Not logged (debug < info)
 * ```
 *
 * @example
 * ```typescript
 * // Change level dynamically
 * const logger = createConsoleLogger();
 * logger.level = 'debug';
 * logger.debug('Now this is logged');
 * ```
 *
 * @example
 * ```typescript
 * // If you need a specific level at creation time:
 * const logger = new ConsoleLogger('debug');
 * ```
 */
export const createConsoleLogger = (): ConsoleLogger => {
  return new ConsoleLogger('info');
};

/**
 * Create a no-op logger (for testing or silent mode).
 *
 * All logging methods do nothing and return immediately.
 * This is useful for:
 * - Unit tests (suppress log output)
 * - Production environments (completely disable logging)
 * - Performance-critical code (zero logging overhead)
 *
 * @returns Logger that does nothing
 *
 * @example
 * ```typescript
 * // Use in tests
 * const logger = createNoopLogger();
 * logger.error('This will not be logged');
 * logger.info('Neither will this');
 * ```
 *
 * @example
 * ```typescript
 * // Conditional logger selection
 * const logger = process.env.ENABLE_LOGGING === 'true'
 *   ? createConsoleLogger()
 *   : createNoopLogger();
 * ```
 */
export const createNoopLogger = (): Logger => ({
  error: () => {},
  warn: () => {},
  info: () => {},
  debug: () => {},
});
