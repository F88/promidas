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
   * Optional callback when download starts.
   */
  onProgressStart?: (
    estimatedTotal: number,
    limit: number,
    prepareTime: number,
  ) => void;

  /**
   * Optional callback for progress updates.
   */
  onProgress?: (received: number, total: number, percentage: number) => void;

  /**
   * Optional callback when download completes.
   */
  onProgressComplete?: (
    received: number,
    estimatedTotal: number,
    downloadTime: number,
    totalTime: number,
  ) => void;
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
  const {
    logger,
    enableProgressLog,
    onProgressStart,
    onProgress,
    onProgressComplete,
  } = config;

  // Check if progress tracking is needed
  const needsProgressTracking =
    enableProgressLog ||
    onProgressStart !== undefined ||
    onProgress !== undefined ||
    onProgressComplete !== undefined;

  if (needsProgressTracking) {
    return createFetchWithProgress({
      logger,
      enableProgressLog,
      ...(onProgressStart !== undefined && { onProgressStart }),
      ...(onProgress !== undefined && { onProgress }),
      ...(onProgressComplete !== undefined && { onProgressComplete }),
    });
  }

  // Future: Add other custom fetch implementations here
  // Example:
  // if (config.retryEnabled) {
  //   return createFetchWithRetry({ ... });
  // }
  //
  // if (config.cacheEnabled) {
  //   return createFetchWithCache({ ... });
  // }

  // Use default fetch
  return undefined;
}
