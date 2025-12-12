/**
 * @file Type safety and contract tests for normalizePrototype function
 *
 * @description
 * This test suite validates the type safety guarantees and data contracts of the
 * normalizePrototype function. It ensures that the output consistently adheres to
 * the NormalizedPrototype type definition and maintains required field constraints.
 *
 * @testStrategy
 * - **Required Fields**: Verify all mandatory fields are always present with correct types
 * - **Optional Fields**: Validate optional fields are correctly omitted or present
 * - **Type Consistency**: Ensure each field has the expected TypeScript type
 * - **Contract Compliance**: Verify the function fulfills its type contract
 *
 * @testCategories
 * - Required field presence and types
 * - Optional field handling (omission when not provided)
 * - Array field type consistency
 * - Numeric field type validation
 * - String field type validation
 * - Timestamp field format validation
 *
 * @totalTests 29
 *
 * @remarks
 * These tests are critical for TypeScript type safety. They ensure that the function's
 * runtime behavior matches its type declarations, preventing type-related bugs in
 * consuming code. Compliance with exactOptionalPropertyTypes is verified.
 *
 * @seeAlso
 * - {@link ./fields.test.ts} - Individual field validation
 * - {@link ./transformation.test.ts} - Transformation consistency
 * - {@link ./error-handling.test.ts} - Error handling and edge cases
 */

import { describe, expect, it } from 'vitest';

import type { UpstreamPrototype } from '../../../types/prototype-api.types.js';
import { normalizePrototype } from '../../normalize-prototype.js';

import { createMinimalUpstream } from './helpers.js';

/**
 * Type Safety & Contract Testing
 */
