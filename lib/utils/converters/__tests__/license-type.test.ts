import { describe, expect, it } from 'vitest';

import { getPrototypeLicenseTypeLabel } from '../license-type.js';

describe('getPrototypeLicenseTypeLabel', () => {
  it('should return correct label for licenseType 0 (なし)', () => {
    expect(getPrototypeLicenseTypeLabel(0)).toBe('なし');
  });

  it('should return correct label for licenseType 1 (表示(CC:BY))', () => {
    expect(getPrototypeLicenseTypeLabel(1)).toBe('表示(CC:BY)');
  });

  it('should return numeric string for unknown licenseType', () => {
    expect(getPrototypeLicenseTypeLabel(99)).toBe('99');
    expect(getPrototypeLicenseTypeLabel(-1)).toBe('-1');
  });

  it('should handle typical API response (licenseType=1)', () => {
    // In practice, all API responses have licenseType=1
    expect(getPrototypeLicenseTypeLabel(1)).toBe('表示(CC:BY)');
  });
});
