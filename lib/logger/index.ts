/**
 * Logger module for Promidas.
 *
 * This module provides logging utilities and types:
 * - {@link Logger} — Logger interface for custom logging implementations.
 * - {@link LogLevel} — Log level type for controlling verbosity.
 * - {@link createConsoleLogger} — Factory to create a console-based logger.
 * - {@link createNoopLogger} — Factory to create a no-op logger.
 *
 * @module
 */

export type { Logger, LogLevel } from './logger.types.js';
export { createConsoleLogger, createNoopLogger } from './logger.js';
