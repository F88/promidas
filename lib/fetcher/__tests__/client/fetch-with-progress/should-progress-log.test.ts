import { describe, expect, it } from 'vitest';

import { ConsoleLogger } from '../../../../logger/index.js';
import { shouldProgressLog } from '../../../client/fetch-with-progress.js';

describe('shouldProgressLog', () => {
  it('returns true when logger level is debug', () => {
    const logger = new ConsoleLogger('debug');
    expect(shouldProgressLog(logger)).toBe(true);
  });

  it('returns true when logger level is info', () => {
    const logger = new ConsoleLogger('info');
    expect(shouldProgressLog(logger)).toBe(true);
  });

  it('returns false when logger level is warn', () => {
    const logger = new ConsoleLogger('warn');
    expect(shouldProgressLog(logger)).toBe(false);
  });

  it('returns false when logger level is error', () => {
    const logger = new ConsoleLogger('error');
    expect(shouldProgressLog(logger)).toBe(false);
  });

  it('returns false when logger level is silent', () => {
    const logger = new ConsoleLogger('silent');
    expect(shouldProgressLog(logger)).toBe(false);
  });

  it('returns true when logger has no level property', () => {
    const customLogger = {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
    };
    expect(shouldProgressLog(customLogger)).toBe(true);
  });

  it('returns true when logger.level is not a string', () => {
    const customLogger = {
      level: 123, // Not a string
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
    };
    expect(shouldProgressLog(customLogger)).toBe(true);
  });
});
