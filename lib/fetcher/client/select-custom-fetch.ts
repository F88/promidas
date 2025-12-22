/**
 * Custom fetch selector function.
 *
 * This module provides a function to select the appropriate custom fetch
 * implementation based on configuration. It evaluates various feature flags
 * and returns the corresponding custom fetch function, or undefined to use
 * the default fetch implementation.
 *
 * @module
 */

import type { Logger } from '../../logger/index.js';
import type { FetchProgressEvent } from '../types/progress-event.types.js';

import { createFetchWithProgress } from './fetch-with-progress.js';

/**
 * Configuration for custom fetch selection.
 */
export interface CustomFetchConfig {
  /**
   * Logger instance for custom fetch implementations.
   */
  logger: Logger;

  /**
   * Whether to enable progress logging.
   */
  enableProgressLog: boolean;

  /**
   * Base fetch function to wrap with progress tracking.
   * If not provided, uses global fetch.
   */
  baseFetch?: typeof fetch;

  /**
   * Optional callback for progress events.
   */
  onProgressEvent?: (event: FetchProgressEvent) => void;
}

/**
 * Select appropriate custom fetch function based on configuration.
 *
 * This function evaluates the provided configuration and returns the appropriate
 * custom fetch function. If no custom features are needed, it returns undefined
 * to allow the default fetch implementation to be used.
 *
 * @param config - Configuration for custom fetch selection
 * @returns Custom fetch function or undefined for default behavior
 *
 * @example
 * ```typescript
 * const customFetch = selectCustomFetch({
 *   logger: myLogger,
 *   enableProgressLog: true,
 * });
 *
 * const client = createProtoPediaClient({
 *   fetch: customFetch, // undefined uses default fetch
 * });
 * ```
 */
export function selectCustomFetch(
  config: CustomFetchConfig,
): typeof fetch | undefined {
  const { logger, enableProgressLog, baseFetch, onProgressEvent } = config;

  // Check if progress tracking is needed
  const needsProgressTracking =
    enableProgressLog || onProgressEvent !== undefined;

  if (needsProgressTracking) {
    return createFetchWithProgress({
      logger,
      enableProgressLog,
      ...(baseFetch !== undefined && { baseFetch }),
      ...(onProgressEvent !== undefined && { onProgressEvent }),
    });
  }

  // Future: Add other custom fetch implementations here
  // Example:
  // if (config.retryEnabled) {
  //   return createFetchWithRetry({ baseFetch, ... });
  // }
  //
  // if (config.cacheEnabled) {
  //   return createFetchWithCache({ baseFetch, ... });
  // }

  // If no custom features needed, return the base fetch or undefined
  return baseFetch;
}
