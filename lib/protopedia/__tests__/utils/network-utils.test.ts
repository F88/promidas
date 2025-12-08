import { ProtoPediaApiError } from 'protopedia-api-v2-client';
import { describe, expect, it, vi } from 'vitest';

import type { NetworkFailure } from '../../types/prototype-api.types.js';
import {
  constructDisplayMessage,
  handleApiError,
  resolveErrorMessage,
} from '../../utils/network-utils.js';

vi.mock('../../lib/logger', () => ({
  createConsoleLogger: () => ({
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

describe('network-utils', () => {
  describe('resolveErrorMessage', () => {
    it('extracts message from Error instance', () => {
      const error = new Error('Network timeout');
      expect(resolveErrorMessage(error)).toBe('Network timeout');
    });

    it('returns string value when input is a non-empty string', () => {
      expect(resolveErrorMessage('Custom error message')).toBe(
        'Custom error message',
      );
    });

    it('returns fallback message for null', () => {
      expect(resolveErrorMessage(null)).toBe('Unknown error occurred.');
    });

    it('returns fallback message for undefined', () => {
      expect(resolveErrorMessage(undefined)).toBe('Unknown error occurred.');
    });

    it('returns fallback message for empty string', () => {
      expect(resolveErrorMessage('')).toBe('Unknown error occurred.');
    });

    it('returns fallback message for number', () => {
      expect(resolveErrorMessage(404)).toBe('Unknown error occurred.');
    });

    it('returns fallback message for object without message', () => {
      expect(resolveErrorMessage({ code: 'ERR_UNKNOWN' })).toBe(
        'Unknown error occurred.',
      );
    });

    it('handles Error with whitespace-only message', () => {
      const error = new Error('   ');
      expect(resolveErrorMessage(error)).toBe('   ');
    });

    it('handles string with whitespace-only', () => {
      expect(resolveErrorMessage('   ')).toBe('   ');
    });

    it('handles object with message property as non-string', () => {
      expect(resolveErrorMessage({ message: 123 })).toBe(
        'Unknown error occurred.',
      );
    });

    it('handles bigint value', () => {
      expect(resolveErrorMessage(BigInt(404))).toBe('Unknown error occurred.');
    });

    it('handles Error subclass', () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomError';
        }
      }
      const error = new CustomError('Custom error occurred');
      expect(resolveErrorMessage(error)).toBe('Custom error occurred');
    });

    it('handles DOMException', () => {
      const error = new DOMException('Operation failed', 'AbortError');
      expect(resolveErrorMessage(error)).toBe('Operation failed');
    });
  });

  describe('constructDisplayMessage', () => {
    it('constructs message with statusText prefix', () => {
      const failure: NetworkFailure = {
        status: 404,
        error: new Error('Resource not found'),
        details: {
          res: {
            statusText: 'Not Found',
          },
        },
      };

      expect(constructDisplayMessage(failure)).toBe(
        'Not Found: Resource not found (404)',
      );
    });

    it('constructs message with code prefix when statusText is absent', () => {
      const failure: NetworkFailure = {
        status: 500,
        error: new Error('Connection failed'),
        details: {
          res: {
            code: 'ECONNREFUSED',
          },
        },
      };

      expect(constructDisplayMessage(failure)).toBe(
        'ECONNREFUSED: Connection failed (500)',
      );
    });

    it('does not duplicate prefix when message already starts with it', () => {
      const failure: NetworkFailure = {
        status: 401,
        error: new Error('Unauthorized: Invalid token'),
        details: {
          res: {
            statusText: 'Unauthorized',
          },
        },
      };

      expect(constructDisplayMessage(failure)).toBe(
        'Unauthorized: Invalid token (401)',
      );
    });

    it('constructs message without prefix when details are absent', () => {
      const failure: NetworkFailure = {
        status: 500,
        error: new Error('Internal error'),
      };

      expect(constructDisplayMessage(failure)).toBe('Internal error (500)');
    });

    it('constructs message with string error', () => {
      const failure: NetworkFailure = {
        status: 503,
        error: 'Service unavailable',
        details: {
          res: {
            statusText: 'Service Unavailable',
          },
        },
      };

      expect(constructDisplayMessage(failure)).toBe(
        'Service Unavailable: Service unavailable (503)',
      );
    });

    it('prioritizes statusText over code', () => {
      const failure: NetworkFailure = {
        status: 404,
        error: new Error('Not found'),
        details: {
          res: {
            statusText: 'Not Found',
            code: 'ERR_404',
          },
        },
      };

      expect(constructDisplayMessage(failure)).toBe(
        'Not Found: Not found (404)',
      );
    });

    it('handles unknown error values', () => {
      const failure: NetworkFailure = {
        status: 500,
        error: null,
      };

      expect(constructDisplayMessage(failure)).toBe(
        'Unknown error occurred. (500)',
      );
    });

    it('handles empty string statusText', () => {
      const failure: NetworkFailure = {
        status: 500,
        error: new Error('Internal error'),
        details: {
          res: {
            statusText: '',
          },
        },
      };

      expect(constructDisplayMessage(failure)).toBe('Internal error (500)');
    });

    it('handles empty string code', () => {
      const failure: NetworkFailure = {
        status: 500,
        error: new Error('Connection error'),
        details: {
          res: {
            code: '',
          },
        },
      };

      expect(constructDisplayMessage(failure)).toBe('Connection error (500)');
    });

    it('uses code when statusText is empty', () => {
      const failure: NetworkFailure = {
        status: 500,
        error: new Error('Network failure'),
        details: {
          res: {
            statusText: '',
            code: 'ECONNREFUSED',
          },
        },
      };

      expect(constructDisplayMessage(failure)).toBe(
        'ECONNREFUSED: Network failure (500)',
      );
    });

    it('handles very long error messages', () => {
      const longMessage = 'A'.repeat(1000);
      const failure: NetworkFailure = {
        status: 500,
        error: new Error(longMessage),
      };

      const result = constructDisplayMessage(failure);
      expect(result).toBe(`${longMessage} (500)`);
      expect(result.length).toBe(1006); // 1000 + ' (500)'.length
    });

    it('handles status code 0', () => {
      const failure: NetworkFailure = {
        status: 0,
        error: new Error('Network error'),
      };

      expect(constructDisplayMessage(failure)).toBe('Network error (0)');
    });

    it('handles negative status codes', () => {
      const failure: NetworkFailure = {
        status: -1,
        error: new Error('Invalid status'),
      };

      expect(constructDisplayMessage(failure)).toBe('Invalid status (-1)');
    });

    it('does not duplicate prefix with different case', () => {
      const failure: NetworkFailure = {
        status: 404,
        error: new Error('not found: Resource missing'),
        details: {
          res: {
            statusText: 'Not Found',
          },
        },
      };

      // Case-sensitive check - prefix will be added
      expect(constructDisplayMessage(failure)).toBe(
        'Not Found: not found: Resource missing (404)',
      );
    });

    it('handles prefix exactly matching message', () => {
      const failure: NetworkFailure = {
        status: 401,
        error: new Error('Unauthorized'),
        details: {
          res: {
            statusText: 'Unauthorized',
          },
        },
      };

      expect(constructDisplayMessage(failure)).toBe('Unauthorized (401)');
    });

    it('handles prefix with colon in error message', () => {
      const failure: NetworkFailure = {
        status: 500,
        error: new Error('Error: Something went wrong'),
        details: {
          res: {
            code: 'ERROR',
          },
        },
      };

      expect(constructDisplayMessage(failure)).toBe(
        'ERROR: Error: Something went wrong (500)',
      );
    });

    it('handles multiple colons in message', () => {
      const failure: NetworkFailure = {
        status: 500,
        error: new Error('Error: Failed: Connection: Timeout'),
        details: {
          res: {
            statusText: 'Internal Server Error',
          },
        },
      };

      expect(constructDisplayMessage(failure)).toBe(
        'Internal Server Error: Error: Failed: Connection: Timeout (500)',
      );
    });
  });

  describe('handleApiError', () => {
    describe('AbortError handling', () => {
      it('maps AbortError to 504 Gateway Timeout', () => {
        const abortError = new DOMException('Aborted', 'AbortError');
        const result = handleApiError(abortError);

        expect(result).toEqual({
          ok: false,
          status: 504,
          error: 'Upstream request timed out',
          details: {},
        });
      });

      it('logs diagnostic information for AbortError', () => {
        const abortError = new DOMException('Operation aborted', 'AbortError');
        const result = handleApiError(abortError);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.status).toBe(504);
        }
      });

      it('returns consistent result for multiple AbortErrors', () => {
        const abortError1 = new DOMException('Timeout 1', 'AbortError');
        const abortError2 = new DOMException('Timeout 2', 'AbortError');

        const result1 = handleApiError(abortError1);
        const result2 = handleApiError(abortError2);

        expect(result1).toEqual(result2);
        expect(result1.ok).toBe(false);
        expect(result2.ok).toBe(false);
        if (!result1.ok && !result2.ok) {
          expect(result1.status).toBe(504);
          expect(result2.status).toBe(504);
        }
      });
    });

    describe('ProtoPediaApiError handling', () => {
      it('normalizes ProtoPediaApiError with full metadata', () => {
        const apiError = new ProtoPediaApiError({
          message: 'Prototype not found',
          req: {
            url: 'https://protopedia.cc/api/prototypes/123',
            method: 'GET',
          },
          status: 404,
          statusText: 'Not Found',
        });

        const result = handleApiError(apiError);

        expect(result).toEqual({
          ok: false,
          status: 404,
          error: 'Prototype not found',
          details: {
            req: {
              url: 'https://protopedia.cc/api/prototypes/123',
              method: 'GET',
            },
            res: {
              statusText: 'Not Found',
            },
          },
        });
      });

      it('handles ProtoPediaApiError with different status codes', () => {
        const apiError = new ProtoPediaApiError({
          message: 'Unauthorized access',
          req: {
            url: 'https://protopedia.cc/api/prototypes',
            method: 'POST',
          },
          status: 401,
          statusText: 'Unauthorized',
        });

        const result = handleApiError(apiError);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.status).toBe(401);
          expect(result.error).toBe('Unauthorized access');
          expect(result.details?.req?.method).toBe('POST');
          expect(result.details?.res?.statusText).toBe('Unauthorized');
        }
      });

      it('includes request method and URL from ProtoPediaApiError', () => {
        const apiError = new ProtoPediaApiError({
          message: 'Service unavailable',
          req: {
            url: 'https://protopedia.cc/api/prototypes/search',
            method: 'GET',
          },
          status: 503,
          statusText: 'Service Unavailable',
        });

        const result = handleApiError(apiError);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.details?.req).toEqual({
            url: 'https://protopedia.cc/api/prototypes/search',
            method: 'GET',
          });
        }
      });

      it('preserves statusText from ProtoPediaApiError', () => {
        const apiError = new ProtoPediaApiError({
          message: 'Bad request',
          req: {
            url: 'https://protopedia.cc/api/prototypes',
            method: 'POST',
          },
          status: 400,
          statusText: 'Bad Request',
        });

        const result = handleApiError(apiError);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.details?.res?.statusText).toBe('Bad Request');
        }
      });

      it('handles ProtoPediaApiError with empty statusText', () => {
        const apiError = new ProtoPediaApiError({
          message: 'Internal server error',
          req: {
            url: 'https://protopedia.cc/api/prototypes',
            method: 'GET',
          },
          status: 500,
          statusText: '',
        });

        const result = handleApiError(apiError);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.status).toBe(500);
          expect(result.details?.res?.statusText).toBe('');
        }
      });

      it('does not include code field for ProtoPediaApiError', () => {
        const apiError = new ProtoPediaApiError({
          message: 'Not found',
          req: {
            url: 'https://protopedia.cc/api/prototypes/999',
            method: 'GET',
          },
          status: 404,
          statusText: 'Not Found',
        });

        const result = handleApiError(apiError);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.details?.res?.code).toBeUndefined();
        }
      });

      it('handles ProtoPediaApiError with missing req.method', () => {
        const apiError = new ProtoPediaApiError({
          message: 'Bad gateway',
          req: {
            url: 'https://protopedia.cc/api/prototypes',
            method: undefined as any,
          },
          status: 502,
          statusText: 'Bad Gateway',
        });

        const result = handleApiError(apiError);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.status).toBe(502);
          expect(result.details?.req?.url).toBe(
            'https://protopedia.cc/api/prototypes',
          );
          expect(result.details?.req?.method).toBeUndefined();
        }
      });

      it('handles ProtoPediaApiError with missing req.url', () => {
        const apiError = new ProtoPediaApiError({
          message: 'Request failed',
          req: {
            url: undefined as any,
            method: 'POST',
          },
          status: 400,
          statusText: 'Bad Request',
        });

        const result = handleApiError(apiError);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.details?.req?.url).toBeUndefined();
          expect(result.details?.req?.method).toBe('POST');
        }
      });

      it('handles ProtoPediaApiError with very long URL', () => {
        const longUrl = 'https://protopedia.cc/api/' + 'a'.repeat(1000);
        const apiError = new ProtoPediaApiError({
          message: 'Request failed',
          req: {
            url: longUrl,
            method: 'GET',
          },
          status: 414,
          statusText: 'URI Too Long',
        });

        const result = handleApiError(apiError);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.details?.req?.url).toBe(longUrl);
          expect(result.details?.req?.url?.length).toBeGreaterThan(1000);
        }
      });

      it('handles ProtoPediaApiError with empty message', () => {
        const apiError = new ProtoPediaApiError({
          message: '',
          req: {
            url: 'https://protopedia.cc/api/prototypes',
            method: 'GET',
          },
          status: 500,
          statusText: 'Internal Server Error',
        });

        const result = handleApiError(apiError);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBe('');
          expect(result.status).toBe(500);
        }
      });

      it('handles ProtoPediaApiError with status 0', () => {
        const apiError = new ProtoPediaApiError({
          message: 'Network error',
          req: {
            url: 'https://protopedia.cc/api/prototypes',
            method: 'GET',
          },
          status: 0,
          statusText: '',
        });

        const result = handleApiError(apiError);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.status).toBe(0);
        }
      });
    });

    describe('HTTP-like error handling', () => {
      it('normalizes HTTP error with all metadata fields', () => {
        const httpError = Object.assign(new Error('Prototype not found'), {
          status: 404,
          statusText: 'Not Found',
          code: 'RESOURCE_NOT_FOUND',
          req: {
            url: 'https://protopedia.cc/api/prototypes',
            method: 'GET',
          },
        });

        const result = handleApiError(httpError);

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

      it('handles HTTP error with Error instance', () => {
        const httpError = Object.assign(new Error('Authentication failed'), {
          status: 401,
          statusText: 'Unauthorized',
        });

        const result = handleApiError(httpError);

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

      it('defaults to 500 when status is missing from HTTP-like error', () => {
        const httpError = {
          status: undefined,
          message: 'Unknown error',
        };

        const result = handleApiError(httpError);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.status).toBe(500);
        }
      });

      it('handles HTTP error with partial metadata', () => {
        const httpError = Object.assign(
          new Error('Service temporarily unavailable'),
          {
            status: 503,
            code: 'SERVICE_UNAVAILABLE',
          },
        );

        const result = handleApiError(httpError);

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

      it('uses fallback message when HTTP-like error has no message', () => {
        const httpError = {
          status: 500,
        };

        const result = handleApiError(httpError);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBe('Failed to fetch prototypes');
        }
      });

      it('handles HTTP error with only req.url', () => {
        const httpError = Object.assign(new Error('Request failed'), {
          status: 400,
          req: {
            url: 'https://protopedia.cc/api/prototypes',
          },
        });

        const result = handleApiError(httpError);

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

      it('handles HTTP error with only req.method', () => {
        const httpError = Object.assign(new Error('Method not allowed'), {
          status: 405,
          req: {
            method: 'DELETE',
          },
        });

        const result = handleApiError(httpError);

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

      it('does not create empty req object when no req fields present', () => {
        const httpError = Object.assign(new Error('Server error'), {
          status: 500,
          statusText: 'Internal Server Error',
        });

        const result = handleApiError(httpError);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.details?.req).toBeUndefined();
          expect(result.details?.res).toBeDefined();
        }
      });

      it('does not create empty res object when no res fields present', () => {
        const httpError = Object.assign(new Error('Request failed'), {
          status: 400,
          req: {
            url: 'https://protopedia.cc/api/prototypes',
            method: 'POST',
          },
        });

        const result = handleApiError(httpError);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.details?.req).toBeDefined();
          expect(result.details?.res).toBeUndefined();
        }
      });

      it('handles HTTP error with status as string number', () => {
        const httpError = {
          status: '404' as any,
          message: 'Not found',
        };

        const result = handleApiError(httpError);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.status).toBe(404);
        }
      });

      it('handles HTTP error with very large status code', () => {
        const httpError = Object.assign(new Error('Invalid status'), {
          status: 999999,
        });

        const result = handleApiError(httpError);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.status).toBe(999999);
        }
      });

      it('handles HTTP error with all possible metadata', () => {
        const httpError = Object.assign(new Error('Complete error'), {
          status: 422,
          statusText: 'Unprocessable Entity',
          code: 'VALIDATION_ERROR',
          req: {
            url: 'https://protopedia.cc/api/prototypes',
            method: 'POST',
          },
        });

        const result = handleApiError(httpError);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.status).toBe(422);
          expect(result.error).toBe('Complete error');
          expect(result.details?.req?.url).toBe(
            'https://protopedia.cc/api/prototypes',
          );
          expect(result.details?.req?.method).toBe('POST');
          expect(result.details?.res?.statusText).toBe('Unprocessable Entity');
          expect(result.details?.res?.code).toBe('VALIDATION_ERROR');
        }
      });

      it('handles HTTP error with empty string req.url', () => {
        const httpError = Object.assign(new Error('Empty URL'), {
          status: 400,
          req: {
            url: '',
            method: 'GET',
          },
        });

        const result = handleApiError(httpError);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.details?.req?.url).toBe('');
        }
      });

      it('handles HTTP error with empty string req.method', () => {
        const httpError = Object.assign(new Error('Empty method'), {
          status: 400,
          req: {
            url: 'https://protopedia.cc/api/prototypes',
            method: '',
          },
        });

        const result = handleApiError(httpError);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.details?.req?.method).toBe('');
        }
      });

      it('handles HTTP error with null status', () => {
        const httpError = {
          status: null as any,
          message: 'Null status',
        };

        const result = handleApiError(httpError);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.status).toBe(500); // status ?? 500
        }
      });

      it('handles HTTP error with negative status', () => {
        const httpError = Object.assign(new Error('Negative status'), {
          status: -500,
        });

        const result = handleApiError(httpError);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.status).toBe(-500);
        }
      });
    });

    describe('unexpected error handling', () => {
      it('maps unexpected Error to 500', () => {
        const error = new Error('Unexpected crash');
        const result = handleApiError(error);

        expect(result).toEqual({
          ok: false,
          status: 500,
          error: 'Unexpected crash',
          details: {},
        });
      });

      it('maps unexpected string to 500', () => {
        const result = handleApiError('Something went wrong');

        expect(result).toEqual({
          ok: false,
          status: 500,
          error: 'Failed to fetch prototypes',
          details: {},
        });
      });

      it('maps null to 500', () => {
        const result = handleApiError(null);

        expect(result).toEqual({
          ok: false,
          status: 500,
          error: 'Failed to fetch prototypes',
          details: {},
        });
      });

      it('maps undefined to 500', () => {
        const result = handleApiError(undefined);

        expect(result).toEqual({
          ok: false,
          status: 500,
          error: 'Failed to fetch prototypes',
          details: {},
        });
      });

      it('maps number to 500', () => {
        const result = handleApiError(404);

        expect(result).toEqual({
          ok: false,
          status: 500,
          error: 'Failed to fetch prototypes',
          details: {},
        });
      });

      it('includes empty details for unexpected errors', () => {
        const error = new Error('Network failure');
        const result = handleApiError(error);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.details).toEqual({});
        }
      });

      it('handles TypeError with proper error message', () => {
        const error = new TypeError('Cannot read property of undefined');
        const result = handleApiError(error);

        expect(result).toEqual({
          ok: false,
          status: 500,
          error: 'Cannot read property of undefined',
          details: {},
        });
      });

      it('handles RangeError with proper error message', () => {
        const error = new RangeError('Array length out of bounds');
        const result = handleApiError(error);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.status).toBe(500);
          expect(result.error).toBe('Array length out of bounds');
        }
      });

      it('handles Error with empty message', () => {
        const error = new Error('');
        const result = handleApiError(error);

        expect(result).toEqual({
          ok: false,
          status: 500,
          error: '',
          details: {},
        });
      });

      it('handles plain object without status', () => {
        const error = { message: 'Plain object error' };
        const result = handleApiError(error);

        expect(result).toEqual({
          ok: false,
          status: 500,
          error: 'Failed to fetch prototypes',
          details: {},
        });
      });

      it('handles array as error', () => {
        const error = ['error', 'occurred'];
        const result = handleApiError(error);

        expect(result).toEqual({
          ok: false,
          status: 500,
          error: 'Failed to fetch prototypes',
          details: {},
        });
      });

      it('handles function as error', () => {
        const error = () => 'error function';
        const result = handleApiError(error);

        expect(result).toEqual({
          ok: false,
          status: 500,
          error: 'Failed to fetch prototypes',
          details: {},
        });
      });

      it('handles symbol as error', () => {
        const error = Symbol('error');
        const result = handleApiError(error);

        expect(result).toEqual({
          ok: false,
          status: 500,
          error: 'Failed to fetch prototypes',
          details: {},
        });
      });

      it('handles boolean as error', () => {
        const result = handleApiError(false);

        expect(result).toEqual({
          ok: false,
          status: 500,
          error: 'Failed to fetch prototypes',
          details: {},
        });
      });

      it('handles RegExp as error', () => {
        const error = /error pattern/;
        const result = handleApiError(error);

        expect(result).toEqual({
          ok: false,
          status: 500,
          error: 'Failed to fetch prototypes',
          details: {},
        });
      });

      it('handles Date as error', () => {
        const error = new Date();
        const result = handleApiError(error);

        expect(result).toEqual({
          ok: false,
          status: 500,
          error: 'Failed to fetch prototypes',
          details: {},
        });
      });

      it('handles Map as error', () => {
        const error = new Map([['key', 'value']]);
        const result = handleApiError(error);

        expect(result).toEqual({
          ok: false,
          status: 500,
          error: 'Failed to fetch prototypes',
          details: {},
        });
      });

      it('handles Set as error', () => {
        const error = new Set([1, 2, 3]);
        const result = handleApiError(error);

        expect(result).toEqual({
          ok: false,
          status: 500,
          error: 'Failed to fetch prototypes',
          details: {},
        });
      });

      it('handles Promise as error', () => {
        const error = Promise.resolve('error');
        const result = handleApiError(error);

        expect(result).toEqual({
          ok: false,
          status: 500,
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
          status: 500,
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
          expect(result.status).toBe(500);
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
          // Number('NOT_A_NUMBER') returns NaN
          expect(Number.isNaN(result.status)).toBe(true);
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
        expect(result).toHaveProperty('status');
        expect(result).toHaveProperty('error');
        expect(result).toHaveProperty('details');

        expect(Object.keys(result).sort()).toEqual([
          'details',
          'error',
          'ok',
          'status',
        ]);
      });

      it('status is always a number', () => {
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
            expect(typeof result.status).toBe('number');
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
            expect(result).toHaveProperty('status');
            expect(result).toHaveProperty('error');
            expect(result).toHaveProperty('details');
          }
        });

        if (!results[0]!.ok && !results[1]!.ok && !results[2]!.ok) {
          expect(results[0]!.status).toBe(504);
          expect(results[1]!.status).toBe(500);
          expect(results[2]!.status).toBe(404);
        }
      });
    });

    describe('v2.0.0 error format compatibility', () => {
      it('handles v2.0.0 error format with req.url', () => {
        const v2Error = Object.assign(new Error('API request failed'), {
          status: 404,
          statusText: 'Not Found',
          code: 'RESOURCE_NOT_FOUND',
          req: {
            url: 'https://protopedia.cc/api/prototypes',
            method: 'GET',
          },
        });

        const result = handleApiError(v2Error);

        expect(result).toEqual({
          ok: false,
          status: 404,
          error: 'API request failed',
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

      it('handles v2.0.0 error with req.url only', () => {
        const v2Error = Object.assign(new Error('API request failed'), {
          status: 500,
          req: {
            url: 'https://protopedia.cc/api/prototypes',
            method: 'POST',
          },
        });

        const result = handleApiError(v2Error);

        expect(result).toEqual({
          ok: false,
          status: 500,
          error: 'API request failed',
          details: {
            req: {
              url: 'https://protopedia.cc/api/prototypes',
              method: 'POST',
            },
          },
        });
      });

      it('handles v2.0.0 error without method', () => {
        const v2Error = Object.assign(new Error('API request failed'), {
          status: 403,
          req: {
            url: 'https://protopedia.cc/api/prototypes',
          },
        });

        const result = handleApiError(v2Error);

        expect(result).toEqual({
          ok: false,
          status: 403,
          error: 'API request failed',
          details: {
            req: {
              url: 'https://protopedia.cc/api/prototypes',
            },
          },
        });
      });
    });
  });
});
