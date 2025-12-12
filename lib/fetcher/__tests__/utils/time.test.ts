import { describe, expect, it } from 'vitest';

import {
  JST_OFFSET_MS,
  normalizeProtoPediaTimestamp,
  parseDateTimeString,
  parseAsProtoPediaTimestamp,
} from '../../utils/time.js';

const HOURS_9_IN_MS = 9 * 60 * 60 * 1000;

describe('Time utilities', () => {
  describe('parseAsProtoPediaTimestamp', () => {
    describe('invalid inputs', () => {
      it('returns undefined for null', () => {
        expect(parseAsProtoPediaTimestamp(null as never)).toBeUndefined();
      });

      it('returns undefined for undefined', () => {
        expect(parseAsProtoPediaTimestamp(undefined as never)).toBeUndefined();
      });

      it('returns undefined for empty string', () => {
        expect(parseAsProtoPediaTimestamp('')).toBeUndefined();
      });

      it('returns undefined for non-string types', () => {
        expect(parseAsProtoPediaTimestamp(123 as never)).toBeUndefined();
        expect(parseAsProtoPediaTimestamp({} as never)).toBeUndefined();
        expect(parseAsProtoPediaTimestamp([] as never)).toBeUndefined();
      });

      it('returns undefined for whitespace-only strings', () => {
        expect(parseAsProtoPediaTimestamp('   ')).toBeUndefined();
        expect(parseAsProtoPediaTimestamp('\t')).toBeUndefined();
        expect(parseAsProtoPediaTimestamp('\n')).toBeUndefined();
      });
    });

    describe('format validation', () => {
      it('returns undefined for timestamp without fractional seconds', () => {
        expect(
          parseAsProtoPediaTimestamp('2025-11-14 12:03:07'),
        ).toBeUndefined();
      });

      it('returns undefined for T separator (ISO 8601)', () => {
        expect(
          parseAsProtoPediaTimestamp('2025-11-14T12:03:07.0'),
        ).toBeUndefined();
      });

      it('returns undefined for ISO 8601 with timezone offset', () => {
        expect(
          parseAsProtoPediaTimestamp('2025-11-14T12:03:07Z'),
        ).toBeUndefined();
        expect(
          parseAsProtoPediaTimestamp('2025-11-14T12:03:07+09:00'),
        ).toBeUndefined();
      });

      it('returns undefined for wrong separators', () => {
        expect(
          parseAsProtoPediaTimestamp('2025/11/14 12:03:07.0'),
        ).toBeUndefined();
        expect(
          parseAsProtoPediaTimestamp('2025-11-14_12:03:07.0'),
        ).toBeUndefined();
        expect(
          parseAsProtoPediaTimestamp('2025-11-14-12:03:07.0'),
        ).toBeUndefined();
      });

      it('returns undefined for missing components', () => {
        expect(parseAsProtoPediaTimestamp('2025-11-14')).toBeUndefined();
        expect(parseAsProtoPediaTimestamp('12:03:07.0')).toBeUndefined();
        expect(
          parseAsProtoPediaTimestamp('2025-11-14 12:03.0'),
        ).toBeUndefined();
      });

      it('returns undefined for wrong zero-padding', () => {
        expect(
          parseAsProtoPediaTimestamp('2025-1-14 12:03:07.0'),
        ).toBeUndefined();
        expect(
          parseAsProtoPediaTimestamp('2025-11-4 12:03:07.0'),
        ).toBeUndefined();
        expect(
          parseAsProtoPediaTimestamp('2025-11-14 2:03:07.0'),
        ).toBeUndefined();
        expect(
          parseAsProtoPediaTimestamp('2025-11-14 12:3:07.0'),
        ).toBeUndefined();
        expect(
          parseAsProtoPediaTimestamp('2025-11-14 12:03:7.0'),
        ).toBeUndefined();
      });

      it('returns undefined for invalid random strings', () => {
        expect(parseAsProtoPediaTimestamp('invalid')).toBeUndefined();
        expect(parseAsProtoPediaTimestamp('not a timestamp')).toBeUndefined();
      });
    });

    describe('current format (YYYY-MM-DD HH:MM:SS.0)', () => {
      it('parses valid JST timestamp to UTC', () => {
        expect(parseAsProtoPediaTimestamp('2025-11-14 12:03:07.0')).toBe(
          '2025-11-14T03:03:07.000Z',
        );
      });

      it('handles midnight', () => {
        expect(parseAsProtoPediaTimestamp('2025-11-14 00:00:00.0')).toBe(
          '2025-11-13T15:00:00.000Z',
        );
      });

      it('handles end of day', () => {
        expect(parseAsProtoPediaTimestamp('2025-11-14 23:59:59.0')).toBe(
          '2025-11-14T14:59:59.000Z',
        );
      });
    });

    describe('fractional seconds support (future compatibility)', () => {
      it('handles 1 digit (current format)', () => {
        expect(parseAsProtoPediaTimestamp('2025-03-05 10:02:03.0')).toBe(
          '2025-03-05T01:02:03.000Z',
        );
        expect(parseAsProtoPediaTimestamp('2025-03-05 10:02:03.5')).toBe(
          '2025-03-05T01:02:03.500Z',
        );
        expect(parseAsProtoPediaTimestamp('2025-03-05 10:02:03.9')).toBe(
          '2025-03-05T01:02:03.900Z',
        );
      });

      it('handles 2 digits', () => {
        expect(parseAsProtoPediaTimestamp('2025-03-05 10:02:03.00')).toBe(
          '2025-03-05T01:02:03.000Z',
        );
        expect(parseAsProtoPediaTimestamp('2025-03-05 10:02:03.05')).toBe(
          '2025-03-05T01:02:03.050Z',
        );
        expect(parseAsProtoPediaTimestamp('2025-03-05 10:02:03.99')).toBe(
          '2025-03-05T01:02:03.990Z',
        );
      });

      it('handles 3 digits (milliseconds)', () => {
        expect(parseAsProtoPediaTimestamp('2025-03-05 10:02:03.000')).toBe(
          '2025-03-05T01:02:03.000Z',
        );
        expect(parseAsProtoPediaTimestamp('2025-03-05 10:02:03.007')).toBe(
          '2025-03-05T01:02:03.007Z',
        );
        expect(parseAsProtoPediaTimestamp('2025-03-05 10:02:03.123')).toBe(
          '2025-03-05T01:02:03.123Z',
        );
        expect(parseAsProtoPediaTimestamp('2025-03-05 10:02:03.999')).toBe(
          '2025-03-05T01:02:03.999Z',
        );
      });

      it('handles 4+ digits (truncates to milliseconds)', () => {
        // 4 digits
        expect(parseAsProtoPediaTimestamp('2025-03-05 10:02:03.4567')).toBe(
          '2025-03-05T01:02:03.456Z',
        );
        // 6 digits (microseconds)
        expect(parseAsProtoPediaTimestamp('2025-03-05 10:02:03.123456')).toBe(
          '2025-03-05T01:02:03.123Z',
        );
        // 9 digits (nanoseconds)
        expect(
          parseAsProtoPediaTimestamp('2025-03-05 10:02:03.123456789'),
        ).toBe('2025-03-05T01:02:03.123Z');
        // 10+ digits
        expect(
          parseAsProtoPediaTimestamp('2025-03-05 10:02:03.1234567890'),
        ).toBe('2025-03-05T01:02:03.123Z');
      });
    });

    describe('JST to UTC conversion', () => {
      it('subtracts JST_OFFSET_MS (9 hours) correctly', () => {
        // 12:00 JST → 03:00 UTC (same day)
        expect(parseAsProtoPediaTimestamp('2025-11-14 12:00:00.0')).toBe(
          '2025-11-14T03:00:00.000Z',
        );
        // 09:00 JST → 00:00 UTC (same day, at midnight)
        expect(parseAsProtoPediaTimestamp('2025-11-14 09:00:00.0')).toBe(
          '2025-11-14T00:00:00.000Z',
        );
        // 08:59 JST → 23:59 UTC (previous day)
        expect(parseAsProtoPediaTimestamp('2025-11-14 08:59:59.0')).toBe(
          '2025-11-13T23:59:59.000Z',
        );
        // 00:00 JST → 15:00 UTC (previous day)
        expect(parseAsProtoPediaTimestamp('2025-11-14 00:00:00.0')).toBe(
          '2025-11-13T15:00:00.000Z',
        );
      });

      it('handles date crossing at midnight JST', () => {
        // JST midnight crosses to previous day in UTC
        expect(parseAsProtoPediaTimestamp('2025-01-01 00:00:00.0')).toBe(
          '2024-12-31T15:00:00.000Z',
        );
        expect(parseAsProtoPediaTimestamp('2025-12-31 23:59:59.999')).toBe(
          '2025-12-31T14:59:59.999Z',
        );
      });

      it('verifies JST_OFFSET_MS constant is correct', () => {
        expect(JST_OFFSET_MS).toBe(HOURS_9_IN_MS);
        expect(JST_OFFSET_MS).toBe(32400000); // 9 * 60 * 60 * 1000
      });
    });

    describe('edge cases', () => {
      it('handles leap year dates correctly', () => {
        expect(parseAsProtoPediaTimestamp('2024-02-29 12:00:00.0')).toBe(
          '2024-02-29T03:00:00.000Z',
        );
        expect(parseAsProtoPediaTimestamp('2024-02-29 00:00:00.0')).toBe(
          '2024-02-28T15:00:00.000Z',
        );
      });

      it('handles year boundaries', () => {
        // Last moment of year
        expect(parseAsProtoPediaTimestamp('2024-12-31 23:59:59.999')).toBe(
          '2024-12-31T14:59:59.999Z',
        );
        // First moment of year
        expect(parseAsProtoPediaTimestamp('2025-01-01 00:00:00.0')).toBe(
          '2024-12-31T15:00:00.000Z',
        );
      });

      it('handles extreme year values', () => {
        // Unix epoch in JST (1970-01-01 09:00 JST = 1970-01-01 00:00 UTC)
        expect(parseAsProtoPediaTimestamp('1970-01-01 09:00:00.0')).toBe(
          '1970-01-01T00:00:00.000Z',
        );
        // Far future
        expect(parseAsProtoPediaTimestamp('2099-12-31 23:59:59.999')).toBe(
          '2099-12-31T14:59:59.999Z',
        );
        // Early date
        expect(parseAsProtoPediaTimestamp('1900-01-01 09:00:00.0')).toBe(
          '1900-01-01T00:00:00.000Z',
        );
      });

      it('handles first and last day of months', () => {
        // January
        expect(parseAsProtoPediaTimestamp('2025-01-01 12:00:00.0')).toBe(
          '2025-01-01T03:00:00.000Z',
        );
        expect(parseAsProtoPediaTimestamp('2025-01-31 12:00:00.0')).toBe(
          '2025-01-31T03:00:00.000Z',
        );
        // February (non-leap)
        expect(parseAsProtoPediaTimestamp('2025-02-28 12:00:00.0')).toBe(
          '2025-02-28T03:00:00.000Z',
        );
        // December
        expect(parseAsProtoPediaTimestamp('2025-12-01 12:00:00.0')).toBe(
          '2025-12-01T03:00:00.000Z',
        );
        expect(parseAsProtoPediaTimestamp('2025-12-31 12:00:00.0')).toBe(
          '2025-12-31T03:00:00.000Z',
        );
      });

      it('handles various time values', () => {
        // Midnight
        expect(parseAsProtoPediaTimestamp('2025-06-15 00:00:00.0')).toBe(
          '2025-06-14T15:00:00.000Z',
        );
        // Noon
        expect(parseAsProtoPediaTimestamp('2025-06-15 12:00:00.0')).toBe(
          '2025-06-15T03:00:00.000Z',
        );
        // End of day
        expect(parseAsProtoPediaTimestamp('2025-06-15 23:59:59.999')).toBe(
          '2025-06-15T14:59:59.999Z',
        );
      });
    });
  });


  describe('normalizeProtoPediaTimestamp', () => {
    describe('JST_OFFSET_MS', () => {
      it('matches a nine-hour offset in milliseconds', () => {
        expect(JST_OFFSET_MS).toBe(HOURS_9_IN_MS);
      });

      it('equals 32400000 milliseconds', () => {
        expect(JST_OFFSET_MS).toBe(32400000);
      });
    });

    describe('Integration scenarios', () => {
      it('returns null for null input', () => {
        expect(normalizeProtoPediaTimestamp(null)).toBeNull();
      });

      it('returns undefined for undefined input', () => {
        expect(normalizeProtoPediaTimestamp(undefined)).toBeUndefined();
      });

      it('converts ProtoPedia format to UTC', () => {
        expect(normalizeProtoPediaTimestamp('2025-11-14 12:03:07.0')).toBe(
          '2025-11-14T03:03:07.000Z',
        );
        expect(normalizeProtoPediaTimestamp('2025-11-14 08:59:59.0')).toBe(
          '2025-11-13T23:59:59.000Z',
        );
      });

      it('falls back to parseDateString for ISO 8601 formats', () => {
        expect(normalizeProtoPediaTimestamp('2025-11-14T12:03:07+09:00')).toBe(
          '2025-11-14T03:03:07.000Z',
        );
        expect(normalizeProtoPediaTimestamp('2025-11-14T03:03:07Z')).toBe(
          '2025-11-14T03:03:07.000Z',
        );
      });
    });

    describe('Passthrough behavior', () => {
      it('returns unparseable strings as-is', () => {
        expect(normalizeProtoPediaTimestamp('')).toBe('');
        expect(normalizeProtoPediaTimestamp('invalid')).toBe('invalid');
        expect(normalizeProtoPediaTimestamp('2025-11-14 12:03:07.abc')).toBe(
          '2025-11-14 12:03:07.abc',
        );
      });
    });
  });
});
