/**
 * @fileoverview Tests for handleApiError function - Network errors and edge cases
 *
 * This file is part of a test suite split by error type for better organization.
 * The implementation remains unified in handler.ts (218 lines, single function),
 * while tests are split across 4 files by input error type:
 *
 * - abort-error.test.ts - AbortError/timeout handling
 * - api-error.test.ts - ProtoPediaApiError handling
 * - http-error.test.ts - HTTP-like errors with status property
 * - network-error.test.ts - Network errors and edge cases
 *
 * This split improves test maintainability without fragmenting the implementation.
 */

import { ProtoPediaApiError } from 'protopedia-api-v2-client';
import { describe, expect, it } from 'vitest';

import { handleApiError } from '../../../../utils/errors/handler.js';

describe('error-handler', () => {
  describe('handleApiError', () => {
    describe('unexpected error handling', () => {
      it('maps unexpected Error to network error without status', () => {
        const error = new Error('Unexpected crash');
        const result = handleApiError(error);

        expect(result).toEqual({
          ok: false,
          error: 'Unexpected crash',
          details: {},
        });
      });

      it('maps unexpected string to network error without status', () => {
        const result = handleApiError('Something went wrong');

        expect(result).toEqual({
          ok: false,
          error: 'Failed to fetch prototypes',
          details: {},
        });
      });

      it('maps null to network error without status', () => {
        const result = handleApiError(null);

        expect(result).toEqual({
          ok: false,
          error: 'Failed to fetch prototypes',
          details: {},
        });
      });

      it('maps undefined to network error without status', () => {
        const result = handleApiError(undefined);

        expect(result).toEqual({
          ok: false,
          error: 'Failed to fetch prototypes',
          details: {},
        });
      });

      it('maps number to network error without status', () => {
        const result = handleApiError(404);

        expect(result).toEqual({
          ok: false,
          error: 'Failed to fetch prototypes',
          details: {},
        });
      });

      it('includes empty details for unexpected errors without code', () => {
        const error = new Error('Network failure');
        const result = handleApiError(error);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.details).toEqual({});
        }
      });

      it('extracts code from error.code for network errors', () => {
        const error = Object.assign(new Error('getaddrinfo ENOTFOUND'), {
          code: 'ENOTFOUND',
          errno: -3008,
          syscall: 'getaddrinfo',
        });

        const result = handleApiError(error);

        expect(result).toEqual({
          ok: false,
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

        const result = handleApiError(error);

        expect(result).toEqual({
          ok: false,
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

        const result = handleApiError(error);

        expect(result.ok).toBe(false);
        if (!result.ok) {
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

        const result = handleApiError(error);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.status).toBeUndefined();
          expect(result.details?.res?.code).toBe('ETIMEDOUT');
        }
      });

      it('prioritizes error.code over error.cause.code', () => {
        const error = Object.assign(new Error('Custom error'), {
          code: 'CUSTOM_CODE',
          cause: { code: 'CAUSE_CODE' },
        });

        const result = handleApiError(error);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.details?.res?.code).toBe('CUSTOM_CODE');
        }
      });

      it('handles TypeError with proper error message', () => {
        const error = new TypeError('Cannot read property of undefined');
        const result = handleApiError(error);

        expect(result).toEqual({
          ok: false,
          error: 'Cannot read property of undefined',
          details: {},
        });
      });

      it('handles RangeError with proper error message', () => {
        const error = new RangeError('Array length out of bounds');
        const result = handleApiError(error);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.status).toBeUndefined();
          expect(result.error).toBe('Array length out of bounds');
        }
      });

      it('handles Error with empty message', () => {
        const error = new Error('');
        const result = handleApiError(error);

        expect(result).toEqual({
          ok: false,
          error: '',
          details: {},
        });
      });

      it('handles plain object without status', () => {
        const error = { message: 'Plain object error' };
        const result = handleApiError(error);

        expect(result).toEqual({
          ok: false,
          error: 'Failed to fetch prototypes',
          details: {},
        });
      });

      it('maps browser fetch TypeError("Failed to fetch") to NETWORK_ERROR code', () => {
        const error = new TypeError('Failed to fetch');
        const result = handleApiError(error);

        expect(result).toEqual({
          ok: false,
          error: 'Failed to fetch',
          details: {
            res: {
              code: 'NETWORK_ERROR',
            },
          },
        });
      });

      it('handles array as error', () => {
        const error = ['error', 'occurred'];
        const result = handleApiError(error);

        expect(result).toEqual({
          ok: false,
          error: 'Failed to fetch prototypes',
          details: {},
        });
      });

      it('handles function as error', () => {
        const error = () => 'error function';
        const result = handleApiError(error);

        expect(result).toEqual({
          ok: false,
          error: 'Failed to fetch prototypes',
          details: {},
        });
      });

      it('handles symbol as error', () => {
        const error = Symbol('error');
        const result = handleApiError(error);

        expect(result).toEqual({
          ok: false,
          error: 'Failed to fetch prototypes',
          details: {},
        });
      });

      it('handles boolean as error', () => {
        const result = handleApiError(false);

        expect(result).toEqual({
          ok: false,
          error: 'Failed to fetch prototypes',
          details: {},
        });
      });

      it('handles RegExp as error', () => {
        const error = /error pattern/;
        const result = handleApiError(error);

        expect(result).toEqual({
          ok: false,
          error: 'Failed to fetch prototypes',
          details: {},
        });
      });

      it('handles Date as error', () => {
        const error = new Date();
        const result = handleApiError(error);

        expect(result).toEqual({
          ok: false,
          error: 'Failed to fetch prototypes',
          details: {},
        });
      });

      it('handles Map as error', () => {
        const error = new Map([['key', 'value']]);
        const result = handleApiError(error);

        expect(result).toEqual({
          ok: false,
          error: 'Failed to fetch prototypes',
          details: {},
        });
      });

      it('handles Set as error', () => {
        const error = new Set([1, 2, 3]);
        const result = handleApiError(error);

        expect(result).toEqual({
          ok: false,
          error: 'Failed to fetch prototypes',
          details: {},
        });
      });

      it('handles Promise as error', () => {
        const error = Promise.resolve('error');
        const result = handleApiError(error);

        expect(result).toEqual({
          ok: false,
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
          expect(result.status).toBeUndefined();
          expect(result.error).toBe('Invalid state');
        }
      });

      it('handles error with status 0', () => {
        const httpError = Object.assign(new Error('Network error'), {
          status: 0,
        });

        const result = handleApiError(httpError);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.status).toBe(0);
          expect(result.error).toBe('Network error');
        }
      });

      it('handles error with non-numeric status', () => {
        const httpError = {
          status: 'NOT_A_NUMBER' as any,
          message: 'Invalid status',
        };

        const result = handleApiError(httpError);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          // Non-numeric status defaults to 500
          expect(result.status).toBe(500);
        }
      });

      it('always returns ok: false', () => {
        const testCases = [
          new DOMException('Aborted', 'AbortError'),
          new ProtoPediaApiError({
            message: 'Test error',
            req: { url: 'https://test.com', method: 'GET' },
            status: 500,
            statusText: 'Internal Server Error',
          }),
          { status: 404, message: 'Not found' },
          new Error('Crash'),
          'String error',
          null,
        ];

        testCases.forEach((error) => {
          const result = handleApiError(error);
          expect(result.ok).toBe(false);
        });
      });

      it('always includes details field', () => {
        const testCases = [
          new DOMException('Aborted', 'AbortError'),
          new ProtoPediaApiError({
            message: 'API error',
            req: { url: 'https://test.com', method: 'GET' },
            status: 404,
            statusText: 'Not Found',
          }),
          new Error('Unexpected error'),
        ];

        testCases.forEach((error) => {
          const result = handleApiError(error);
          expect(result.ok).toBe(false);
          if (!result.ok) {
            expect(result.details).toBeDefined();
          }
        });
      });

      it('result object has correct shape', () => {
        const error = new Error('Test error');
        const result = handleApiError(error);

        expect(result).toHaveProperty('ok');
        expect(result).toHaveProperty('error');
        expect(result).toHaveProperty('details');
        // status is optional for network errors

        const keys = Object.keys(result).sort();
        expect(keys).toContain('ok');
        expect(keys).toContain('error');
        expect(keys).toContain('details');
      });

      it('status is a number when present', () => {
        const testCases = [
          {
            error: new ProtoPediaApiError({
              message: 'API error',
              req: { url: 'https://test.com', method: 'GET' },
              status: 404,
              statusText: 'Not Found',
            }),
            hasStatus: true,
          },
          {
            error: { status: 500, message: 'Server error' },
            hasStatus: true,
          },
          {
            error: new DOMException('Aborted', 'AbortError'),
            hasStatus: false,
          },
          {
            error: new Error('Unexpected'),
            hasStatus: false,
          },
        ];

        testCases.forEach(({ error, hasStatus }) => {
          const result = handleApiError(error);
          expect(result.ok).toBe(false);
          if (!result.ok) {
            if (hasStatus) {
              expect(typeof result.status).toBe('number');
            } else {
              expect(result.status).toBeUndefined();
            }
          }
        });
      });

      it('error is always a string', () => {
        const testCases = [
          new DOMException('Aborted', 'AbortError'),
          new ProtoPediaApiError({
            message: 'API error',
            req: { url: 'https://test.com', method: 'GET' },
            status: 404,
            statusText: 'Not Found',
          }),
          { status: 500, message: 'Server error' },
          new Error('Unexpected'),
          null,
          undefined,
          123,
        ];

        testCases.forEach((error) => {
          const result = handleApiError(error);
          expect(result.ok).toBe(false);
          if (!result.ok) {
            expect(typeof result.error).toBe('string');
          }
        });
      });

      it('details is always an object', () => {
        const testCases = [
          new DOMException('Aborted', 'AbortError'),
          new ProtoPediaApiError({
            message: 'API error',
            req: { url: 'https://test.com', method: 'GET' },
            status: 404,
            statusText: 'Not Found',
          }),
          { status: 500, message: 'Server error' },
          new Error('Unexpected'),
        ];

        testCases.forEach((error) => {
          const result = handleApiError(error);
          expect(result.ok).toBe(false);
          if (!result.ok) {
            expect(typeof result.details).toBe('object');
            expect(result.details).not.toBeNull();
            expect(Array.isArray(result.details)).toBe(false);
          }
        });
      });

      it('empty details object is distinct from undefined', () => {
        const error = new Error('Test error');
        const result = handleApiError(error);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.details).toEqual({});
          expect(Object.keys(result.details!).length).toBe(0);
        }
      });

      it('details with req only has no res property', () => {
        const httpError = Object.assign(new Error('Request error'), {
          status: 400,
          req: {
            url: 'https://protopedia.cc/api/prototypes',
            method: 'POST',
          },
        });

        const result = handleApiError(httpError);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.details).toHaveProperty('req');
          expect(result.details).not.toHaveProperty('res');
          expect(Object.keys(result.details!)).toEqual(['req']);
        }
      });

      it('details with res only has no req property', () => {
        const httpError = Object.assign(new Error('Response error'), {
          status: 500,
          statusText: 'Internal Server Error',
        });

        const result = handleApiError(httpError);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.details).toHaveProperty('res');
          expect(result.details).not.toHaveProperty('req');
          expect(Object.keys(result.details!)).toEqual(['res']);
        }
      });

      it('handles multiple errors in sequence', () => {
        const errors = [
          new DOMException('Abort', 'AbortError'),
          new Error('Generic error'),
          { status: 404, message: 'Not found' },
        ];

        const results = errors.map((e) => handleApiError(e));

        results.forEach((result) => {
          expect(result.ok).toBe(false);
          if (!result.ok) {
            expect(result).toHaveProperty('error');
            expect(result).toHaveProperty('details');
          }
        });

        if (!results[0]!.ok && !results[1]!.ok && !results[2]!.ok) {
          // AbortError and generic Error have no status
          expect(results[0]!.status).toBeUndefined();
          expect(results[1]!.status).toBeUndefined();
          // HTTP error has status
          expect(results[2]!.status).toBe(404);
        }
      });
    });
  });
});
