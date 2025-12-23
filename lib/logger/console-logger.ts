import type { Logger, LogLevel } from './logger.types.js';

const LEVEL_ORDER: LogLevel[] = ['debug', 'info', 'warn', 'error', 'silent'];

const getConsoleFn = (
  method: 'debug' | 'info' | 'warn' | 'error',
): ((message?: unknown, ...optionalParams: unknown[]) => void) | undefined => {
  const hasConsole = typeof console !== 'undefined';
  return hasConsole && typeof console[method] === 'function'
    ? console[method].bind(console)
    : undefined;
};

/**
 * Universal console-based logger.
 *
 * Works in Browser, Node.js, and Edge environments.
 * Safe for environments without `console` (silently skips logging).
 *
 * @remarks
 * - Implements the Logger interface with mutable `level` property
 * - Uses native console methods (console.error, console.warn, etc.)
 * - Respects the current log level for filtering output
 * - Level can be changed at runtime via the `level` property
 *
 * @example
 * ```typescript
 * // Create with specific level
 * const debugLogger = new ConsoleLogger('debug');
 * debugLogger.debug('Detailed info'); // Will be logged
 * ```
 *
 * @example
 * ```typescript
 * // Default level ('info')
 * const logger = new ConsoleLogger();
 * logger.debug('Not logged'); // debug < info
 * logger.info('Logged'); // info = info
 * ```
 *
 * @example
 * ```typescript
 * // Change level dynamically
 * const logger = new ConsoleLogger('error');
 * logger.info('Not logged'); // info < error
 * logger.level = 'info';
 * logger.info('Now logged'); // info = info
 * ```
 */
export class ConsoleLogger implements Logger {
  level: LogLevel;

  private readonly hasConsole: boolean;

  /**
   * Creates a new ConsoleLogger instance.
   *
   * @param level - Initial log level (default: 'info')
   *
   * @example
   * ```typescript
   * // Default level
   * const logger = new ConsoleLogger(); // 'info'
   * ```
   *
   * @example
   * ```typescript
   * // Specific level
   * const debugLogger = new ConsoleLogger('debug');
   * const errorLogger = new ConsoleLogger('error');
   * ```
   *
   * @example
   * ```typescript
   * // Level can be changed after creation
   * const logger = new ConsoleLogger('info');
   * logger.level = 'debug'; // Now shows debug logs
   * ```
   */
  constructor(level: LogLevel = 'info') {
    this.level = level;
    this.hasConsole = typeof console !== 'undefined';

    // Bind methods to preserve `this` when methods are passed around as callbacks.
    // Some upstream libraries call logger methods without a receiver.
    this.error = this.error.bind(this);
    this.warn = this.warn.bind(this);
    this.info = this.info.bind(this);
    this.debug = this.debug.bind(this);
  }

  error(message: string, meta?: unknown): void {
    this.log('error', message, meta, getConsoleFn('error'));
  }

  warn(message: string, meta?: unknown): void {
    this.log('warn', message, meta, getConsoleFn('warn'));
  }

  info(message: string, meta?: unknown): void {
    this.log('info', message, meta, getConsoleFn('info'));
  }

  debug(message: string, meta?: unknown): void {
    this.log('debug', message, meta, getConsoleFn('debug'));
  }

  private log(
    targetLevel: LogLevel,
    message: string,
    meta: unknown,
    consoleFn?: (message?: unknown, ...optionalParams: unknown[]) => void,
  ): void {
    if (!this.shouldLog(targetLevel) || !this.hasConsole || !consoleFn) {
      return;
    }

    const prefix = `[${targetLevel.toUpperCase()}]`;
    const formattedMessage = `${prefix} ${message}`;

    if (meta === undefined) {
      consoleFn(formattedMessage);
    } else {
      consoleFn(formattedMessage, meta);
    }
  }

  private shouldLog(target: LogLevel): boolean {
    if (this.level === 'silent') return false;
    return LEVEL_ORDER.indexOf(target) >= LEVEL_ORDER.indexOf(this.level);
  }
}
