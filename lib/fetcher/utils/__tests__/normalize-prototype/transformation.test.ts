import { describe, expect, it } from 'vitest';

import type { UpstreamPrototype } from '../../../types/prototype-api.types.js';
import { normalizePrototype } from '../../normalize-prototype.js';

import { createMinimalUpstream } from './helpers.js';

/**
 * Transformation Consistency Tests
 */
describe('Transformation Consistency', () => {
  describe('Complete field mapping', () => {
    it('maps all UpstreamPrototype fields to NormalizedPrototype', () => {
      const upstream = createMinimalUpstream();
      const result = normalizePrototype(upstream);

      // Check all expected fields exist
      const expectedFields = [
        'id',
        'createDate',
        'updateDate',
        'releaseDate',
        'createId',
        'updateId',
        'releaseFlg',
        'status',
        'prototypeNm',
        'summary',
        'freeComment',
        'systemDescription',
        'users',
        'teamNm',
        'tags',
        'materials',
        'events',
        'awards',
        'officialLink',
        'videoUrl',
        'mainUrl',
        'relatedLink',
        'relatedLink2',
        'relatedLink3',
        'relatedLink4',
        'relatedLink5',
        'viewCount',
        'goodCount',
        'commentCount',
        'uuid',
        'nid',
        'revision',
        'licenseType',
        'thanksFlg',
        'slideMode',
      ];

      expectedFields.forEach((field) => {
        expect(result).toHaveProperty(field);
      });
    });

    it('does not add extra fields beyond NormalizedPrototype', () => {
      const upstream = createMinimalUpstream();
      const result = normalizePrototype(upstream);

      const expectedFieldCount = 35; // Total fields in NormalizedPrototype
      const actualFieldCount = Object.keys(result).length;

      expect(actualFieldCount).toBe(expectedFieldCount);
    });
  });

  describe('Idempotency', () => {
    it('produces consistent results on multiple normalizations', () => {
      const upstream = createMinimalUpstream({
        tags: 'tag1|tag2|tag3',
        users: 'user1|user2',
        createDate: '2024-01-01 12:00:00.0',
      });

      const result1 = normalizePrototype(upstream);
      const result2 = normalizePrototype(upstream);

      expect(result1).toEqual(result2);
    });

    it('produces same result for equivalent upstream objects', () => {
      const upstream1 = createMinimalUpstream({
        id: 100,
        prototypeNm: 'Test',
      });
      const upstream2 = createMinimalUpstream({
        id: 100,
        prototypeNm: 'Test',
      });

      const result1 = normalizePrototype(upstream1);
      const result2 = normalizePrototype(upstream2);

      expect(result1).toEqual(result2);
    });
  });

  describe('No data loss', () => {
    it('preserves all provided data', () => {
      const upstream = createMinimalUpstream({
        id: 123,
        prototypeNm: 'Important Project',
        summary: 'Critical summary',
        tags: 'important|critical',
        viewCount: 9999,
      });

      const result = normalizePrototype(upstream);

      expect(result.id).toBe(123);
      expect(result.prototypeNm).toBe('Important Project');
      expect(result.summary).toBe('Critical summary');
      expect(result.tags).toEqual(['important', 'critical']);
      expect(result.viewCount).toBe(9999);
    });

    it('preserves special characters in strings', () => {
      const upstream = createMinimalUpstream({
        prototypeNm: 'Test <>&" Project',
        summary: 'Line1\\nLine2',
        tags: 'C++|Node.js',
      });

      const result = normalizePrototype(upstream);

      expect(result.prototypeNm).toBe('Test <>&" Project');
      expect(result.summary).toBe('Line1\\nLine2');
      expect(result.tags).toEqual(['C++', 'Node.js']);
    });
  });

  describe('Minimal valid object transformation', () => {
    it('handles object with only required fields', () => {
      const minimal: UpstreamPrototype = {
        id: 1,
        createDate: '2024-01-01 00:00:00.0',
        updateDate: '2024-01-01 00:00:00.0',
        status: 1,
        prototypeNm: 'Minimal',
        mainUrl: 'https://example.com/image.jpg',
        viewCount: 0,
        goodCount: 0,
        commentCount: 0,
      } as UpstreamPrototype;

      const result = normalizePrototype(minimal);

      expect(result.id).toBe(1);
      expect(result.prototypeNm).toBe('Minimal');
      expect(result.status).toBe(1);
      expect(result.mainUrl).toBe('https://example.com/image.jpg');
      expect(result.viewCount).toBe(0);
      expect(result.goodCount).toBe(0);
      expect(result.commentCount).toBe(0);

      // Check defaults are applied
      expect(result.releaseFlg).toBe(2);
      expect(result.summary).toBe('');
      expect(result.users).toEqual([]);
      expect(result.tags).toEqual([]);
    });
  });

  describe('Maximal object transformation', () => {
    it('handles object with all fields populated', () => {
      const maximal = createMinimalUpstream({
        releaseDate: '2024-01-15 12:00:00.0',
        createId: 100,
        updateId: 200,
        nid: 'test-nid',
        uuid: 'test-uuid',
        slideMode: 1,
      });

      const result = normalizePrototype(maximal);

      // All fields should be present and properly transformed
      expect(result.releaseDate).toBe('2024-01-15T03:00:00.000Z');
      expect(result.createId).toBe(100);
      expect(result.updateId).toBe(200);
      expect(result.nid).toBe('test-nid');
      expect(result.uuid).toBe('test-uuid');
      expect(result.slideMode).toBe(1);
    });
  });
});
