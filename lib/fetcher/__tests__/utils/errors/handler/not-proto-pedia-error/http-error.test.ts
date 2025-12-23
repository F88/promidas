/**
 * @fileoverview Tests for handleApiError function - HTTP-like error handling
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
 * - http-error.test.ts (this file) - HTTP-like errors with status property
 * - network-error.test.ts - Network errors and edge cases
 *
 * This split improves test maintainability without fragmenting the implementation.
 *
 * NOTE: handleNotProtoPediaApiError does NOT treat errors with status property as HTTP errors.
 * Only ProtoPediaApiError instances are treated as HTTP. All other errors are classified as
 * network/timeout/abort/unknown/cors based on their properties, regardless of status field.
 */

import { describe, expect, it } from 'vitest';

import {
  handleApiError,
  handleNotProtoPediaApiError,
} from '../../../../../utils/errors/handler.js';

describe('handleNotProtoPediaApiError', () => {
  describe('HTTP-like error handling', () => {
    describe('general cases', () => {
      it('maps error with status property to unknown (not HTTP)', () => {
        const httpError = {
          status: undefined,
          message: 'Unknown error',
        };

        const result = handleNotProtoPediaApiError(httpError);

        expect(result).toEqual({
          ok: false,
          origin: 'fetcher',
          kind: 'unknown',
          code: 'UNKNOWN',
          error: 'Failed to fetch prototypes',
          details: {},
        });
      });

      it('ignores status property on non-ProtoPediaApiError', () => {
        const httpError = Object.assign(new Error('Invalid status'), {
          status: 999999,
        });

        const result = handleNotProtoPediaApiError(httpError);

        expect(result).toEqual({
          ok: false,
          origin: 'fetcher',
          kind: 'unknown',
          code: 'UNKNOWN',
          error: 'Invalid status',
          details: {},
        });
      });

      it('treats null status as unknown error', () => {
        const httpError = {
          status: null as any,
          message: 'Null status',
        };

        const result = handleNotProtoPediaApiError(httpError);

        expect(result).toEqual({
          ok: false,
          origin: 'fetcher',
          kind: 'unknown',
          code: 'UNKNOWN',
          error: 'Failed to fetch prototypes',
          details: {},
        });
      });

      it('ignores negative status on non-ProtoPediaApiError', () => {
        const httpError = Object.assign(new Error('Negative status'), {
          status: -500,
        });

        const result = handleNotProtoPediaApiError(httpError);

        expect(result).toEqual({
          ok: false,
          origin: 'fetcher',
          kind: 'unknown',
          code: 'UNKNOWN',
          error: 'Negative status',
          details: {},
        });
      });
    });

    describe('4xx client errors', () => {
      it('uses fallback message for non-Error object', () => {
        const httpError = {
          status: 400,
        };

        const result = handleNotProtoPediaApiError(httpError);

        expect(result).toEqual({
          ok: false,
          origin: 'fetcher',
          kind: 'unknown',
          code: 'UNKNOWN',
          error: 'Failed to fetch prototypes',
          details: {},
        });
      });

      it('ignores req metadata on non-ProtoPediaApiError', () => {
        const httpError = Object.assign(new Error('Request failed'), {
          status: 400,
          req: {
            url: 'https://protopedia.cc/api/prototypes',
          },
        });

        const result = handleNotProtoPediaApiError(httpError);

        expect(result).toEqual({
          ok: false,
          origin: 'fetcher',
          kind: 'unknown',
          code: 'UNKNOWN',
          error: 'Request failed',
          details: {},
        });
      });

      it('does not preserve req metadata', () => {
        const httpError = Object.assign(new Error('Request failed'), {
          status: 400,
          req: {
            url: 'https://protopedia.cc/api/prototypes',
            method: 'POST',
          },
        });

        const result = handleNotProtoPediaApiError(httpError);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.details).toEqual({});
        }
      });

      it('ignores req.url on non-ProtoPediaApiError', () => {
        const httpError = Object.assign(new Error('Empty URL'), {
          status: 400,
          req: {
            url: '',
            method: 'GET',
          },
        });

        const result = handleNotProtoPediaApiError(httpError);

        expect(result).toEqual({
          ok: false,
          origin: 'fetcher',
          kind: 'unknown',
          code: 'UNKNOWN',
          error: 'Empty URL',
          details: {},
        });
      });

      it('ignores req.method on non-ProtoPediaApiError', () => {
        const httpError = Object.assign(new Error('Empty method'), {
          status: 400,
          req: {
            url: 'https://protopedia.cc/api/prototypes',
            method: '',
          },
        });

        const result = handleNotProtoPediaApiError(httpError);

        expect(result).toEqual({
          ok: false,
          origin: 'fetcher',
          kind: 'unknown',
          code: 'UNKNOWN',
          error: 'Empty method',
          details: {},
        });
      });

      it('ignores statusText on non-ProtoPediaApiError', () => {
        const httpError = Object.assign(new Error('Authentication failed'), {
          status: 401,
          statusText: 'Unauthorized',
        });

        const result = handleNotProtoPediaApiError(httpError);

        expect(result).toEqual({
          ok: false,
          origin: 'fetcher',
          kind: 'unknown',
          code: 'UNKNOWN',
          error: 'Authentication failed',
          details: {},
        });
      });

      it('extracts code property as network error', () => {
        const httpError = Object.assign(new Error('Prototype not found'), {
          status: 404,
          statusText: 'Not Found',
          code: 'RESOURCE_NOT_FOUND',
          req: {
            url: 'https://protopedia.cc/api/prototypes',
            method: 'GET',
          },
        });

        const result = handleNotProtoPediaApiError(httpError);

        expect(result).toEqual({
          ok: false,
          origin: 'fetcher',
          kind: 'network',
          code: 'RESOURCE_NOT_FOUND',
          error: 'Prototype not found',
          details: {
            res: {
              code: 'RESOURCE_NOT_FOUND',
            },
          },
        });
      });

      it('treats string status as unknown error', () => {
        const httpError = {
          status: '404' as any,
          message: 'Not found',
        };

        const result = handleNotProtoPediaApiError(httpError);

        expect(result).toEqual({
          ok: false,
          origin: 'fetcher',
          kind: 'unknown',
          code: 'UNKNOWN',
          error: 'Failed to fetch prototypes',
          details: {},
        });
      });

      it('does not preserve req.method without other fields', () => {
        const httpError = Object.assign(new Error('Method not allowed'), {
          status: 405,
          req: {
            method: 'DELETE',
          },
        });

        const result = handleNotProtoPediaApiError(httpError);

        expect(result).toEqual({
          ok: false,
          origin: 'fetcher',
          kind: 'unknown',
          code: 'UNKNOWN',
          error: 'Method not allowed',
          details: {},
        });
      });

      it('extracts code from error with mixed metadata', () => {
        const httpError = Object.assign(new Error('Complete error'), {
          status: 422,
          statusText: 'Unprocessable Entity',
          code: 'VALIDATION_ERROR',
          req: {
            url: 'https://protopedia.cc/api/prototypes',
            method: 'POST',
          },
        });

        const result = handleNotProtoPediaApiError(httpError);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.origin).toBe('fetcher');
          expect(result.kind).toBe('network');
          expect(result.code).toBe('VALIDATION_ERROR');
          expect(result.error).toBe('Complete error');
          expect(result.details).toEqual({
            res: {
              code: 'VALIDATION_ERROR',
            },
          });
        }
      });

      it('ignores all HTTP metadata on 429 error', () => {
        const httpError = Object.assign(new Error('Rate limit exceeded'), {
          status: 429,
          statusText: 'Too Many Requests',
          req: {
            url: 'https://protopedia.cc/api/prototypes',
            method: 'GET',
          },
        });

        const result = handleNotProtoPediaApiError(httpError);

        expect(result).toEqual({
          ok: false,
          origin: 'fetcher',
          kind: 'unknown',
          code: 'UNKNOWN',
          error: 'Rate limit exceeded',
          details: {},
        });
      });

      it('ignores all HTTP metadata on 499 error', () => {
        const httpError = Object.assign(new Error('Client closed connection'), {
          status: 499,
          statusText: 'Client Closed Request',
          req: {
            url: 'https://protopedia.cc/api/prototypes/stream',
            method: 'GET',
          },
        });

        const result = handleNotProtoPediaApiError(httpError);

        expect(result).toEqual({
          ok: false,
          origin: 'fetcher',
          kind: 'unknown',
          code: 'UNKNOWN',
          error: 'Client closed connection',
          details: {},
        });
      });
    });

    describe('5xx server errors', () => {
      it('uses fallback message for 500 without Error instance', () => {
        const httpError = {
          status: 500,
        };

        const result = handleNotProtoPediaApiError(httpError);

        expect(result).toEqual({
          ok: false,
          origin: 'fetcher',
          kind: 'unknown',
          code: 'UNKNOWN',
          error: 'Failed to fetch prototypes',
          details: {},
        });
      });

      it('ignores statusText on 500 error', () => {
        const httpError = Object.assign(new Error('Server error'), {
          status: 500,
          statusText: 'Internal Server Error',
        });

        const result = handleNotProtoPediaApiError(httpError);

        expect(result).toEqual({
          ok: false,
          origin: 'fetcher',
          kind: 'unknown',
          code: 'UNKNOWN',
          error: 'Server error',
          details: {},
        });
      });

      it('extracts code from 503 error as network failure', () => {
        const httpError = Object.assign(
          new Error('Service temporarily unavailable'),
          {
            status: 503,
            code: 'SERVICE_UNAVAILABLE',
          },
        );

        const result = handleNotProtoPediaApiError(httpError);

        expect(result).toEqual({
          ok: false,
          origin: 'fetcher',
          kind: 'network',
          code: 'SERVICE_UNAVAILABLE',
          error: 'Service temporarily unavailable',
          details: {
            res: {
              code: 'SERVICE_UNAVAILABLE',
            },
          },
        });
      });
    });
  });
});
