import { describe, expect, it } from 'vitest';

import {
  JST_OFFSET_MS,
  normalizeProtoPediaTimestamp,
  parseDateString,
  parseAsProtoPediaTimestamp,
} from '../../utils/time.js';

const HOURS_9_IN_MS = 9 * 60 * 60 * 1000;

describe('Time utilities', () => {
  describe('parseAsProtoPediaTimestamp', () => {
    it('returns undefined for null', () => {
      expect(parseAsProtoPediaTimestamp(null as never)).toBeUndefined();
    });

    it('returns undefined for undefined', () => {
      expect(parseAsProtoPediaTimestamp(undefined as never)).toBeUndefined();
    });

    it('parses valid JST timestamp to UTC', () => {
      expect(parseAsProtoPediaTimestamp('2025-11-14 12:03:07.0')).toBe(
        '2025-11-14T03:03:07.000Z',
      );
    });

    it('returns undefined for invalid format', () => {
      expect(parseAsProtoPediaTimestamp('invalid')).toBeUndefined();
    });

    it('returns undefined for ISO 8601 with offset', () => {
      expect(
        parseAsProtoPediaTimestamp('2025-11-14T12:03:07Z'),
      ).toBeUndefined();
    });

    it('returns undefined for empty string', () => {
      expect(parseAsProtoPediaTimestamp('')).toBeUndefined();
    });

    it('returns undefined for timestamp without fractional seconds', () => {
      expect(parseAsProtoPediaTimestamp('2025-11-14 12:03:07')).toBeUndefined();
    });

    it('returns undefined for T separator', () => {
      expect(
        parseAsProtoPediaTimestamp('2025-11-14T12:03:07.0'),
      ).toBeUndefined();
    });

    it('handles fractional seconds with various precision', () => {
      // 1 digit - pad to 3
      expect(parseAsProtoPediaTimestamp('2025-03-05 10:02:03.5')).toBe(
        '2025-03-05T01:02:03.500Z',
      );
      // 2 digits - pad to 3
      expect(parseAsProtoPediaTimestamp('2025-03-05 10:02:03.05')).toBe(
        '2025-03-05T01:02:03.050Z',
      );
      // 3 digits - use as-is
      expect(parseAsProtoPediaTimestamp('2025-03-05 10:02:03.007')).toBe(
        '2025-03-05T01:02:03.007Z',
      );
      // 4+ digits - truncate to 3
      expect(parseAsProtoPediaTimestamp('2025-03-05 10:02:03.4567')).toBe(
        '2025-03-05T01:02:03.456Z',
      );
      expect(parseAsProtoPediaTimestamp('2025-03-05 10:02:03.123456789')).toBe(
        '2025-03-05T01:02:03.123Z',
      );
    });

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

    it('handles leap year dates correctly', () => {
      // Valid leap year date
      expect(parseAsProtoPediaTimestamp('2024-02-29 12:00:00.0')).toBe(
        '2024-02-29T03:00:00.000Z',
      );
    });

    it('handles extreme year values', () => {
      // Unix epoch in JST
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

    it('returns undefined for malformed formats', () => {
      // Wrong separators
      expect(
        parseAsProtoPediaTimestamp('2025/11/14 12:03:07.0'),
      ).toBeUndefined();
      expect(
        parseAsProtoPediaTimestamp('2025-11-14_12:03:07.0'),
      ).toBeUndefined();
      // Missing components
      expect(parseAsProtoPediaTimestamp('2025-11-14')).toBeUndefined();
      expect(parseAsProtoPediaTimestamp('12:03:07.0')).toBeUndefined();
      // Wrong padding
      expect(
        parseAsProtoPediaTimestamp('2025-1-14 12:03:07.0'),
      ).toBeUndefined();
      expect(
        parseAsProtoPediaTimestamp('2025-11-4 12:03:07.0'),
      ).toBeUndefined();
      expect(
        parseAsProtoPediaTimestamp('2025-11-14 2:03:07.0'),
      ).toBeUndefined();
    });
  });

  describe('parseDateString', () => {
    it('returns undefined for null', () => {
      // @ts-expect-error Testing runtime behavior
      expect(parseDateString(null)).toBeUndefined();
    });

    it('returns undefined for undefined', () => {
      // @ts-expect-error Testing runtime behavior
      expect(parseDateString(undefined)).toBeUndefined();
    });

    it('parses UTC timestamp with Z suffix', () => {
      expect(parseDateString('2025-11-14T03:03:07Z')).toBe(
        '2025-11-14T03:03:07.000Z',
      );
    });

    it('parses timestamp with positive offset', () => {
      expect(parseDateString('2025-11-14T12:03:07+09:00')).toBe(
        '2025-11-14T03:03:07.000Z',
      );
    });

    it('parses timestamp with negative offset', () => {
      expect(parseDateString('2025-11-14T12:03:07-05:00')).toBe(
        '2025-11-14T17:03:07.000Z',
      );
    });

    it('parses timestamp without offset as local time', () => {
      // This will be interpreted as local timezone (browser-dependent)
      const result = parseDateString('2025-11-14T12:03:07');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
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
