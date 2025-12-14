/**
 * @fileoverview Tests for handleApiError function - HTTP-like error handling
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

import { describe, expect, it, vi } from 'vitest';

import { handleApiError } from '../../../../utils/errors/handler.js';

vi.mock('../../../../../../logger', () => ({
  createConsoleLogger: () => ({
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

const mockLogger = {
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};

describe('error-handler', () => {
  describe('handleApiError', () => {
    describe('HTTP-like error handling', () => {
      describe('general cases', () => {
        it('defaults to 500 when status is missing from HTTP-like error', () => {
          const httpError = {
            status: undefined,
            message: 'Unknown error',
          };

          const result = handleApiError(httpError, mockLogger);

          expect(result.ok).toBe(false);
          if (!result.ok) {
            expect(result.status).toBe(500);
          }
        });

        it('handles HTTP error with very large status code', () => {
          const httpError = Object.assign(new Error('Invalid status'), {
            status: 999999,
          });

          const result = handleApiError(httpError, mockLogger);

          expect(result.ok).toBe(false);
          if (!result.ok) {
            expect(result.status).toBe(999999);
          }
        });

        it('handles HTTP error with null status', () => {
          const httpError = {
            status: null as any,
            message: 'Null status',
          };

          const result = handleApiError(httpError, mockLogger);

          expect(result.ok).toBe(false);
          if (!result.ok) {
            expect(result.status).toBe(500); // status ?? 500
          }
        });

        it('handles HTTP error with negative status', () => {
          const httpError = Object.assign(new Error('Negative status'), {
            status: -500,
          });

          const result = handleApiError(httpError, mockLogger);

          expect(result.ok).toBe(false);
          if (!result.ok) {
            expect(result.status).toBe(-500);
          }
        });
      });

      describe('4xx client errors', () => {
        it('handles 400 Bad Request with fallback message', () => {
          const httpError = {
            status: 400,
          };

          const result = handleApiError(httpError, mockLogger);

          expect(result.ok).toBe(false);
          if (!result.ok) {
            expect(result.error).toBe('Failed to fetch prototypes');
          }
        });

        it('handles 400 Bad Request with only req.url', () => {
          const httpError = Object.assign(new Error('Request failed'), {
            status: 400,
            req: {
              url: 'https://protopedia.cc/api/prototypes',
            },
          });

          const result = handleApiError(httpError, mockLogger);

          expect(result).toEqual({
            ok: false,
            status: 400,
            error: 'Request failed',
            details: {
              req: {
                url: 'https://protopedia.cc/api/prototypes',
              },
            },
          });
        });

        it('does not create empty res object when no res fields present (400)', () => {
          const httpError = Object.assign(new Error('Request failed'), {
            status: 400,
            req: {
              url: 'https://protopedia.cc/api/prototypes',
              method: 'POST',
            },
          });

          const result = handleApiError(httpError, mockLogger);

          expect(result.ok).toBe(false);
          if (!result.ok) {
            expect(result.details?.req).toBeDefined();
            expect(result.details?.res).toBeUndefined();
          }
        });

        it('handles 400 Bad Request with empty string req.url', () => {
          const httpError = Object.assign(new Error('Empty URL'), {
            status: 400,
            req: {
              url: '',
              method: 'GET',
            },
          });

          const result = handleApiError(httpError, mockLogger);

          expect(result.ok).toBe(false);
          if (!result.ok) {
            expect(result.details?.req?.url).toBe('');
          }
        });

        it('handles 400 Bad Request with empty string req.method', () => {
          const httpError = Object.assign(new Error('Empty method'), {
            status: 400,
            req: {
              url: 'https://protopedia.cc/api/prototypes',
              method: '',
            },
          });

          const result = handleApiError(httpError, mockLogger);

          expect(result.ok).toBe(false);
          if (!result.ok) {
            expect(result.details?.req?.method).toBe('');
          }
        });

        it('handles 401 Unauthorized with Error instance', () => {
          const httpError = Object.assign(new Error('Authentication failed'), {
            status: 401,
            statusText: 'Unauthorized',
          });

          const result = handleApiError(httpError, mockLogger);

          expect(result).toEqual({
            ok: false,
            status: 401,
            error: 'Authentication failed',
            details: {
              res: {
                statusText: 'Unauthorized',
              },
            },
          });
        });

        it('handles 404 Not Found with all metadata fields', () => {
          const httpError = Object.assign(new Error('Prototype not found'), {
            status: 404,
            statusText: 'Not Found',
            code: 'RESOURCE_NOT_FOUND',
            req: {
              url: 'https://protopedia.cc/api/prototypes',
              method: 'GET',
            },
          });

          const result = handleApiError(httpError, mockLogger);

          expect(result).toEqual({
            ok: false,
            status: 404,
            error: 'Prototype not found',
            details: {
              req: {
                url: 'https://protopedia.cc/api/prototypes',
                method: 'GET',
              },
              res: {
                statusText: 'Not Found',
                code: 'RESOURCE_NOT_FOUND',
              },
            },
          });
        });

        it('handles 404 Not Found with status as string number', () => {
          const httpError = {
            status: '404' as any,
            message: 'Not found',
          };

          const result = handleApiError(httpError, mockLogger);

          expect(result.ok).toBe(false);
          if (!result.ok) {
            expect(result.status).toBe(404);
          }
        });

        it('handles 405 Method Not Allowed with only req.method', () => {
          const httpError = Object.assign(new Error('Method not allowed'), {
            status: 405,
            req: {
              method: 'DELETE',
            },
          });

          const result = handleApiError(httpError, mockLogger);

          expect(result).toEqual({
            ok: false,
            status: 405,
            error: 'Method not allowed',
            details: {
              req: {
                method: 'DELETE',
              },
            },
          });
        });

        it('handles 422 Unprocessable Entity with all possible metadata', () => {
          const httpError = Object.assign(new Error('Complete error'), {
            status: 422,
            statusText: 'Unprocessable Entity',
            code: 'VALIDATION_ERROR',
            req: {
              url: 'https://protopedia.cc/api/prototypes',
              method: 'POST',
            },
          });

          const result = handleApiError(httpError, mockLogger);

          expect(result.ok).toBe(false);
          if (!result.ok) {
            expect(result.status).toBe(422);
            expect(result.error).toBe('Complete error');
            expect(result.details?.req?.url).toBe(
              'https://protopedia.cc/api/prototypes',
            );
            expect(result.details?.req?.method).toBe('POST');
            expect(result.details?.res?.statusText).toBe(
              'Unprocessable Entity',
            );
            expect(result.details?.res?.code).toBe('VALIDATION_ERROR');
          }
        });

        it('handles HTTP error with status 429 (Too Many Requests)', () => {
          const httpError = Object.assign(new Error('Rate limit exceeded'), {
            status: 429,
            statusText: 'Too Many Requests',
            req: {
              url: 'https://protopedia.cc/api/prototypes',
              method: 'GET',
            },
          });

          const result = handleApiError(httpError, mockLogger);

          expect(result).toEqual({
            ok: false,
            status: 429,
            error: 'Rate limit exceeded',
            details: {
              req: {
                url: 'https://protopedia.cc/api/prototypes',
                method: 'GET',
              },
              res: {
                statusText: 'Too Many Requests',
              },
            },
          });
        });

        it('handles HTTP error with status 499 (Client Closed Request)', () => {
          const httpError = Object.assign(
            new Error('Client closed connection'),
            {
              status: 499,
              statusText: 'Client Closed Request',
              req: {
                url: 'https://protopedia.cc/api/prototypes/stream',
                method: 'GET',
              },
            },
          );

          const result = handleApiError(httpError, mockLogger);

          expect(result).toEqual({
            ok: false,
            status: 499,
            error: 'Client closed connection',
            details: {
              req: {
                url: 'https://protopedia.cc/api/prototypes/stream',
                method: 'GET',
              },
              res: {
                statusText: 'Client Closed Request',
              },
            },
          });
        });
      });

      describe('5xx server errors', () => {
        it('handles 500 Internal Server Error with fallback message', () => {
          const httpError = {
            status: 500,
          };

          const result = handleApiError(httpError, mockLogger);

          expect(result.ok).toBe(false);
          if (!result.ok) {
            expect(result.status).toBe(500);
            expect(result.error).toBe('Failed to fetch prototypes');
          }
        });

        it('handles 500 Internal Server Error with no req fields', () => {
          const httpError = Object.assign(new Error('Server error'), {
            status: 500,
            statusText: 'Internal Server Error',
          });

          const result = handleApiError(httpError, mockLogger);

          expect(result.ok).toBe(false);
          if (!result.ok) {
            expect(result.status).toBe(500);
            expect(result.details?.req).toBeUndefined();
            expect(result.details?.res).toBeDefined();
          }
        });

        it('handles 503 Service Unavailable with partial metadata', () => {
          const httpError = Object.assign(
            new Error('Service temporarily unavailable'),
            {
              status: 503,
              code: 'SERVICE_UNAVAILABLE',
            },
          );

          const result = handleApiError(httpError, mockLogger);

          expect(result).toEqual({
            ok: false,
            status: 503,
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
});
