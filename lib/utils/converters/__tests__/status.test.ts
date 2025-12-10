import { describe, expect, it } from 'vitest';

import { getPrototypeStatusLabel } from '../status.js';

describe('getPrototypeStatusLabel', () => {
  it('should return correct label for status 1 (アイデア)', () => {
    expect(getPrototypeStatusLabel(1)).toBe('アイデア');
  });

  it('should return correct label for status 2 (開発中)', () => {
    expect(getPrototypeStatusLabel(2)).toBe('開発中');
  });

  it('should return correct label for status 3 (完成)', () => {
    expect(getPrototypeStatusLabel(3)).toBe('完成');
  });

  it('should return correct label for status 4 (供養)', () => {
    expect(getPrototypeStatusLabel(4)).toBe('供養');
  });

  it('should return numeric string for unknown status', () => {
    expect(getPrototypeStatusLabel(99)).toBe('99');
    expect(getPrototypeStatusLabel(0)).toBe('0');
    expect(getPrototypeStatusLabel(-1)).toBe('-1');
  });
});
