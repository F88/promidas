/**
 * @fileoverview Tests for handleApiError function - Network errors and edge cases
 *
 * This file is part of a test suite split by error type for better organization.
 * The implementation remains unified in handler.ts (218 lines, single function),
 * while tests are split into separate directories by input error type:
 *
 * proto-pedia-error/
 * - api-error.test.ts - ProtoPediaApiError handling
 *
 * not-proto-pedia-error/
 * - abort-error.test.ts - AbortError/timeout handling
 * - http-error.test.ts - HTTP-like errors with status property
 * - network-error.test.ts (this file) - Network errors and edge cases
 *
 * This split improves test maintainability without fragmenting the implementation.
 */

import { describe, expect, it } from 'vitest';

import {
  handleApiError,
  handleNotProtoPediaApiError,
} from '../../../../../utils/errors/handler.js';

describe('handleNotProtoPediaApiError', () => {
  describe('unexpected error handling', () => {
    it('maps unexpected Error to network error without status', () => {
      const error = new Error('Unexpected crash');
      const result = handleNotProtoPediaApiError(error);

      expect(result).toEqual({
        ok: false,
        origin: 'fetcher',
        kind: 'unknown',
        code: 'UNKNOWN',
        error: 'Unexpected crash',
        details: {},
      });
    });

    it('maps unexpected string to network error without status', () => {
      const result = handleNotProtoPediaApiError('Something went wrong');

      expect(result).toEqual({
        ok: false,
        origin: 'fetcher',
        kind: 'unknown',
        code: 'UNKNOWN',
        error: 'Failed to fetch prototypes',
        details: {},
      });
    });

    it('maps null to network error without status', () => {
      const result = handleNotProtoPediaApiError(null);

      expect(result).toEqual({
        ok: false,
        origin: 'fetcher',
        kind: 'unknown',
        code: 'UNKNOWN',
        error: 'Failed to fetch prototypes',
        details: {},
      });
    });

    it('maps undefined to network error without status', () => {
      const result = handleNotProtoPediaApiError(undefined);

      expect(result).toEqual({
        ok: false,
        origin: 'fetcher',
        kind: 'unknown',
        code: 'UNKNOWN',
        error: 'Failed to fetch prototypes',
        details: {},
      });
    });

    it('maps number to network error without status', () => {
      const result = handleNotProtoPediaApiError(404);

      expect(result).toEqual({
        ok: false,
        origin: 'fetcher',
        kind: 'unknown',
        code: 'UNKNOWN',
        error: 'Failed to fetch prototypes',
        details: {},
      });
    });

    it('includes empty details for unexpected errors without code', () => {
      const error = new Error('Network failure');
      const result = handleNotProtoPediaApiError(error);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.origin).toBe('fetcher');
        expect(result.kind).toBe('unknown');
        expect(result.code).toBe('UNKNOWN');
        expect(result.details).toEqual({});
      }
    });

    it('extracts code from error.code for network errors', () => {
      const error = Object.assign(new Error('getaddrinfo ENOTFOUND'), {
        code: 'ENOTFOUND',
        errno: -3008,
        syscall: 'getaddrinfo',
      });

      const result = handleNotProtoPediaApiError(error);

      expect(result).toEqual({
        ok: false,
        origin: 'fetcher',
        kind: 'network',
        code: 'ENOTFOUND',
        error: 'getaddrinfo ENOTFOUND',
        details: {
          res: {
            code: 'ENOTFOUND',
          },
        },
      });
    });

    it('extracts code from error.cause.code for Node.js fetch errors', () => {
      const error = Object.assign(new TypeError('fetch failed'), {
        cause: Object.assign(new Error('getaddrinfo ENOTFOUND example.com'), {
          code: 'ENOTFOUND',
          errno: -3008,
          syscall: 'getaddrinfo',
          hostname: 'example.com',
        }),
      });

      const result = handleNotProtoPediaApiError(error);

      expect(result).toEqual({
        ok: false,
        origin: 'fetcher',
        kind: 'network',
        code: 'ENOTFOUND',
        error: 'fetch failed',
        details: {
          res: {
            code: 'ENOTFOUND',
          },
        },
      });
    });

    it('handles ECONNREFUSED error with code', () => {
      const error = Object.assign(new Error('connect ECONNREFUSED'), {
        code: 'ECONNREFUSED',
        errno: -61,
        syscall: 'connect',
      });

      const result = handleNotProtoPediaApiError(error);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.origin).toBe('fetcher');
        expect(result.kind).toBe('network');
        expect(result.code).toBe('ECONNREFUSED');
        expect(result.status).toBeUndefined();
        expect(result.details?.res?.code).toBe('ECONNREFUSED');
      }
    });

    it('handles ETIMEDOUT error with code', () => {
      const error = Object.assign(new Error('connect ETIMEDOUT'), {
        code: 'ETIMEDOUT',
        errno: -60,
        syscall: 'connect',
      });

      const result = handleNotProtoPediaApiError(error);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.origin).toBe('fetcher');
        expect(result.kind).toBe('network');
        expect(result.code).toBe('ETIMEDOUT');
        expect(result.status).toBeUndefined();
        expect(result.details?.res?.code).toBe('ETIMEDOUT');
      }
    });

    it('prioritizes error.code over error.cause.code', () => {
      const error = Object.assign(new Error('Custom error'), {
        code: 'CUSTOM_CODE',
        cause: { code: 'CAUSE_CODE' },
      });

      const result = handleNotProtoPediaApiError(error);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.origin).toBe('fetcher');
        expect(result.kind).toBe('network');
        expect(result.code).toBe('CUSTOM_CODE');
        expect(result.details?.res?.code).toBe('CUSTOM_CODE');
      }
    });

    it('handles TypeError with proper error message', () => {
      const error = new TypeError('Cannot read property of undefined');
      const result = handleNotProtoPediaApiError(error);

      expect(result).toEqual({
        ok: false,
        origin: 'fetcher',
        kind: 'unknown',
        code: 'UNKNOWN',
        error: 'Cannot read property of undefined',
        details: {},
      });
    });

    it('handles RangeError with proper error message', () => {
      const error = new RangeError('Array length out of bounds');
      const result = handleNotProtoPediaApiError(error);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.origin).toBe('fetcher');
        expect(result.kind).toBe('unknown');
        expect(result.code).toBe('UNKNOWN');
        expect(result.status).toBeUndefined();
        expect(result.error).toBe('Array length out of bounds');
      }
    });

    it('handles Error with empty message', () => {
      const error = new Error('');
      const result = handleNotProtoPediaApiError(error);

      expect(result).toEqual({
        ok: false,
        origin: 'fetcher',
        kind: 'unknown',
        code: 'UNKNOWN',
        error: '',
        details: {},
      });
    });

    it('handles plain object without status', () => {
      const error = { message: 'Plain object error' };
      const result = handleNotProtoPediaApiError(error);

      expect(result).toEqual({
        ok: false,
        origin: 'fetcher',
        kind: 'unknown',
        code: 'UNKNOWN',
        error: 'Failed to fetch prototypes',
        details: {},
      });
    });

    it('maps browser fetch TypeError("Failed to fetch") to NETWORK_ERROR code', () => {
      const error = new TypeError('Failed to fetch');
      const result = handleNotProtoPediaApiError(error);

      expect(result).toEqual({
        ok: false,
        origin: 'fetcher',
        kind: 'cors',
        code: 'CORS_BLOCKED',
        error: 'Failed to fetch',
        details: {
          res: {
            code: 'NETWORK_ERROR',
          },
        },
      });
    });

    it.each([
      'fetch failed',
      'Load failed',
      'NetworkError when attempting to fetch resource.',
    ])('maps browser fetch TypeError(%s) to NETWORK_ERROR code', (message) => {
      const error = new TypeError(message);
      const result = handleNotProtoPediaApiError(error);

      expect(result).toEqual({
        ok: false,
        origin: 'fetcher',
        kind: 'cors',
        code: 'CORS_BLOCKED',
        error: message,
        details: {
          res: {
            code: 'NETWORK_ERROR',
          },
        },
      });
    });

    it('does not overwrite extracted code with NETWORK_ERROR', () => {
      const error = Object.assign(new TypeError('Failed to fetch'), {
        code: 'CUSTOM_CODE',
      });
      const result = handleNotProtoPediaApiError(error);

      expect(result).toEqual({
        ok: false,
        origin: 'fetcher',
        kind: 'network',
        code: 'CUSTOM_CODE',
        error: 'Failed to fetch',
        details: {
          res: {
            code: 'CUSTOM_CODE',
          },
        },
      });
    });

    it('handles array as error', () => {
      const error = ['error', 'occurred'];
      const result = handleApiError(error);

      expect(result).toEqual({
        ok: false,
        origin: 'fetcher',
        kind: 'unknown',
        code: 'UNKNOWN',
        error: 'Failed to fetch prototypes',
        details: {},
      });
    });

    it('handles function as error', () => {
      const error = () => 'error function';
      const result = handleApiError(error);

      expect(result).toEqual({
        ok: false,
        origin: 'fetcher',
        kind: 'unknown',
        code: 'UNKNOWN',
        error: 'Failed to fetch prototypes',
        details: {},
      });
    });

    it('handles symbol as error', () => {
      const error = Symbol('error');
      const result = handleApiError(error);

      expect(result).toEqual({
        ok: false,
        origin: 'fetcher',
        kind: 'unknown',
        code: 'UNKNOWN',
        error: 'Failed to fetch prototypes',
        details: {},
      });
    });

    it('handles boolean as error', () => {
      const result = handleApiError(false);

      expect(result).toEqual({
        ok: false,
        origin: 'fetcher',
        kind: 'unknown',
        code: 'UNKNOWN',
        error: 'Failed to fetch prototypes',
        details: {},
      });
    });

    it('handles RegExp as error', () => {
      const error = /error pattern/;
      const result = handleApiError(error);

      expect(result).toEqual({
        ok: false,
        origin: 'fetcher',
        kind: 'unknown',
        code: 'UNKNOWN',
        error: 'Failed to fetch prototypes',
        details: {},
      });
    });

    it('handles Date as error', () => {
      const error = new Date();
      const result = handleApiError(error);

      expect(result).toEqual({
        ok: false,
        origin: 'fetcher',
        kind: 'unknown',
        code: 'UNKNOWN',
        error: 'Failed to fetch prototypes',
        details: {},
      });
    });

    it('handles Map as error', () => {
      const error = new Map([['key', 'value']]);
      const result = handleApiError(error);

      expect(result).toEqual({
        ok: false,
        origin: 'fetcher',
        kind: 'unknown',
        code: 'UNKNOWN',
        error: 'Failed to fetch prototypes',
        details: {},
      });
    });

    it('handles Set as error', () => {
      const error = new Set([1, 2, 3]);
      const result = handleApiError(error);

      expect(result).toEqual({
        ok: false,
        origin: 'fetcher',
        kind: 'unknown',
        code: 'UNKNOWN',
        error: 'Failed to fetch prototypes',
        details: {},
      });
    });

    it('handles Promise as error', () => {
      const error = Promise.resolve('error');
      const result = handleApiError(error);

      expect(result).toEqual({
        ok: false,
        origin: 'fetcher',
        kind: 'unknown',
        code: 'UNKNOWN',
        error: 'Failed to fetch prototypes',
        details: {},
      });
    });

    it('handles circular reference object', () => {
      const error: any = { name: 'circular' };
      error.self = error;

      const result = handleApiError(error);

      expect(result).toEqual({
        ok: false,
        origin: 'fetcher',
        kind: 'unknown',
        code: 'UNKNOWN',
        error: 'Failed to fetch prototypes',
        details: {},
      });
    });
  });

  describe('edge cases', () => {
    it('handles DOMException that is not AbortError', () => {
      const domError = new DOMException('Invalid state', 'InvalidStateError');
      const result = handleApiError(domError);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.origin).toBe('fetcher');
        // DOMException has a numeric code property, so it's extracted as network
        expect(result.kind).toBe('network');
        expect(result.code).toBe(domError.code);
        expect(result.status).toBeUndefined();
        expect(result.error).toBe('Invalid state');
        expect(result.details.res?.code).toBe(domError.code);
      }
    });

    it('ignores status 0 on non-ProtoPediaApiError', () => {
      const httpError = Object.assign(new Error('Network error'), {
        status: 0,
      });

      const result = handleApiError(httpError);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.origin).toBe('fetcher');
        expect(result.kind).toBe('unknown');
        expect(result.code).toBe('UNKNOWN');
        expect(result.status).toBeUndefined();
        expect(result.error).toBe('Network error');
      }
    });

    it('ignores non-numeric status on non-ProtoPediaApiError', () => {
      const httpError = {
        status: 'NOT_A_NUMBER' as any,
        message: 'Invalid status',
      };

      const result = handleApiError(httpError);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.origin).toBe('fetcher');
        expect(result.kind).toBe('unknown');
        expect(result.code).toBe('UNKNOWN');
        expect(result.status).toBeUndefined();
      }
    });
  });
});
