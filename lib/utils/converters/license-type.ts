/**
 * License type value to label converter.
 *
 * Converts numeric license type codes from the ProtoPedia API to Japanese labels.
 *
 * @module utils/converters/license-type
 */

import type { LicenseTypeCode } from '../types/index.js';

/**
 * License type labels mapping.
 *
 * - 0: 'なし' (None) - **Not observed in API responses**
 * - 1: '表示(CC:BY)' (Display with Creative Commons Attribution license) - **All API responses have this value**
 *
 * Note: In practice, all prototypes accessible via the public API have licenseType=1.
 *
 * @see https://protopedia.gitbook.io/helpcenter/info/2022.05.23
 */
const LICENSE_TYPE_LABELS: Record<LicenseTypeCode, string> = {
  0: 'なし',
  1: '表示(CC:BY)',
};

/**
 * Convert license type code to label.
 *
 * @param licenseType - License type from NormalizedPrototype.licenseType
 * @returns Japanese label or the numeric value as string if unknown
 *
 * @example
 * ```typescript
 * getPrototypeLicenseTypeLabel(0); // => 'なし'
 * getPrototypeLicenseTypeLabel(1); // => '表示(CC:BY)'
 * getPrototypeLicenseTypeLabel(99); // => '99'
 * ```
 */
export const getPrototypeLicenseTypeLabel = (licenseType: number): string => {
  return (
    LICENSE_TYPE_LABELS[licenseType as LicenseTypeCode] ?? `${licenseType}`
  );
};
