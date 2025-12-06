import { describe, expect, it } from 'vitest';

import {
  JST_OFFSET_MS,
  normalizeProtoPediaTimestamp,
} from '../../utils/time.js';

describe('time utilities', () => {
  describe('JST_OFFSET_MS', () => {
    it('has correct JST offset value (UTC+9)', () => {
      expect(JST_OFFSET_MS).toBe(9 * 60 * 60 * 1000);
      expect(JST_OFFSET_MS).toBe(32400000);
    });
  });

  describe('normalizeProtoPediaTimestamp', () => {
    describe('null and empty value handling', () => {
      it('returns null for null input', () => {
        expect(normalizeProtoPediaTimestamp(null)).toBeNull();
      });

      it('returns null for undefined input', () => {
        expect(normalizeProtoPediaTimestamp(undefined)).toBeNull();
      });

      it('returns null for empty string', () => {
        expect(normalizeProtoPediaTimestamp('')).toBeNull();
      });

      it('returns null for whitespace-only string', () => {
        expect(normalizeProtoPediaTimestamp('   ')).toBeNull();
      });
    });

    describe('JST timestamp without offset (current ProtoPedia format)', () => {
      it('converts JST timestamp with space separator to UTC', () => {
        const result = normalizeProtoPediaTimestamp('2024-01-15 12:34:56');
        expect(result).toBe('2024-01-15T03:34:56.000Z');
      });

      it('converts JST timestamp with T separator to UTC', () => {
        const result = normalizeProtoPediaTimestamp('2024-01-15T12:34:56');
        expect(result).toBe('2024-01-15T03:34:56.000Z');
      });

      it('handles JST midnight correctly', () => {
        const result = normalizeProtoPediaTimestamp('2024-01-15 00:00:00');
        expect(result).toBe('2024-01-14T15:00:00.000Z');
      });

      it('handles JST timestamp with fractional seconds', () => {
        const result = normalizeProtoPediaTimestamp('2024-01-15 12:34:56.789');
        expect(result).toBe('2024-01-15T03:34:56.789Z');
      });

      it('handles JST timestamp with single-digit fractional seconds', () => {
        const result = normalizeProtoPediaTimestamp('2024-01-15 12:34:56.1');
        expect(result).toBe('2024-01-15T03:34:56.100Z');
      });

      it('handles JST timestamp with two-digit fractional seconds', () => {
        const result = normalizeProtoPediaTimestamp('2024-01-15 12:34:56.12');
        expect(result).toBe('2024-01-15T03:34:56.120Z');
      });

      it('handles JST timestamp with more than 3 fractional digits', () => {
        const result = normalizeProtoPediaTimestamp(
          '2024-01-15 12:34:56.123456',
        );
        expect(result).toBe('2024-01-15T03:34:56.123Z');
      });

      it('converts JST new year to previous year in UTC', () => {
        const result = normalizeProtoPediaTimestamp('2024-01-01 08:00:00');
        expect(result).toBe('2023-12-31T23:00:00.000Z');
      });

      it('handles leap year correctly', () => {
        const result = normalizeProtoPediaTimestamp('2024-02-29 12:00:00');
        expect(result).toBe('2024-02-29T03:00:00.000Z');
      });

      it('handles month boundaries correctly', () => {
        const result = normalizeProtoPediaTimestamp('2024-03-01 01:00:00');
        expect(result).toBe('2024-02-29T16:00:00.000Z');
      });
    });

    describe('timestamp with explicit offset (future-proof)', () => {
      it('handles UTC timestamp (ending with Z)', () => {
        const result = normalizeProtoPediaTimestamp('2024-01-15T03:34:56Z');
        expect(result).toBe('2024-01-15T03:34:56.000Z');
      });

      it('handles UTC timestamp with fractional seconds', () => {
        const result = normalizeProtoPediaTimestamp('2024-01-15T03:34:56.789Z');
        expect(result).toBe('2024-01-15T03:34:56.789Z');
      });

      it('handles timestamp with +09:00 offset (JST)', () => {
        const result = normalizeProtoPediaTimestamp(
          '2024-01-15T12:34:56+09:00',
        );
        expect(result).toBe('2024-01-15T03:34:56.000Z');
      });

      it('handles timestamp with +0900 offset (no colon)', () => {
        const result = normalizeProtoPediaTimestamp('2024-01-15T12:34:56+0900');
        expect(result).toBe('2024-01-15T03:34:56.000Z');
      });

      it('handles timestamp with negative offset', () => {
        const result = normalizeProtoPediaTimestamp(
          '2024-01-15T03:34:56-05:00',
        );
        expect(result).toBe('2024-01-15T08:34:56.000Z');
      });

      it('handles timestamp with +00:00 offset', () => {
        const result = normalizeProtoPediaTimestamp(
          '2024-01-15T03:34:56+00:00',
        );
        expect(result).toBe('2024-01-15T03:34:56.000Z');
      });
    });

    describe('edge cases and invalid input', () => {
      it('returns null for invalid date format', () => {
        expect(normalizeProtoPediaTimestamp('2024/01/15 12:34:56')).toBeNull();
      });

      it('returns null for incomplete date', () => {
        expect(normalizeProtoPediaTimestamp('2024-01-15')).toBeNull();
      });

      it('returns null for incomplete time', () => {
        expect(normalizeProtoPediaTimestamp('2024-01-15 12:34')).toBeNull();
      });

      it('returns null for non-numeric components', () => {
        expect(normalizeProtoPediaTimestamp('2024-AA-15 12:34:56')).toBeNull();
      });

      it('returns null for random text', () => {
        expect(normalizeProtoPediaTimestamp('invalid timestamp')).toBeNull();
      });

      it('handles timestamp with leading/trailing whitespace', () => {
        const result = normalizeProtoPediaTimestamp('  2024-01-15 12:34:56  ');
        expect(result).toBe('2024-01-15T03:34:56.000Z');
      });

      it('returns null for extremely large year value that causes infinite date', () => {
        const result = normalizeProtoPediaTimestamp('999999-01-01 00:00:00');
        expect(result).toBeNull();
      });

      it('returns null for date that exceeds Date.UTC range', () => {
        const result = normalizeProtoPediaTimestamp('300000-12-31 23:59:59');
        expect(result).toBeNull();
      });

      it('returns null for extremely large values', () => {
        expect(
          normalizeProtoPediaTimestamp('9999999-01-01 00:00:00'),
        ).toBeNull();
        expect(
          normalizeProtoPediaTimestamp('999999999-12-31 23:59:59'),
        ).toBeNull();
      });

      it('returns null for negative year values', () => {
        const result = normalizeProtoPediaTimestamp('-0001-01-01 00:00:00');
        expect(result).toBeNull();
      });
    });

    describe('boundary values', () => {
      it('handles minimum date (year 0001)', () => {
        const result = normalizeProtoPediaTimestamp('0001-01-01 00:00:00');
        expect(result).not.toBeNull();
        expect(result).toMatch(/Z$/);
      });

      it('handles year 9999', () => {
        const result = normalizeProtoPediaTimestamp('9999-12-31 23:59:59');
        expect(result).not.toBeNull();
        expect(result).toMatch(/Z$/);
      });

      it('handles January 1st (month boundary)', () => {
        const result = normalizeProtoPediaTimestamp('2024-01-01 12:34:56');
        expect(result).toBe('2024-01-01T03:34:56.000Z');
      });

      it('handles December 31st (month boundary)', () => {
        const result = normalizeProtoPediaTimestamp('2024-12-31 12:34:56');
        expect(result).toBe('2024-12-31T03:34:56.000Z');
      });

      it('handles 00:00:00 (start of day)', () => {
        const result = normalizeProtoPediaTimestamp('2024-06-15 00:00:00');
        expect(result).toBe('2024-06-14T15:00:00.000Z');
      });

      it('handles 23:59:59 (end of day)', () => {
        const result = normalizeProtoPediaTimestamp('2024-06-15 23:59:59');
        expect(result).toBe('2024-06-15T14:59:59.000Z');
      });
    });

    describe('consistency and stability', () => {
      it('produces consistent results for same input', () => {
        const input = '2024-01-15 12:34:56';
        const result1 = normalizeProtoPediaTimestamp(input);
        const result2 = normalizeProtoPediaTimestamp(input);
        expect(result1).toBe(result2);
      });

      it('always returns UTC format (ending with Z)', () => {
        const inputs = [
          '2024-01-15 12:34:56',
          '2024-06-20T08:00:00',
          '2024-12-31 23:59:59',
        ];

        inputs.forEach((input) => {
          const result = normalizeProtoPediaTimestamp(input);
          expect(result).toMatch(/Z$/);
        });
      });

      it('always returns ISO 8601 format', () => {
        const result = normalizeProtoPediaTimestamp('2024-01-15 12:34:56');
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      });

      it('preserves millisecond precision', () => {
        const result = normalizeProtoPediaTimestamp('2024-01-15 12:34:56.789');
        expect(result).toContain('.789Z');
      });
    });

    describe('real-world scenarios', () => {
      it('handles typical createDate from ProtoPedia', () => {
        const result = normalizeProtoPediaTimestamp('2023-05-20 14:30:00');
        expect(result).toBe('2023-05-20T05:30:00.000Z');
      });

      it('handles typical updateDate from ProtoPedia', () => {
        const result = normalizeProtoPediaTimestamp('2024-11-15 09:45:30');
        expect(result).toBe('2024-11-15T00:45:30.000Z');
      });

      it('handles typical releaseDate from ProtoPedia', () => {
        const result = normalizeProtoPediaTimestamp('2024-03-10 18:00:00');
        expect(result).toBe('2024-03-10T09:00:00.000Z');
      });

      it('handles early morning JST time', () => {
        const result = normalizeProtoPediaTimestamp('2024-01-15 01:00:00');
        expect(result).toBe('2024-01-14T16:00:00.000Z');
      });

      it('handles late evening JST time', () => {
        const result = normalizeProtoPediaTimestamp('2024-01-15 22:30:00');
        expect(result).toBe('2024-01-15T13:30:00.000Z');
      });
    });
  });
});
