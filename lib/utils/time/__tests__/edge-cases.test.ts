import { describe, expect, it } from 'vitest';

import { parseProtoPediaTimestamp, parseW3cDtfTimestamp } from '../index.js';

describe('Time parser edge cases', () => {
  describe('parseProtoPediaTimestamp - date overflow behavior', () => {
    it('handles month overflow (13 becomes next year January)', () => {
      // JavaScript Date automatically adjusts invalid dates
      expect(parseProtoPediaTimestamp('2025-13-01 12:00:00.0')).toBe(
        '2026-01-01T03:00:00.000Z',
      );
    });

    it('handles day overflow (32nd of January becomes 1st of February)', () => {
      expect(parseProtoPediaTimestamp('2025-01-32 12:00:00.0')).toBe(
        '2025-02-01T03:00:00.000Z',
      );
    });

    it('handles hour overflow (24 becomes next day midnight)', () => {
      expect(parseProtoPediaTimestamp('2025-11-14 24:00:00.0')).toBe(
        '2025-11-14T15:00:00.000Z',
      );
    });

    it('handles minute overflow (60 becomes next hour)', () => {
      expect(parseProtoPediaTimestamp('2025-11-14 12:60:00.0')).toBe(
        '2025-11-14T04:00:00.000Z',
      );
    });

    it('handles second overflow (60 becomes next minute)', () => {
      expect(parseProtoPediaTimestamp('2025-11-14 12:00:60.0')).toBe(
        '2025-11-14T03:01:00.000Z',
      );
    });
  });

  describe('parseW3cDtfTimestamp - date overflow behavior', () => {
    it('handles month overflow', () => {
      expect(parseW3cDtfTimestamp('2025-13-01T12:00:00Z')).toBeUndefined();
    });

    it('handles day overflow', () => {
      expect(parseW3cDtfTimestamp('2025-01-32T12:00:00Z')).toBeUndefined();
    });

    it('handles hour overflow (24:00 is valid in some ISO 8601 interpretations)', () => {
      // JavaScript Date parser accepts 24:00 as next day 00:00
      expect(parseW3cDtfTimestamp('2025-11-14T24:00:00Z')).toBe(
        '2025-11-15T00:00:00.000Z',
      );
    });

    it('returns undefined for invalid minute (60)', () => {
      expect(parseW3cDtfTimestamp('2025-11-14T12:60:00Z')).toBeUndefined();
    });

    it('returns undefined for invalid second (60)', () => {
      expect(parseW3cDtfTimestamp('2025-11-14T12:00:60Z')).toBeUndefined();
    });

    it('returns undefined for month 00', () => {
      expect(parseW3cDtfTimestamp('2025-00-14T12:00:00Z')).toBeUndefined();
    });

    it('returns undefined for day 00', () => {
      expect(parseW3cDtfTimestamp('2025-11-00T12:00:00Z')).toBeUndefined();
    });
  });

  describe('parseProtoPediaTimestamp - boundary month lengths', () => {
    it('handles 30-day months correctly', () => {
      // April (30 days)
      expect(parseProtoPediaTimestamp('2025-04-30 12:00:00.0')).toBe(
        '2025-04-30T03:00:00.000Z',
      );
      // 31st overflows to next month (May 1st)
      expect(parseProtoPediaTimestamp('2025-04-31 12:00:00.0')).toBe(
        '2025-05-01T03:00:00.000Z',
      );

      // November (30 days)
      expect(parseProtoPediaTimestamp('2025-11-30 12:00:00.0')).toBe(
        '2025-11-30T03:00:00.000Z',
      );
      // 31st overflows to December 1st
      expect(parseProtoPediaTimestamp('2025-11-31 12:00:00.0')).toBe(
        '2025-12-01T03:00:00.000Z',
      );
    });

    it('handles 31-day months correctly', () => {
      // January
      expect(parseProtoPediaTimestamp('2025-01-31 12:00:00.0')).toBe(
        '2025-01-31T03:00:00.000Z',
      );

      // December
      expect(parseProtoPediaTimestamp('2025-12-31 12:00:00.0')).toBe(
        '2025-12-31T03:00:00.000Z',
      );
    });

    it('handles February in leap years', () => {
      // 2024 is a leap year
      expect(parseProtoPediaTimestamp('2024-02-28 12:00:00.0')).toBe(
        '2024-02-28T03:00:00.000Z',
      );
      expect(parseProtoPediaTimestamp('2024-02-29 12:00:00.0')).toBe(
        '2024-02-29T03:00:00.000Z',
      );
      // 30th overflows to March 1st
      expect(parseProtoPediaTimestamp('2024-02-30 12:00:00.0')).toBe(
        '2024-03-01T03:00:00.000Z',
      );
    });

    it('handles February in non-leap years', () => {
      // 2025 is not a leap year
      expect(parseProtoPediaTimestamp('2025-02-28 12:00:00.0')).toBe(
        '2025-02-28T03:00:00.000Z',
      );
      // 29th overflows to March 1st
      expect(parseProtoPediaTimestamp('2025-02-29 12:00:00.0')).toBe(
        '2025-03-01T03:00:00.000Z',
      );
    });
  });

  describe('parseW3cDtfTimestamp - boundary month lengths', () => {
    it('handles 30-day months correctly', () => {
      expect(parseW3cDtfTimestamp('2025-04-30T12:00:00Z')).toBe(
        '2025-04-30T12:00:00.000Z',
      );
      // JavaScript Date parser handles overflow
      expect(parseW3cDtfTimestamp('2025-04-31T12:00:00Z')).toBe(
        '2025-05-01T12:00:00.000Z',
      );
    });

    it('handles 31-day months correctly', () => {
      expect(parseW3cDtfTimestamp('2025-01-31T12:00:00Z')).toBe(
        '2025-01-31T12:00:00.000Z',
      );
      expect(parseW3cDtfTimestamp('2025-03-31T12:00:00Z')).toBe(
        '2025-03-31T12:00:00.000Z',
      );
    });

    it('handles February in leap years', () => {
      expect(parseW3cDtfTimestamp('2024-02-29T12:00:00Z')).toBe(
        '2024-02-29T12:00:00.000Z',
      );
      // Overflow to March 1st
      expect(parseW3cDtfTimestamp('2024-02-30T12:00:00Z')).toBe(
        '2024-03-01T12:00:00.000Z',
      );
    });

    it('handles February in non-leap years', () => {
      expect(parseW3cDtfTimestamp('2025-02-28T12:00:00Z')).toBe(
        '2025-02-28T12:00:00.000Z',
      );
      // Overflow to March 1st
      expect(parseW3cDtfTimestamp('2025-02-29T12:00:00Z')).toBe(
        '2025-03-01T12:00:00.000Z',
      );
    });
  });

  describe('parseProtoPediaTimestamp - special characters and malformed input', () => {
    it('returns undefined for extra characters before timestamp', () => {
      expect(
        parseProtoPediaTimestamp('x2025-11-14 12:00:00.0'),
      ).toBeUndefined();
    });

    it('returns undefined for extra characters after timestamp', () => {
      expect(
        parseProtoPediaTimestamp('2025-11-14 12:00:00.0x'),
      ).toBeUndefined();
    });

    it('returns undefined for extra spaces', () => {
      expect(
        parseProtoPediaTimestamp(' 2025-11-14 12:00:00.0'),
      ).toBeUndefined();
      expect(
        parseProtoPediaTimestamp('2025-11-14 12:00:00.0 '),
      ).toBeUndefined();
      expect(
        parseProtoPediaTimestamp('2025-11-14  12:00:00.0'),
      ).toBeUndefined();
    });

    it('returns undefined for missing fractional second digits', () => {
      expect(parseProtoPediaTimestamp('2025-11-14 12:00:00.')).toBeUndefined();
    });

    it('returns undefined for negative values', () => {
      expect(
        parseProtoPediaTimestamp('-2025-11-14 12:00:00.0'),
      ).toBeUndefined();
      expect(
        parseProtoPediaTimestamp('2025--11-14 12:00:00.0'),
      ).toBeUndefined();
      expect(
        parseProtoPediaTimestamp('2025-11--14 12:00:00.0'),
      ).toBeUndefined();
    });
  });

  describe('parseW3cDtfTimestamp - special characters and malformed input', () => {
    it('returns undefined for extra characters before timestamp', () => {
      expect(parseW3cDtfTimestamp('x2025-11-14T12:00:00Z')).toBeUndefined();
    });

    it('returns undefined for extra characters after timestamp', () => {
      expect(parseW3cDtfTimestamp('2025-11-14T12:00:00Zx')).toBeUndefined();
    });

    it('returns undefined for extra spaces', () => {
      expect(parseW3cDtfTimestamp(' 2025-11-14T12:00:00Z')).toBeUndefined();
      expect(parseW3cDtfTimestamp('2025-11-14T12:00:00Z ')).toBeUndefined();
    });

    it('returns undefined for missing fractional second digits after dot', () => {
      expect(parseW3cDtfTimestamp('2025-11-14T12:00:00.Z')).toBeUndefined();
    });

    it('returns undefined for invalid timezone offset format', () => {
      expect(parseW3cDtfTimestamp('2025-11-14T12:00:00+9:00')).toBeUndefined();
      expect(parseW3cDtfTimestamp('2025-11-14T12:00:00+09')).toBeUndefined();
      expect(parseW3cDtfTimestamp('2025-11-14T12:00:00+09:')).toBeUndefined();
      expect(parseW3cDtfTimestamp('2025-11-14T12:00:00+:00')).toBeUndefined();
    });

    it('returns undefined for negative values', () => {
      expect(parseW3cDtfTimestamp('-2025-11-14T12:00:00Z')).toBeUndefined();
    });
  });

  describe('parseProtoPediaTimestamp - century and millennium boundaries', () => {
    it('handles Y2K boundary', () => {
      expect(parseProtoPediaTimestamp('1999-12-31 23:59:59.999')).toBe(
        '1999-12-31T14:59:59.999Z',
      );
      expect(parseProtoPediaTimestamp('2000-01-01 00:00:00.0')).toBe(
        '1999-12-31T15:00:00.000Z',
      );
    });

    it('handles century boundaries', () => {
      expect(parseProtoPediaTimestamp('1900-01-01 09:00:00.0')).toBe(
        '1900-01-01T00:00:00.000Z',
      );
      expect(parseProtoPediaTimestamp('2100-01-01 09:00:00.0')).toBe(
        '2100-01-01T00:00:00.000Z',
      );
    });
  });

  describe('parseW3cDtfTimestamp - century and millennium boundaries', () => {
    it('handles Y2K boundary', () => {
      expect(parseW3cDtfTimestamp('1999-12-31T23:59:59.999Z')).toBe(
        '1999-12-31T23:59:59.999Z',
      );
      expect(parseW3cDtfTimestamp('2000-01-01T00:00:00Z')).toBe(
        '2000-01-01T00:00:00.000Z',
      );
    });

    it('handles century boundaries', () => {
      expect(parseW3cDtfTimestamp('1900-01-01T00:00:00Z')).toBe(
        '1900-01-01T00:00:00.000Z',
      );
      expect(parseW3cDtfTimestamp('2100-01-01T00:00:00Z')).toBe(
        '2100-01-01T00:00:00.000Z',
      );
    });
  });
});
