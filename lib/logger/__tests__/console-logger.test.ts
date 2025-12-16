import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ConsoleLogger } from '../console-logger.js';
import type { LogLevel } from '../logger.types.js';

describe('ConsoleLogger', () => {
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

  describe('constructor', () => {
    it('can be instantiated with default level', () => {
      const logger = new ConsoleLogger();
      expect(logger.level).toBe('info');
    });

    it('can be instantiated with custom level', () => {
      const logger = new ConsoleLogger('debug');
      expect(logger.level).toBe('debug');
    });
  });

  describe('level property', () => {
    it('has mutable level property', () => {
      const logger = new ConsoleLogger('info');
      expect(logger.level).toBe('info');

      logger.level = 'debug';
      expect(logger.level).toBe('debug');

      logger.level = 'error';
      expect(logger.level).toBe('error');
    });

    it('respects level changes for filtering', () => {
      const logger = new ConsoleLogger('info');

      logger.debug('Should not log');
      expect(debugSpy).not.toHaveBeenCalled();

      logger.level = 'debug';
      logger.debug('Should log');
      expect(debugSpy).toHaveBeenCalledOnce();

      logger.level = 'error';
      debugSpy.mockClear();
      logger.debug('Should not log again');
      expect(debugSpy).not.toHaveBeenCalled();
    });
  });

  describe('log levels', () => {
    describe('debug level', () => {
      it('logs all message levels', () => {
        const logger = new ConsoleLogger('debug');
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
        const logger = new ConsoleLogger('debug');
        logger.debug('Debug with meta', { key: 'value' });
        expect(debugSpy).toHaveBeenCalledWith('[DEBUG] Debug with meta', {
          key: 'value',
        });
      });
    });

    describe('warn level', () => {
      it('does not log debug or info messages', () => {
        const logger = new ConsoleLogger('warn');
        logger.debug('Debug');
        logger.info('Info');

        expect(debugSpy).not.toHaveBeenCalled();
        expect(infoSpy).not.toHaveBeenCalled();
      });

      it('logs warn and error messages', () => {
        const logger = new ConsoleLogger('warn');
        logger.warn('Warn');
        logger.error('Error');

        expect(warnSpy).toHaveBeenCalledOnce();
        expect(errorSpy).toHaveBeenCalledOnce();
      });
    });

    describe('error level', () => {
      it('only logs error messages', () => {
        const logger = new ConsoleLogger('error');
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
        const logger = new ConsoleLogger('silent');
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

    describe('level hierarchy validation', () => {
      const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'silent'];

      levels.forEach((level, index) => {
        it(`level ${level} respects hierarchy`, () => {
          const logger = new ConsoleLogger(level);

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

  describe('metadata handling', () => {
    it('merges object metadata with level', () => {
      const logger = new ConsoleLogger('info');
      logger.info('Message', { userId: 123, action: 'login' });
      expect(infoSpy).toHaveBeenCalledWith('[INFO] Message', {
        userId: 123,
        action: 'login',
      });
    });

    it('wraps primitive metadata', () => {
      const logger = new ConsoleLogger('info');
      logger.info('Message', 'string meta');
      expect(infoSpy).toHaveBeenCalledWith('[INFO] Message', 'string meta');
    });

    it('wraps number metadata', () => {
      const logger = new ConsoleLogger('info');
      logger.info('Message', 42);
      expect(infoSpy).toHaveBeenCalledWith('[INFO] Message', 42);
    });

    it('wraps boolean metadata', () => {
      const logger = new ConsoleLogger('info');
      logger.info('Message', true);
      expect(infoSpy).toHaveBeenCalledWith('[INFO] Message', true);
    });

    it('wraps null metadata', () => {
      const logger = new ConsoleLogger('info');
      logger.info('Message', null);
      expect(infoSpy).toHaveBeenCalledWith('[INFO] Message', null);
    });

    it('handles undefined metadata', () => {
      const logger = new ConsoleLogger('info');
      logger.info('Message', undefined);
      expect(infoSpy).toHaveBeenCalledWith('[INFO] Message');
    });

    it('handles no metadata parameter', () => {
      const logger = new ConsoleLogger('info');
      logger.info('Message');
      expect(infoSpy).toHaveBeenCalledWith('[INFO] Message');
    });

    it('merges nested object metadata', () => {
      const logger = new ConsoleLogger('warn');
      logger.warn('Warning', {
        error: { code: 'ERR_001', message: 'Failed' },
      });
      expect(warnSpy).toHaveBeenCalledWith('[WARN] Warning', {
        error: { code: 'ERR_001', message: 'Failed' },
      });
    });

    it('handles array metadata', () => {
      const logger = new ConsoleLogger('error');
      logger.error('Error', [1, 2, 3]);
      expect(errorSpy).toHaveBeenCalledWith('[ERROR] Error', [1, 2, 3]);
    });

    it('wraps Error objects instead of merging', () => {
      const logger = new ConsoleLogger('error');
      const error = new Error('Test Error');
      logger.error('Failed', error);
      expect(errorSpy).toHaveBeenCalledWith('[ERROR] Failed', error);
    });

    it('wraps Date objects instead of merging', () => {
      const logger = new ConsoleLogger('info');
      const date = new Date('2024-01-01');
      logger.info('Time', date);
      expect(infoSpy).toHaveBeenCalledWith('[INFO] Time', date);
    });

    it('merges objects created with Object.create(null)', () => {
      const logger = new ConsoleLogger('info');
      const meta = Object.create(null);
      meta.key = 'value';
      logger.info('Null proto', meta);
      expect(infoSpy).toHaveBeenCalledWith('[INFO] Null proto', {
        key: 'value',
      });
    });
  });

  describe('multiple calls', () => {
    it('handles multiple calls to same level', () => {
      const logger = new ConsoleLogger('info');
      logger.info('First');
      logger.info('Second');
      logger.info('Third');

      expect(infoSpy).toHaveBeenCalledTimes(3);
    });

    it('handles mixed level calls', () => {
      const logger = new ConsoleLogger('debug');
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

  describe('edge cases', () => {
    it('handles empty string message', () => {
      const logger = new ConsoleLogger('info');
      logger.info('');
      expect(infoSpy).toHaveBeenCalledWith('[INFO] ');
    });

    it('handles very long messages', () => {
      const logger = new ConsoleLogger('info');
      const longMessage = 'x'.repeat(10000);
      logger.info(longMessage);
      expect(infoSpy).toHaveBeenCalledWith(`[INFO] ${longMessage}`);
    });

    it('handles special characters in message', () => {
      const logger = new ConsoleLogger('info');
      const specialMessage = '🎉 \n\t\r Special "chars" \'test\'';
      logger.info(specialMessage);
      expect(infoSpy).toHaveBeenCalledWith(`[INFO] ${specialMessage}`);
    });

    it('handles metadata with circular references gracefully', () => {
      const logger = new ConsoleLogger('info');
      const circular: any = { a: 1 };
      circular.self = circular;

      expect(() => {
        logger.info('Message', circular);
      }).not.toThrow();
    });

    it('wraps array metadata without spreading', () => {
      const logger = new ConsoleLogger('info');
      const arrayMeta = ['item1', 'item2', 'item3'];
      logger.info('Array test', arrayMeta);
      expect(infoSpy).toHaveBeenCalledWith('[INFO] Array test', arrayMeta);
    });

    it('wraps non-plain objects without spreading', () => {
      const logger = new ConsoleLogger('info');
      class CustomClass {
        value = 42;
      }
      const customInstance = new CustomClass();
      logger.info('Custom class', customInstance);
      expect(infoSpy).toHaveBeenCalledWith(
        '[INFO] Custom class',
        customInstance,
      );
    });

    it('wraps primitive metadata values', () => {
      const logger = new ConsoleLogger('info');

      logger.info('String meta', 'value');
      expect(infoSpy).toHaveBeenCalledWith('[INFO] String meta', 'value');

      infoSpy.mockClear();
      logger.info('Number meta', 42);
      expect(infoSpy).toHaveBeenCalledWith('[INFO] Number meta', 42);

      infoSpy.mockClear();
      logger.info('Boolean meta', true);
      expect(infoSpy).toHaveBeenCalledWith('[INFO] Boolean meta', true);
    });

    it('handles objects with null prototype', () => {
      const logger = new ConsoleLogger('info');
      const nullProtoObj = Object.create(null);
      nullProtoObj.key = 'value';
      nullProtoObj.num = 123;
      logger.info('Null proto test', nullProtoObj);
      expect(infoSpy).toHaveBeenCalledWith('[INFO] Null proto test', {
        key: 'value',
        num: 123,
      });
    });
  });
});
