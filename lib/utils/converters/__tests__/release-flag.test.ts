import { describe, expect, it } from 'vitest';

import { getPrototypeReleaseFlagLabel } from '../release-flag.js';

describe('getPrototypeReleaseFlagLabel', () => {
  it('should return correct label for releaseFlg 1 (下書き保存)', () => {
    expect(getPrototypeReleaseFlagLabel(1)).toBe('下書き保存');
  });

  it('should return correct label for releaseFlg 2 (一般公開)', () => {
    expect(getPrototypeReleaseFlagLabel(2)).toBe('一般公開');
  });

  it('should return correct label for releaseFlg 3 (限定共有)', () => {
    expect(getPrototypeReleaseFlagLabel(3)).toBe('限定共有');
  });

  it('should return numeric string for unknown releaseFlg', () => {
    expect(getPrototypeReleaseFlagLabel(0)).toBe('0');
    expect(getPrototypeReleaseFlagLabel(99)).toBe('99');
  });

  it('should handle typical API response (releaseFlg=2)', () => {
    // In practice, all API responses have releaseFlg=2
    expect(getPrototypeReleaseFlagLabel(2)).toBe('一般公開');
  });
});
