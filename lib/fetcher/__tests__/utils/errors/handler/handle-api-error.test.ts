/**
 * @fileoverview Delegation tests for handleApiError
 *
 * This suite covers cross-cutting behavior that spans both ProtoPedia and
 * non-ProtoPedia branches. ProtoPedia-specific cases live under
 * proto-pedia-error/, and non-ProtoPedia cases live under not-proto-pedia-error/.
 */
import { ProtoPediaApiError } from 'protopedia-api-v2-client';
import { describe, expect, it } from 'vitest';

import type { FetchPrototypesResult } from '../../../../types/result.types.js';
import { handleApiError } from '../../../../utils/errors/handler.js';

describe('handleApiError - delegation', () => {
  it('delegates ProtoPediaApiError to http failure with mapped code', () => {
    const apiError = new ProtoPediaApiError({
      message: 'Server exploded',
      req: {
        url: 'https://protopedia.cc/api/prototypes',
        method: 'GET',
      },
      status: 500,
      statusText: 'Internal Server Error',
    });

    const result = handleApiError(apiError);

    expect(result).toEqual({
      ok: false,
      origin: 'fetcher',
      kind: 'http',
      code: 'SERVER_INTERNAL_ERROR',
      status: 500,
      error: 'Server exploded',
      details: {
        req: {
          url: 'https://protopedia.cc/api/prototypes',
          method: 'GET',
        },
        res: {
          statusText: 'Internal Server Error',
        },
      },
    });
  });

  it('delegates AbortError to abort failure without status', () => {
    const abortError = new DOMException('Aborted', 'AbortError');

    const result = handleApiError(abortError);

    expect(result).toEqual({
      ok: false,
      origin: 'fetcher',
      kind: 'abort',
      code: 'ABORTED',
      error: 'Upstream request aborted',
      details: {},
    });
  });

  it('classifies browser TypeError("Failed to fetch") as BROWSER_FETCH_FAILED', () => {
    const error = new TypeError('Failed to fetch');

    const result = handleApiError(error);

    expect(result).toEqual({
      ok: false,
      origin: 'fetcher',
      kind: 'browser_fetch',
      code: 'BROWSER_FETCH_FAILED',
      error: 'Failed to fetch',
      details: {},
    });
  });

  it('returns ok: false for non-error values and keeps details object', () => {
    const inputs = ['string', 42, null, undefined];

    inputs.forEach((input) => {
      const result: FetchPrototypesResult = handleApiError(input);
      expect(result.ok).toBe(false);
      if (result.ok) {
        throw new Error('Expected failure result');
      }
      expect(result.details).toEqual({});
      expect(result.status).toBeUndefined();
    });
  });
});
