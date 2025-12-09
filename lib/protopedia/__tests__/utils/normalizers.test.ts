import { describe, expect, it } from 'vitest';

import type { NormalizedPrototype } from '../../../core/types.js';
import {
  splitPipeSeparatedString,
  normalizePrototype,
  type UpstreamPrototype,
} from '../../utils/normalizers.js';

describe('utils', () => {
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
  });
});
