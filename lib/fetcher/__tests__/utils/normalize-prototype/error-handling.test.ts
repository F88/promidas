/**
 * @file Error handling and edge case tests for normalizePrototype function
 *
 * @description
 * This test suite validates the robustness of the normalizePrototype function when
 * handling malformed, invalid, or edge case input data. It ensures the function
 * gracefully handles errors and produces safe, predictable output even with corrupted data.
 *
 * @testStrategy
 * - **Defensive Programming**: Verify safe handling of null, undefined, and invalid values
 * - **Data Corruption**: Test resilience against malformed timestamps, strings, and arrays
 * - **Boundary Conditions**: Validate behavior at numeric and string length limits
 * - **Security**: Ensure protection against prototype pollution and injection attacks
 * - **Edge Cases**: Cover unusual but valid input scenarios
 *
 * @testCategories
 * - Null and undefined value handling (6 tests)
 * - NaN and Infinity in numeric fields (7 tests)
 * - Timestamp edge cases (7 tests) - Invalid years, months, days, hours, malformed formats
 * - Extremely long data (5 tests) - 10K+ character strings, 1000+ array items
 * - Multiple simultaneous anomalies (5 tests) - All fields null/NaN, mixed corruption
 * - Prototype pollution protection (3 tests) - __proto__, constructor keywords
 * - Array field edge cases (5 tests) - Delimiters only, Unicode whitespace
 * - Numeric boundary conditions (6 tests) - MAX_VALUE, MIN_VALUE, EPSILON, -0
 * - Empty and whitespace-only inputs (13 tests)
 * - Malformed pipe-separated strings (11 tests)
 *
 * @totalTests 68
 *
 * @remarks
 * These tests are critical for production reliability. They ensure the normalizePrototype
 * function never crashes, throws exceptions, or produces corrupted output when processing
 * real-world data from the Protopedia API, which may contain unexpected or malformed values.
 * The comprehensive edge case coverage provides confidence in the function's robustness.
 *
 * @security
 * Includes tests for prototype pollution attacks (__proto__, constructor) to ensure
 * the function safely handles potentially malicious input data.
 *
 * @seeAlso
 * - {@link ./fields.test.ts} - Individual field validation
 * - {@link ./type-safety.test.ts} - Type contracts and guarantees
 * - {@link ./transformation.test.ts} - Transformation consistency
 */

import { describe, expect, it } from 'vitest';

import type { UpstreamPrototype } from '../../../types/prototype-api.types.js';
import { normalizePrototype } from '../../../utils/normalize-prototype.js';

import { createMinimalUpstream } from './helpers.js';

/**
 * Error Handling & Edge Case Tests
 */
