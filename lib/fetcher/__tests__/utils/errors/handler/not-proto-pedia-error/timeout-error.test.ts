import { describe, expect, it } from 'vitest';

import { PromidasTimeoutError } from '../../../../../errors/fetcher-error.js';
import { handleNotProtoPediaApiError } from '../../../../../utils/errors/handler.js';

describe('handleNotProtoPediaApiError', () => {
  it('maps PromidasTimeoutError to TIMEOUT with code', () => {
    const timeoutError = new PromidasTimeoutError(5000);
    const result = handleNotProtoPediaApiError(timeoutError);

    expect(result).toEqual({
      ok: false,
      origin: 'fetcher',
      kind: 'timeout',
      code: 'TIMEOUT',
      error: 'Upstream request timed out',
      details: {
        res: {
          code: 'TIMEOUT',
        },
      },
    });
  });
});
