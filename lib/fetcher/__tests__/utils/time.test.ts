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

  describe('parseDateTimeString', () => {
    it('returns undefined for null', () => {
      // @ts-expect-error Testing runtime behavior
      expect(parseDateTimeString(null)).toBeUndefined();
    });

    it('returns undefined for undefined', () => {
      // @ts-expect-error Testing runtime behavior
      expect(parseDateTimeString(undefined)).toBeUndefined();
    });

    describe('with timezone offset', () => {
      it('parses UTC timestamp with Z suffix', () => {
        expect(parseDateTimeString('2025-11-14T03:03:07Z')).toBe(
          '2025-11-14T03:03:07.000Z',
        );
      });

      it('parses UTC timestamp with milliseconds', () => {
        expect(parseDateTimeString('2025-11-14T03:03:07.123Z')).toBe(
          '2025-11-14T03:03:07.123Z',
        );
      });

      it('parses timestamp with positive offset', () => {
        expect(parseDateTimeString('2025-11-14T12:03:07+09:00')).toBe(
          '2025-11-14T03:03:07.000Z',
        );
      });

      it('parses timestamp with positive offset and milliseconds', () => {
        expect(parseDateTimeString('2025-11-14T12:03:07.456+09:00')).toBe(
          '2025-11-14T03:03:07.456Z',
        );
      });

      it('parses timestamp with negative offset', () => {
        expect(parseDateTimeString('2025-11-14T12:03:07-05:00')).toBe(
          '2025-11-14T17:03:07.000Z',
        );
      });

      it('parses timestamp with negative offset and milliseconds', () => {
        expect(parseDateTimeString('2025-11-14T12:03:07.789-05:00')).toBe(
          '2025-11-14T17:03:07.789Z',
        );
      });

      it('returns undefined for short offset format (not ISO 8601 compliant)', () => {
        // Short offset format like +09 is not valid ISO 8601
        expect(parseDateTimeString('2025-11-14T12:03:07+09')).toBeUndefined();
      });

      it('parses timestamp with offset without colon', () => {
        expect(parseDateTimeString('2025-11-14T12:03:07+0900')).toBe(
          '2025-11-14T03:03:07.000Z',
        );
      });

      it('handles edge case: midnight UTC', () => {
        expect(parseDateTimeString('2025-11-14T00:00:00Z')).toBe(
          '2025-11-14T00:00:00.000Z',
        );
      });

      it('handles edge case: end of day', () => {
        expect(parseDateTimeString('2025-11-14T23:59:59.999Z')).toBe(
          '2025-11-14T23:59:59.999Z',
        );
      });
    });

    describe('without timezone offset (timezone-dependent)', () => {
      it.each([
        '2000-02-29T01:02:03.789',
        '2000/02/29 01:02:03.789',
        '29 Feb 2000 01:02:03.789',
      ])('parses various date-time-formats: %s', (input) => {
        const expected = new Date(2000, 1, 29, 1, 2, 3, 789).toISOString(); // sanity check
        const result = parseDateTimeString(input);
        console.log({ expected, result });
        expect(result).toBe(expected);
      });

      it.each(['2026-01-01', '1 Jan 2026', 'January 1, 2026'])(
        'parses various date-only formats: %s',
        (input) => {
          const expected = new Date('2026-01-01T00:00:00Z').toISOString();
          const result = parseDateTimeString(input);
          console.log({ expected, result });
          expect(result).toBe(expected);
        },
      );

      it('parses timestamp as local time', () => {
        // WARNING: This behavior is timezone-dependent
        // The result will differ based on the execution environment's timezone
        const result = parseDateTimeString('2025-11-14T12:03:07');

        // Verify it returns a valid ISO string format
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

        // The actual UTC time depends on the local timezone:
        // - In JST (UTC+9): '2025-11-14T12:03:07' → '2025-11-14T03:03:07.000Z'
        // - In UTC:         '2025-11-14T12:03:07' → '2025-11-14T12:03:07.000Z'
        // - In EST (UTC-5): '2025-11-14T12:03:07' → '2025-11-14T17:03:07.000Z'

        // This is why we should use explicit timezone offsets in production
      });

      it('parses date-only format as local midnight', () => {
        const result = parseDateTimeString('2025-11-14');
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        // Result depends on local timezone offset from UTC
      });

      it('parses timestamp with milliseconds as local time', () => {
        const result = parseDateTimeString('2025-11-14T12:03:07.123');
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        expect(result).toContain('.123Z');
      });

      it('parses timestamp with space separator as local time', () => {
        const result = parseDateTimeString('2025-11-14 12:03:07');
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      });
    });

    describe('invalid inputs', () => {
      it('returns undefined for empty string', () => {
        expect(parseDateTimeString('')).toBeUndefined();
      });

      it('returns undefined for random text', () => {
        expect(parseDateTimeString('invalid')).toBeUndefined();
        expect(parseDateTimeString('not a date')).toBeUndefined();
      });

      it('returns undefined for random text', () => {
        expect(parseDateTimeString('invalid')).toBeUndefined();
        expect(parseDateTimeString('not a date')).toBeUndefined();
      });

      it('handles partial date formats with auto-completion', () => {
        // JavaScript Date auto-completes partial dates
        // 2025-11 becomes 2025-11-01T00:00:00
        expect(parseDateTimeString('2025-11')).toBe('2025-11-01T00:00:00.000Z');
      });

      it('returns undefined for incomplete timestamps with T separator', () => {
        expect(parseDateTimeString('2025-11-14T')).toBeUndefined();
        expect(parseDateTimeString('2025-11-14T12')).toBeUndefined();
      });

      it('returns undefined for special string values', () => {
        expect(parseDateTimeString('NaN')).toBeUndefined();
        expect(parseDateTimeString('Infinity')).toBeUndefined();
      });

      it('returns undefined for whitespace-only strings', () => {
        expect(parseDateTimeString('   ')).toBeUndefined();
        expect(parseDateTimeString('\t')).toBeUndefined();
        expect(parseDateTimeString('\n')).toBeUndefined();
      });
    });

    describe('edge cases', () => {
      it('handles leap year date', () => {
        expect(parseDateTimeString('2024-02-29T12:00:00Z')).toBe(
          '2024-02-29T12:00:00.000Z',
        );
      });

      it('handles year boundaries', () => {
        expect(parseDateTimeString('2024-12-31T23:59:59Z')).toBe(
          '2024-12-31T23:59:59.000Z',
        );
        expect(parseDateTimeString('2025-01-01T00:00:00Z')).toBe(
          '2025-01-01T00:00:00.000Z',
        );
      });

      it('handles very old dates', () => {
        expect(parseDateTimeString('1970-01-01T00:00:00Z')).toBe(
          '1970-01-01T00:00:00.000Z',
        );
      });

      it('handles far future dates', () => {
        expect(parseDateTimeString('2099-12-31T23:59:59Z')).toBe(
          '2099-12-31T23:59:59.000Z',
        );
      });

      it('handles various offset formats', () => {
        // +HH:MM
        expect(parseDateTimeString('2025-11-14T12:00:00+05:30')).toBe(
          '2025-11-14T06:30:00.000Z',
        );
        // -HH:MM
        expect(parseDateTimeString('2025-11-14T12:00:00-03:30')).toBe(
          '2025-11-14T15:30:00.000Z',
        );
      });

      it('handles extreme timezone offsets', () => {
        // UTC+14 (Kiribati)
        expect(parseDateTimeString('2025-11-14T12:00:00+14:00')).toBe(
          '2025-11-13T22:00:00.000Z',
        );
        // UTC-12 (Baker Island)
        expect(parseDateTimeString('2025-11-14T12:00:00-12:00')).toBe(
          '2025-11-15T00:00:00.000Z',
        );
      });

      it('handles various millisecond precisions', () => {
        expect(parseDateTimeString('2025-11-14T12:00:00.1Z')).toBe(
          '2025-11-14T12:00:00.100Z',
        );
        expect(parseDateTimeString('2025-11-14T12:00:00.12Z')).toBe(
          '2025-11-14T12:00:00.120Z',
        );
        expect(parseDateTimeString('2025-11-14T12:00:00.123Z')).toBe(
          '2025-11-14T12:00:00.123Z',
        );
      });

      it('handles lowercase t and z separators', () => {
        expect(parseDateTimeString('2025-11-14t12:00:00z')).toBe(
          '2025-11-14T12:00:00.000Z',
        );
      });
    });

    describe('format variations', () => {
      it('returns undefined for ISO 8601 basic format (no separators)', () => {
        // Basic format like 20251114T120000Z is not supported by new Date()
        expect(parseDateTimeString('20251114T120000Z')).toBeUndefined();
      });

      it('parses ISO 8601 with lowercase separators', () => {
        expect(parseDateTimeString('2025-11-14t12:00:00z')).toBe(
          '2025-11-14T12:00:00.000Z',
        );
      });

      it('parses with zero offset notation', () => {
        expect(parseDateTimeString('2025-11-14T12:00:00+00:00')).toBe(
          '2025-11-14T12:00:00.000Z',
        );
      });

      it('parses timestamp with seconds only (no milliseconds)', () => {
        expect(parseDateTimeString('2025-11-14T12:00:00Z')).toBe(
          '2025-11-14T12:00:00.000Z',
        );
      });

      it('parses date with slash separators (timezone-dependent)', () => {
        // new Date() accepts slash separators
        const result = parseDateTimeString('2025/11/14');
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      });
    });

    describe('special dates', () => {
      it('handles Unix epoch', () => {
        expect(parseDateTimeString('1970-01-01T00:00:00.000Z')).toBe(
          '1970-01-01T00:00:00.000Z',
        );
      });

      it('handles pre-epoch dates', () => {
        expect(parseDateTimeString('1969-12-31T23:59:59.999Z')).toBe(
          '1969-12-31T23:59:59.999Z',
        );
      });

      it('handles first day of months', () => {
        expect(parseDateTimeString('2025-01-01T00:00:00Z')).toBe(
          '2025-01-01T00:00:00.000Z',
        );
      });

      it('handles last day of months', () => {
        expect(parseDateTimeString('2025-01-31T23:59:59Z')).toBe(
          '2025-01-31T23:59:59.000Z',
        );
        expect(parseDateTimeString('2025-12-31T23:59:59Z')).toBe(
          '2025-12-31T23:59:59.000Z',
        );
      });

      it('handles February in non-leap years', () => {
        expect(parseDateTimeString('2025-02-28T12:00:00Z')).toBe(
          '2025-02-28T12:00:00.000Z',
        );
      });

      it('handles February 29 in leap years', () => {
        expect(parseDateTimeString('2024-02-29T12:00:00Z')).toBe(
          '2024-02-29T12:00:00.000Z',
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
