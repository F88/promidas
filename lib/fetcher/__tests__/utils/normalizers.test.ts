import { describe, expect, it } from 'vitest';

import type { NormalizedPrototype } from '../../../types/index.js';
import {
  splitPipeSeparatedString,
  normalizePrototype,
  type UpstreamPrototype,
} from '../../utils/normalizers.js';

describe('normalizers', () => {
  describe('splitPipeSeparatedString', () => {
    it('splits pipe-separated string into array', () => {
      const result = splitPipeSeparatedString('tag1|tag2|tag3');
      expect(result).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('trims whitespace from each segment', () => {
      const result = splitPipeSeparatedString('tag1 | tag2|tag3 ');
      expect(result).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('returns empty array for empty string', () => {
      const result = splitPipeSeparatedString('');
      expect(result).toEqual([]);
    });

    it('returns empty array for falsy values', () => {
      expect(splitPipeSeparatedString(null as any)).toEqual([]);
      expect(splitPipeSeparatedString(undefined as any)).toEqual([]);
    });

    it('handles single value without pipe', () => {
      const result = splitPipeSeparatedString('single');
      expect(result).toEqual(['single']);
    });

    it('handles empty segments', () => {
      const result = splitPipeSeparatedString('tag1||tag3');
      expect(result).toEqual(['tag1', '', 'tag3']);
    });

    it('handles string with only pipes', () => {
      const result = splitPipeSeparatedString('|||');
      expect(result).toEqual(['', '', '', '']);
    });

    it('handles string with trailing pipe', () => {
      const result = splitPipeSeparatedString('tag1|tag2|');
      expect(result).toEqual(['tag1', 'tag2', '']);
    });

    it('handles string with leading pipe', () => {
      const result = splitPipeSeparatedString('|tag1|tag2');
      expect(result).toEqual(['', 'tag1', 'tag2']);
    });

    it('handles whitespace-only segments', () => {
      const result = splitPipeSeparatedString('tag1|  |tag3');
      expect(result).toEqual(['tag1', '', 'tag3']);
    });

    it('handles Japanese characters', () => {
      const result = splitPipeSeparatedString('タグ1|タグ2|タグ3');
      expect(result).toEqual(['タグ1', 'タグ2', 'タグ3']);
    });

    it('handles special characters', () => {
      const result = splitPipeSeparatedString('tag@1|tag#2|tag$3');
      expect(result).toEqual(['tag@1', 'tag#2', 'tag$3']);
    });

    it('handles very long string', () => {
      const longString = Array(100).fill('tag').join('|');
      const result = splitPipeSeparatedString(longString);
      expect(result).toHaveLength(100);
      expect(result.every((s: string) => s === 'tag')).toBe(true);
    });
  });

  describe('normalizePrototype', () => {
    const createUpstreamPrototype = (
      overrides: Partial<UpstreamPrototype> = {},
    ): UpstreamPrototype => ({
      id: 123,
      uuid: 'uuid-123',
      nid: 'nid-123',
      prototypeNm: 'Test Prototype',
      tags: 'IoT|AI|Robotics',
      teamNm: 'Test Team',
      users: 'user1|user2',
      summary: 'A test prototype',
      status: 1,
      releaseFlg: 1,
      createId: 100,
      createDate: '2024-01-15 12:00:00',
      updateId: 101,
      updateDate: '2024-01-16 13:00:00',
      releaseDate: '2024-01-17 14:00:00',
      revision: 1,
      awards: 'award1|award2',
      freeComment: 'Free comment text',
      systemDescription: 'System description',
      viewCount: 100,
      goodCount: 50,
      commentCount: 10,
      videoUrl: 'https://example.com/video',
      mainUrl: 'https://example.com/main',
      relatedLink: 'https://example.com/link1',
      relatedLink2: 'https://example.com/link2',
      relatedLink3: 'https://example.com/link3',
      relatedLink4: 'https://example.com/link4',
      relatedLink5: 'https://example.com/link5',
      licenseType: 1,
      thanksFlg: 0,
      events: 'event1|event2',
      officialLink: 'https://example.com/official',
      materials: 'material1|material2',
      slideMode: 0,
      ...overrides,
    });

    describe('basic field mapping', () => {
      it('maps all scalar fields correctly', () => {
        const upstream = createUpstreamPrototype();
        const normalized = normalizePrototype(upstream);

        expect(normalized.id).toBe(123);
        expect(normalized.prototypeNm).toBe('Test Prototype');
        expect(normalized.teamNm).toBe('Test Team');
        expect(normalized.summary).toBe('A test prototype');
        expect(normalized.status).toBe(1);
        expect(normalized.releaseFlg).toBe(1);
        expect(normalized.createId).toBe(100);
        expect(normalized.updateId).toBe(101);
        expect(normalized.revision).toBe(1);
        expect(normalized.freeComment).toBe('Free comment text');
        expect(normalized.systemDescription).toBe('System description');
        expect(normalized.viewCount).toBe(100);
        expect(normalized.goodCount).toBe(50);
        expect(normalized.commentCount).toBe(10);
        expect(normalized.videoUrl).toBe('https://example.com/video');
        expect(normalized.mainUrl).toBe('https://example.com/main');
        expect(normalized.relatedLink).toBe('https://example.com/link1');
        expect(normalized.relatedLink2).toBe('https://example.com/link2');
        expect(normalized.relatedLink3).toBe('https://example.com/link3');
        expect(normalized.relatedLink4).toBe('https://example.com/link4');
        expect(normalized.relatedLink5).toBe('https://example.com/link5');
        expect(normalized.licenseType).toBe(1);
        expect(normalized.thanksFlg).toBe(0);
        expect(normalized.officialLink).toBe('https://example.com/official');
      });
    });

    describe('pipe-separated field transformation', () => {
      it('splits tags into array', () => {
        const upstream = createUpstreamPrototype({
          tags: 'IoT|AI|Robotics',
        });
        const normalized = normalizePrototype(upstream);

        expect(normalized.tags).toEqual(['IoT', 'AI', 'Robotics']);
      });

      it('splits users into array', () => {
        const upstream = createUpstreamPrototype({
          users: 'user1|user2|user3',
        });
        const normalized = normalizePrototype(upstream);

        expect(normalized.users).toEqual(['user1', 'user2', 'user3']);
      });

      it('splits awards into array', () => {
        const upstream = createUpstreamPrototype({
          awards: 'award1|award2|award3',
        });
        const normalized = normalizePrototype(upstream);

        expect(normalized.awards).toEqual(['award1', 'award2', 'award3']);
      });

      it('splits events into array', () => {
        const upstream = createUpstreamPrototype({
          events: 'event1|event2|event3',
        });
        const normalized = normalizePrototype(upstream);

        expect(normalized.events).toEqual(['event1', 'event2', 'event3']);
      });

      it('splits materials into array', () => {
        const upstream = createUpstreamPrototype({
          materials: 'material1|material2|material3',
        });
        const normalized = normalizePrototype(upstream);

        expect(normalized.materials).toEqual([
          'material1',
          'material2',
          'material3',
        ]);
      });

      it('handles empty pipe-separated fields as empty array', () => {
        const upstream = createUpstreamPrototype({
          tags: '',
          users: '',
          awards: '',
          events: '',
          materials: '',
        });
        const normalized = normalizePrototype(upstream);

        expect(normalized.tags).toEqual([]);
        expect(normalized.users).toEqual([]);
        expect(normalized.awards).toEqual([]);
        expect(normalized.events).toEqual([]);
        expect(normalized.materials).toEqual([]);
      });

      it('handles null pipe-separated fields as empty array', () => {
        const upstream = createUpstreamPrototype({
          tags: null as any,
          users: null as any,
          awards: null as any,
          events: null as any,
          materials: null as any,
        });
        const normalized = normalizePrototype(upstream);

        expect(normalized.tags).toEqual([]);
        expect(normalized.users).toEqual([]);
        expect(normalized.awards).toEqual([]);
        expect(normalized.events).toEqual([]);
        expect(normalized.materials).toEqual([]);
      });

      it('handles undefined pipe-separated fields as empty array', () => {
        const upstream = createUpstreamPrototype({
          tags: undefined as any,
          users: undefined as any,
          awards: undefined as any,
          events: undefined as any,
          materials: undefined as any,
        });
        const normalized = normalizePrototype(upstream);

        expect(normalized.tags).toEqual([]);
        expect(normalized.users).toEqual([]);
        expect(normalized.awards).toEqual([]);
        expect(normalized.events).toEqual([]);
        expect(normalized.materials).toEqual([]);
      });

      it('trims whitespace in pipe-separated fields', () => {
        const upstream = createUpstreamPrototype({
          tags: ' IoT | AI | Robotics ',
        });
        const normalized = normalizePrototype(upstream);

        expect(normalized.tags).toEqual(['IoT', 'AI', 'Robotics']);
      });
    });

    describe('date field normalization', () => {
      it('normalizes createDate to UTC', () => {
        const upstream = createUpstreamPrototype({
          createDate: '2024-01-15 12:00:00',
        });
        const normalized = normalizePrototype(upstream);

        expect(normalized.createDate).toBe('2024-01-15T03:00:00.000Z');
      });

      it('normalizes updateDate to UTC', () => {
        const upstream = createUpstreamPrototype({
          updateDate: '2024-01-16 13:00:00',
        });
        const normalized = normalizePrototype(upstream);

        expect(normalized.updateDate).toBe('2024-01-16T04:00:00.000Z');
      });

      it('normalizes releaseDate to UTC', () => {
        const upstream = createUpstreamPrototype({
          releaseDate: '2024-01-17 14:00:00',
        });
        const normalized = normalizePrototype(upstream);

        expect(normalized.releaseDate).toBe('2024-01-17T05:00:00.000Z');
      });

      it('normalizes all three date fields independently', () => {
        const upstream = createUpstreamPrototype({
          createDate: '2024-01-15 12:00:00',
          updateDate: '2024-01-16 13:00:00',
          releaseDate: '2024-01-17 14:00:00',
        });
        const normalized = normalizePrototype(upstream);

        // Each date field should be normalized independently
        expect(normalized.createDate).toBe('2024-01-15T03:00:00.000Z');
        expect(normalized.updateDate).toBe('2024-01-16T04:00:00.000Z');
        expect(normalized.releaseDate).toBe('2024-01-17T05:00:00.000Z');

        // Verify they are all different (regression test for releaseDate bug)
        expect(normalized.createDate).not.toBe(normalized.updateDate);
        expect(normalized.updateDate).not.toBe(normalized.releaseDate);
        expect(normalized.createDate).not.toBe(normalized.releaseDate);
      });

      it('falls back to original string when date normalization fails', () => {
        const upstream = createUpstreamPrototype({
          createDate: 'invalid-date',
        });
        const normalized = normalizePrototype(upstream);

        expect(normalized.createDate).toBe('invalid-date');
      });

      it('handles null dates by falling back to original value', () => {
        const upstream = createUpstreamPrototype({
          createDate: null as any,
        });
        const normalized = normalizePrototype(upstream);

        expect(normalized.createDate).toBe(null);
      });

      it('handles empty date strings', () => {
        const upstream = createUpstreamPrototype({
          createDate: '',
        });
        const normalized = normalizePrototype(upstream);

        expect(normalized.createDate).toBe('');
      });

      it('normalizes all three date fields independently with different values', () => {
        const upstream = createUpstreamPrototype({
          createDate: '2024-01-15 12:00:00',
          updateDate: '2024-02-20 15:30:00',
          releaseDate: '2024-03-25 18:45:00',
        });
        const normalized = normalizePrototype(upstream);

        // Each field should have its own distinct normalized value
        expect(normalized.createDate).toBe('2024-01-15T03:00:00.000Z');
        expect(normalized.updateDate).toBe('2024-02-20T06:30:00.000Z');
        expect(normalized.releaseDate).toBe('2024-03-25T09:45:00.000Z');

        // Verify they are all different (catch copy-paste bugs)
        expect(normalized.createDate).not.toBe(normalized.updateDate);
        expect(normalized.updateDate).not.toBe(normalized.releaseDate);
        expect(normalized.createDate).not.toBe(normalized.releaseDate);
      });
    });

    describe('type safety and structure', () => {
      it('returns object satisfying NormalizedPrototype type', () => {
        const upstream = createUpstreamPrototype();
        const normalized = normalizePrototype(upstream);

        // Type assertion to verify it satisfies the type
        const _typeCheck: NormalizedPrototype = normalized;
        expect(_typeCheck).toBeDefined();
      });

      it('includes all required NormalizedPrototype fields', () => {
        const upstream = createUpstreamPrototype();
        const normalized = normalizePrototype(upstream);

        const requiredFields = [
          'id',
          'prototypeNm',
          'tags',
          'teamNm',
          'users',
          'summary',
          'status',
          'releaseFlg',
          'createId',
          'createDate',
          'updateId',
          'updateDate',
          'releaseDate',
          'revision',
          'awards',
          'freeComment',
          'systemDescription',
          'viewCount',
          'goodCount',
          'commentCount',
          'videoUrl',
          'mainUrl',
          'relatedLink',
          'relatedLink2',
          'relatedLink3',
          'relatedLink4',
          'relatedLink5',
          'licenseType',
          'thanksFlg',
          'events',
          'officialLink',
          'materials',
        ];

        requiredFields.forEach((field) => {
          expect(normalized).toHaveProperty(field);
        });
      });
    });

    describe('edge cases', () => {
      it('handles prototype with minimal data', () => {
        const upstream = createUpstreamPrototype({
          tags: '',
          users: '',
          awards: '',
          events: '',
          materials: '',
          summary: '',
          freeComment: '',
          systemDescription: '',
          videoUrl: '',
          mainUrl: '',
          relatedLink: '',
          relatedLink2: '',
          relatedLink3: '',
          relatedLink4: '',
          relatedLink5: '',
          officialLink: '',
        });
        const normalized = normalizePrototype(upstream);

        expect(normalized.tags).toEqual([]);
        expect(normalized.users).toEqual([]);
        expect(normalized.awards).toEqual([]);
        expect(normalized.events).toEqual([]);
        expect(normalized.materials).toEqual([]);
      });

      it('handles prototype with ID 0', () => {
        const upstream = createUpstreamPrototype({ id: 0 });
        const normalized = normalizePrototype(upstream);

        expect(normalized.id).toBe(0);
      });

      it('handles prototype with negative counts', () => {
        const upstream = createUpstreamPrototype({
          viewCount: -1,
          goodCount: -1,
          commentCount: -1,
        });
        const normalized = normalizePrototype(upstream);

        expect(normalized.viewCount).toBe(-1);
        expect(normalized.goodCount).toBe(-1);
        expect(normalized.commentCount).toBe(-1);
      });

      it('handles very large count values', () => {
        const upstream = createUpstreamPrototype({
          viewCount: 999999999,
          goodCount: 888888888,
          commentCount: 777777777,
        });
        const normalized = normalizePrototype(upstream);

        expect(normalized.viewCount).toBe(999999999);
        expect(normalized.goodCount).toBe(888888888);
        expect(normalized.commentCount).toBe(777777777);
      });

      it('handles very long prototype name', () => {
        const longName = 'A'.repeat(1000);
        const upstream = createUpstreamPrototype({
          prototypeNm: longName,
        });
        const normalized = normalizePrototype(upstream);

        expect(normalized.prototypeNm).toBe(longName);
        expect(normalized.prototypeNm).toHaveLength(1000);
      });

      it('handles special characters in text fields', () => {
        const upstream = createUpstreamPrototype({
          prototypeNm: '<script>alert("test")</script>',
          summary: 'Summary with "quotes" and \'apostrophes\'',
          freeComment: 'Comment with\nnewlines\nand\ttabs',
        });
        const normalized = normalizePrototype(upstream);

        expect(normalized.prototypeNm).toBe('<script>alert("test")</script>');
        expect(normalized.summary).toBe(
          'Summary with "quotes" and \'apostrophes\'',
        );
        expect(normalized.freeComment).toBe(
          'Comment with\nnewlines\nand\ttabs',
        );
      });

      it('handles Unicode characters', () => {
        const upstream = createUpstreamPrototype({
          prototypeNm: '日本語プロトタイプ',
          teamNm: '開発チーム',
          tags: '技術|イノベーション',
        });
        const normalized = normalizePrototype(upstream);

        expect(normalized.prototypeNm).toBe('日本語プロトタイプ');
        expect(normalized.teamNm).toBe('開発チーム');
        expect(normalized.tags).toEqual(['技術', 'イノベーション']);
      });

      it('handles emoji in text fields', () => {
        const upstream = createUpstreamPrototype({
          prototypeNm: 'Prototype 🚀',
          summary: 'Summary with emoji 😊',
        });
        const normalized = normalizePrototype(upstream);

        expect(normalized.prototypeNm).toBe('Prototype 🚀');
        expect(normalized.summary).toBe('Summary with emoji 😊');
      });
    });

    describe('real-world scenarios', () => {
      it('normalizes typical ProtoPedia prototype data', () => {
        const upstream: UpstreamPrototype = {
          id: 12345,
          uuid: 'uuid-12345',
          nid: 'nid-12345',
          prototypeNm: 'IoT Temperature Monitor',
          tags: 'IoT|Sensors|ESP32',
          teamNm: 'Maker Team',
          users: 'user_a|user_b',
          summary: 'A temperature monitoring system using IoT',
          status: 1,
          releaseFlg: 1,
          createId: 100,
          createDate: '2023-05-20 14:30:00',
          updateId: 101,
          updateDate: '2024-11-15 09:45:30',
          releaseDate: '2024-03-10 18:00:00',
          revision: 3,
          awards: 'Best IoT Project|Innovation Award',
          freeComment: 'This project monitors temperature in real-time.',
          systemDescription: 'ESP32-based system with cloud integration',
          viewCount: 1250,
          goodCount: 85,
          commentCount: 23,
          videoUrl: 'https://youtube.com/watch?v=example',
          mainUrl: 'https://protopedia.cc/prototype/12345',
          relatedLink: 'https://github.com/user/project',
          relatedLink2: '',
          relatedLink3: '',
          relatedLink4: '',
          relatedLink5: '',
          licenseType: 1,
          thanksFlg: 1,
          events: 'Maker Faire Tokyo 2024|IoT Conference',
          officialLink: 'https://example.com/official',
          materials: 'ESP32|DHT22 Sensor|OLED Display',
          slideMode: 0,
        };

        const normalized = normalizePrototype(upstream);

        expect(normalized.id).toBe(12345);
        expect(normalized.prototypeNm).toBe('IoT Temperature Monitor');
        expect(normalized.tags).toEqual(['IoT', 'Sensors', 'ESP32']);
        expect(normalized.users).toEqual(['user_a', 'user_b']);
        expect(normalized.createDate).toBe('2023-05-20T05:30:00.000Z');
        expect(normalized.updateDate).toBe('2024-11-15T00:45:30.000Z');
        expect(normalized.releaseDate).toBe('2024-03-10T09:00:00.000Z');
        expect(normalized.awards).toEqual([
          'Best IoT Project',
          'Innovation Award',
        ]);
        expect(normalized.events).toEqual([
          'Maker Faire Tokyo 2024',
          'IoT Conference',
        ]);
        expect(normalized.materials).toEqual([
          'ESP32',
          'DHT22 Sensor',
          'OLED Display',
        ]);
      });

      it('falls back to original timestamp when normalization returns null', () => {
        const upstream: UpstreamPrototype = {
          id: 1,
          uuid: 'uuid-invalid',
          nid: 'nid-invalid',
          createId: 1,
          prototypeNm: 'Test',
          teamNm: 'Team',
          users: '',
          status: 1,
          releaseFlg: 1,
          createDate: 'invalid-date-format',
          updateDate: '99999-13-45',
          releaseDate: '',
          revision: 1,
          freeComment: '',
          systemDescription: '',
          viewCount: 0,
          goodCount: 0,
          commentCount: 0,
          mainUrl: '',
          licenseType: 1,
          thanksFlg: 0,
        };

        const normalized = normalizePrototype(upstream);

        // When normalizeProtoPediaTimestamp returns null, fallback to original
        expect(normalized.createDate).toBe('invalid-date-format');
        expect(normalized.updateDate).toBe('99999-13-45');
        expect(normalized.releaseDate).toBe('');
      });
    });

    describe('v3.0.0 optional fields handling', () => {
      it('handles missing teamNm with default empty string', () => {
        const upstream = createUpstreamPrototype();
        delete (upstream as any).teamNm;
        const normalized = normalizePrototype(upstream);

        expect(normalized.teamNm).toBe('');
      });

      it('handles missing users with default empty array', () => {
        const upstream = createUpstreamPrototype();
        delete (upstream as any).users;
        const normalized = normalizePrototype(upstream);

        expect(normalized.users).toEqual([]);
      });

      it('handles missing freeComment with default empty string', () => {
        const upstream = createUpstreamPrototype();
        delete (upstream as any).freeComment;
        const normalized = normalizePrototype(upstream);

        expect(normalized.freeComment).toBe('');
      });

      it('handles missing releaseDate with default undefined', () => {
        const upstream = createUpstreamPrototype();
        delete (upstream as any).releaseDate;
        const normalized = normalizePrototype(upstream);

        expect(normalized.releaseDate).toBeUndefined();
      });

      it('handles missing thanksFlg with default 0', () => {
        const upstream = createUpstreamPrototype();
        delete (upstream as any).thanksFlg;
        const normalized = normalizePrototype(upstream);

        expect(normalized.thanksFlg).toBe(0);
      });

      it('handles missing uuid as-is (undefined)', () => {
        const upstream = createUpstreamPrototype();
        delete (upstream as any).uuid;
        const normalized = normalizePrototype(upstream);

        expect(normalized.uuid).toBeUndefined();
      });

      it('handles missing revision with default 0', () => {
        const upstream = createUpstreamPrototype();
        delete (upstream as any).revision;
        const normalized = normalizePrototype(upstream);

        expect(normalized.revision).toBe(0);
      });

      it('handles missing releaseFlg with default 2 (Released)', () => {
        const upstream = createUpstreamPrototype();
        delete (upstream as any).releaseFlg;
        const normalized = normalizePrototype(upstream);

        expect(normalized.releaseFlg).toBe(2);
      });

      it('handles missing licenseType with default 1', () => {
        const upstream = createUpstreamPrototype();
        delete (upstream as any).licenseType;
        const normalized = normalizePrototype(upstream);

        expect(normalized.licenseType).toBe(1);
      });

      it('handles all v3.0.0 optional fields as missing simultaneously', () => {
        const upstream = createUpstreamPrototype();
        delete (upstream as any).teamNm;
        delete (upstream as any).users;
        delete (upstream as any).freeComment;
        delete (upstream as any).releaseDate;
        delete (upstream as any).thanksFlg;
        delete (upstream as any).uuid;
        delete (upstream as any).revision;
        delete (upstream as any).releaseFlg;
        delete (upstream as any).licenseType;
        const normalized = normalizePrototype(upstream);

        expect(normalized.teamNm).toBe('');
        expect(normalized.users).toEqual([]);
        expect(normalized.freeComment).toBe('');
        expect(normalized.releaseDate).toBeUndefined();
        expect(normalized.thanksFlg).toBe(0);
        expect(normalized.uuid).toBeUndefined();
        expect(normalized.revision).toBe(0);
        expect(normalized.releaseFlg).toBe(2);
        expect(normalized.licenseType).toBe(1);
      });

      it('preserves defined values even when they are falsy', () => {
        const upstream = createUpstreamPrototype({
          teamNm: '',
          users: '',
          freeComment: '',
          thanksFlg: 0,
          revision: 0,
          releaseFlg: 0,
          licenseType: 0,
        });
        const normalized = normalizePrototype(upstream);

        // Empty strings should remain as-is
        expect(normalized.teamNm).toBe('');
        expect(normalized.users).toEqual([]);
        expect(normalized.freeComment).toBe('');
        // Zeros should remain as-is (not replaced with defaults)
        expect(normalized.thanksFlg).toBe(0);
        expect(normalized.revision).toBe(0);
        expect(normalized.releaseFlg).toBe(0);
        expect(normalized.licenseType).toBe(0);
      });

      it('handles null values for v3.0.0 optional string fields', () => {
        const upstream = createUpstreamPrototype({
          teamNm: null as any,
          users: null as any,
          freeComment: null as any,
          releaseDate: null as any,
        });
        const normalized = normalizePrototype(upstream);

        // Null should be coalesced to default values
        expect(normalized.teamNm).toBe('');
        expect(normalized.users).toEqual([]);
        expect(normalized.freeComment).toBe('');
        expect(normalized.releaseDate).toBeUndefined();
      });

      it('handles null values for v3.0.0 optional number fields', () => {
        const upstream = createUpstreamPrototype({
          thanksFlg: null as any,
          revision: null as any,
          releaseFlg: null as any,
          licenseType: null as any,
        });
        const normalized = normalizePrototype(upstream);

        // Null should be coalesced to default values
        expect(normalized.thanksFlg).toBe(0);
        expect(normalized.revision).toBe(0);
        expect(normalized.releaseFlg).toBe(2);
        expect(normalized.licenseType).toBe(1);
      });

      it('handles mix of missing and null optional fields', () => {
        const upstream = createUpstreamPrototype({
          teamNm: null as any,
          freeComment: null as any,
        });
        delete (upstream as any).users;
        delete (upstream as any).releaseDate;
        const normalized = normalizePrototype(upstream);

        expect(normalized.teamNm).toBe('');
        expect(normalized.users).toEqual([]);
        expect(normalized.freeComment).toBe('');
        expect(normalized.releaseDate).toBeUndefined();
      });

      it('handles missing summary with default empty string', () => {
        const upstream = createUpstreamPrototype();
        delete (upstream as any).summary;
        const normalized = normalizePrototype(upstream);

        expect(normalized.summary).toBe('');
      });

      it('handles missing systemDescription with default empty string', () => {
        const upstream = createUpstreamPrototype();
        delete (upstream as any).systemDescription;
        const normalized = normalizePrototype(upstream);

        expect(normalized.systemDescription).toBe('');
      });

      it('handles null summary with default empty string', () => {
        const upstream = createUpstreamPrototype({
          summary: null as any,
        });
        const normalized = normalizePrototype(upstream);

        expect(normalized.summary).toBe('');
      });

      it('handles null systemDescription with default empty string', () => {
        const upstream = createUpstreamPrototype({
          systemDescription: null as any,
        });
        const normalized = normalizePrototype(upstream);

        expect(normalized.systemDescription).toBe('');
      });

      it('handles missing createId as-is (undefined)', () => {
        const upstream = createUpstreamPrototype();
        delete (upstream as any).createId;
        const normalized = normalizePrototype(upstream);

        expect(normalized.createId).toBeUndefined();
      });

      it('handles missing updateId as-is (undefined)', () => {
        const upstream = createUpstreamPrototype();
        delete (upstream as any).updateId;
        const normalized = normalizePrototype(upstream);

        expect(normalized.updateId).toBeUndefined();
      });

      it('handles missing updateDate as-is (undefined)', () => {
        const upstream = createUpstreamPrototype();
        delete (upstream as any).updateDate;
        const normalized = normalizePrototype(upstream);

        expect(normalized.updateDate).toBeUndefined();
      });

      it('handles missing slideMode as-is (undefined)', () => {
        const upstream = createUpstreamPrototype();
        delete (upstream as any).slideMode;
        const normalized = normalizePrototype(upstream);

        expect(normalized.slideMode).toBeUndefined();
      });

      it('handles missing optional URL fields as-is (undefined)', () => {
        const upstream = createUpstreamPrototype();
        delete (upstream as any).officialLink;
        delete (upstream as any).videoUrl;
        delete (upstream as any).relatedLink;
        delete (upstream as any).relatedLink2;
        delete (upstream as any).relatedLink3;
        delete (upstream as any).relatedLink4;
        delete (upstream as any).relatedLink5;
        const normalized = normalizePrototype(upstream);

        expect(normalized.officialLink).toBeUndefined();
        expect(normalized.videoUrl).toBeUndefined();
        expect(normalized.relatedLink).toBeUndefined();
        expect(normalized.relatedLink2).toBeUndefined();
        expect(normalized.relatedLink3).toBeUndefined();
        expect(normalized.relatedLink4).toBeUndefined();
        expect(normalized.relatedLink5).toBeUndefined();
      });

      it('preserves empty string URL fields', () => {
        const upstream = createUpstreamPrototype({
          officialLink: '',
          videoUrl: '',
          relatedLink: '',
          relatedLink2: '',
          relatedLink3: '',
          relatedLink4: '',
          relatedLink5: '',
        });
        const normalized = normalizePrototype(upstream);

        expect(normalized.officialLink).toBe('');
        expect(normalized.videoUrl).toBe('');
        expect(normalized.relatedLink).toBe('');
        expect(normalized.relatedLink2).toBe('');
        expect(normalized.relatedLink3).toBe('');
        expect(normalized.relatedLink4).toBe('');
        expect(normalized.relatedLink5).toBe('');
      });

      it('handles prototype with all optional fields missing', () => {
        const upstream = createUpstreamPrototype();
        // Remove all optional fields
        delete (upstream as any).teamNm;
        delete (upstream as any).users;
        delete (upstream as any).summary;
        delete (upstream as any).freeComment;
        delete (upstream as any).systemDescription;
        delete (upstream as any).releaseDate;
        delete (upstream as any).createId;
        delete (upstream as any).updateId;
        delete (upstream as any).updateDate;
        delete (upstream as any).tags;
        delete (upstream as any).awards;
        delete (upstream as any).events;
        delete (upstream as any).materials;
        delete (upstream as any).thanksFlg;
        delete (upstream as any).uuid;
        delete (upstream as any).nid;
        delete (upstream as any).revision;
        delete (upstream as any).releaseFlg;
        delete (upstream as any).licenseType;
        delete (upstream as any).slideMode;
        delete (upstream as any).officialLink;
        delete (upstream as any).videoUrl;
        delete (upstream as any).relatedLink;
        delete (upstream as any).relatedLink2;
        delete (upstream as any).relatedLink3;
        delete (upstream as any).relatedLink4;
        delete (upstream as any).relatedLink5;

        const normalized = normalizePrototype(upstream);

        // Should still be valid with all defaults applied
        expect(normalized.id).toBe(123);
        expect(normalized.prototypeNm).toBe('Test Prototype');
        expect(normalized.teamNm).toBe('');
        expect(normalized.users).toEqual([]);
        expect(normalized.summary).toBe('');
        expect(normalized.freeComment).toBe('');
        expect(normalized.systemDescription).toBe('');
        expect(normalized.tags).toEqual([]);
        expect(normalized.awards).toEqual([]);
        expect(normalized.events).toEqual([]);
        expect(normalized.materials).toEqual([]);
        expect(normalized.thanksFlg).toBe(0);
        expect(normalized.revision).toBe(0);
        expect(normalized.releaseFlg).toBe(2);
        expect(normalized.licenseType).toBe(1);
      });

      it('handles nid field correctly', () => {
        const upstream = createUpstreamPrototype({
          nid: 'test-nid-value',
        });
        const normalized = normalizePrototype(upstream);

        expect(normalized.nid).toBe('test-nid-value');
      });

      it('handles missing nid as-is (undefined)', () => {
        const upstream = createUpstreamPrototype();
        delete (upstream as any).nid;
        const normalized = normalizePrototype(upstream);

        expect(normalized.nid).toBeUndefined();
      });

      it('handles real-world data with sparse optional fields', () => {
        const upstream = createUpstreamPrototype({
          // Only provide required fields and some optional ones
          teamNm: 'Real Team',
          users: 'maker1|maker2',
          summary: 'A real project',
          // Missing: freeComment, systemDescription, awards, events, materials
          // Missing: officialLink, videoUrl, relatedLinks
          // Missing: uuid, nid, slideMode
        });
        delete (upstream as any).freeComment;
        delete (upstream as any).systemDescription;
        delete (upstream as any).awards;
        delete (upstream as any).events;
        delete (upstream as any).materials;
        delete (upstream as any).officialLink;
        delete (upstream as any).videoUrl;
        delete (upstream as any).relatedLink;
        delete (upstream as any).relatedLink2;
        delete (upstream as any).relatedLink3;
        delete (upstream as any).relatedLink4;
        delete (upstream as any).relatedLink5;
        delete (upstream as any).uuid;
        delete (upstream as any).nid;
        delete (upstream as any).slideMode;

        const normalized = normalizePrototype(upstream);

        // Provided fields
        expect(normalized.teamNm).toBe('Real Team');
        expect(normalized.users).toEqual(['maker1', 'maker2']);
        expect(normalized.summary).toBe('A real project');

        // Default values for missing fields
        expect(normalized.freeComment).toBe('');
        expect(normalized.systemDescription).toBe('');
        expect(normalized.awards).toEqual([]);
        expect(normalized.events).toEqual([]);
        expect(normalized.materials).toEqual([]);
        expect(normalized.officialLink).toBeUndefined();
        expect(normalized.videoUrl).toBeUndefined();
        expect(normalized.uuid).toBeUndefined();
        expect(normalized.nid).toBeUndefined();
        expect(normalized.slideMode).toBeUndefined();
      });
    });

    describe('field coverage validation', () => {
      it('normalizes all upstream prototype fields', () => {
        const upstream = createUpstreamPrototype();
        const normalized = normalizePrototype(upstream);

        // Fields that are intentionally excluded from normalization
        // These are internal SDK fields not needed in the normalized output
        const excludedFields: Array<keyof UpstreamPrototype> = [
          'uuid', // Internal SDK identifier
          'nid', // Internal SDK identifier
          'slideMode', // Internal display mode flag
        ];

        // Get all keys from both objects
        const upstreamKeys = Object.keys(upstream) as Array<
          keyof UpstreamPrototype
        >;
        const normalizedKeys = Object.keys(normalized) as Array<
          keyof NormalizedPrototype
        >;

        // Check that all upstream fields are handled (either copied, transformed, or excluded)
        const missingFields = upstreamKeys.filter((key) => {
          // Skip excluded fields
          if (excludedFields.includes(key)) {
            return false;
          }
          // Check if the field exists in normalized output
          return !(key in normalized);
        });

        // If this test fails, it means upstream added new fields that aren't being normalized
        expect(
          missingFields,
          `The following upstream fields are not being normalized: ${missingFields.join(', ')}. ` +
            'Please update normalizePrototype() in lib/fetcher/utils/normalizers.ts',
        ).toEqual([]);
      });

      it('does not add unexpected fields to normalized output', () => {
        const upstream = createUpstreamPrototype();
        const normalized = normalizePrototype(upstream);

        const normalizedKeys = Object.keys(normalized);
        const upstreamKeys = Object.keys(upstream);

        // Check that normalized doesn't have fields that don't exist in upstream
        const unexpectedFields = normalizedKeys.filter((key) => {
          return !(key in upstream);
        });

        // This ensures we're not accidentally adding fields from nowhere
        expect(
          unexpectedFields,
          `Unexpected fields found in normalized output: ${unexpectedFields.join(', ')}`,
        ).toEqual([]);
      });
    });
  });
});
