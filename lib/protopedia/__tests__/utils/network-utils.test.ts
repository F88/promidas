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
