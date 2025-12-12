import { describe, expect, it } from 'vitest';

import type { UpstreamPrototype } from '../../../types/prototype-api.types.js';
import { normalizePrototype } from '../../normalize-prototype.js';

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
});
