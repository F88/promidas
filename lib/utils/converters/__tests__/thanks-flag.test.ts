import { describe, expect, it } from 'vitest';

import { getPrototypeThanksFlagLabel } from '../thanks-flag.js';

describe('getPrototypeThanksFlagLabel', () => {
  it('should return correct label for thanksFlg 1 (初回表示済)', () => {
    expect(getPrototypeThanksFlagLabel(1)).toBe('初回表示済');
  });

  it('should return numeric string for thanksFlg 0 (no label defined)', () => {
    expect(getPrototypeThanksFlagLabel(0)).toBe('0');
  });

  it('should return numeric string for unknown thanksFlg', () => {
    expect(getPrototypeThanksFlagLabel(99)).toBe('99');
    expect(getPrototypeThanksFlagLabel(-1)).toBe('-1');
  });

  it('should return "不明" for undefined thanksFlg (historical data)', () => {
    // Historical data (~3.26%) may have undefined thanksFlg
    expect(getPrototypeThanksFlagLabel(undefined)).toBe('不明');
  });

  it('should handle typical API response (thanksFlg=1)', () => {
    // In practice, almost all API responses have thanksFlg=1
    expect(getPrototypeThanksFlagLabel(1)).toBe('初回表示済');
  });
});
