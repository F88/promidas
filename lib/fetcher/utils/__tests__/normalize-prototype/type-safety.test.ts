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
});
