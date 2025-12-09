import { describe, expect, it } from 'vitest';

import type { NetworkFailure } from '../../../types/prototype-api.types.js';
import {
  constructDisplayMessage,
  resolveErrorMessage,
} from '../../../utils/errors/messages.js';

describe('error-messages', () => {
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
        details: {},
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
        details: {},
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
        details: {},
      };

      const result = constructDisplayMessage(failure);
      expect(result).toBe(`${longMessage} (500)`);
      expect(result.length).toBe(1006); // 1000 + ' (500)'.length
    });

    it('handles status code 0', () => {
      const failure: NetworkFailure = {
        status: 0,
        error: new Error('Network error'),
        details: {},
      };

      expect(constructDisplayMessage(failure)).toBe('Network error (0)');
    });

    it('handles negative status codes', () => {
      const failure: NetworkFailure = {
        status: -1,
        error: new Error('Invalid status'),
        details: {},
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
});
