import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { ConsoleLogger } from '../console-logger.js';

describe('ConsoleLogger - Edge Cases', () => {
  const originalConsole = { ...console };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore console
    Object.assign(console, originalConsole);
  });

  describe('console method availability', () => {
    it('handles missing console.debug gracefully', () => {
      // @ts-expect-error - Intentionally removing debug
      delete console.debug;

      const logger = new ConsoleLogger('debug');

      // Should not throw
      expect(() => {
        logger.debug('Test message', {});
      }).not.toThrow();
    });

    it('handles missing console.info gracefully', () => {
      // @ts-expect-error - Intentionally removing info
      delete console.info;

      const logger = new ConsoleLogger('info');

      // Should not throw
      expect(() => {
        logger.info('Test message', {});
      }).not.toThrow();
    });

    it('handles missing console.warn gracefully', () => {
      // @ts-expect-error - Intentionally removing warn
      delete console.warn;

      const logger = new ConsoleLogger('warn');

      // Should not throw
      expect(() => {
        logger.warn('Test message', {});
      }).not.toThrow();
    });

    it('handles missing console.error gracefully', () => {
      // @ts-expect-error - Intentionally removing error
      delete console.error;

      const logger = new ConsoleLogger('error');

      // Should not throw
      expect(() => {
        logger.error('Test message', {});
      }).not.toThrow();
    });
  });

  describe('silent log level', () => {
    it('does not log when target level is silent', () => {
      const debugSpy = vi.spyOn(console, 'debug');
      const infoSpy = vi.spyOn(console, 'info');
      const warnSpy = vi.spyOn(console, 'warn');
      const errorSpy = vi.spyOn(console, 'error');

      const logger = new ConsoleLogger('info');

      // Try to log with 'silent' level (though not exposed in public API)
      // This tests the internal shouldLog method's silent handling

      logger.info('Test', {});
      expect(infoSpy).toHaveBeenCalled();

      // Change level to silent
      logger.level = 'silent';

      logger.debug('Test', {});
      logger.info('Test', {});
      logger.warn('Test', {});
      logger.error('Test', {});

      // Only the first info call should have been made
      expect(debugSpy).not.toHaveBeenCalled();
      expect(infoSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });
});
