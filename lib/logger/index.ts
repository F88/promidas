/**
 * Logger module for Promidas.
 *
 * This module provides logging utilities and types:
 * - {@link Logger} — Logger interface for custom logging implementations.
 * - {@link LogLevel} — Log level type for controlling verbosity.
 * - {@link ConsoleLogger} — Console-based logger class with mutable level.
 * - {@link createConsoleLogger} — Factory to create a console logger with default 'info' level.
 * - {@link createNoopLogger} — Factory to create a no-op logger.
 *
 * @example
 * ```typescript
 * // Using the factory (default 'info' level)
 * const logger = createConsoleLogger();
 * logger.info('Application started');
 * logger.level = 'debug'; // Change level dynamically
 * ```
 *
 * @example
 * ```typescript
 * // Using the constructor for specific level
 * const debugLogger = new ConsoleLogger('debug');
 * debugLogger.debug('Detailed debug info');
 * ```
 *
 * @example
 * ```typescript
 * // With Repository/Store (recommended pattern)
 * import { PromidasRepositoryBuilder } from '@f88/promidas';
 * const logger = createConsoleLogger();
 * const repo = new PromidasRepositoryBuilder()
 *   .setStoreConfig({ logger, logLevel: 'debug' })
 *   .setRepositoryConfig({ logger })
 *   .build();
 * ```
 *
 * @module
 */

export type { Logger, LogLevel } from './logger.types.js';
export { ConsoleLogger } from './console-logger.js';
export { createConsoleLogger, createNoopLogger } from './factory.js';
