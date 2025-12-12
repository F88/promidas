import { describe, expect, it } from 'vitest';

import { normalizeProtoPediaTimestamp } from '../../utils/normalize-protopedia-timestamp.js';

describe('normalizeProtoPediaTimestamp', () => {
  describe('null and undefined handling', () => {
    it('returns null for null input', () => {
      expect(normalizeProtoPediaTimestamp(null)).toBe(null);
    });

    it('returns undefined for undefined input', () => {
      expect(normalizeProtoPediaTimestamp(undefined)).toBe(undefined);
    });
  });

  describe('ProtoPedia format handling', () => {
    it('parses valid ProtoPedia timestamp with .0 fractional seconds', () => {
      const result = normalizeProtoPediaTimestamp('2025-11-14 12:03:07.0');
      expect(result).toBe('2025-11-14T03:03:07.000Z');
    });

    it('parses ProtoPedia timestamp with variable-length fractional seconds', () => {
      const result = normalizeProtoPediaTimestamp('2025-11-14 12:03:07.123');
      expect(result).toBe('2025-11-14T03:03:07.123Z');
    });

    it('returns original value for ProtoPedia format without fractional seconds', () => {
      // parseProtoPediaTimestamp requires fractional seconds (.0, .123, etc.)
      const input = '2025-11-14 12:03:07';
      expect(normalizeProtoPediaTimestamp(input)).toBe(input);
    });
  });

  describe('W3C-DTF format handling (fallback)', () => {
    it('falls back to W3C-DTF parser for UTC timezone', () => {
      const result = normalizeProtoPediaTimestamp('2025-11-14T12:03:07Z');
      expect(result).toBe('2025-11-14T12:03:07.000Z');
    });

    it('falls back to W3C-DTF parser for positive timezone offset', () => {
      const result = normalizeProtoPediaTimestamp('2025-11-14T12:03:07+09:00');
      expect(result).toBe('2025-11-14T03:03:07.000Z');
    });

    it('falls back to W3C-DTF parser for negative timezone offset', () => {
      const result = normalizeProtoPediaTimestamp('2025-11-14T12:03:07-05:00');
      expect(result).toBe('2025-11-14T17:03:07.000Z');
    });

    it('falls back to W3C-DTF parser without seconds', () => {
      const result = normalizeProtoPediaTimestamp('2025-11-14T12:03Z');
      expect(result).toBe('2025-11-14T12:03:00.000Z');
    });
  });

  describe('passthrough for unparseable formats', () => {
    it('returns original value for completely invalid format', () => {
      const input = 'not-a-timestamp';
      expect(normalizeProtoPediaTimestamp(input)).toBe(input);
    });

    it('returns original value for empty string', () => {
      const input = '';
      expect(normalizeProtoPediaTimestamp(input)).toBe(input);
    });

    it('returns original value for timezone-less ISO format', () => {
      // W3C-DTF requires timezone, so this should pass through
      const input = '2025-11-14T12:03:07';
      expect(normalizeProtoPediaTimestamp(input)).toBe(input);
    });

    it('returns original value for offset without colon', () => {
      // W3C-DTF requires colon in offset, so this should pass through
      const input = '2025-11-14T12:03:07+0900';
      expect(normalizeProtoPediaTimestamp(input)).toBe(input);
    });

    it('normalizes date with overflow month (JavaScript Date behavior)', () => {
      // JavaScript Date.UTC adjusts invalid dates:
      // 2025-13-01 becomes 2026-01-01
      const result = normalizeProtoPediaTimestamp('2025-13-01 12:00:00.0');
      expect(result).toBe('2026-01-01T03:00:00.000Z');
    });
  });

  describe('fallback priority order', () => {
    it('prioritizes ProtoPedia format over W3C-DTF when both could match', () => {
      // This input matches ProtoPedia format (space separator, JST)
      const result = normalizeProtoPediaTimestamp('2025-11-14 12:03:07.0');
      // Should be parsed as JST, not as UTC
      expect(result).toBe('2025-11-14T03:03:07.000Z');
      // If it were parsed as UTC, it would be '2025-11-14T12:03:07.000Z'
      expect(result).not.toBe('2025-11-14T12:03:07.000Z');
    });
  });
});
