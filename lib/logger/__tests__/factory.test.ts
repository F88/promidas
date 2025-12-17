import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ConsoleLogger } from '../console-logger.js';
import { createConsoleLogger, createNoopLogger } from '../factory.js';

describe('logger factories', () => {
  describe('createConsoleLogger', () => {
    let debugSpy: ReturnType<typeof vi.spyOn>;
    let infoSpy: ReturnType<typeof vi.spyOn>;
    let warnSpy: ReturnType<typeof vi.spyOn>;
    let errorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      debugSpy.mockRestore();
      infoSpy.mockRestore();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    });

    describe('default log level (info)', () => {
      it('does not log debug messages', () => {
        const logger = createConsoleLogger();
        logger.debug('Debug message');
        expect(debugSpy).not.toHaveBeenCalled();
      });

      it('logs info messages', () => {
        const logger = createConsoleLogger();
        logger.info('Info message');
        expect(infoSpy).toHaveBeenCalledWith('[INFO] Info message');
      });

      it('logs warn messages', () => {
        const logger = createConsoleLogger();
        logger.warn('Warn message');
        expect(warnSpy).toHaveBeenCalledWith('[WARN] Warn message');
      });

      it('logs error messages', () => {
        const logger = createConsoleLogger();
        logger.error('Error message');
        expect(errorSpy).toHaveBeenCalledWith('[ERROR] Error message');
      });
    });

    it('returns ConsoleLogger instance', () => {
      const logger = createConsoleLogger();
      expect(logger).toBeInstanceOf(ConsoleLogger);
    });

    it('creates logger with info level', () => {
      const logger = createConsoleLogger();
      expect(logger.level).toBe('info');
    });
  });

  describe('createNoopLogger', () => {
    let debugSpy: ReturnType<typeof vi.spyOn>;
    let infoSpy: ReturnType<typeof vi.spyOn>;
    let warnSpy: ReturnType<typeof vi.spyOn>;
    let errorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      debugSpy.mockRestore();
      infoSpy.mockRestore();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    });

    it('does not log any messages', () => {
      const logger = createNoopLogger();
      logger.debug('Debug');
      logger.info('Info');
      logger.warn('Warn');
      logger.error('Error');

      expect(debugSpy).not.toHaveBeenCalled();
      expect(infoSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('accepts metadata without errors', () => {
      const logger = createNoopLogger();
      expect(() => {
        logger.debug('Debug', { key: 'value' });
        logger.info('Info', 123);
        logger.warn('Warn', ['array']);
        logger.error('Error', null);
      }).not.toThrow();
    });

    it('handles multiple calls', () => {
      const logger = createNoopLogger();
      for (let i = 0; i < 100; i++) {
        logger.info('Message');
      }

      expect(infoSpy).not.toHaveBeenCalled();
    });

    it('returns undefined from all methods', () => {
      const logger = createNoopLogger();
      expect(logger.debug('test')).toBeUndefined();
      expect(logger.info('test')).toBeUndefined();
      expect(logger.warn('test')).toBeUndefined();
      expect(logger.error('test')).toBeUndefined();
    });
  });

  describe('logger interface consistency', () => {
    it('both logger types have same method signatures', () => {
      const consoleLogger = createConsoleLogger();
      const noopLogger = createNoopLogger();

      expect(typeof consoleLogger.debug).toBe('function');
      expect(typeof consoleLogger.info).toBe('function');
      expect(typeof consoleLogger.warn).toBe('function');
      expect(typeof consoleLogger.error).toBe('function');

      expect(typeof noopLogger.debug).toBe('function');
      expect(typeof noopLogger.info).toBe('function');
      expect(typeof noopLogger.warn).toBe('function');
      expect(typeof noopLogger.error).toBe('function');
    });

    it('ConsoleLogger has level property', () => {
      const consoleLogger = new ConsoleLogger('warn');
      expect(consoleLogger.level).toBe('warn');
    });
  });
});
