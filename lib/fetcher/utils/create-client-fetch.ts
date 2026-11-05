/**
 * Client fetch function factory.
 *
 * This module provides a factory function that creates a customized fetch function
 * by composing multiple fetch wrappers based on configuration:
 * - Header stripping wrapper (for browser compatibility)
 * - Progress tracking wrapper (if progress features are enabled)
 *
 * @module
 */

import type { Logger } from '../../logger/index.js';
import { selectCustomFetch } from '../client/select-custom-fetch.js';
import type { FetchProgressEvent } from '../types/progress-event.types.js';

import { createFetchWithStrippedHeaders } from './create-fetch-with-stripped-headers.js';

/**
 * Parameters for creating a customized fetch function.
 */
export type CreateClientFetchParams = {
  readonly logger: Logger;
  readonly enableProgressLog: boolean;
  readonly progressCallback: ((event: FetchProgressEvent) => void) | undefined;
  readonly providedFetch: typeof fetch | undefined;
  readonly stripHeaders?: string[] | undefined;
};

/**
 * Create a customized fetch function with optional features.
 *
 * This function composes multiple fetch wrappers in the following order:
 * 1. Header stripping wrapper (if stripHeaders is specified)
 * 2. Progress tracking wrapper (if enableProgressLog or progressCallback is specified)
 *
 * @param params - Configuration parameters for fetch customization
 * @returns Customized fetch function, or undefined to use default fetch
 *
 * @example Basic usage
 * ```typescript
 * const customFetch = createClientFetch({
 *   logger: myLogger,
 *   enableProgressLog: false,
 *   progressCallback: undefined,
 *   providedFetch: undefined,
 * });
 * ```
 *
 * @example With progress tracking
 * ```typescript
 * const customFetch = createClientFetch({
 *   logger: myLogger,
 *   enableProgressLog: true,
 *   progressCallback: (event) => {
 *     if (event.type === 'download-progress') {
 *       console.log(`Progress: ${event.percentage}%`);
 *     }
 *   },
 *   providedFetch: undefined,
 * });
 * ```
 */
export function createClientFetch(
  params: CreateClientFetchParams,
): typeof fetch | undefined {
  const {
    logger,
    enableProgressLog,
    progressCallback,
    providedFetch,
    stripHeaders,
  } = params;

  const shouldStripHeaders =
    Array.isArray(stripHeaders) && stripHeaders.length > 0;

  const baseFetchForStripping: typeof fetch | undefined = shouldStripHeaders
    ? (providedFetch ??
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
    : providedFetch;

  // If user provides a custom fetch, wrap it with progress tracking.
  // Otherwise, progress tracking wraps the global fetch.
  const selected = selectCustomFetch({
    logger,
    enableProgressLog,
    ...(strippedFetch !== undefined && {
      baseFetch: strippedFetch,
    }),
    ...(progressCallback !== undefined && {
      onProgressEvent: progressCallback,
    }),
  });

  return selected;
}
