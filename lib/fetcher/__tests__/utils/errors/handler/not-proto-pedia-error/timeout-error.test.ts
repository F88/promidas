import { describe, expect, it } from 'vitest';

import { handleNotProtoPediaApiError } from '../../../../../utils/errors/handler.js';

describe('handleNotProtoPediaApiError', () => {
  it('maps TimeoutError to TIMEOUT with code', () => {
    // Same shape the SDK throws when its timeoutMs elapses
    const timeoutError = new DOMException(
      'Request timed out after 5000 ms',
      'TimeoutError',
    );
    const result = handleNotProtoPediaApiError(timeoutError);

    expect(result).toEqual({
      ok: false,
      origin: 'fetcher',
      kind: 'timeout',
      code: 'TIMEOUT',
      error: 'Upstream request timed out',
      details: {},
    });
  });

  it('does not treat the DOMException legacy code of TimeoutError as a network code (Issue #134)', () => {
    const timeoutError = new DOMException('timed out', 'TimeoutError');
    expect(timeoutError.code).toBe(23);

    const result = handleNotProtoPediaApiError(timeoutError);

    expect(result).toMatchObject({ kind: 'timeout', code: 'TIMEOUT' });
  });
});
