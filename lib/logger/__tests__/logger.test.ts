import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createConsoleLogger, createNoopLogger } from '../logger.js';
import type { LogLevel } from '../logger.types.js';

describe('logger', () => {
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
        expect(infoSpy).toHaveBeenCalledWith('Info message', {
          level: 'info',
        });
      });

      it('logs warn messages', () => {
        const logger = createConsoleLogger();
        logger.warn('Warn message');
        expect(warnSpy).toHaveBeenCalledWith('Warn message', {
          level: 'warn',
        });
      });

      it('logs error messages', () => {
        const logger = createConsoleLogger();
        logger.error('Error message');
        expect(errorSpy).toHaveBeenCalledWith('Error message', {
          level: 'error',
        });
      });
    });

    describe('debug level', () => {
      it('logs all message levels', () => {
        const logger = createConsoleLogger('debug');
        logger.debug('Debug');
        logger.info('Info');
        logger.warn('Warn');
        logger.error('Error');

        expect(debugSpy).toHaveBeenCalledOnce();
        expect(infoSpy).toHaveBeenCalledOnce();
        expect(warnSpy).toHaveBeenCalledOnce();
        expect(errorSpy).toHaveBeenCalledOnce();
      });

      it('includes metadata in debug logs', () => {
        const logger = createConsoleLogger('debug');
        logger.debug('Debug with meta', { key: 'value' });
        expect(debugSpy).toHaveBeenCalledWith('Debug with meta', {
          level: 'debug',
          key: 'value',
        });
      });
    });

    describe('warn level', () => {
      it('does not log debug or info messages', () => {
        const logger = createConsoleLogger('warn');
        logger.debug('Debug');
        logger.info('Info');

        expect(debugSpy).not.toHaveBeenCalled();
        expect(infoSpy).not.toHaveBeenCalled();
      });

      it('logs warn and error messages', () => {
        const logger = createConsoleLogger('warn');
        logger.warn('Warn');
        logger.error('Error');

        expect(warnSpy).toHaveBeenCalledOnce();
        expect(errorSpy).toHaveBeenCalledOnce();
      });
    });

    describe('error level', () => {
      it('only logs error messages', () => {
        const logger = createConsoleLogger('error');
        logger.debug('Debug');
        logger.info('Info');
        logger.warn('Warn');
        logger.error('Error');

        expect(debugSpy).not.toHaveBeenCalled();
        expect(infoSpy).not.toHaveBeenCalled();
        expect(warnSpy).not.toHaveBeenCalled();
        expect(errorSpy).toHaveBeenCalledOnce();
      });
    });

    describe('silent level', () => {
      it('does not log any messages', () => {
        const logger = createConsoleLogger('silent');
        logger.debug('Debug');
        logger.info('Info');
        logger.warn('Warn');
        logger.error('Error');

        expect(debugSpy).not.toHaveBeenCalled();
        expect(infoSpy).not.toHaveBeenCalled();
        expect(warnSpy).not.toHaveBeenCalled();
        expect(errorSpy).not.toHaveBeenCalled();
      });
    });

    describe('metadata handling', () => {
      it('merges object metadata with level', () => {
        const logger = createConsoleLogger('info');
        logger.info('Message', { userId: 123, action: 'login' });
        expect(infoSpy).toHaveBeenCalledWith('Message', {
          level: 'info',
          userId: 123,
          action: 'login',
        });
      });

      it('wraps primitive metadata', () => {
        const logger = createConsoleLogger('info');
        logger.info('Message', 'string meta');
        expect(infoSpy).toHaveBeenCalledWith('Message', {
          level: 'info',
          meta: 'string meta',
        });
      });

      it('wraps number metadata', () => {
        const logger = createConsoleLogger('info');
        logger.info('Message', 42);
        expect(infoSpy).toHaveBeenCalledWith('Message', {
          level: 'info',
          meta: 42,
        });
      });

      it('wraps boolean metadata', () => {
        const logger = createConsoleLogger('info');
        logger.info('Message', true);
        expect(infoSpy).toHaveBeenCalledWith('Message', {
          level: 'info',
          meta: true,
        });
      });

      it('wraps null metadata', () => {
        const logger = createConsoleLogger('info');
        logger.info('Message', null);
        expect(infoSpy).toHaveBeenCalledWith('Message', {
          level: 'info',
          meta: null,
        });
      });

      it('handles undefined metadata', () => {
        const logger = createConsoleLogger('info');
        logger.info('Message', undefined);
        expect(infoSpy).toHaveBeenCalledWith('Message', {
          level: 'info',
          meta: undefined,
        });
      });

      it('handles no metadata parameter', () => {
        const logger = createConsoleLogger('info');
        logger.info('Message');
        expect(infoSpy).toHaveBeenCalledWith('Message', {
          level: 'info',
          meta: undefined,
        });
      });

      it('merges nested object metadata', () => {
        const logger = createConsoleLogger('warn');
        logger.warn('Warning', {
          error: { code: 'ERR_001', message: 'Failed' },
        });
        expect(warnSpy).toHaveBeenCalledWith('Warning', {
          level: 'warn',
          error: { code: 'ERR_001', message: 'Failed' },
        });
      });

      it('handles array metadata', () => {
        const logger = createConsoleLogger('error');
        logger.error('Error', [1, 2, 3]);
        expect(errorSpy).toHaveBeenCalledWith('Error', {
          level: 'error',
          meta: [1, 2, 3],
        });
      });
    });

    describe('multiple calls', () => {
      it('handles multiple calls to same level', () => {
        const logger = createConsoleLogger('info');
        logger.info('First');
        logger.info('Second');
        logger.info('Third');

        expect(infoSpy).toHaveBeenCalledTimes(3);
      });

      it('handles mixed level calls', () => {
        const logger = createConsoleLogger('debug');
        logger.debug('1');
        logger.info('2');
        logger.warn('3');
        logger.error('4');
        logger.debug('5');

        expect(debugSpy).toHaveBeenCalledTimes(2);
        expect(infoSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(errorSpy).toHaveBeenCalledTimes(1);
      });
    });

    describe('level hierarchy validation', () => {
      const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'silent'];

      levels.forEach((level, index) => {
        it(`level ${level} respects hierarchy`, () => {
          const logger = createConsoleLogger(level);

          logger.debug('test');
          logger.info('test');
          logger.warn('test');
          logger.error('test');

          const shouldLogDebug = index <= 0;
          const shouldLogInfo = index <= 1;
          const shouldLogWarn = index <= 2;
          const shouldLogError = index <= 3;

          expect(debugSpy).toHaveBeenCalledTimes(shouldLogDebug ? 1 : 0);
          expect(infoSpy).toHaveBeenCalledTimes(shouldLogInfo ? 1 : 0);
          expect(warnSpy).toHaveBeenCalledTimes(shouldLogWarn ? 1 : 0);
          expect(errorSpy).toHaveBeenCalledTimes(shouldLogError ? 1 : 0);

          debugSpy.mockClear();
          infoSpy.mockClear();
          warnSpy.mockClear();
          errorSpy.mockClear();
        });
      });
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

    it('both logger types have level property', () => {
      const consoleLogger = createConsoleLogger('warn');
      const noopLogger = createNoopLogger();

      expect(typeof consoleLogger.debug).toBe('function');
      expect(typeof noopLogger.debug).toBe('function');
    });
  });

  describe('edge cases', () => {
    let infoSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    });

    afterEach(() => {
      infoSpy.mockRestore();
    });

    it('handles empty string message', () => {
      const logger = createConsoleLogger('info');
      logger.info('');
      expect(infoSpy).toHaveBeenCalledWith('', { level: 'info' });
    });

    it('handles very long messages', () => {
      const logger = createConsoleLogger('info');
      const longMessage = 'x'.repeat(10000);
      logger.info(longMessage);
      expect(infoSpy).toHaveBeenCalledWith(longMessage, { level: 'info' });
    });

    it('handles special characters in message', () => {
      const logger = createConsoleLogger('info');
      const specialMessage = '🎉 \n\t\r Special "chars" \'test\'';
      logger.info(specialMessage);
      expect(infoSpy).toHaveBeenCalledWith(specialMessage, { level: 'info' });
    });

    it('handles metadata with circular references gracefully', () => {
      const logger = createConsoleLogger('info');
      const circular: any = { a: 1 };
      circular.self = circular;

      expect(() => {
        logger.info('Message', circular);
      }).not.toThrow();
    });
  });
});
