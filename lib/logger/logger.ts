import type { Logger, LogLevel } from './logger.types.js';

const levelOrder: LogLevel[] = ['debug', 'info', 'warn', 'error', 'silent'];

const shouldLog = (current: LogLevel, target: LogLevel): boolean => {
  return levelOrder.indexOf(target) >= levelOrder.indexOf(current);
};

const hasConsole = typeof console !== 'undefined';

const createPayload = (
  level: LogLevel,
  meta: unknown,
): Record<string, unknown> => {
  return meta && typeof meta === 'object' && !Array.isArray(meta)
    ? { level, ...(meta as Record<string, unknown>) }
    : { level, meta };
};

const createLogMethod = (
  currentLevel: LogLevel,
  targetLevel: LogLevel,
  consoleFn:
    | ((message?: unknown, ...optionalParams: unknown[]) => void)
    | undefined,
) => {
  return (message: string, meta?: unknown): void => {
    if (!shouldLog(currentLevel, targetLevel) || !consoleFn) {
      return;
    }
    consoleFn(message, createPayload(targetLevel, meta));
  };
};

const getConsoleFn = (
  method: 'debug' | 'info' | 'warn' | 'error',
): ((message?: unknown, ...optionalParams: unknown[]) => void) | undefined => {
  return hasConsole && typeof console[method] === 'function'
    ? console[method].bind(console)
    : undefined;
};

export const createConsoleLogger = (level: LogLevel = 'info'): Logger => {
  return {
    debug: createLogMethod(level, 'debug', getConsoleFn('debug')),
    info: createLogMethod(level, 'info', getConsoleFn('info')),
    warn: createLogMethod(level, 'warn', getConsoleFn('warn')),
    error: createLogMethod(level, 'error', getConsoleFn('error')),
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
