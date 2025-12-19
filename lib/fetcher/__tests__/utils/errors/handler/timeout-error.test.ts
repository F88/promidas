import { describe, expect, it } from 'vitest';

import { PromidasTimeoutError } from '../../../../errors/fetcher-error.js';
import { handleApiError } from '../../../../utils/errors/handler.js';

describe('handleApiError - PromidasTimeoutError handling', () => {
  it('maps PromidasTimeoutError to TIMEOUT with code', () => {
    const timeoutError = new PromidasTimeoutError(5000);
    const result = handleApiError(timeoutError);

    expect(result).toEqual({
      ok: false,
      error: 'Upstream request timed out',
      details: {
        res: {
          code: 'TIMEOUT',
        },
      },
    });
  });
});
