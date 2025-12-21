import type { Logger } from '../../logger/index.js';
import { createFetchWithTimeout } from '../client/fetch-with-timeout.js';
import { selectCustomFetch } from '../client/select-custom-fetch.js';

import { createFetchWithStrippedHeaders } from './create-fetch-with-stripped-headers.js';

export type CreateClientFetchParams = {
  logger: Logger;
  enableProgressLog: boolean;
  progressCallback:
    | {
        onStart?: (
          estimatedTotal: number,
          limit: number,
          prepareTime: number,
        ) => void;
        onProgress?: (
          received: number,
          total: number,
          percentage: number,
        ) => void;
        onComplete?: (
          received: number,
          estimatedTotal: number,
          downloadTime: number,
          totalTime: number,
        ) => void;
      }
    | undefined;
  timeoutMs: number | undefined;
  providedFetch: typeof fetch | undefined;
  stripHeaders?: string[] | undefined;
};

export function createClientFetch(
  params: CreateClientFetchParams,
): typeof fetch | undefined {
  const {
    logger,
    enableProgressLog,
    progressCallback,
    timeoutMs,
    providedFetch,
    stripHeaders,
  } = params;

  const timeoutWrappedFetch: typeof fetch | undefined =
    typeof timeoutMs === 'number'
      ? createFetchWithTimeout({
          timeoutMs,
          baseFetch: providedFetch,
        })
      : providedFetch;

  const shouldStripHeaders =
    Array.isArray(stripHeaders) && stripHeaders.length > 0;

  const baseFetchForStripping: typeof fetch | undefined = shouldStripHeaders
    ? (timeoutWrappedFetch ??
      (typeof globalThis.fetch === 'function'
        ? (globalThis.fetch as typeof fetch)
        : undefined))
    : undefined;

  const strippedFetch: typeof fetch | undefined = shouldStripHeaders
    ? baseFetchForStripping !== undefined
      ? createFetchWithStrippedHeaders({
          baseFetch: baseFetchForStripping,
          headerNames: stripHeaders,
        })
      : undefined
    : timeoutWrappedFetch;

  // If user provides a custom fetch, wrap it with progress tracking.
  // Otherwise, progress tracking wraps the global fetch.
  const selected = selectCustomFetch({
    logger,
    enableProgressLog,
    ...(strippedFetch !== undefined && {
      baseFetch: strippedFetch,
    }),
    ...(progressCallback?.onStart !== undefined && {
      onProgressStart: progressCallback.onStart,
    }),
    ...(progressCallback?.onProgress !== undefined && {
      onProgress: progressCallback.onProgress,
    }),
    ...(progressCallback?.onComplete !== undefined && {
      onProgressComplete: progressCallback.onComplete,
    }),
  });

  // If header stripping was requested, ensure we return a custom fetch even
  // when progress tracking is disabled.
  if (selected === undefined && strippedFetch !== undefined) {
    return strippedFetch;
  }

  return selected;
}
