/**
 * Release flag value to label converter.
 *
 * Converts numeric release flag codes from the ProtoPedia API to Japanese labels.
 *
 * **Note**: API typically only returns prototypes with `releaseFlg: 2` (publicly released).
 *
 * @module utils/converters/release-flag
 */

import type { ReleaseFlagCode } from '../../types/codes.js';

/**
 * Release flag labels mapping.
 *
 * - 1: '下書き保存' (Draft) - **Not accessible via public API**
 * - 2: '一般公開' (Public) - **Only this value appears in API responses**
 * - 3: '限定共有' (Limited Sharing) - **Not accessible via public API**
 *
 * Note: The public API only returns publicly released prototypes (releaseFlg=2).
 * Draft and limited sharing prototypes are not included in API responses.
 */
const RELEASE_FLAG_LABELS: Record<ReleaseFlagCode, string> = {
  1: '下書き保存',
  2: '一般公開',
  3: '限定共有',
};

/**
 * Convert release flag code to label.
 *
 * @param releaseFlag - Release flag from NormalizedPrototype.releaseFlg
 * @returns Japanese label or the numeric value as string if unknown
 *
 * @example
 * ```typescript
 * getPrototypeReleaseFlagLabel(2); // => '一般公開'
 * getPrototypeReleaseFlagLabel(0); // => '0'
 * ```
 */
export const getPrototypeReleaseFlagLabel = (releaseFlag: number): string => {
  return (
    RELEASE_FLAG_LABELS[releaseFlag as ReleaseFlagCode] ?? `${releaseFlag}`
  );
};
