import { describe, expect, it, vi } from 'vitest';

import { NetworkFailure } from '../../types/prototype-api.types.js';
import {
  constructDisplayMessage,
  handleApiError,
  resolveErrorMessage,
} from '../../utils/network-utils';

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
          statusText: 'Not Found',
          code: undefined,
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
          code: 'ECONNREFUSED',
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
          statusText: 'Unauthorized',
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
          statusText: 'Service Unavailable',
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
          statusText: 'Not Found',
          code: 'ERR_404',
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

    describe('HTTP-like error handling', () => {
      it('normalizes HTTP error with all metadata fields', () => {
        const httpError = Object.assign(new Error('Prototype not found'), {
          status: 404,
          statusText: 'Not Found',
          code: 'RESOURCE_NOT_FOUND',
          url: 'https://protopedia.cc/api/prototypes',
          requestId: 'req-12345',
        });

        const result = handleApiError(httpError);

        expect(result).toEqual({
          ok: false,
          status: 404,
          error: 'Prototype not found',
          details: {
            statusText: 'Not Found',
            code: 'RESOURCE_NOT_FOUND',
            url: 'https://protopedia.cc/api/prototypes',
            requestId: 'req-12345',
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
            statusText: 'Unauthorized',
            code: undefined,
            url: undefined,
            requestId: undefined,
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
            statusText: undefined,
            code: 'SERVICE_UNAVAILABLE',
            url: undefined,
            requestId: undefined,
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
        });
      });

      it('maps unexpected string to 500', () => {
        const result = handleApiError('Something went wrong');

        expect(result).toEqual({
          ok: false,
          status: 500,
          error: 'Failed to fetch prototypes',
        });
      });

      it('maps null to 500', () => {
        const result = handleApiError(null);

        expect(result).toEqual({
          ok: false,
          status: 500,
          error: 'Failed to fetch prototypes',
        });
      });

      it('maps undefined to 500', () => {
        const result = handleApiError(undefined);

        expect(result).toEqual({
          ok: false,
          status: 500,
          error: 'Failed to fetch prototypes',
        });
      });

      it('maps number to 500', () => {
        const result = handleApiError(404);

        expect(result).toEqual({
          ok: false,
          status: 500,
          error: 'Failed to fetch prototypes',
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
    });
  });
});
