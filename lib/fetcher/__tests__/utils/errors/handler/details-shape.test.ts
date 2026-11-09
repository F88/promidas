/**
 * @fileoverview Tests for the shape of `details` and how `causeCode` is found.
 *
 * `details.res` only describes a received response, and `details.causeCode`
 * only holds a string code found on the error. Values that promidas sets, such
 * as TIMEOUT or NETWORK_ERROR, must not appear in `details` (Issue #157).
 */
import {
  ProtoPediaApiError,
  ResponseBodyReadError,
} from 'protopedia-api-v2-client';
import { describe, expect, it } from 'vitest';

import { handleApiError } from '../../../../utils/errors/handler.js';

const req = { method: 'GET', url: 'https://example.com/prototype/list' };

describe('handleApiError - details', () => {
  it.each([
    [
      'an HTTP error',
      new ProtoPediaApiError({
        message: 'API request failed',
        req,
        status: 401,
        statusText: 'Unauthorized',
      }),
      'http',
      { req, res: { statusText: 'Unauthorized' } },
    ],
    ['a timeout', new DOMException('Timed out', 'TimeoutError'), 'timeout', {}],
    ['an abort', new DOMException('Aborted', 'AbortError'), 'abort', {}],
    [
      'a browser fetch failure',
      new TypeError('Failed to fetch'),
      'browser_fetch',
      {},
    ],
    [
      'a Node.js fetch failure without a code',
      new TypeError('fetch failed'),
      'network',
      {},
    ],
    [
      'a failed body read without a code',
      new ResponseBodyReadError({ req, cause: new TypeError('Load failed') }),
      'network',
      {},
    ],
    [
      'a Node.js connection error',
      new TypeError('fetch failed', {
        cause: Object.assign(new Error('connect'), { code: 'ECONNREFUSED' }),
      }),
      'network',
      { causeCode: 'ECONNREFUSED' },
    ],
    ['an unknown error', new Error('Something broke'), 'unknown', {}],
  ])('has the expected details for %s', (_name, error, kind, details) => {
    const result = handleApiError(error);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe(kind);
      expect(result.details).toEqual(details);
    }
  });
});

describe('handleApiError - causeCode', () => {
  it.each([
    [
      'the error',
      Object.assign(new Error('reset'), { code: 'ECONNRESET' }),
      'ECONNRESET',
    ],
    [
      'the cause',
      new Error('fetch failed', {
        cause: Object.assign(new Error('reset'), { code: 'ECONNRESET' }),
      }),
      'ECONNRESET',
    ],
    [
      'the cause of the cause',
      new Error('terminated', {
        cause: new Error('socket', {
          cause: Object.assign(new Error('closed'), {
            code: 'UND_ERR_SOCKET',
          }),
        }),
      }),
      'UND_ERR_SOCKET',
    ],
    [
      'the error before its cause',
      Object.assign(
        new Error('outer', {
          cause: Object.assign(new Error('inner'), { code: 'INNER' }),
        }),
        { code: 'OUTER' },
      ),
      'OUTER',
    ],
    [
      'a string code after a numeric one',
      Object.assign(
        new Error('outer', {
          cause: Object.assign(new Error('inner'), { code: 'ECONNRESET' }),
        }),
        { code: 23 },
      ),
      'ECONNRESET',
    ],
  ])('takes the code from %s', (_name, error, causeCode) => {
    const result = handleApiError(error);

    expect(result).toMatchObject({ kind: 'network', details: { causeCode } });
  });

  it('ignores a code that is not a string', () => {
    const error = Object.assign(new Error('Weird'), { code: 42 });

    const result = handleApiError(error);

    expect(result).toMatchObject({
      kind: 'unknown',
      code: 'UNKNOWN',
      details: {},
    });
  });

  it('keeps a code outside FetcherErrorCode only in causeCode', () => {
    const error = Object.assign(new Error('reset'), { code: 'ECONNRESET' });

    const result = handleApiError(error);

    expect(result).toMatchObject({
      kind: 'network',
      code: 'NETWORK_ERROR',
      details: { causeCode: 'ECONNRESET' },
    });
  });
});
