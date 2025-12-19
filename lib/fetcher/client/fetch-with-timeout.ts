import { PromidasTimeoutError } from '../errors/fetcher-error.js';

export interface FetchWithTimeoutConfig {
  timeoutMs: number;
  baseFetch?: typeof fetch;
}

function isAbortError(error: unknown): error is DOMException {
  return error instanceof DOMException && error.name === 'AbortError';
}

export function createFetchWithTimeout(
  config: FetchWithTimeoutConfig,
): typeof fetch {
  const { timeoutMs, baseFetch } = config;

  return async (url, init) => {
    const fetchFn = baseFetch ?? globalThis.fetch;

    const controller = new AbortController();
    const timeoutError = new PromidasTimeoutError(timeoutMs);

    const abortFromCaller = () => {
      // Preserve caller-provided abort reason when available
      controller.abort(init?.signal?.reason);
    };

    if (init?.signal?.aborted) {
      abortFromCaller();
    } else if (init?.signal) {
      init.signal.addEventListener('abort', abortFromCaller, { once: true });
    }

    const timeoutId = setTimeout(() => {
      controller.abort(timeoutError);
    }, timeoutMs);

    try {
      return await fetchFn(url, {
        ...init,
        signal: controller.signal,
      });
    } catch (error) {
      // Some runtimes may reject with AbortError instead of the abort reason.
      if (error === timeoutError) {
        throw error;
      }

      if (isAbortError(error) && controller.signal.reason === timeoutError) {
        throw timeoutError;
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
      if (init?.signal) {
        init.signal.removeEventListener('abort', abortFromCaller);
      }
    }
  };
}
