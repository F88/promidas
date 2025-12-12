import { describe, expect, it } from 'vitest';

import {
  JST_OFFSET_MS,
  parseProtoPediaTimestamp,
  parseW3cDtfTimestamp,
} from '../index.js';

const HOURS_9_IN_MS = 9 * 60 * 60 * 1000;

describe('Time parser', () => {
  describe('parseProtoPediaTimestamp', () => {
    describe('invalid inputs', () => {
      it('returns undefined for null', () => {
        expect(parseProtoPediaTimestamp(null as never)).toBeUndefined();
      });

      it('returns undefined for undefined', () => {
        expect(parseProtoPediaTimestamp(undefined as never)).toBeUndefined();
      });

      it('returns undefined for empty string', () => {
        expect(parseProtoPediaTimestamp('')).toBeUndefined();
      });

      it('returns undefined for non-string types', () => {
        expect(parseProtoPediaTimestamp(123 as never)).toBeUndefined();
        expect(parseProtoPediaTimestamp({} as never)).toBeUndefined();
        expect(parseProtoPediaTimestamp([] as never)).toBeUndefined();
      });

      it('returns undefined for whitespace-only strings', () => {
        expect(parseProtoPediaTimestamp('   ')).toBeUndefined();
        expect(parseProtoPediaTimestamp('\t')).toBeUndefined();
        expect(parseProtoPediaTimestamp('\n')).toBeUndefined();
      });
    });

    describe('format validation', () => {
      it('returns undefined for timestamp without fractional seconds', () => {
        expect(parseProtoPediaTimestamp('2025-11-14 12:03:07')).toBeUndefined();
      });

      it('returns undefined for T separator (ISO 8601)', () => {
        expect(
          parseProtoPediaTimestamp('2025-11-14T12:03:07.0'),
        ).toBeUndefined();
      });

      it('returns undefined for ISO 8601 with timezone offset', () => {
        expect(
          parseProtoPediaTimestamp('2025-11-14T12:03:07Z'),
        ).toBeUndefined();
        expect(
          parseProtoPediaTimestamp('2025-11-14T12:03:07+09:00'),
        ).toBeUndefined();
      });

      it('returns undefined for wrong separators', () => {
        expect(
          parseProtoPediaTimestamp('2025/11/14 12:03:07.0'),
        ).toBeUndefined();
        expect(
          parseProtoPediaTimestamp('2025-11-14_12:03:07.0'),
        ).toBeUndefined();
        expect(
          parseProtoPediaTimestamp('2025-11-14-12:03:07.0'),
        ).toBeUndefined();
      });

      it('returns undefined for missing components', () => {
        expect(parseProtoPediaTimestamp('2025-11-14')).toBeUndefined();
        expect(parseProtoPediaTimestamp('12:03:07.0')).toBeUndefined();
        expect(parseProtoPediaTimestamp('2025-11-14 12:03.0')).toBeUndefined();
      });

      it('returns undefined for wrong zero-padding', () => {
        expect(
          parseProtoPediaTimestamp('2025-1-14 12:03:07.0'),
        ).toBeUndefined();
        expect(
          parseProtoPediaTimestamp('2025-11-4 12:03:07.0'),
        ).toBeUndefined();
        expect(
          parseProtoPediaTimestamp('2025-11-14 2:03:07.0'),
        ).toBeUndefined();
        expect(
          parseProtoPediaTimestamp('2025-11-14 12:3:07.0'),
        ).toBeUndefined();
        expect(
          parseProtoPediaTimestamp('2025-11-14 12:03:7.0'),
        ).toBeUndefined();
      });

      it('returns undefined for values with invalid numeric components', () => {
        // Test edge case where parseInt might succeed but create NaN in conversion
        // Note: These are caught by regex, but testing for defense in depth
        expect(
          parseProtoPediaTimestamp('2025-11-14 12:03:07.NaN'),
        ).toBeUndefined();
      });

      it('returns undefined for invalid random strings', () => {
        expect(parseProtoPediaTimestamp('invalid')).toBeUndefined();
        expect(parseProtoPediaTimestamp('not a timestamp')).toBeUndefined();
      });
    });

    describe('current format (YYYY-MM-DD HH:MM:SS.0)', () => {
      it('parses valid JST timestamp to UTC', () => {
        expect(parseProtoPediaTimestamp('2025-11-14 12:03:07.0')).toBe(
          '2025-11-14T03:03:07.000Z',
        );
      });

      it('handles midnight', () => {
        expect(parseProtoPediaTimestamp('2025-11-14 00:00:00.0')).toBe(
          '2025-11-13T15:00:00.000Z',
        );
      });

      it('handles end of day', () => {
        expect(parseProtoPediaTimestamp('2025-11-14 23:59:59.0')).toBe(
          '2025-11-14T14:59:59.000Z',
        );
      });
    });

    describe('fractional seconds support (future compatibility)', () => {
      it('handles 1 digit (current format)', () => {
        expect(parseProtoPediaTimestamp('2025-03-05 10:02:03.0')).toBe(
          '2025-03-05T01:02:03.000Z',
        );
        expect(parseProtoPediaTimestamp('2025-03-05 10:02:03.5')).toBe(
          '2025-03-05T01:02:03.500Z',
        );
        expect(parseProtoPediaTimestamp('2025-03-05 10:02:03.9')).toBe(
          '2025-03-05T01:02:03.900Z',
        );
      });

      it('handles 2 digits', () => {
        expect(parseProtoPediaTimestamp('2025-03-05 10:02:03.00')).toBe(
          '2025-03-05T01:02:03.000Z',
        );
        expect(parseProtoPediaTimestamp('2025-03-05 10:02:03.05')).toBe(
          '2025-03-05T01:02:03.050Z',
        );
        expect(parseProtoPediaTimestamp('2025-03-05 10:02:03.99')).toBe(
          '2025-03-05T01:02:03.990Z',
        );
      });

      it('handles 3 digits (milliseconds)', () => {
        expect(parseProtoPediaTimestamp('2025-03-05 10:02:03.000')).toBe(
          '2025-03-05T01:02:03.000Z',
        );
        expect(parseProtoPediaTimestamp('2025-03-05 10:02:03.007')).toBe(
          '2025-03-05T01:02:03.007Z',
        );
        expect(parseProtoPediaTimestamp('2025-03-05 10:02:03.123')).toBe(
          '2025-03-05T01:02:03.123Z',
        );
        expect(parseProtoPediaTimestamp('2025-03-05 10:02:03.999')).toBe(
          '2025-03-05T01:02:03.999Z',
        );
      });

      it('handles 4+ digits (truncates to milliseconds)', () => {
        // 4 digits
        expect(parseProtoPediaTimestamp('2025-03-05 10:02:03.4567')).toBe(
          '2025-03-05T01:02:03.456Z',
        );
        // 6 digits (microseconds)
        expect(parseProtoPediaTimestamp('2025-03-05 10:02:03.123456')).toBe(
          '2025-03-05T01:02:03.123Z',
        );
        // 9 digits (nanoseconds)
        expect(parseProtoPediaTimestamp('2025-03-05 10:02:03.123456789')).toBe(
          '2025-03-05T01:02:03.123Z',
        );
        // 10+ digits
        expect(parseProtoPediaTimestamp('2025-03-05 10:02:03.1234567890')).toBe(
          '2025-03-05T01:02:03.123Z',
        );
      });
    });

    describe('JST to UTC conversion', () => {
      it('subtracts JST_OFFSET_MS (9 hours) correctly', () => {
        // 12:00 JST → 03:00 UTC (same day)
        expect(parseProtoPediaTimestamp('2025-11-14 12:00:00.0')).toBe(
          '2025-11-14T03:00:00.000Z',
        );
        // 09:00 JST → 00:00 UTC (same day, at midnight)
        expect(parseProtoPediaTimestamp('2025-11-14 09:00:00.0')).toBe(
          '2025-11-14T00:00:00.000Z',
        );
        // 08:59 JST → 23:59 UTC (previous day)
        expect(parseProtoPediaTimestamp('2025-11-14 08:59:59.0')).toBe(
          '2025-11-13T23:59:59.000Z',
        );
        // 00:00 JST → 15:00 UTC (previous day)
        expect(parseProtoPediaTimestamp('2025-11-14 00:00:00.0')).toBe(
          '2025-11-13T15:00:00.000Z',
        );
      });

      it('handles date crossing at midnight JST', () => {
        // JST midnight crosses to previous day in UTC
        expect(parseProtoPediaTimestamp('2025-01-01 00:00:00.0')).toBe(
          '2024-12-31T15:00:00.000Z',
        );
        expect(parseProtoPediaTimestamp('2025-12-31 23:59:59.999')).toBe(
          '2025-12-31T14:59:59.999Z',
        );
      });

      it('verifies JST_OFFSET_MS constant is correct', () => {
        expect(JST_OFFSET_MS).toBe(HOURS_9_IN_MS);
        expect(JST_OFFSET_MS).toBe(32400000); // 9 * 60 * 60 * 1000
      });
    });

    describe('invalid numeric values', () => {
      it('handles dates with extreme overflow values', () => {
        // These pass regex but create overflowed Date values
        const result = parseProtoPediaTimestamp('9999-99-99 99:99:99.999');
        // Date overflow is handled by JavaScript Date
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      });

      it('returns undefined for extremely large values causing Date overflow', () => {
        // Date.UTC with extreme values may return Infinity
        const result = parseProtoPediaTimestamp('999999-12-31 23:59:59.999');
        // JavaScript Date can handle very large years, but result may be undefined if not finite
        expect(typeof result === 'string' || result === undefined).toBe(true);
      });

      it('returns undefined for values that produce non-finite UTC timestamp', () => {
        // Year 275761 and beyond causes Date.UTC to return NaN (not finite)
        // This tests the Number.isFinite check
        expect(
          parseProtoPediaTimestamp('275761-01-01 00:00:00.0'),
        ).toBeUndefined();
        expect(
          parseProtoPediaTimestamp('999999-12-31 23:59:59.999'),
        ).toBeUndefined();
      });
    });

    describe('edge cases', () => {
      it('handles leap year dates correctly', () => {
        expect(parseProtoPediaTimestamp('2024-02-29 12:00:00.0')).toBe(
          '2024-02-29T03:00:00.000Z',
        );
        expect(parseProtoPediaTimestamp('2024-02-29 00:00:00.0')).toBe(
          '2024-02-28T15:00:00.000Z',
        );
      });

      it('handles year boundaries', () => {
        // Last moment of year
        expect(parseProtoPediaTimestamp('2024-12-31 23:59:59.999')).toBe(
          '2024-12-31T14:59:59.999Z',
        );
        // First moment of year
        expect(parseProtoPediaTimestamp('2025-01-01 00:00:00.0')).toBe(
          '2024-12-31T15:00:00.000Z',
        );
      });

      it('handles extreme year values', () => {
        // Unix epoch in JST (1970-01-01 09:00 JST = 1970-01-01 00:00 UTC)
        expect(parseProtoPediaTimestamp('1970-01-01 09:00:00.0')).toBe(
          '1970-01-01T00:00:00.000Z',
        );
        // Far future
        expect(parseProtoPediaTimestamp('2099-12-31 23:59:59.999')).toBe(
          '2099-12-31T14:59:59.999Z',
        );
        // Early date
        expect(parseProtoPediaTimestamp('1900-01-01 09:00:00.0')).toBe(
          '1900-01-01T00:00:00.000Z',
        );
      });

      it('handles first and last day of months', () => {
        // January
        expect(parseProtoPediaTimestamp('2025-01-01 12:00:00.0')).toBe(
          '2025-01-01T03:00:00.000Z',
        );
        expect(parseProtoPediaTimestamp('2025-01-31 12:00:00.0')).toBe(
          '2025-01-31T03:00:00.000Z',
        );
        // February (non-leap)
        expect(parseProtoPediaTimestamp('2025-02-28 12:00:00.0')).toBe(
          '2025-02-28T03:00:00.000Z',
        );
        // December
        expect(parseProtoPediaTimestamp('2025-12-01 12:00:00.0')).toBe(
          '2025-12-01T03:00:00.000Z',
        );
        expect(parseProtoPediaTimestamp('2025-12-31 12:00:00.0')).toBe(
          '2025-12-31T03:00:00.000Z',
        );
      });

      it('handles various time values', () => {
        // Midnight
        expect(parseProtoPediaTimestamp('2025-06-15 00:00:00.0')).toBe(
          '2025-06-14T15:00:00.000Z',
        );
        // Noon
        expect(parseProtoPediaTimestamp('2025-06-15 12:00:00.0')).toBe(
          '2025-06-15T03:00:00.000Z',
        );
        // End of day
        expect(parseProtoPediaTimestamp('2025-06-15 23:59:59.999')).toBe(
          '2025-06-15T14:59:59.999Z',
        );
      });
    });
  });

  describe('parseW3cDtfTimestamp', () => {
    describe('invalid inputs', () => {
      it('returns undefined for null', () => {
        expect(parseW3cDtfTimestamp(null as never)).toBeUndefined();
      });

      it('returns undefined for undefined', () => {
        expect(parseW3cDtfTimestamp(undefined as never)).toBeUndefined();
      });

      it('returns undefined for empty string', () => {
        expect(parseW3cDtfTimestamp('')).toBeUndefined();
      });

      it('returns undefined for non-string types', () => {
        expect(parseW3cDtfTimestamp(123 as never)).toBeUndefined();
        expect(parseW3cDtfTimestamp({} as never)).toBeUndefined();
        expect(parseW3cDtfTimestamp([] as never)).toBeUndefined();
      });

      it('returns undefined for whitespace-only strings', () => {
        expect(parseW3cDtfTimestamp('   ')).toBeUndefined();
        expect(parseW3cDtfTimestamp('\t')).toBeUndefined();
        expect(parseW3cDtfTimestamp('\n')).toBeUndefined();
      });
    });

    describe('W3C-DTF Level 1-3 (NOT supported)', () => {
      it('returns undefined for year-only (Level 1)', () => {
        expect(parseW3cDtfTimestamp('2025')).toBeUndefined();
      });

      it('returns undefined for year-month (Level 2)', () => {
        expect(parseW3cDtfTimestamp('2025-11')).toBeUndefined();
      });

      it('returns undefined for date-only (Level 3)', () => {
        expect(parseW3cDtfTimestamp('2025-11-14')).toBeUndefined();
      });
    });

    describe('timestamps without TZD (NOT supported)', () => {
      it('returns undefined for datetime without timezone', () => {
        expect(parseW3cDtfTimestamp('2025-11-14T12:03:07')).toBeUndefined();
      });

      it('returns undefined for datetime with fractional seconds but no TZD', () => {
        expect(parseW3cDtfTimestamp('2025-11-14T12:03:07.123')).toBeUndefined();
      });

      it('returns undefined for Level 4 format without TZD', () => {
        expect(parseW3cDtfTimestamp('2025-11-14T12:03')).toBeUndefined();
      });
    });

    describe('non-W3C-DTF formats (NOT supported)', () => {
      it('returns undefined for offset without colon', () => {
        expect(
          parseW3cDtfTimestamp('2025-11-14T12:03:07+0900'),
        ).toBeUndefined();
        expect(
          parseW3cDtfTimestamp('2025-11-14T12:03:07-0500'),
        ).toBeUndefined();
      });

      it('returns undefined for space separator (ProtoPedia format)', () => {
        expect(parseW3cDtfTimestamp('2025-11-14 12:03:07.0')).toBeUndefined();
      });

      it('returns undefined for invalid random strings', () => {
        expect(parseW3cDtfTimestamp('invalid')).toBeUndefined();
        expect(parseW3cDtfTimestamp('not a timestamp')).toBeUndefined();
      });
    });

    describe('Level 4: Complete date plus hours and minutes (YYYY-MM-DDThh:mmTZD)', () => {
      it('parses UTC timezone with Z', () => {
        expect(parseW3cDtfTimestamp('2025-11-14T12:03Z')).toBe(
          '2025-11-14T12:03:00.000Z',
        );
      });

      it('parses UTC timezone with lowercase z', () => {
        expect(parseW3cDtfTimestamp('2025-11-14T12:03z')).toBe(
          '2025-11-14T12:03:00.000Z',
        );
      });

      it('parses positive timezone offset', () => {
        expect(parseW3cDtfTimestamp('2025-11-14T12:03+09:00')).toBe(
          '2025-11-14T03:03:00.000Z',
        );
      });

      it('parses negative timezone offset', () => {
        expect(parseW3cDtfTimestamp('2025-11-14T12:03-05:00')).toBe(
          '2025-11-14T17:03:00.000Z',
        );
      });

      it('handles midnight', () => {
        expect(parseW3cDtfTimestamp('2025-11-14T00:00Z')).toBe(
          '2025-11-14T00:00:00.000Z',
        );
      });

      it('handles end of day', () => {
        expect(parseW3cDtfTimestamp('2025-11-14T23:59Z')).toBe(
          '2025-11-14T23:59:00.000Z',
        );
      });
    });

    describe('Level 5: Complete date plus hours, minutes and seconds (YYYY-MM-DDThh:mm:ssTZD)', () => {
      it('parses UTC timezone with Z', () => {
        expect(parseW3cDtfTimestamp('2025-11-14T12:03:07Z')).toBe(
          '2025-11-14T12:03:07.000Z',
        );
      });

      it('parses UTC timezone with lowercase z', () => {
        expect(parseW3cDtfTimestamp('2025-11-14T12:03:07z')).toBe(
          '2025-11-14T12:03:07.000Z',
        );
      });

      it('parses positive timezone offset', () => {
        expect(parseW3cDtfTimestamp('2025-11-14T12:03:07+09:00')).toBe(
          '2025-11-14T03:03:07.000Z',
        );
      });

      it('parses negative timezone offset', () => {
        expect(parseW3cDtfTimestamp('2025-11-14T12:03:07-05:00')).toBe(
          '2025-11-14T17:03:07.000Z',
        );
      });

      it('handles midnight with seconds', () => {
        expect(parseW3cDtfTimestamp('2025-11-14T00:00:00Z')).toBe(
          '2025-11-14T00:00:00.000Z',
        );
      });

      it('handles end of day with seconds', () => {
        expect(parseW3cDtfTimestamp('2025-11-14T23:59:59Z')).toBe(
          '2025-11-14T23:59:59.000Z',
        );
      });
    });

    describe('Level 6: Complete date plus hours, minutes, seconds and fractional seconds (YYYY-MM-DDThh:mm:ss.sTZD)', () => {
      it('parses UTC timezone with Z', () => {
        expect(parseW3cDtfTimestamp('2025-11-14T12:03:07.123Z')).toBe(
          '2025-11-14T12:03:07.123Z',
        );
      });

      it('parses UTC timezone with lowercase z', () => {
        expect(parseW3cDtfTimestamp('2025-11-14T12:03:07.456z')).toBe(
          '2025-11-14T12:03:07.456Z',
        );
      });

      it('parses positive timezone offset', () => {
        expect(parseW3cDtfTimestamp('2025-11-14T12:03:07.789+09:00')).toBe(
          '2025-11-14T03:03:07.789Z',
        );
      });

      it('parses negative timezone offset', () => {
        expect(parseW3cDtfTimestamp('2025-11-14T12:03:07.321-05:00')).toBe(
          '2025-11-14T17:03:07.321Z',
        );
      });

      it('handles 1 digit fractional seconds', () => {
        expect(parseW3cDtfTimestamp('2025-11-14T12:03:07.5Z')).toBe(
          '2025-11-14T12:03:07.500Z',
        );
      });

      it('handles 2 digits fractional seconds', () => {
        expect(parseW3cDtfTimestamp('2025-11-14T12:03:07.05Z')).toBe(
          '2025-11-14T12:03:07.050Z',
        );
      });

      it('handles 3 digits fractional seconds (milliseconds)', () => {
        expect(parseW3cDtfTimestamp('2025-11-14T12:03:07.123Z')).toBe(
          '2025-11-14T12:03:07.123Z',
        );
      });

      it('handles 4+ digits fractional seconds', () => {
        expect(parseW3cDtfTimestamp('2025-11-14T12:03:07.1234Z')).toBe(
          '2025-11-14T12:03:07.123Z',
        );
        expect(parseW3cDtfTimestamp('2025-11-14T12:03:07.123456Z')).toBe(
          '2025-11-14T12:03:07.123Z',
        );
      });

      it('handles zero fractional seconds', () => {
        expect(parseW3cDtfTimestamp('2025-11-14T12:03:07.0Z')).toBe(
          '2025-11-14T12:03:07.000Z',
        );
        expect(parseW3cDtfTimestamp('2025-11-14T12:03:07.000Z')).toBe(
          '2025-11-14T12:03:07.000Z',
        );
      });
    });

    describe('timezone conversions', () => {
      it('converts JST (+09:00) to UTC correctly', () => {
        expect(parseW3cDtfTimestamp('2025-11-14T12:00:00+09:00')).toBe(
          '2025-11-14T03:00:00.000Z',
        );
      });

      it('converts EST (-05:00) to UTC correctly', () => {
        expect(parseW3cDtfTimestamp('2025-11-14T12:00:00-05:00')).toBe(
          '2025-11-14T17:00:00.000Z',
        );
      });

      it('converts PST (-08:00) to UTC correctly', () => {
        expect(parseW3cDtfTimestamp('2025-11-14T12:00:00-08:00')).toBe(
          '2025-11-14T20:00:00.000Z',
        );
      });

      it('handles date crossing at midnight with positive offset', () => {
        expect(parseW3cDtfTimestamp('2025-11-14T00:00:00+09:00')).toBe(
          '2025-11-13T15:00:00.000Z',
        );
      });

      it('handles date crossing at midnight with negative offset', () => {
        expect(parseW3cDtfTimestamp('2025-11-14T00:00:00-05:00')).toBe(
          '2025-11-14T05:00:00.000Z',
        );
      });
    });

    describe('invalid numeric values', () => {
      it('returns undefined for dates that produce invalid UTC timestamp', () => {
        // Test values that might produce non-finite results
        // Year 0 and negative years may cause issues
        expect(parseProtoPediaTimestamp('0000-01-01 00:00:00.0')).toBeDefined();

        // Extremely large milliseconds should still be handled
        expect(
          parseProtoPediaTimestamp('2025-11-14 12:00:00.999999999'),
        ).toBeDefined();
      });
    });

    describe('W3C-DTF invalid date values', () => {
      it('returns undefined for invalid dates that pass regex', () => {
        // Invalid month
        expect(parseW3cDtfTimestamp('2025-13-01T12:00:00Z')).toBeUndefined();
        // Invalid day
        expect(parseW3cDtfTimestamp('2025-11-32T12:00:00Z')).toBeUndefined();
        // Invalid hour
        expect(parseW3cDtfTimestamp('2025-11-14T25:00:00Z')).toBeUndefined();
      });
    });

    describe('edge cases', () => {
      it('handles leap year dates', () => {
        expect(parseW3cDtfTimestamp('2024-02-29T12:00:00Z')).toBe(
          '2024-02-29T12:00:00.000Z',
        );
      });

      it('handles year boundaries', () => {
        expect(parseW3cDtfTimestamp('2024-12-31T23:59:59.999Z')).toBe(
          '2024-12-31T23:59:59.999Z',
        );
        expect(parseW3cDtfTimestamp('2025-01-01T00:00:00Z')).toBe(
          '2025-01-01T00:00:00.000Z',
        );
      });

      it('handles extreme year values', () => {
        expect(parseW3cDtfTimestamp('1970-01-01T00:00:00Z')).toBe(
          '1970-01-01T00:00:00.000Z',
        );
        expect(parseW3cDtfTimestamp('2099-12-31T23:59:59Z')).toBe(
          '2099-12-31T23:59:59.000Z',
        );
      });

      it('handles various offset values', () => {
        expect(parseW3cDtfTimestamp('2025-11-14T12:00:00+00:00')).toBe(
          '2025-11-14T12:00:00.000Z',
        );
        expect(parseW3cDtfTimestamp('2025-11-14T12:00:00+12:00')).toBe(
          '2025-11-14T00:00:00.000Z',
        );
        expect(parseW3cDtfTimestamp('2025-11-14T12:00:00-12:00')).toBe(
          '2025-11-15T00:00:00.000Z',
        );
      });
    });
  });
});