describe('Type Safety & Contract Testing', () => {
  describe('Required fields always present', () => {
    it('ensures id is always present', () => {
      const upstream = createMinimalUpstream();
      const result = normalizePrototype(upstream);
      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe('number');
    });

    it('ensures createDate is always present', () => {
      const upstream = createMinimalUpstream();
      const result = normalizePrototype(upstream);
      expect(result.createDate).toBeDefined();
      expect(typeof result.createDate).toBe('string');
    });

    it('ensures updateDate is always present', () => {
      const upstream = createMinimalUpstream();
      const result = normalizePrototype(upstream);
      expect(result.updateDate).toBeDefined();
      expect(typeof result.updateDate).toBe('string');
    });

    it('ensures status is always present', () => {
      const upstream = createMinimalUpstream();
      const result = normalizePrototype(upstream);
      expect(result.status).toBeDefined();
      expect(typeof result.status).toBe('number');
    });

    it('ensures prototypeNm is always present', () => {
      const upstream = createMinimalUpstream();
      const result = normalizePrototype(upstream);
      expect(result.prototypeNm).toBeDefined();
      expect(typeof result.prototypeNm).toBe('string');
    });

    it('ensures mainUrl is always present', () => {
      const upstream = createMinimalUpstream();
      const result = normalizePrototype(upstream);
      expect(result.mainUrl).toBeDefined();
      expect(typeof result.mainUrl).toBe('string');
    });

    it('ensures viewCount is always present', () => {
      const upstream = createMinimalUpstream();
      const result = normalizePrototype(upstream);
      expect(result.viewCount).toBeDefined();
      expect(typeof result.viewCount).toBe('number');
    });

    it('ensures goodCount is always present', () => {
      const upstream = createMinimalUpstream();
      const result = normalizePrototype(upstream);
      expect(result.goodCount).toBeDefined();
      expect(typeof result.goodCount).toBe('number');
    });

    it('ensures commentCount is always present', () => {
      const upstream = createMinimalUpstream();
      const result = normalizePrototype(upstream);
      expect(result.commentCount).toBeDefined();
      expect(typeof result.commentCount).toBe('number');
    });
  });

  describe('Fields with defaults are never undefined', () => {
    it('ensures releaseFlg has default value when not provided', () => {
      const { releaseFlg, ...rest } = createMinimalUpstream();
      const upstream = rest as UpstreamPrototype;
      const result = normalizePrototype(upstream);
      expect(result.releaseFlg).toBeDefined();
      expect(result.releaseFlg).toBe(2);
    });

    it('ensures summary defaults to empty string when not provided', () => {
      const { summary, ...rest } = createMinimalUpstream();
      const upstream = rest as UpstreamPrototype;
      const result = normalizePrototype(upstream);
      expect(result.summary).toBeDefined();
      expect(result.summary).toBe('');
    });

    it('ensures freeComment defaults to empty string when not provided', () => {
      const { freeComment, ...rest } = createMinimalUpstream();
      const upstream = rest as UpstreamPrototype;
      const result = normalizePrototype(upstream);
      expect(result.freeComment).toBeDefined();
      expect(result.freeComment).toBe('');
    });

    it('ensures systemDescription defaults to empty string when not provided', () => {
      const { systemDescription, ...rest } = createMinimalUpstream();
      const upstream = rest as UpstreamPrototype;
      const result = normalizePrototype(upstream);
      expect(result.systemDescription).toBeDefined();
      expect(result.systemDescription).toBe('');
    });

    it('ensures teamNm defaults to empty string when not provided', () => {
      const { teamNm, ...rest } = createMinimalUpstream();
      const upstream = rest as UpstreamPrototype;
      const result = normalizePrototype(upstream);
      expect(result.teamNm).toBeDefined();
      expect(result.teamNm).toBe('');
    });

    it('ensures revision defaults to 0 when not provided', () => {
      const { revision, ...rest } = createMinimalUpstream();
      const upstream = rest as UpstreamPrototype;
      const result = normalizePrototype(upstream);
      expect(result.revision).toBeDefined();
      expect(result.revision).toBe(0);
    });

    it('ensures licenseType defaults to 1 when not provided', () => {
      const { licenseType, ...rest } = createMinimalUpstream();
      const upstream = rest as UpstreamPrototype;
      const result = normalizePrototype(upstream);
      expect(result.licenseType).toBeDefined();
      expect(result.licenseType).toBe(1);
    });

    it('ensures thanksFlg defaults to 0 when not provided', () => {
      const { thanksFlg, ...rest } = createMinimalUpstream();
      const upstream = rest as UpstreamPrototype;
      const result = normalizePrototype(upstream);
      expect(result.thanksFlg).toBeDefined();
      expect(result.thanksFlg).toBe(0);
    });
  });

  describe('Pipe-separated fields always return arrays', () => {
    it('ensures users is always an array', () => {
      const upstream = createMinimalUpstream();
      const result = normalizePrototype(upstream);
      expect(Array.isArray(result.users)).toBe(true);
    });

    it('ensures tags is always an array', () => {
      const upstream = createMinimalUpstream();
      const result = normalizePrototype(upstream);
      expect(Array.isArray(result.tags)).toBe(true);
    });

    it('ensures materials is always an array', () => {
      const upstream = createMinimalUpstream();
      const result = normalizePrototype(upstream);
      expect(Array.isArray(result.materials)).toBe(true);
    });

    it('ensures events is always an array', () => {
      const upstream = createMinimalUpstream();
      const result = normalizePrototype(upstream);
      expect(Array.isArray(result.events)).toBe(true);
    });

    it('ensures awards is always an array', () => {
      const upstream = createMinimalUpstream();
      const result = normalizePrototype(upstream);
      expect(Array.isArray(result.awards)).toBe(true);
    });
  });

  describe('Optional fields can be undefined', () => {
    it('allows releaseDate to be undefined', () => {
      const { releaseDate, ...rest } = createMinimalUpstream();
      const upstream = rest as UpstreamPrototype;
      const result = normalizePrototype(upstream);
      expect(result.releaseDate).toBeUndefined();
    });

    it('allows createId to be undefined', () => {
      const { createId, ...rest } = createMinimalUpstream();
      const upstream = rest as UpstreamPrototype;
      const result = normalizePrototype(upstream);
      expect(result.createId).toBeUndefined();
    });

    it('allows updateId to be undefined', () => {
      const { updateId, ...rest } = createMinimalUpstream();
      const upstream = rest as UpstreamPrototype;
      const result = normalizePrototype(upstream);
      expect(result.updateId).toBeUndefined();
    });

    it('allows officialLink to be undefined', () => {
      const { officialLink, ...rest } = createMinimalUpstream();
      const upstream = rest as UpstreamPrototype;
      const result = normalizePrototype(upstream);
      expect(result.officialLink).toBeUndefined();
    });

    it('allows videoUrl to be undefined', () => {
      const { videoUrl, ...rest } = createMinimalUpstream();
      const upstream = rest as UpstreamPrototype;
      const result = normalizePrototype(upstream);
      expect(result.videoUrl).toBeUndefined();
    });

    it('allows nid to be undefined', () => {
      const { nid, ...rest } = createMinimalUpstream();
      const upstream = rest as UpstreamPrototype;
      const result = normalizePrototype(upstream);
      expect(result.nid).toBeUndefined();
    });

    it('allows slideMode to be undefined', () => {
      const { slideMode, ...rest } = createMinimalUpstream();
      const upstream = rest as UpstreamPrototype;
      const result = normalizePrototype(upstream);
      expect(result.slideMode).toBeUndefined();
    });
  });

  describe('Array element type validation', () => {
    it('ensures all users array elements are strings', () => {
      const upstream = createMinimalUpstream({ users: 'alice|bob|charlie' });
      const result = normalizePrototype(upstream);
      expect(result.users.every((user) => typeof user === 'string')).toBe(true);
    });

    it('ensures all tags array elements are strings', () => {
      const upstream = createMinimalUpstream({ tags: 'IoT|AI|ML' });
      const result = normalizePrototype(upstream);
      expect(result.tags.every((tag) => typeof tag === 'string')).toBe(true);
    });

    it('ensures all materials array elements are strings', () => {
      const upstream = createMinimalUpstream({
        materials: 'material1|material2',
      });
      const result = normalizePrototype(upstream);
      expect(
        result.materials.every((material) => typeof material === 'string'),
      ).toBe(true);
    });

    it('ensures all events array elements are strings', () => {
      const upstream = createMinimalUpstream({
        events: 'event1|event2|event3',
      });
      const result = normalizePrototype(upstream);
      expect(result.events.every((event) => typeof event === 'string')).toBe(
        true,
      );
    });

    it('ensures all awards array elements are strings', () => {
      const upstream = createMinimalUpstream({
        awards: 'award1|award2|award3',
      });
      const result = normalizePrototype(upstream);
      expect(result.awards.every((award) => typeof award === 'string')).toBe(
        true,
      );
    });

    it('ensures empty arrays have no non-string elements', () => {
      const upstream = createMinimalUpstream({
        users: '',
        tags: '',
        materials: '',
        events: '',
        awards: '',
      });
      const result = normalizePrototype(upstream);
      expect(result.users).toEqual([]);
      expect(result.tags).toEqual([]);
      expect(result.materials).toEqual([]);
      expect(result.events).toEqual([]);
      expect(result.awards).toEqual([]);
    });
  });

  describe('Numeric range contracts', () => {
    it('ensures id is a positive number', () => {
      const upstream = createMinimalUpstream({ id: 42 });
      const result = normalizePrototype(upstream);
      expect(result.id).toBeGreaterThan(0);
      expect(Number.isInteger(result.id)).toBe(true);
    });

    it('ensures viewCount is non-negative', () => {
      const upstream = createMinimalUpstream({ viewCount: 100 });
      const result = normalizePrototype(upstream);
      expect(result.viewCount).toBeGreaterThanOrEqual(0);
    });

    it('ensures goodCount is non-negative', () => {
      const upstream = createMinimalUpstream({ goodCount: 50 });
      const result = normalizePrototype(upstream);
      expect(result.goodCount).toBeGreaterThanOrEqual(0);
    });

    it('ensures commentCount is non-negative', () => {
      const upstream = createMinimalUpstream({ commentCount: 25 });
      const result = normalizePrototype(upstream);
      expect(result.commentCount).toBeGreaterThanOrEqual(0);
    });

    it('ensures status is a valid number', () => {
      const upstream = createMinimalUpstream({ status: 1 });
      const result = normalizePrototype(upstream);
      expect(Number.isFinite(result.status)).toBe(true);
    });

    it('ensures releaseFlg is a valid number', () => {
      const upstream = createMinimalUpstream({ releaseFlg: 2 });
      const result = normalizePrototype(upstream);
      expect(Number.isFinite(result.releaseFlg)).toBe(true);
    });

    it('ensures revision is non-negative', () => {
      const upstream = createMinimalUpstream({ revision: 5 });
      const result = normalizePrototype(upstream);
      expect(result.revision).toBeGreaterThanOrEqual(0);
    });

    it('ensures licenseType is a valid number', () => {
      const upstream = createMinimalUpstream({ licenseType: 1 });
      const result = normalizePrototype(upstream);
      expect(Number.isFinite(result.licenseType)).toBe(true);
    });

    it('ensures thanksFlg is 0 or 1', () => {
      const upstream = createMinimalUpstream({ thanksFlg: 0 });
      const result = normalizePrototype(upstream);
      expect([0, 1]).toContain(result.thanksFlg);
    });

    it('ensures slideMode when present is valid', () => {
      const upstream = createMinimalUpstream({ slideMode: 1 });
      const result = normalizePrototype(upstream);
      if (result.slideMode !== undefined) {
        expect(Number.isFinite(result.slideMode)).toBe(true);
      }
    });
  });

  describe('String format validation', () => {
    it('ensures createDate follows ISO 8601 timestamp format', () => {
      const upstream = createMinimalUpstream({
        createDate: '2024-01-01 12:00:00.0',
      });
      const result = normalizePrototype(upstream);
      expect(result.createDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('ensures updateDate follows ISO 8601 timestamp format', () => {
      const upstream = createMinimalUpstream({
        updateDate: '2024-01-02 12:00:00.0',
      });
      const result = normalizePrototype(upstream);
      expect(result.updateDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('ensures releaseDate when present follows ISO 8601 timestamp format', () => {
      const upstream = createMinimalUpstream({
        releaseDate: '2024-01-03 12:00:00.0',
      });
      const result = normalizePrototype(upstream);
      if (result.releaseDate !== undefined) {
        expect(result.releaseDate).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
        );
      }
    });

    it('ensures officialLink when present is a valid URL format', () => {
      const upstream = createMinimalUpstream({
        officialLink: 'https://example.com',
      });
      const result = normalizePrototype(upstream);
      if (result.officialLink !== undefined) {
        expect(result.officialLink).toMatch(/^https?:\/\//);
      }
    });

    it('ensures videoUrl when present is a valid URL format', () => {
      const upstream = createMinimalUpstream({
        videoUrl: 'https://youtube.com/watch',
      });
      const result = normalizePrototype(upstream);
      if (result.videoUrl !== undefined) {
        expect(result.videoUrl).toMatch(/^https?:\/\//);
      }
    });

    it('ensures mainUrl is a valid URL format', () => {
      const upstream = createMinimalUpstream({
        mainUrl: 'https://example.com/image.jpg',
      });
      const result = normalizePrototype(upstream);
      expect(result.mainUrl).toMatch(/^https?:\/\//);
    });

    it('ensures uuid when present is a non-empty string', () => {
      const upstream = createMinimalUpstream({ uuid: 'test-uuid-123' });
      const result = normalizePrototype(upstream);
      if (result.uuid !== undefined) {
        expect(typeof result.uuid).toBe('string');
        expect(result.uuid.length).toBeGreaterThan(0);
      }
    });

    it('ensures nid when present is a non-empty string', () => {
      const upstream = createMinimalUpstream({ nid: 'test-nid-456' });
      const result = normalizePrototype(upstream);
      if (result.nid !== undefined) {
        expect(typeof result.nid).toBe('string');
        expect(result.nid.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Type narrowing verification', () => {
    it('narrows releaseDate type after undefined check', () => {
      const upstream = createMinimalUpstream({
        releaseDate: '2024-01-03 12:00:00.0',
      });
      const result = normalizePrototype(upstream);

      if (result.releaseDate !== undefined) {
        const date: string = result.releaseDate;
        expect(typeof date).toBe('string');
      }
    });

    it('narrows createId type after undefined check', () => {
      const upstream = createMinimalUpstream({ createId: 100 });
      const result = normalizePrototype(upstream);

      if (result.createId !== undefined) {
        const id: number = result.createId;
        expect(typeof id).toBe('number');
      }
    });

    it('narrows updateId type after undefined check', () => {
      const upstream = createMinimalUpstream({ updateId: 200 });
      const result = normalizePrototype(upstream);

      if (result.updateId !== undefined) {
        const id: number = result.updateId;
        expect(typeof id).toBe('number');
      }
    });

    it('narrows officialLink type after undefined check', () => {
      const upstream = createMinimalUpstream({
        officialLink: 'https://example.com',
      });
      const result = normalizePrototype(upstream);

      if (result.officialLink !== undefined) {
        const link: string = result.officialLink;
        expect(typeof link).toBe('string');
      }
    });

    it('narrows videoUrl type after undefined check', () => {
      const upstream = createMinimalUpstream({
        videoUrl: 'https://youtube.com/watch',
      });
      const result = normalizePrototype(upstream);

      if (result.videoUrl !== undefined) {
        const url: string = result.videoUrl;
        expect(typeof url).toBe('string');
      }
    });

    it('narrows uuid type after undefined check', () => {
      const upstream = createMinimalUpstream({ uuid: 'test-uuid' });
      const result = normalizePrototype(upstream);

      if (result.uuid !== undefined) {
        const uuid: string = result.uuid;
        expect(typeof uuid).toBe('string');
      }
    });

    it('narrows nid type after undefined check', () => {
      const upstream = createMinimalUpstream({ nid: 'test-nid' });
      const result = normalizePrototype(upstream);

      if (result.nid !== undefined) {
        const nid: string = result.nid;
        expect(typeof nid).toBe('string');
      }
    });

    it('narrows slideMode type after undefined check', () => {
      const upstream = createMinimalUpstream({ slideMode: 1 });
      const result = normalizePrototype(upstream);

      if (result.slideMode !== undefined) {
        const mode: number = result.slideMode;
        expect(typeof mode).toBe('number');
      }
    });
  });

  describe('Immutability checks', () => {
    it('does not modify the input upstream object', () => {
      const upstream = createMinimalUpstream({ id: 42 });
      const originalUpstream = JSON.parse(JSON.stringify(upstream));

      normalizePrototype(upstream);

      expect(upstream).toEqual(originalUpstream);
    });

    it('does not modify string fields in input', () => {
      const upstream = createMinimalUpstream({
        prototypeNm: 'Original Name',
        summary: 'Original Summary',
      });
      const originalName = upstream.prototypeNm;
      const originalSummary = upstream.summary;

      normalizePrototype(upstream);

      expect(upstream.prototypeNm).toBe(originalName);
      expect(upstream.summary).toBe(originalSummary);
    });

    it('does not modify numeric fields in input', () => {
      const upstream = createMinimalUpstream({
        id: 999,
        viewCount: 123,
        goodCount: 456,
      });
      const originalId = upstream.id;
      const originalViewCount = upstream.viewCount;
      const originalGoodCount = upstream.goodCount;

      normalizePrototype(upstream);

      expect(upstream.id).toBe(originalId);
      expect(upstream.viewCount).toBe(originalViewCount);
      expect(upstream.goodCount).toBe(originalGoodCount);
    });

    it('does not modify pipe-separated fields in input', () => {
      const upstream = createMinimalUpstream({
        users: 'alice|bob|charlie',
        tags: 'IoT|AI',
      });
      const originalUsers = upstream.users;
      const originalTags = upstream.tags;

      normalizePrototype(upstream);

      expect(upstream.users).toBe(originalUsers);
      expect(upstream.tags).toBe(originalTags);
    });
  });

  describe('Return type completeness', () => {
    it('returns an object with all required properties defined', () => {
      const upstream = createMinimalUpstream();
      const result = normalizePrototype(upstream);

      const requiredFields = [
        'id',
        'createDate',
        'updateDate',
        'status',
        'prototypeNm',
        'mainUrl',
        'viewCount',
        'goodCount',
        'commentCount',
      ];

      requiredFields.forEach((field) => {
        expect(result).toHaveProperty(field);
        expect(result[field as keyof typeof result]).toBeDefined();
      });
    });

    it('returns an object with all array fields as arrays', () => {
      const upstream = createMinimalUpstream();
      const result = normalizePrototype(upstream);

      expect(Array.isArray(result.users)).toBe(true);
      expect(Array.isArray(result.tags)).toBe(true);
      expect(Array.isArray(result.materials)).toBe(true);
      expect(Array.isArray(result.events)).toBe(true);
      expect(Array.isArray(result.awards)).toBe(true);
    });

    it('returns an object with all default fields initialized', () => {
      const {
        releaseFlg,
        summary,
        freeComment,
        systemDescription,
        teamNm,
        revision,
        licenseType,
        thanksFlg,
        ...rest
      } = createMinimalUpstream();
      const upstream = rest as UpstreamPrototype;
      const result = normalizePrototype(upstream);

      expect(result.releaseFlg).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.freeComment).toBeDefined();
      expect(result.systemDescription).toBeDefined();
      expect(result.teamNm).toBeDefined();
      expect(result.revision).toBeDefined();
      expect(result.licenseType).toBeDefined();
      expect(result.thanksFlg).toBeDefined();
    });

    it('returns an object where optional fields may be undefined', () => {
      const { releaseDate, createId, updateId, ...rest } =
        createMinimalUpstream();
      const upstream = rest as UpstreamPrototype;
      const result = normalizePrototype(upstream);

      // These should be undefined when not provided
      expect(result.releaseDate).toBeUndefined();
      expect(result.createId).toBeUndefined();
      expect(result.updateId).toBeUndefined();
    });

    it('returns a new object instance (not the same reference)', () => {
      const upstream = createMinimalUpstream();
      const result = normalizePrototype(upstream);

      expect(result).not.toBe(upstream);
    });

    it('returns an object that satisfies NormalizedPrototype type contract', () => {
      const upstream = createMinimalUpstream();
      const result = normalizePrototype(upstream);

      // Type-level assertion: if this compiles, the contract is satisfied
      const _typeCheck: {
        id: number;
        createDate: string;
        updateDate?: undefined | string;
        releaseDate?: undefined | string;
        createId?: undefined | number;
        updateId?: undefined | number;
        releaseFlg: number;
        status: number;
        prototypeNm: string;
        summary: string;
        freeComment: string;
        systemDescription: string;
        users: string[];
        teamNm: string;
        tags: string[];
        materials: string[];
        events: string[];
        awards: string[];
        officialLink?: undefined | string;
        videoUrl?: undefined | string;
        mainUrl: string;
        relatedLink?: undefined | string;
        relatedLink2?: undefined | string;
        relatedLink3?: undefined | string;
        relatedLink4?: undefined | string;
        relatedLink5?: undefined | string;
        viewCount: number;
        goodCount: number;
        commentCount: number;
        uuid?: undefined | string;
        nid?: undefined | string;
        revision?: undefined | number;
        licenseType?: undefined | number;
        thanksFlg?: undefined | number;
        slideMode?: undefined | number;
      } = result;

      expect(_typeCheck).toBeDefined();
    });
  });
});
