import { describe, expect, it } from 'vitest';

import type { FetchPrototypesFailure } from '../../../fetcher/types/result.types.js';
import { convertFetchFailure } from '../convert-fetch-failure.js';

const baseFailureFields: Pick<
  FetchPrototypesFailure,
  'ok' | 'origin' | 'kind' | 'code'
> = {
  ok: false,
  origin: 'fetcher',
  kind: 'unknown',
  code: 'UNKNOWN',
};

const makeFetchFailure = (
  overrides: Omit<FetchPrototypesFailure, 'ok' | 'origin' | 'kind' | 'code'> &
    Partial<Pick<FetchPrototypesFailure, 'kind' | 'code'>>,
): FetchPrototypesFailure => ({
  ...baseFailureFields,
  ...overrides,
});

describe('convertFetchFailure', () => {
  describe('Basic conversion', () => {
    it('should convert error with only error message', () => {
      const fetchFailure = makeFetchFailure({
        error: 'Network error',
        details: {},
      });

      const result = convertFetchFailure(fetchFailure);

      expect(result).toStrictEqual({
        ok: false,
        origin: 'fetcher',
        kind: 'unknown',
        code: 'UNKNOWN',
        message: 'Network error',
        details: {},
      });
    });

    it('should preserve ok: false property', () => {
      const fetchFailure = makeFetchFailure({
        error: 'Error',
        details: {},
      });

      const result = convertFetchFailure(fetchFailure);

      expect(result.ok).toBe(false);
    });

    it('should not mutate the input object', () => {
      const fetchFailure = makeFetchFailure({
        error: 'Not Found',
        status: 404,
        details: {
          req: {
            method: 'GET',
            url: 'https://example.com',
          },
          res: {
            statusText: 'Not Found',
            code: 'RESOURCE_NOT_FOUND',
          },
        },
      });
      const original = JSON.parse(
        JSON.stringify(fetchFailure),
      ) as FetchPrototypesFailure;

      convertFetchFailure(fetchFailure);

      expect(fetchFailure).toStrictEqual(original);
    });

    it('should not remove or rewrite details from the input', () => {
      const fetchFailure = makeFetchFailure({
        error: 'Error',
        details: {
          res: {
            code: 'INTERNAL_ERROR',
          },
        },
      });

      convertFetchFailure(fetchFailure);

      expect(fetchFailure.details).toStrictEqual({
        res: {
          code: 'INTERNAL_ERROR',
        },
      });
    });
  });

  describe('Status code handling', () => {
    it('should include status when present', () => {
      const fetchFailure = makeFetchFailure({
        error: 'Not Found',
        status: 404,
        details: {},
      });

      const result = convertFetchFailure(fetchFailure);

      expect(result).toStrictEqual({
        ok: false,
        origin: 'fetcher',
        kind: 'unknown',
        code: 'UNKNOWN',
        message: 'Not Found',
        status: 404,
        details: {},
      });
    });

    it('should handle various HTTP status codes', () => {
      const testCases = [
        { status: 400, error: 'Bad Request' },
        { status: 401, error: 'Unauthorized' },
        { status: 403, error: 'Forbidden' },
        { status: 500, error: 'Internal Server Error' },
        { status: 503, error: 'Service Unavailable' },
      ];

      for (const testCase of testCases) {
        const fetchFailure = makeFetchFailure({
          error: testCase.error,
          status: testCase.status,
          details: {},
        });

        const result = convertFetchFailure(fetchFailure);

        expect(result.status).toBe(testCase.status);
      }
    });

    it('should omit status when undefined', () => {
      const fetchFailure = makeFetchFailure({
        error: 'Connection error',
        details: {},
      });

      const result = convertFetchFailure(fetchFailure);

      expect(result).not.toHaveProperty('status');
    });
  });

  describe('Kind and code handling', () => {
    it('should preserve kind and code from input', () => {
      const fetchFailure = makeFetchFailure({
        kind: 'http',
        code: 'CLIENT_NOT_FOUND',
        error: 'Resource not found',
        status: 404,
        details: {
          res: {
            code: 'RESOURCE_NOT_FOUND',
          },
        },
      });

      const result = convertFetchFailure(fetchFailure);

      expect(result.kind).toBe('http');
      expect(result.code).toBe('CLIENT_NOT_FOUND');
    });

    it('should handle various kinds', () => {
      const testCases: Array<FetchPrototypesFailure['kind']> = [
        'http',
        'cors',
        'network',
        'timeout',
        'abort',
        'unknown',
      ];

      for (const kind of testCases) {
        const fetchFailure = makeFetchFailure({
          kind,
          error: 'Error',
          details: {},
        });

        const result = convertFetchFailure(fetchFailure);

        expect(result.kind).toBe(kind);
      }
    });

    it('should handle various error codes', () => {
      const testCases = [
        'CLIENT_UNAUTHORIZED',
        'CLIENT_FORBIDDEN',
        'CLIENT_NOT_FOUND',
        'CLIENT_RATE_LIMITED',
        'CLIENT_BAD_REQUEST',
        'CLIENT_METHOD_NOT_ALLOWED',
        'CLIENT_TIMEOUT',
        'CLIENT_ERROR',
        'SERVER_INTERNAL_ERROR',
        'SERVER_BAD_GATEWAY',
        'SERVER_GATEWAY_TIMEOUT',
        'SERVER_SERVICE_UNAVAILABLE',
        'SERVER_ERROR',
        'NETWORK_ERROR',
        'ECONNREFUSED',
        'ENOTFOUND',
        'ETIMEDOUT',
        'TIMEOUT',
        'ABORTED',
        'CORS_BLOCKED',
        'UNKNOWN',
      ];

      for (const code of testCases) {
        const fetchFailure = makeFetchFailure({
          code,
          error: 'Error',
          details: {},
        });

        const result = convertFetchFailure(fetchFailure);

        expect(result.code).toBe(code);
      }
    });
  });

  describe('Combined properties', () => {
    it('should include all properties when present', () => {
      const fetchFailure = makeFetchFailure({
        kind: 'http',
        code: 'CLIENT_UNAUTHORIZED',
        error: 'Unauthorized',
        status: 401,
        details: {
          res: {
            code: 'UNAUTHORIZED',
            statusText: 'Unauthorized',
          },
        },
      });

      const result = convertFetchFailure(fetchFailure);

      expect(result).toStrictEqual({
        ok: false,
        origin: 'fetcher',
        kind: 'http',
        code: 'CLIENT_UNAUTHORIZED',
        message: 'Unauthorized',
        status: 401,
        details: {
          res: {
            code: 'UNAUTHORIZED',
            statusText: 'Unauthorized',
          },
        },
      });
    });

    it('should include all available properties with request details', () => {
      const fetchFailure = makeFetchFailure({
        kind: 'http',
        code: 'SERVER_INTERNAL_ERROR',
        error: 'Server error',
        status: 500,
        details: {
          req: {
            method: 'POST',
            url: 'https://example.com/api',
          },
          res: {
            code: 'INTERNAL_ERROR',
            statusText: 'Internal Server Error',
          },
        },
      });

      const result = convertFetchFailure(fetchFailure);

      expect(result).toStrictEqual({
        ok: false,
        origin: 'fetcher',
        kind: 'http',
        code: 'SERVER_INTERNAL_ERROR',
        message: 'Server error',
        status: 500,
        details: {
          req: {
            method: 'POST',
            url: 'https://example.com/api',
          },
          res: {
            code: 'INTERNAL_ERROR',
            statusText: 'Internal Server Error',
          },
        },
      });
    });
  });

  describe('Details object handling', () => {
    it('should preserve details object in the result', () => {
      const fetchFailure = makeFetchFailure({
        error: 'Server error',
        status: 500,
        details: {
          req: {
            method: 'POST',
            url: 'https://example.com/api',
          },
          res: {
            statusText: 'Internal Server Error',
            code: 'INTERNAL_ERROR',
          },
        },
      });

      const result = convertFetchFailure(fetchFailure);

      expect(result.details).toStrictEqual({
        req: {
          method: 'POST',
          url: 'https://example.com/api',
        },
        res: {
          statusText: 'Internal Server Error',
          code: 'INTERNAL_ERROR',
        },
      });
    });

    it('should preserve empty details object', () => {
      const fetchFailure = makeFetchFailure({
        error: 'Connection failed',
        details: {},
      });

      const result = convertFetchFailure(fetchFailure);

      expect(result).toStrictEqual({
        ok: false,
        origin: 'fetcher',
        kind: 'unknown',
        code: 'UNKNOWN',
        message: 'Connection failed',
        details: {},
      });
    });

    it('should preserve details.req information', () => {
      const fetchFailure = makeFetchFailure({
        error: 'Request failed',
        details: {
          req: {
            method: 'GET',
            url: 'https://example.com',
          },
        },
      });

      const result = convertFetchFailure(fetchFailure);

      expect(result.details).toStrictEqual({
        req: {
          method: 'GET',
          url: 'https://example.com',
        },
      });
    });

    it('should preserve details.res.statusText', () => {
      const fetchFailure = makeFetchFailure({
        error: 'Not Found',
        status: 404,
        details: {
          res: {
            statusText: 'Not Found',
            code: 'RESOURCE_NOT_FOUND',
          },
        },
      });

      const result = convertFetchFailure(fetchFailure);

      expect(result).toStrictEqual({
        ok: false,
        origin: 'fetcher',
        kind: 'unknown',
        code: 'UNKNOWN',
        message: 'Not Found',
        status: 404,
        details: {
          res: {
            statusText: 'Not Found',
            code: 'RESOURCE_NOT_FOUND',
          },
        },
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle status: 0', () => {
      const fetchFailure = makeFetchFailure({
        error: 'Connection refused',
        status: 0,
        details: {},
      });

      const result = convertFetchFailure(fetchFailure);

      expect(result.status).toBe(0);
    });

    it('should handle empty string as error', () => {
      const fetchFailure = makeFetchFailure({
        error: '',
        details: {},
      });

      const result = convertFetchFailure(fetchFailure);

      expect(result.message).toBe('');
    });

    it('should preserve details.res.code even when empty', () => {
      const fetchFailure = makeFetchFailure({
        error: 'Error',
        details: {
          res: {
            code: '',
          },
        },
      });

      const result = convertFetchFailure(fetchFailure);

      expect(result.details).toStrictEqual({
        res: {
          code: '',
        },
      });
    });

    it('should handle very long error messages', () => {
      const longError = 'A'.repeat(1000);
      const fetchFailure = makeFetchFailure({
        error: longError,
        details: {},
      });

      const result = convertFetchFailure(fetchFailure);

      expect(result.message).toBe(longError);
      expect(result.message.length).toBe(1000);
    });

    it('should handle error messages with special characters', () => {
      const fetchFailure = makeFetchFailure({
        error:
          'Error: Connection failed\nCause: ECONNREFUSED\t(127.0.0.1:8080)',
        details: {},
      });

      const result = convertFetchFailure(fetchFailure);

      expect(result.message).toBe(
        'Error: Connection failed\nCause: ECONNREFUSED\t(127.0.0.1:8080)',
      );
    });

    it('should handle error messages with unicode characters', () => {
      const fetchFailure = makeFetchFailure({
        error: 'エラーが発生しました: 接続失敗 🚫',
        details: {},
      });

      const result = convertFetchFailure(fetchFailure);

      expect(result.message).toBe('エラーが発生しました: 接続失敗 🚫');
    });

    it('should handle negative status codes', () => {
      const fetchFailure = makeFetchFailure({
        error: 'Invalid status',
        status: -1,
        details: {},
      });

      const result = convertFetchFailure(fetchFailure);

      expect(result.status).toBe(-1);
    });

    it('should handle very large status codes', () => {
      const fetchFailure = makeFetchFailure({
        error: 'Unknown status',
        status: 999,
        details: {},
      });

      const result = convertFetchFailure(fetchFailure);

      expect(result.status).toBe(999);
    });
  });

  describe('Type safety', () => {
    it('should return FetcherSnapshotFailure type', () => {
      const fetchFailure = makeFetchFailure({
        kind: 'http',
        code: 'SERVER_INTERNAL_ERROR',
        error: 'Error',
        status: 500,
        details: {
          res: {
            code: 'INTERNAL_ERROR',
          },
        },
      });

      const result = convertFetchFailure(fetchFailure);

      // Type assertions to verify the return type matches FetcherSnapshotFailure
      expect(result).toHaveProperty('ok');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('origin');
      expect(result).toHaveProperty('kind');
      expect(result).toHaveProperty('code');
      expect(result).toHaveProperty('details');
      expect(result.ok).toBe(false);
      expect(result.origin).toBe('fetcher');
      expect(typeof result.message).toBe('string');
      expect(typeof result.kind).toBe('string');
      expect(typeof result.code).toBe('string');
      if ('status' in result) {
        expect(typeof result.status).toBe('number');
      }
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle 404 Not Found API error', () => {
      const fetchFailure = makeFetchFailure({
        kind: 'http',
        code: 'CLIENT_NOT_FOUND',
        error: 'Prototype not found',
        status: 404,
        details: {
          req: {
            method: 'GET',
            url: 'https://protopedia.cc/api/prototypes/123',
          },
          res: {
            statusText: 'Not Found',
            code: 'RESOURCE_NOT_FOUND',
          },
        },
      });

      const result = convertFetchFailure(fetchFailure);

      expect(result).toStrictEqual({
        ok: false,
        origin: 'fetcher',
        kind: 'http',
        code: 'CLIENT_NOT_FOUND',
        message: 'Prototype not found',
        status: 404,
        details: {
          req: {
            method: 'GET',
            url: 'https://protopedia.cc/api/prototypes/123',
          },
          res: {
            statusText: 'Not Found',
            code: 'RESOURCE_NOT_FOUND',
          },
        },
      });
    });

    it('should handle network timeout error', () => {
      const fetchFailure = makeFetchFailure({
        kind: 'timeout',
        code: 'TIMEOUT',
        error: 'Request timeout',
        details: {
          res: {
            code: 'ETIMEDOUT',
          },
        },
      });

      const result = convertFetchFailure(fetchFailure);

      expect(result).toStrictEqual({
        ok: false,
        origin: 'fetcher',
        kind: 'timeout',
        code: 'TIMEOUT',
        message: 'Request timeout',
        details: {
          res: {
            code: 'ETIMEDOUT',
          },
        },
      });
    });

    it('should handle connection refused error', () => {
      const fetchFailure = makeFetchFailure({
        kind: 'network',
        code: 'ECONNREFUSED',
        error: 'connect ECONNREFUSED',
        details: {
          res: {
            code: 'ECONNREFUSED',
          },
        },
      });

      const result = convertFetchFailure(fetchFailure);

      expect(result).toStrictEqual({
        ok: false,
        origin: 'fetcher',
        kind: 'network',
        code: 'ECONNREFUSED',
        message: 'connect ECONNREFUSED',
        details: {
          res: {
            code: 'ECONNREFUSED',
          },
        },
      });
    });

    it('should handle 401 Unauthorized error', () => {
      const fetchFailure = makeFetchFailure({
        kind: 'http',
        code: 'CLIENT_UNAUTHORIZED',
        error: 'Authentication required',
        status: 401,
        details: {
          req: {
            method: 'GET',
            url: 'https://protopedia.cc/api/prototypes',
          },
          res: {
            statusText: 'Unauthorized',
            code: 'UNAUTHORIZED',
          },
        },
      });

      const result = convertFetchFailure(fetchFailure);

      expect(result).toStrictEqual({
        ok: false,
        origin: 'fetcher',
        kind: 'http',
        code: 'CLIENT_UNAUTHORIZED',
        message: 'Authentication required',
        status: 401,
        details: {
          req: {
            method: 'GET',
            url: 'https://protopedia.cc/api/prototypes',
          },
          res: {
            statusText: 'Unauthorized',
            code: 'UNAUTHORIZED',
          },
        },
      });
    });

    it('should handle 500 Internal Server Error', () => {
      const fetchFailure = makeFetchFailure({
        kind: 'http',
        code: 'SERVER_INTERNAL_ERROR',
        error: 'Internal server error',
        status: 500,
        details: {
          req: {
            method: 'GET',
            url: 'https://protopedia.cc/api/prototypes',
          },
          res: {
            statusText: 'Internal Server Error',
            code: 'INTERNAL_ERROR',
          },
        },
      });

      const result = convertFetchFailure(fetchFailure);

      expect(result).toStrictEqual({
        ok: false,
        origin: 'fetcher',
        kind: 'http',
        code: 'SERVER_INTERNAL_ERROR',
        message: 'Internal server error',
        status: 500,
        details: {
          req: {
            method: 'GET',
            url: 'https://protopedia.cc/api/prototypes',
          },
          res: {
            statusText: 'Internal Server Error',
            code: 'INTERNAL_ERROR',
          },
        },
      });
    });

    it('should handle DNS resolution failure', () => {
      const fetchFailure = makeFetchFailure({
        kind: 'network',
        code: 'ENOTFOUND',
        error: 'getaddrinfo ENOTFOUND example.com',
        details: {
          res: {
            code: 'ENOTFOUND',
          },
        },
      });

      const result = convertFetchFailure(fetchFailure);

      expect(result).toStrictEqual({
        ok: false,
        origin: 'fetcher',
        kind: 'network',
        code: 'ENOTFOUND',
        message: 'getaddrinfo ENOTFOUND example.com',
        details: {
          res: {
            code: 'ENOTFOUND',
          },
        },
      });
    });

    it('should handle browser-like fetch network errors', () => {
      const fetchFailure = makeFetchFailure({
        kind: 'network',
        code: 'NETWORK_ERROR',
        error: 'Failed to fetch',
        details: {
          res: {
            code: 'NETWORK_ERROR',
          },
        },
      });

      const result = convertFetchFailure(fetchFailure);

      expect(result).toStrictEqual({
        ok: false,
        origin: 'fetcher',
        kind: 'network',
        code: 'NETWORK_ERROR',
        message: 'Failed to fetch',
        details: {
          res: {
            code: 'NETWORK_ERROR',
          },
        },
      });
    });

    it('should handle AbortError', () => {
      const fetchFailure = makeFetchFailure({
        kind: 'abort',
        code: 'ABORTED',
        error: 'The operation was aborted',
        details: {},
      });

      const result = convertFetchFailure(fetchFailure);

      expect(result).toStrictEqual({
        ok: false,
        origin: 'fetcher',
        kind: 'abort',
        code: 'ABORTED',
        message: 'The operation was aborted',
        details: {},
      });
    });

    it('should handle CORS blocked errors', () => {
      const fetchFailure = makeFetchFailure({
        kind: 'cors',
        code: 'CORS_BLOCKED',
        error: 'CORS policy blocked',
        details: {},
      });

      const result = convertFetchFailure(fetchFailure);

      expect(result).toStrictEqual({
        ok: false,
        origin: 'fetcher',
        kind: 'cors',
        code: 'CORS_BLOCKED',
        message: 'CORS policy blocked',
        details: {},
      });
    });
  });
});
