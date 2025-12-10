import type { Logger, LogLevel } from './logger.types.js';

const levelOrder: LogLevel[] = ['debug', 'info', 'warn', 'error', 'silent'];

const shouldLog = (current: LogLevel, target: LogLevel): boolean => {
  return levelOrder.indexOf(target) >= levelOrder.indexOf(current);
};

const hasConsole = typeof console !== 'undefined';

export const createConsoleLogger = (level: LogLevel = 'info'): Logger => {
  const safeDebug =
    hasConsole && typeof console.debug === 'function'
      ? console.debug.bind(console)
      : undefined;
  const safeInfo =
    hasConsole && typeof console.info === 'function'
      ? console.info.bind(console)
      : undefined;
  const safeWarn =
    hasConsole && typeof console.warn === 'function'
      ? console.warn.bind(console)
      : undefined;
  const safeError =
    hasConsole && typeof console.error === 'function'
      ? console.error.bind(console)
      : undefined;

  return {
    debug: (message, meta) => {
      if (!shouldLog(level, 'debug') || !safeDebug) {
        return;
      }
      const payload =
        meta && typeof meta === 'object' && !Array.isArray(meta)
          ? { level: 'debug', ...(meta as Record<string, unknown>) }
          : { level: 'debug', meta };
      safeDebug(message, payload);
    },
    info: (message, meta) => {
      if (!shouldLog(level, 'info') || !safeInfo) {
        return;
      }
      const payload =
        meta && typeof meta === 'object'
          ? { level: 'info', ...(meta as Record<string, unknown>) }
          : { level: 'info', meta };
      safeInfo(message, payload);
    },
    warn: (message, meta) => {
      if (!shouldLog(level, 'warn') || !safeWarn) {
        return;
      }
      const payload =
        meta && typeof meta === 'object'
          ? { level: 'warn', ...(meta as Record<string, unknown>) }
          : { level: 'warn', meta };
      safeWarn(message, payload);
    },
    error: (message, meta) => {
      if (!shouldLog(level, 'error') || !safeError) {
        return;
      }
      const payload =
        meta && typeof meta === 'object'
          ? { level: 'error', ...(meta as Record<string, unknown>) }
          : { level: 'error', meta };
      safeError(message, payload);
    },
  };
};

export const createNoopLogger = (): Logger => ({
  debug: () => {
    // noop
  },
  info: () => {
    // noop
  },
  warn: () => {
    // noop
  },
  error: () => {
    // noop
  },
});
