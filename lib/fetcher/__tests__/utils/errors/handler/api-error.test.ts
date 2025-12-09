/**
 * @fileoverview Tests for handleApiError function - ProtoPediaApiError handling
 *
 * This file is part of a test suite split by error type for better organization.
 * The implementation remains unified in handler.ts (218 lines, single function),
 * while tests are split across 4 files by input error type:
 *
 * - abort-error.test.ts - AbortError/timeout handling
 * - api-error.test.ts (this file) - ProtoPediaApiError handling
 * - http-error.test.ts - HTTP-like errors with status property
 * - network-error.test.ts - Network errors and edge cases
 *
 * This split improves test maintainability without fragmenting the implementation.
 */
import { ProtoPediaApiError } from 'protopedia-api-v2-client';
import { describe, expect, it, vi } from 'vitest';

import { handleApiError } from '../../../../utils/errors/handler.js';

vi.mock('../../../../lib/logger', () => ({
  createConsoleLogger: () => ({
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

describe('handleApiError - ProtoPediaApiError handling', () => {
  describe('4xx client errors', () => {
    it('handles 400 Bad Request', () => {
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
        expect(result.status).toBe(400);
        expect(result.details?.res?.statusText).toBe('Bad Request');
      }
    });

    it('handles 400 Bad Request with missing req.url', () => {
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

    it('handles 401 Unauthorized', () => {
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

    it('handles 404 Not Found with full metadata', () => {
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

    it('handles 404 Not Found with request method and URL', () => {
      const apiError = new ProtoPediaApiError({
        message: 'Not found',
        req: {
          url: 'https://protopedia.cc/api/prototypes/search',
          method: 'GET',
        },
        status: 404,
        statusText: 'Not Found',
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

    it('does not include code field for ProtoPediaApiError (404)', () => {
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

    it('handles 414 URI Too Long with very long URL', () => {
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

    it('handles 429 Too Many Requests', () => {
      const apiError = new ProtoPediaApiError({
        message: 'Rate limit exceeded',
        req: {
          url: 'https://protopedia.cc/api/prototypes',
          method: 'GET',
        },
        status: 429,
        statusText: 'Too Many Requests',
      });

      const result = handleApiError(apiError);

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

    it('handles 499 Client Closed Request', () => {
      const apiError = new ProtoPediaApiError({
        message: 'Client closed request',
        req: {
          url: 'https://protopedia.cc/api/prototypes',
          method: 'POST',
        },
        status: 499,
        statusText: 'Client Closed Request',
      });

      const result = handleApiError(apiError);

      expect(result).toEqual({
        ok: false,
        status: 499,
        error: 'Client closed request',
        details: {
          req: {
            url: 'https://protopedia.cc/api/prototypes',
            method: 'POST',
          },
          res: {
            statusText: 'Client Closed Request',
          },
        },
      });
    });
  });

  describe('5xx server errors', () => {
    it('handles 500 Internal Server Error with empty statusText', () => {
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

    it('handles 500 Internal Server Error with empty message', () => {
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

    it('handles 502 Bad Gateway with missing req.method', () => {
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

    it('handles 503 Service Unavailable', () => {
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
        expect(result.status).toBe(503);
        expect(result.details?.req).toEqual({
          url: 'https://protopedia.cc/api/prototypes/search',
          method: 'GET',
        });
      }
    });
  });
});
