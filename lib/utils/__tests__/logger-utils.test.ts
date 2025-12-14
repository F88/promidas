import { describe, expect, it } from 'vitest';

import { sanitizeDataForLogging } from '../logger-utils.js';

describe('logger-utils', () => {
  describe('sanitizeDataForLogging', () => {
    it('should return null or primitive values as is', () => {
      expect(sanitizeDataForLogging(null)).toBeNull();
      expect(sanitizeDataForLogging(undefined)).toBeUndefined();
      expect(sanitizeDataForLogging(123)).toBe(123);
      expect(sanitizeDataForLogging('string')).toBe('string');
      expect(sanitizeDataForLogging(true)).toBe(true);
    });

    it('should redact "token" field in a flat object', () => {
      const data = {
        name: 'test',
        token: 'secret-token',
        id: 123,
      };
      const sanitized = sanitizeDataForLogging(data);
      expect(sanitized).toEqual({
        name: 'test',
        token: '***',
        id: 123,
      });
    });

    it('should redact "token" field in a nested object', () => {
      const data = {
        config: {
          api: {
            token: 'nested-secret',
            url: 'https://example.com',
          },
        },
      };
      const sanitized = sanitizeDataForLogging(data);
      expect(sanitized).toEqual({
        config: {
          api: {
            token: '***',
            url: 'https://example.com',
          },
        },
      });
    });

    it('should redact "token" field in arrays of objects', () => {
      const data = [
        { id: 1, token: 'secret-1' },
        { id: 2, token: 'secret-2' },
      ];
      const sanitized = sanitizeDataForLogging(data);
      expect(sanitized).toEqual([
        { id: 1, token: '***' },
        { id: 2, token: '***' },
      ]);
    });

    it('should not affect fields that contain "token" as substring', () => {
      const data = {
        tokenizer: 'value',
        accessToken: 'value', // Only exact 'token' match is redacted based on current implementation?
        // Let's verify the implementation. The current implementation checks key === 'token'.
        // So 'accessToken' should NOT be redacted.
      };
      const sanitized = sanitizeDataForLogging(data);
      expect(sanitized).toEqual(data);
    });

    it('should handle Error objects', () => {
      const error = new Error('Something went wrong');
      // @ts-expect-error Adding custom property for testing
      error.token = 'error-token';
      // @ts-expect-error Adding custom property for testing
      error.context = { token: 'context-token' };

      const sanitized = sanitizeDataForLogging(error) as any;

      expect(sanitized.message).toBe('Something went wrong');
      expect(sanitized.name).toBe('Error');
      expect(sanitized.stack).toBeDefined();
      expect(sanitized.token).toBe('***');
      expect(sanitized.context).toEqual({ token: '***' });
    });

    it('should handle circular references gracefully (by throwing JSON error currently)', () => {
      // The current implementation uses JSON.stringify/parse, so it will throw on circular refs.
      // This is acceptable for simple logging utils, but we should verify the behavior.
      const obj: any = { a: 1 };
      obj.self = obj;

      expect(() => sanitizeDataForLogging(obj)).toThrow();
    });
  });
});