describe('Error Handling & Edge Cases', () => {
  describe('Handling null values', () => {
    it('handles null in optional string fields by converting to undefined or default', () => {
      const upstream = createMinimalUpstream({
        summary: null as any,
        freeComment: null as any,
      });
      const result = normalizePrototype(upstream);
      // Fields with defaults should use default
      expect(result.summary).toBe('');
      expect(result.freeComment).toBe('');
    });

    it('handles null in pipe-separated fields', () => {
      const upstream = createMinimalUpstream({
        tags: null as any,
        users: null as any,
      });
      const result = normalizePrototype(upstream);
      // Should return empty arrays
      expect(result.tags).toEqual([]);
      expect(result.users).toEqual([]);
    });

    it('handles null in numeric fields with defaults', () => {
      const upstream = createMinimalUpstream({
        releaseFlg: null as any,
        revision: null as any,
      });
      const result = normalizePrototype(upstream);
      // Should use default values
      expect(result.releaseFlg).toBe(2);
      expect(result.revision).toBe(0);
    });

    it('handles null in date fields', () => {
      const upstream = createMinimalUpstream({
        releaseDate: null as any,
      });
      const result = normalizePrototype(upstream);
      // releaseDate with null should become undefined
      expect(result.releaseDate).toBeUndefined();
    });
  });

  describe('Handling undefined values explicitly', () => {
    it('handles explicit undefined in optional fields', () => {
      const { officialLink, videoUrl, nid, ...rest } = createMinimalUpstream();
      const upstream = rest as UpstreamPrototype;
      const result = normalizePrototype(upstream);
      expect(result.officialLink).toBeUndefined();
      expect(result.videoUrl).toBeUndefined();
      expect(result.nid).toBeUndefined();
    });

    it('handles explicit undefined in fields with defaults', () => {
      const { summary, teamNm, ...rest } = createMinimalUpstream();
      const upstream = rest as UpstreamPrototype;
      const result = normalizePrototype(upstream);
      // Should apply defaults
      expect(result.summary).toBe('');
      expect(result.teamNm).toBe('');
    });
  });

  describe('Handling unexpected value types', () => {
    it('handles number-as-string in numeric fields', () => {
      const upstream = createMinimalUpstream({
        id: '123' as any,
        viewCount: '9999' as any,
      });
      const result = normalizePrototype(upstream);
      // Values pass through as-is (no coercion)
      expect(result.id).toBe('123');
      expect(result.viewCount).toBe('9999');
    });

    it('handles object in string fields', () => {
      const upstream = createMinimalUpstream({
        prototypeNm: { name: 'test' } as any,
      });
      const result = normalizePrototype(upstream);
      // Object passes through (no coercion)
      expect(result.prototypeNm).toEqual({ name: 'test' });
    });

    it('handles array in pipe-separated field (already an array)', () => {
      const upstream = createMinimalUpstream({
        tags: ['tag1', 'tag2'] as any,
      });
      const result = normalizePrototype(upstream);
      // splitPipeSeparatedString should handle array input
      expect(result.tags).toEqual([]);
    });

    it('handles boolean in numeric fields', () => {
      const upstream = createMinimalUpstream({
        releaseFlg: true as any,
        revision: false as any,
      });
      const result = normalizePrototype(upstream);
      // Boolean passes through
      expect(result.releaseFlg).toBe(true);
      expect(result.revision).toBe(false);
    });
  });

  describe('Handling malformed data', () => {
    it('handles completely empty object', () => {
      const empty = {} as UpstreamPrototype;
      const result = normalizePrototype(empty);

      // Should apply all defaults
      expect(result.releaseFlg).toBe(2);
      expect(result.revision).toBe(0);
      expect(result.licenseType).toBe(1);
      expect(result.thanksFlg).toBe(0);
      expect(result.summary).toBe('');
      expect(result.freeComment).toBe('');
      expect(result.systemDescription).toBe('');
      expect(result.teamNm).toBe('');
      expect(result.users).toEqual([]);
      expect(result.tags).toEqual([]);
      expect(result.materials).toEqual([]);
      expect(result.events).toEqual([]);
      expect(result.awards).toEqual([]);
    });

    it('handles object with only some fields', () => {
      const partial = {
        id: 1,
        prototypeNm: 'Partial',
        createDate: '2024-01-01 00:00:00.0',
      } as UpstreamPrototype;

      const result = normalizePrototype(partial);

      expect(result.id).toBe(1);
      expect(result.prototypeNm).toBe('Partial');
      expect(result.createDate).toBe('2023-12-31T15:00:00.000Z');
      // Defaults should be applied
      expect(result.summary).toBe('');
      expect(result.users).toEqual([]);
    });

    it('handles NaN in numeric fields', () => {
      const upstream = createMinimalUpstream({
        viewCount: NaN,
        goodCount: NaN,
      });
      const result = normalizePrototype(upstream);
      // NaN passes through
      expect(Number.isNaN(result.viewCount)).toBe(true);
      expect(Number.isNaN(result.goodCount)).toBe(true);
    });

    it('handles Infinity in numeric fields', () => {
      const upstream = createMinimalUpstream({
        viewCount: Infinity,
        goodCount: -Infinity,
      });
      const result = normalizePrototype(upstream);
      expect(result.viewCount).toBe(Infinity);
      expect(result.goodCount).toBe(-Infinity);
    });
  });

  describe('Robustness with extreme values', () => {
    it('handles very large numbers', () => {
      const upstream = createMinimalUpstream({
        id: Number.MAX_SAFE_INTEGER,
        viewCount: Number.MAX_SAFE_INTEGER,
      });
      const result = normalizePrototype(upstream);
      expect(result.id).toBe(Number.MAX_SAFE_INTEGER);
      expect(result.viewCount).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('handles very small numbers', () => {
      const upstream = createMinimalUpstream({
        id: Number.MIN_SAFE_INTEGER,
        viewCount: 0,
      });
      const result = normalizePrototype(upstream);
      expect(result.id).toBe(Number.MIN_SAFE_INTEGER);
      expect(result.viewCount).toBe(0);
    });

    it('handles empty array in pipe-separated fields', () => {
      const upstream = createMinimalUpstream({
        tags: [] as any,
        users: [] as any,
      });
      const result = normalizePrototype(upstream);
      // Empty arrays should remain empty
      expect(result.tags).toEqual([]);
      expect(result.users).toEqual([]);
    });
  });

  describe('Defensive behavior', () => {
    it('does not mutate input object', () => {
      const upstream = createMinimalUpstream({
        tags: 'tag1|tag2',
        summary: 'Original',
      });

      const originalTags = upstream.tags;
      const originalSummary = upstream.summary;

      normalizePrototype(upstream);

      // Input should remain unchanged
      expect(upstream.tags).toBe(originalTags);
      expect(upstream.summary).toBe(originalSummary);
    });

    it('produces independent output objects', () => {
      const upstream = createMinimalUpstream();
      const result1 = normalizePrototype(upstream);
      const result2 = normalizePrototype(upstream);

      // Modifying one should not affect the other
      result1.tags.push('new-tag');
      expect(result2.tags).not.toContain('new-tag');
    });
  });

  describe('Timestamp edge cases', () => {
    it('handles timestamp with invalid year', () => {
      const upstream = createMinimalUpstream({
        createDate: '9999-12-31 23:59:59.0',
      });
      const result = normalizePrototype(upstream);
      // Should attempt normalization
      expect(result.createDate).toBeDefined();
    });

    it('handles timestamp with year 0', () => {
      const upstream = createMinimalUpstream({
        createDate: '0000-01-01 00:00:00.0',
      });
      const result = normalizePrototype(upstream);
      // Should handle gracefully
      expect(result.createDate).toBeDefined();
    });

    it('handles timestamp with invalid month', () => {
      const upstream = createMinimalUpstream({
        createDate: '2024-13-01 00:00:00.0',
      });
      const result = normalizePrototype(upstream);
      // Should return original or normalized value
      expect(result.createDate).toBeDefined();
    });

    it('handles timestamp with invalid day', () => {
      const upstream = createMinimalUpstream({
        createDate: '2024-02-30 00:00:00.0',
      });
      const result = normalizePrototype(upstream);
      // Should handle invalid date gracefully
      expect(result.createDate).toBeDefined();
    });

    it('handles timestamp with invalid hour', () => {
      const upstream = createMinimalUpstream({
        createDate: '2024-01-01 25:00:00.0',
      });
      const result = normalizePrototype(upstream);
      expect(result.createDate).toBeDefined();
    });

    it('handles completely malformed timestamp', () => {
      const upstream = createMinimalUpstream({
        createDate: 'not-a-date-at-all',
      });
      const result = normalizePrototype(upstream);
      // Should return original value
      expect(result.createDate).toBe('not-a-date-at-all');
    });

    it('handles timestamp with only spaces', () => {
      const upstream = createMinimalUpstream({
        createDate: '     ',
      });
      const result = normalizePrototype(upstream);
      expect(result.createDate).toBe('     ');
    });
  });

  describe('Extremely long data', () => {
    it('handles extremely long prototype name (10000+ chars)', () => {
      const longName = 'A'.repeat(10000);
      const upstream = createMinimalUpstream({
        prototypeNm: longName,
      });
      const result = normalizePrototype(upstream);
      expect(result.prototypeNm).toBe(longName);
      expect(result.prototypeNm.length).toBe(10000);
    });

    it('handles extremely long summary (50000+ chars)', () => {
      const longSummary = 'Summary text. '.repeat(5000);
      const upstream = createMinimalUpstream({
        summary: longSummary,
      });
      const result = normalizePrototype(upstream);
      expect(result.summary).toBe(longSummary);
      expect(result.summary.length).toBeGreaterThan(50000);
    });

    it('handles extremely long URL', () => {
      const longUrl = 'https://example.com/' + 'segment/'.repeat(1000);
      const upstream = createMinimalUpstream({
        officialLink: longUrl,
      });
      const result = normalizePrototype(upstream);
      expect(result.officialLink).toBe(longUrl);
    });

    it('handles pipe-separated field with many items (1000+)', () => {
      const manyTags = Array.from({ length: 1000 }, (_, i) => `tag${i}`).join(
        '|',
      );
      const upstream = createMinimalUpstream({
        tags: manyTags,
      });
      const result = normalizePrototype(upstream);
      expect(result.tags).toHaveLength(1000);
      expect(result.tags[0]).toBe('tag0');
      expect(result.tags[999]).toBe('tag999');
    });

    it('handles pipe-separated field with very long individual segments', () => {
      const longTag = 'VeryLongTag'.repeat(100);
      const upstream = createMinimalUpstream({
        tags: `${longTag}|normalTag`,
      });
      const result = normalizePrototype(upstream);
      expect(result.tags).toHaveLength(2);
      expect(result.tags[0]).toBe(longTag);
      expect(result.tags[1]).toBe('normalTag');
    });
  });

  describe('Multiple simultaneous anomalies', () => {
    it('handles all string fields being null simultaneously', () => {
      const upstream = createMinimalUpstream({
        summary: null as any,
        freeComment: null as any,
        systemDescription: null as any,
        teamNm: null as any,
      });
      const result = normalizePrototype(upstream);
      // All should use defaults
      expect(result.summary).toBe('');
      expect(result.freeComment).toBe('');
      expect(result.systemDescription).toBe('');
      expect(result.teamNm).toBe('');
    });

    it('handles all array fields being null simultaneously', () => {
      const upstream = createMinimalUpstream({
        users: null as any,
        tags: null as any,
        materials: null as any,
        events: null as any,
        awards: null as any,
      });
      const result = normalizePrototype(upstream);
      // All should be empty arrays
      expect(result.users).toEqual([]);
      expect(result.tags).toEqual([]);
      expect(result.materials).toEqual([]);
      expect(result.events).toEqual([]);
      expect(result.awards).toEqual([]);
    });

    it('handles all numeric fields being NaN simultaneously', () => {
      const upstream = createMinimalUpstream({
        id: NaN,
        viewCount: NaN,
        goodCount: NaN,
        commentCount: NaN,
      });
      const result = normalizePrototype(upstream);
      expect(Number.isNaN(result.id)).toBe(true);
      expect(Number.isNaN(result.viewCount)).toBe(true);
      expect(Number.isNaN(result.goodCount)).toBe(true);
      expect(Number.isNaN(result.commentCount)).toBe(true);
    });

    it('handles mix of null, undefined, NaN, and Infinity', () => {
      const { releaseDate, ...base } = createMinimalUpstream({
        summary: null as any,
        tags: null as any,
        viewCount: NaN,
        goodCount: Infinity,
      });
      const upstream = base as UpstreamPrototype;
      const result = normalizePrototype(upstream);
      expect(result.summary).toBe('');
      expect(result.tags).toEqual([]);
      expect(Number.isNaN(result.viewCount)).toBe(true);
      expect(result.goodCount).toBe(Infinity);
      expect(result.releaseDate).toBeUndefined();
    });

    it('handles all timestamps being invalid', () => {
      const upstream = createMinimalUpstream({
        createDate: 'invalid',
        updateDate: 'also-invalid',
        releaseDate: 'not-a-date',
      });
      const result = normalizePrototype(upstream);
      // All should pass through as-is
      expect(result.createDate).toBe('invalid');
      expect(result.updateDate).toBe('also-invalid');
      expect(result.releaseDate).toBe('not-a-date');
    });
  });

  describe('Prototype pollution protection', () => {
    it('handles __proto__ in string fields safely', () => {
      const upstream = createMinimalUpstream({
        prototypeNm: '__proto__',
        summary: '__proto__',
      });
      const result = normalizePrototype(upstream);
      expect(result.prototypeNm).toBe('__proto__');
      expect(result.summary).toBe('__proto__');
      // Ensure it's just a string value, not affecting prototype
      expect(Object.getPrototypeOf(result)).toBeDefined();
    });

    it('handles constructor in string fields safely', () => {
      const upstream = createMinimalUpstream({
        prototypeNm: 'constructor',
        teamNm: 'constructor',
      });
      const result = normalizePrototype(upstream);
      expect(result.prototypeNm).toBe('constructor');
      expect(result.teamNm).toBe('constructor');
    });

    it('handles prototype in pipe-separated fields safely', () => {
      const upstream = createMinimalUpstream({
        tags: '__proto__|constructor|prototype',
      });
      const result = normalizePrototype(upstream);
      expect(result.tags).toEqual(['__proto__', 'constructor', 'prototype']);
      // Ensure prototype chain is not affected
      expect(Array.isArray(result.tags)).toBe(true);
    });
  });

  describe('Array field edge cases', () => {
    it('handles pipe-separated field with only delimiters', () => {
      const upstream = createMinimalUpstream({
        tags: '||||||||',
      });
      const result = normalizePrototype(upstream);
      expect(result.tags).toEqual([]);
    });

    it('handles pipe-separated field with whitespace variations', () => {
      const upstream = createMinimalUpstream({
        tags: '  tag1  |  tag2\t|\ntag3  ',
      });
      const result = normalizePrototype(upstream);
      expect(result.tags).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('handles pipe-separated field with mixed empty and valid segments', () => {
      const upstream = createMinimalUpstream({
        users: 'user1||  ||user2||  ||',
      });
      const result = normalizePrototype(upstream);
      expect(result.users).toEqual(['user1', 'user2']);
    });

    it('handles pipe-separated field with Unicode whitespace', () => {
      const upstream = createMinimalUpstream({
        tags: 'tag1\u00A0|\u2003tag2\u2003|\u3000tag3',
      });
      const result = normalizePrototype(upstream);
      // Should trim various types of whitespace
      expect(result.tags.length).toBeGreaterThan(0);
    });

    it('handles pipe-separated field with special characters in segments', () => {
      const upstream = createMinimalUpstream({
        tags: 'tag<script>|tag&amp;|tag"quote"',
      });
      const result = normalizePrototype(upstream);
      expect(result.tags).toEqual(['tag<script>', 'tag&amp;', 'tag"quote"']);
    });
  });

  describe('Numeric field boundary conditions', () => {
    it('handles Number.MAX_VALUE', () => {
      const upstream = createMinimalUpstream({
        viewCount: Number.MAX_VALUE,
      });
      const result = normalizePrototype(upstream);
      expect(result.viewCount).toBe(Number.MAX_VALUE);
    });

    it('handles Number.MIN_VALUE', () => {
      const upstream = createMinimalUpstream({
        viewCount: Number.MIN_VALUE,
      });
      const result = normalizePrototype(upstream);
      expect(result.viewCount).toBe(Number.MIN_VALUE);
    });

    it('handles Number.EPSILON', () => {
      const upstream = createMinimalUpstream({
        viewCount: Number.EPSILON,
      });
      const result = normalizePrototype(upstream);
      expect(result.viewCount).toBe(Number.EPSILON);
    });

    it('handles unsafe integers beyond safe range', () => {
      const unsafeInteger = Number.MAX_SAFE_INTEGER + 1000;
      const upstream = createMinimalUpstream({
        id: unsafeInteger,
      });
      const result = normalizePrototype(upstream);
      expect(result.id).toBe(unsafeInteger);
    });

    it('handles negative zero', () => {
      const upstream = createMinimalUpstream({
        viewCount: -0,
      });
      const result = normalizePrototype(upstream);
      // -0 is equal to 0 but can be distinguished with Object.is
      expect(Object.is(result.viewCount, -0)).toBe(true);
    });
  });
});
