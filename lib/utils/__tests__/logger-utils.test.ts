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

    it('should redact fields containing "token" as substring', () => {
      const data = {
        tokenizer: 'value', // Should not be redacted (doesn't mean sensitive) - wait, our logic includes 'token', so 'tokenizer' contains 'token'. It WILL be redacted.
        // If we want to avoid 'tokenizer', we should be more specific. But for now, substring match is safer.
        accessToken: 'value',
      };
      const sanitized = sanitizeDataForLogging(data);
      expect(sanitized).toEqual({
        tokenizer: '***',
        accessToken: '***',
      });
    });

    it('should redact other sensitive keywords (password, secret, credential)', () => {
      const data = {
        userPassword: '123',
        clientSecret: 'abc',
        myCredentials: 'xyz',
        publicId: '1',
      };
      const sanitized = sanitizeDataForLogging(data);
      expect(sanitized).toEqual({
        userPassword: '***',
        clientSecret: '***',
        myCredentials: '***',
        publicId: '1',
      });
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

    it('should handle circular references gracefully', () => {
      const obj: any = { a: 1 };
      obj.self = obj;

      const sanitized = sanitizeDataForLogging(obj) as any;
      expect(sanitized.a).toBe(1);
      expect(sanitized.self).toBe('[Circular]');
    });

    it('should preserve non-serializable values as strings', () => {
      const data = {
        func: () => {},
        namedFunc: function test() {},
        sym: Symbol('test'),
        bigint: 123n,
      };
      const sanitized = sanitizeDataForLogging(data) as any;

      expect(sanitized.func).toContain('[Function');
      expect(sanitized.namedFunc).toBe('[Function: test]');
      expect(sanitized.sym).toBe('Symbol(test)');
      expect(sanitized.bigint).toBe('123n');
    });

    it('should prevent prototype pollution by skipping dangerous keys', () => {
      // Create object with dangerous keys as own properties using Object.defineProperty
      // to ensure they are enumerable own properties, not inherited
      const maliciousData: any = {
        normalKey: 'value',
        safeKey: 'safe',
      };

      // Manually add dangerous keys using Object.defineProperty to make them enumerable
      Object.defineProperty(maliciousData, 'constructor', {
        value: { dangerous: true },
        enumerable: true,
        configurable: true,
      });
      Object.defineProperty(maliciousData, 'prototype', {
        value: { harmful: true },
        enumerable: true,
        configurable: true,
      });

      const sanitized = sanitizeDataForLogging(maliciousData) as any;

      expect(sanitized.normalKey).toBe('value');
      expect(sanitized.safeKey).toBe('safe');
      // These dangerous keys should be filtered out during sanitization
      expect(sanitized).not.toHaveProperty('constructor');
      expect(sanitized).not.toHaveProperty('prototype');
      // Verify that sanitized object doesn't have dangerous keys as own properties
      expect(Object.keys(sanitized)).not.toContain('constructor');
      expect(Object.keys(sanitized)).not.toContain('prototype');
    });

    it('should limit recursion depth to prevent stack overflow', () => {
      // Create a deeply nested object (exactly at MAX_DEPTH = 100)
      let deepObj: any = { value: 'deep' };
      for (let i = 0; i < 100; i++) {
        deepObj = { nested: deepObj };
      }

      const sanitized = sanitizeDataForLogging(deepObj) as any;

      // Navigate through the sanitized object
      let current = sanitized;
      let depth = 0;
      while (current && typeof current === 'object' && current.nested) {
        current = current.nested;
        depth++;
      }

      // Should hit max depth and return '[Max Depth Exceeded]'
      expect(current).toBe('[Max Depth Exceeded]');
      // Depth should be exactly at MAX_DEPTH (100)
      expect(depth).toBe(100);
    });

    it('should handle case-insensitive sensitive key matching', () => {
      const data = {
        TOKEN: 'uppercase',
        Token: 'titlecase',
        token: 'lowercase',
        MyApiToken: 'mixed',
        API_PASSWORD: 'pw',
        secretKey: 'sk',
        UserCredential: 'uc',
        authHeader: 'ah',
      };

      const sanitized = sanitizeDataForLogging(data) as any;

      expect(sanitized.TOKEN).toBe('***');
      expect(sanitized.Token).toBe('***');
      expect(sanitized.token).toBe('***');
      expect(sanitized.MyApiToken).toBe('***');
      expect(sanitized.API_PASSWORD).toBe('***');
      expect(sanitized.secretKey).toBe('***');
      expect(sanitized.UserCredential).toBe('***');
      expect(sanitized.authHeader).toBe('***');
    });

    it('should handle deeply nested arrays and objects together', () => {
      const data = {
        users: [
          {
            name: 'Alice',
            auth: { password: 'alice-pw', token: 'alice-token' },
          },
          {
            name: 'Bob',
            auth: { password: 'bob-pw', apiKey: 'normal-key' },
          },
        ],
      };

      const sanitized = sanitizeDataForLogging(data) as any;

      expect(sanitized.users).toBeDefined();
      expect(sanitized.users[0]).toBeDefined();
      expect(sanitized.users[0].name).toBe('Alice');
      expect(sanitized.users[0].auth).toBe('***'); // 'auth' is a sensitive key
      expect(sanitized.users[1].name).toBe('Bob');
      expect(sanitized.users[1].auth).toBe('***'); // 'auth' is a sensitive key
    });

    it('should not sanitize inherited properties', () => {
      const proto = { inheritedToken: 'should-not-appear' };
      const obj = Object.create(proto);
      obj.ownToken = 'own-secret';
      obj.normalKey = 'value';

      const sanitized = sanitizeDataForLogging(obj) as any;

      expect(sanitized.ownToken).toBe('***');
      expect(sanitized.normalKey).toBe('value');
      // Inherited properties should not appear in sanitized output
      expect(sanitized.inheritedToken).toBeUndefined();
    });

    it('should handle empty objects and arrays', () => {
      expect(sanitizeDataForLogging({})).toEqual({});
      expect(sanitizeDataForLogging([])).toEqual([]);
    });

    it('should handle mixed circular and sensitive data', () => {
      const obj: any = {
        name: 'test',
        apiToken: 'secret',
        nested: {
          password: 'pw',
        },
      };
      obj.circular = obj;
      obj.nested.parent = obj;

      const sanitized = sanitizeDataForLogging(obj) as any;

      expect(sanitized.name).toBe('test');
      expect(sanitized.apiToken).toBe('***');
      expect(sanitized.nested.password).toBe('***');
      expect(sanitized.circular).toBe('[Circular]');
      expect(sanitized.nested.parent).toBe('[Circular]');
    });
  });
});
