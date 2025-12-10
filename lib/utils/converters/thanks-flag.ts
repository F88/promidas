/**
 * Thanks flag value to label converter.
 *
 * Converts numeric thanks flag codes from the ProtoPedia API to labels.
 *
 * This flag controls whether the "Thank you for posting" message has been shown.
 *
 * @module utils/converters/thanks-flag
 */

import type { ThanksFlagCode } from '../types/index.js';

/**
 * Thanks flag labels mapping.
 *
 * - 0: (Implicit) Message not yet shown - **Rarely or never seen in API responses**
 * - 1: '初回表示済' ("Thank you for posting" message already shown) - **Most common value in API**
 *
 * Note: Almost all prototypes in API responses have thanksFlg=1.
 * Historical data (~3.26%) may have undefined thanksFlg.
 */
const THANKS_FLAG_LABELS: Record<number, string> = {
  1: '初回表示済',
};

/**
 * Convert thanks flag code to label.
 *
 * @param thanksFlag - Thanks flag from NormalizedPrototype.thanksFlg (may be undefined for old data)
 * @returns Label or the numeric value as string, or '不明' for undefined
 *
 * @example
 * ```typescript
 * getPrototypeThanksFlagLabel(1); // => '初回表示済'
 * getPrototypeThanksFlagLabel(0); // => '0'
 * getPrototypeThanksFlagLabel(undefined); // => '不明'
 * ```
 */
export const getPrototypeThanksFlagLabel = (
  thanksFlag: number | undefined,
): string => {
  if (thanksFlag === undefined) {
    return '不明';
  }
  return THANKS_FLAG_LABELS[thanksFlag] ?? `${thanksFlag}`;
};
