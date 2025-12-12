/**
 * Status value to label converter.
 *
 * Converts numeric status codes from the ProtoPedia API to Japanese labels.
 *
 * @module utils/converters/status
 */

import type { StatusCode } from '../../types/codes.js';

/**
 * Status labels mapping.
 *
 * - 1: 'アイデア' (Idea) - ~6% of API responses
 * - 2: '開発中' (In Development) - ~35% of API responses
 * - 3: '完成' (Completed) - ~57% of API responses (most common)
 * - 4: '供養' (Retired/Memorial) - ~2% of API responses
 *
 * All four status values appear in public API responses.
 */
const STATUS_LABELS: Record<StatusCode, string> = {
  1: 'アイデア',
  2: '開発中',
  3: '完成',
  4: '供養',
};

/**
 * Convert status code to label.
 *
 * @param status - Status code from NormalizedPrototype.status
 * @returns Japanese label or the numeric value as string if unknown
 *
 * @example
 * ```typescript
 * getPrototypeStatusLabel(1); // => 'アイデア'
 * getPrototypeStatusLabel(3); // => '完成'
 * getPrototypeStatusLabel(99); // => '99'
 * ```
 */
export const getPrototypeStatusLabel = (status: number): string => {
  return STATUS_LABELS[status as StatusCode] ?? `${status}`;
};
