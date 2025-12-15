/**
 * Log levels supported by PROMIDAS loggers.
 *
 * @remarks
 * Levels are ordered from most verbose to least verbose:
 * - debug: Detailed information for debugging
 * - info: General informational messages
 * - warn: Warning messages
 * - error: Error messages
 * - silent: No logging output
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

/**
 * Logger interface for PROMIDAS.
 *
 * This interface is compatible with protopedia-api-v2-client Logger.
 * Follows the Fastify/NestJS pattern where log level is managed separately.
 *
 * @remarks
 * - Universal: works in Browser, Node.js, and Edge environments
 * - Level is managed externally (not part of the interface)
 * - Default implementation uses `console` (universal)
 * - Compatible with protopedia-api-v2-client Logger instances
 *
 * @example
 * ```typescript
 * const logger = createConsoleLogger();
 * logger.debug('Debug message', { userId: 123 });
 * ```
 */
export interface Logger {
  /**
   * Log error messages (highest priority).
   */
  error: (message: string, meta?: unknown) => void;

  /**
   * Log warning messages.
   */
  warn: (message: string, meta?: unknown) => void;

  /**
   * Log informational messages.
   */
  info: (message: string, meta?: unknown) => void;

  /**
   * Log debug messages (lowest priority).
   */
  debug: (message: string, meta?: unknown) => void;
}
