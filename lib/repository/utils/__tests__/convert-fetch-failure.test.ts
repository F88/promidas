import { describe, expect, it } from 'vitest';

import type { FetchPrototypesFailure } from '../../../fetcher/types/result.types.js';
import { convertFetchFailure } from '../convert-fetch-failure.js';

describe('convertFetchFailure', () => {
  describe('Basic conversion', () => {
    it('should convert error with only error message', () => {
      const fetchFailure: FetchPrototypesFailure = {
        ok: false,
        error: 'Network error',
        details: {},
      };

      const result = convertFetchFailure(fetchFailure);

      expect(result).toStrictEqual({
        ok: false,
        error: 'Network error',
      });
    });

    it('should preserve ok: false property', () => {
      const fetchFailure: FetchPrototypesFailure = {
        ok: false,
        error: 'Error',
        details: {},
      };

      const result = convertFetchFailure(fetchFailure);

      expect(result.ok).toBe(false);
    });

    it('should not mutate the input object', () => {
      const fetchFailure: FetchPrototypesFailure = {
        ok: false,
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
      };
      const original = JSON.parse(
        JSON.stringify(fetchFailure),
      ) as FetchPrototypesFailure;

      convertFetchFailure(fetchFailure);

      expect(fetchFailure).toStrictEqual(original);
    });

    it('should not remove or rewrite details from the input', () => {
      const fetchFailure: FetchPrototypesFailure = {
        ok: false,
        error: 'Error',
        details: {
          res: {
            code: 'INTERNAL_ERROR',
          },
        },
      };

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
      const fetchFailure: FetchPrototypesFailure = {
        ok: false,
        error: 'Not Found',
        status: 404,
        details: {},
      };

      const result = convertFetchFailure(fetchFailure);

      expect(result).toStrictEqual({
        ok: false,
        error: 'Not Found',
        status: 404,
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
        const fetchFailure: FetchPrototypesFailure = {
          ok: false,
          error: testCase.error,
          status: testCase.status,
          details: {},
        };

        const result = convertFetchFailure(fetchFailure);

        expect(result.status).toBe(testCase.status);
      }
    });

    it('should omit status when undefined', () => {
      const fetchFailure: FetchPrototypesFailure = {
        ok: false,
        error: 'Connection error',
        details: {},
      };

      const result = convertFetchFailure(fetchFailure);

      expect(result).not.toHaveProperty('status');
    });
  });

  describe('Error code handling', () => {
    it('should include code when present in details.res', () => {
      const fetchFailure: FetchPrototypesFailure = {
        ok: false,
        error: 'Resource not found',
        details: {
          res: {
            code: 'RESOURCE_NOT_FOUND',
          },
        },
      };

      const result = convertFetchFailure(fetchFailure);

      expect(result).toStrictEqual({
        ok: false,
        error: 'Resource not found',
        code: 'RESOURCE_NOT_FOUND',
      });
    });

    it('should handle various error codes', () => {
      const testCases = [
        'UNAUTHORIZED',
        'FORBIDDEN',
        'RESOURCE_NOT_FOUND',
        'INTERNAL_ERROR',
        'ECONNREFUSED',
        'ETIMEDOUT',
      ];

      for (const code of testCases) {
        const fetchFailure: FetchPrototypesFailure = {
          ok: false,
          error: 'Error',
          details: {
            res: {
              code,
            },
          },
        };

        const result = convertFetchFailure(fetchFailure);

        expect(result.code).toBe(code);
      }
    });

    it('should omit code when details.res is undefined', () => {
      const fetchFailure: FetchPrototypesFailure = {
        ok: false,
        error: 'Request failed',
        details: {
          req: {
            method: 'GET',
            url: 'https://example.com',
          },
        },
      };

      const result = convertFetchFailure(fetchFailure);

      expect(result).not.toHaveProperty('code');
    });

    it('should omit code when details.res.code is undefined', () => {
      const fetchFailure: FetchPrototypesFailure = {
        ok: false,
        error: 'Request failed',
        details: {
          res: {
            statusText: 'Not Found',
          },
        },
      };

      const result = convertFetchFailure(fetchFailure);

      expect(result).not.toHaveProperty('code');
    });
  });

  describe('Combined properties', () => {
    it('should include both status and code when both are present', () => {
      const fetchFailure: FetchPrototypesFailure = {
        ok: false,
        error: 'Unauthorized',
        status: 401,
        details: {
          res: {
            code: 'UNAUTHORIZED',
            statusText: 'Unauthorized',
          },
        },
      };

      const result = convertFetchFailure(fetchFailure);

      expect(result).toStrictEqual({
        ok: false,
        error: 'Unauthorized',
        status: 401,
        code: 'UNAUTHORIZED',
      });
    });

    it('should include all available properties', () => {
      const fetchFailure: FetchPrototypesFailure = {
        ok: false,
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
      };

      const result = convertFetchFailure(fetchFailure);

      expect(result).toStrictEqual({
        ok: false,
        error: 'Server error',
        status: 500,
        code: 'INTERNAL_ERROR',
      });
    });
  });

  describe('Details object handling', () => {
    it('should omit details object from the result', () => {
      const fetchFailure: FetchPrototypesFailure = {
        ok: false,
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
      };

      const result = convertFetchFailure(fetchFailure);

      expect(result).not.toHaveProperty('details');
    });

    it('should handle empty details object', () => {
      const fetchFailure: FetchPrototypesFailure = {
        ok: false,
        error: 'Connection failed',
        details: {},
      };

      const result = convertFetchFailure(fetchFailure);

      expect(result).toStrictEqual({
        ok: false,
        error: 'Connection failed',
      });
      expect(result).not.toHaveProperty('details');
    });

    it('should omit details.req information', () => {
      const fetchFailure: FetchPrototypesFailure = {
        ok: false,
        error: 'Request failed',
        details: {
          req: {
            method: 'GET',
            url: 'https://example.com',
          },
        },
      };

      const result = convertFetchFailure(fetchFailure);

      expect(result).not.toHaveProperty('details');
      expect(result).not.toHaveProperty('req');
    });

    it('should omit details.res.statusText', () => {
      const fetchFailure: FetchPrototypesFailure = {
        ok: false,
        error: 'Not Found',
        status: 404,
        details: {
          res: {
            statusText: 'Not Found',
            code: 'RESOURCE_NOT_FOUND',
          },
        },
      };

      const result = convertFetchFailure(fetchFailure);

      expect(result).toStrictEqual({
        ok: false,
        error: 'Not Found',
        status: 404,
        code: 'RESOURCE_NOT_FOUND',
      });
      expect(result).not.toHaveProperty('statusText');
    });
  });

  describe('Edge cases', () => {
    it('should handle status: 0', () => {
      const fetchFailure: FetchPrototypesFailure = {
        ok: false,
        error: 'Connection refused',
        status: 0,
        details: {},
      };

      const result = convertFetchFailure(fetchFailure);

      expect(result.status).toBe(0);
    });

    it('should handle empty string as error', () => {
      const fetchFailure: FetchPrototypesFailure = {
        ok: false,
        error: '',
        details: {},
      };

      const result = convertFetchFailure(fetchFailure);

      expect(result.error).toBe('');
    });

    it('should handle empty string as code', () => {
      const fetchFailure: FetchPrototypesFailure = {
        ok: false,
        error: 'Error',
        details: {
          res: {
            code: '',
          },
        },
      };

      const result = convertFetchFailure(fetchFailure);

      // Empty string is still a defined value and should be preserved
      expect(result).toStrictEqual({
        ok: false,
        error: 'Error',
        code: '',
      });
    });

    it('should handle very long error messages', () => {
      const longError = 'A'.repeat(1000);
      const fetchFailure: FetchPrototypesFailure = {
        ok: false,
        error: longError,
        details: {},
      };

      const result = convertFetchFailure(fetchFailure);

      expect(result.error).toBe(longError);
      expect(result.error.length).toBe(1000);
    });

    it('should handle error messages with special characters', () => {
      const fetchFailure: FetchPrototypesFailure = {
        ok: false,
        error:
          'Error: Connection failed\nCause: ECONNREFUSED\t(127.0.0.1:8080)',
        details: {},
      };

      const result = convertFetchFailure(fetchFailure);

      expect(result.error).toBe(
        'Error: Connection failed\nCause: ECONNREFUSED\t(127.0.0.1:8080)',
      );
    });

    it('should handle error messages with unicode characters', () => {
      const fetchFailure: FetchPrototypesFailure = {
        ok: false,
        error: 'エラーが発生しました: 接続失敗 🚫',
        details: {},
      };

      const result = convertFetchFailure(fetchFailure);

      expect(result.error).toBe('エラーが発生しました: 接続失敗 🚫');
    });

    it('should handle negative status codes', () => {
      const fetchFailure: FetchPrototypesFailure = {
        ok: false,
        error: 'Invalid status',
        status: -1,
        details: {},
      };

      const result = convertFetchFailure(fetchFailure);

      expect(result.status).toBe(-1);
    });

    it('should handle very large status codes', () => {
      const fetchFailure: FetchPrototypesFailure = {
        ok: false,
        error: 'Unknown status',
        status: 999,
        details: {},
      };

      const result = convertFetchFailure(fetchFailure);

      expect(result.status).toBe(999);
    });
  });

  describe('Type safety', () => {
    it('should return SnapshotOperationFailure type', () => {
      const fetchFailure: FetchPrototypesFailure = {
        ok: false,
        error: 'Error',
        status: 500,
        details: {
          res: {
            code: 'INTERNAL_ERROR',
          },
        },
      };

      const result = convertFetchFailure(fetchFailure);

      // Type assertions to verify the return type matches SnapshotOperationFailure
      expect(result).toHaveProperty('ok');
      expect(result).toHaveProperty('error');
      expect(result.ok).toBe(false);
      expect(typeof result.error).toBe('string');
      if ('status' in result) {
        expect(typeof result.status).toBe('number');
      }
      if ('code' in result) {
        expect(typeof result.code).toBe('string');
      }
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle 404 Not Found API error', () => {
      const fetchFailure: FetchPrototypesFailure = {
        ok: false,
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
      };

      const result = convertFetchFailure(fetchFailure);

      expect(result).toStrictEqual({
        ok: false,
        error: 'Prototype not found',
        status: 404,
        code: 'RESOURCE_NOT_FOUND',
      });
    });

    it('should handle network timeout error', () => {
      const fetchFailure: FetchPrototypesFailure = {
        ok: false,
        error: 'Request timeout',
        details: {
          res: {
            code: 'ETIMEDOUT',
          },
        },
      };

      const result = convertFetchFailure(fetchFailure);

      expect(result).toStrictEqual({
        ok: false,
        error: 'Request timeout',
        code: 'ETIMEDOUT',
      });
    });

    it('should handle connection refused error', () => {
      const fetchFailure: FetchPrototypesFailure = {
        ok: false,
        error: 'connect ECONNREFUSED',
        details: {
          res: {
            code: 'ECONNREFUSED',
          },
        },
      };

      const result = convertFetchFailure(fetchFailure);

      expect(result).toStrictEqual({
        ok: false,
        error: 'connect ECONNREFUSED',
        code: 'ECONNREFUSED',
      });
    });

    it('should handle 401 Unauthorized error', () => {
      const fetchFailure: FetchPrototypesFailure = {
        ok: false,
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
      };

      const result = convertFetchFailure(fetchFailure);

      expect(result).toStrictEqual({
        ok: false,
        error: 'Authentication required',
        status: 401,
        code: 'UNAUTHORIZED',
      });
    });

    it('should handle 500 Internal Server Error', () => {
      const fetchFailure: FetchPrototypesFailure = {
        ok: false,
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
      };

      const result = convertFetchFailure(fetchFailure);

      expect(result).toStrictEqual({
        ok: false,
        error: 'Internal server error',
        status: 500,
        code: 'INTERNAL_ERROR',
      });
    });

    it('should handle DNS resolution failure', () => {
      const fetchFailure: FetchPrototypesFailure = {
        ok: false,
        error: 'getaddrinfo ENOTFOUND example.com',
        details: {
          res: {
            code: 'ENOTFOUND',
          },
        },
      };

      const result = convertFetchFailure(fetchFailure);

      expect(result).toStrictEqual({
        ok: false,
        error: 'getaddrinfo ENOTFOUND example.com',
        code: 'ENOTFOUND',
      });
    });

    it('should handle AbortError without status or code', () => {
      const fetchFailure: FetchPrototypesFailure = {
        ok: false,
        error: 'The operation was aborted',
        details: {},
      };

      const result = convertFetchFailure(fetchFailure);

      expect(result).toStrictEqual({
        ok: false,
        error: 'The operation was aborted',
      });
    });
  });
});
