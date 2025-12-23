import { describe, expect, it, vi } from 'vitest';

import { createFetchWithTimeout } from '../../../client/fetch-with-timeout.js';
import { PromidasTimeoutError } from '../../../errors/fetcher-error.js';

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

  it('handles signal already aborted before fetch call', async () => {
    const baseFetch = vi.fn((_, init) => {
      // When signal is already aborted, fetch should throw immediately
      if (init?.signal?.aborted) {
        const error = new DOMException('Aborted', 'AbortError');
        return Promise.reject(error);
      }
      return Promise.resolve(new Response('ok'));
    });

    const controller = new AbortController();
    const reason = new Error('Custom abort reason');
    controller.abort(reason);

    const fetchWithTimeout = createFetchWithTimeout({
      timeoutMs: 10,
      baseFetch,
    });

    await expect(
      fetchWithTimeout('https://example.test', { signal: controller.signal }),
    ).rejects.toThrow('Aborted');

    // baseFetch should be called (it checks the aborted signal internally)
    expect(baseFetch).toHaveBeenCalled();
  });

  it('throws timeout error when baseFetch rejects with exact timeout error object', async () => {
    vi.useFakeTimers();

    try {
      const baseFetch = vi.fn((_, init) => {
        return new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener(
            'abort',
            () => {
              // Reject with the exact timeout error object (not AbortError wrapper)
              reject(init.signal.reason);
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

  it('returns response when fetch resolves before timeout', async () => {
    vi.useFakeTimers();

    try {
      const response = new Response('ok', { status: 200 });

      const baseFetch = vi.fn(() => {
        return new Promise<Response>((resolve) => {
          setTimeout(() => {
            resolve(response);
          }, 5);
        });
      });

      const fetchWithTimeout = createFetchWithTimeout({
        timeoutMs: 50,
        baseFetch,
      });

      const promise = fetchWithTimeout('https://example.test', {});

      await vi.advanceTimersByTimeAsync(10);
      await expect(promise).resolves.toBe(response);
    } finally {
      vi.useRealTimers();
    }
  });
});
