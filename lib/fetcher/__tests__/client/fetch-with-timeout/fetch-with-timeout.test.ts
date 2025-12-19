import { describe, expect, it, vi } from 'vitest';

import { createFetchWithTimeout } from '../../../client/fetch-with-timeout.js';
import { PromidasTimeoutError } from '../../../utils/errors/timeout-error.js';

describe('createFetchWithTimeout', () => {
  it('throws PromidasTimeoutError when the timeout triggers', async () => {
    vi.useFakeTimers();

    try {
      const baseFetch = vi.fn((_, init) => {
        return new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener(
            'abort',
            () => {
              reject(new DOMException('Aborted', 'AbortError'));
            },
            { once: true },
          );
        });
      });
      const fetchWithTimeout = createFetchWithTimeout({
        timeoutMs: 10,
        baseFetch,
      });

      const promise = fetchWithTimeout('https://example.test', {});
      const assertion =
        expect(promise).rejects.toBeInstanceOf(PromidasTimeoutError);

      await vi.advanceTimersByTimeAsync(20);
      await Promise.resolve();

      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });

  it('preserves AbortError when caller aborts', async () => {
    const abortError = new DOMException('Aborted', 'AbortError');

    const baseFetch = vi.fn(async () => {
      throw abortError;
    });

    const controller = new AbortController();
    controller.abort();

    const fetchWithTimeout = createFetchWithTimeout({
      timeoutMs: 10,
      baseFetch,
    });

    await expect(
      fetchWithTimeout('https://example.test', { signal: controller.signal }),
    ).rejects.toBe(abortError);
  });
});
