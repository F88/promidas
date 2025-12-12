import { describe, expect, it } from 'vitest';

import { JST_OFFSET_MS } from '../index.js';

describe('Time constants', () => {
  describe('JST_OFFSET_MS', () => {
    it('equals 32400000 milliseconds (9 hours)', () => {
      expect(JST_OFFSET_MS).toBe(32400000);
    });

    it('equals 9 hours in milliseconds', () => {
      const hours = 9;
      const minutesPerHour = 60;
      const secondsPerMinute = 60;
      const msPerSecond = 1000;
      const expected = hours * minutesPerHour * secondsPerMinute * msPerSecond;
      expect(JST_OFFSET_MS).toBe(expected);
    });

    it('is a positive integer', () => {
      expect(JST_OFFSET_MS).toBeGreaterThan(0);
      expect(Number.isInteger(JST_OFFSET_MS)).toBe(true);
    });

    it('matches the JST timezone offset from UTC', () => {
      // JST is UTC+9, so offset should be +9 hours
      const expectedHours = 9;
      const actualHours = JST_OFFSET_MS / (60 * 60 * 1000);
      expect(actualHours).toBe(expectedHours);
    });

    it('correctly offsets JST local time to UTC', () => {
      // When ProtoPedia says "2025-01-01 00:00:00" (JST local time)
      // We treat it as UTC, then subtract JST_OFFSET_MS
      const jstAsUtc = Date.UTC(2025, 0, 1, 0, 0, 0, 0);
      const actualUtc = jstAsUtc - JST_OFFSET_MS;

      // Expected: 2024-12-31 15:00:00 UTC (9 hours earlier)
      const expected = Date.UTC(2024, 11, 31, 15, 0, 0, 0);
      expect(actualUtc).toBe(expected);
    });
  });
});
