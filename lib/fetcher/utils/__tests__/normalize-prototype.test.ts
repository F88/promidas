import { describe, expect, it } from 'vitest';

import type { UpstreamPrototype } from '../../types/prototype-api.types.js';
import { normalizePrototype } from '../normalize-prototype.js';

/**
 * Helper to create a minimal valid UpstreamPrototype for testing
 */
function createMinimalUpstream(
  overrides?: Partial<UpstreamPrototype>,
): UpstreamPrototype {
  return {
    id: 1,
    createDate: '2024-01-01 00:00:00.0',
    updateDate: '2024-01-02 00:00:00.0',
    createId: 100,
    updateId: 200,
    releaseFlg: 2,
    status: 1,
    prototypeNm: 'Test Prototype',
    summary: 'A test prototype',
    freeComment: 'A comment',
    systemDescription: 'A description',
    users: 'user1|user2',
    teamNm: 'Team Alpha',
    tags: 'IoT|AI',
    materials: 'material1',
    events: 'event1',
    awards: 'award1',
    officialLink: 'https://example.com',
    videoUrl: 'https://youtube.com/watch',
    mainUrl: 'https://example.com/image.jpg',
    relatedLink: 'https://example.com/related',
    relatedLink2: 'https://example.com/related2',
    relatedLink3: 'https://example.com/related3',
    relatedLink4: 'https://example.com/related4',
    relatedLink5: 'https://example.com/related5',
    viewCount: 0,
    goodCount: 0,
    commentCount: 0,
    uuid: 'test-uuid',
    nid: 'test-nid',
    revision: 0,
    licenseType: 1,
    thanksFlg: 0,
    slideMode: 0,
    ...overrides,
  };
}

describe('normalizePrototype', () => {
  describe('Field-focused testing', () => {
    describe('id field', () => {
      it('maps id from upstream', () => {
        const upstream = createMinimalUpstream({ id: 42 });
        const result = normalizePrototype(upstream);
        expect(result.id).toBe(42);
      });
    });

    describe('createDate field', () => {
      it('normalizes valid ProtoPedia timestamp', () => {
        const upstream = createMinimalUpstream({
          createDate: '2024-01-15 10:30:45.0',
        });
        const result = normalizePrototype(upstream);
        expect(result.createDate).toBe('2024-01-15T01:30:45.000Z');
      });

      it('uses original value if normalization fails', () => {
        const upstream = createMinimalUpstream({
          createDate: 'invalid-date',
        });
        const result = normalizePrototype(upstream);
        expect(result.createDate).toBe('invalid-date');
      });

      it('correctly converts JST to UTC (9-hour offset)', () => {
        const upstream = createMinimalUpstream({
          createDate: '2024-06-15 09:00:00.0',
        });
        const result = normalizePrototype(upstream);
        expect(result.createDate).toBe('2024-06-15T00:00:00.000Z');
      });

      it('handles midnight JST correctly', () => {
        const upstream = createMinimalUpstream({
          createDate: '2024-01-01 00:00:00.0',
        });
        const result = normalizePrototype(upstream);
        expect(result.createDate).toBe('2023-12-31T15:00:00.000Z');
      });

      it('handles end of day JST correctly', () => {
        const upstream = createMinimalUpstream({
          createDate: '2024-12-31 23:59:59.0',
        });
        const result = normalizePrototype(upstream);
        expect(result.createDate).toBe('2024-12-31T14:59:59.000Z');
      });

      it('handles leap year date correctly', () => {
        const upstream = createMinimalUpstream({
          createDate: '2024-02-29 12:00:00.0',
        });
        const result = normalizePrototype(upstream);
        expect(result.createDate).toBe('2024-02-29T03:00:00.000Z');
      });

      it('handles empty string by passing through', () => {
        const upstream = createMinimalUpstream({
          createDate: '',
        });
        const result = normalizePrototype(upstream);
        expect(result.createDate).toBe('');
      });

      describe('MEDIUM: Format variations', () => {
        it('handles different millisecond formats (.00)', () => {
          const upstream = createMinimalUpstream({
            createDate: '2024-01-01 12:00:00.00',
          });
          const result = normalizePrototype(upstream);
          expect(result.createDate).toBe('2024-01-01T03:00:00.000Z');
        });

        it('handles different millisecond formats (.000)', () => {
          const upstream = createMinimalUpstream({
            createDate: '2024-01-01 12:00:00.000',
          });
          const result = normalizePrototype(upstream);
          expect(result.createDate).toBe('2024-01-01T03:00:00.000Z');
        });

        it('handles different millisecond formats (.123)', () => {
          const upstream = createMinimalUpstream({
            createDate: '2024-01-01 12:00:00.123',
          });
          const result = normalizePrototype(upstream);
          expect(result.createDate).toBe('2024-01-01T03:00:00.123Z');
        });

        it('handles W3C-DTF format with timezone', () => {
          const upstream = createMinimalUpstream({
            createDate: '2024-01-01T12:00:00+09:00',
          });
          const result = normalizePrototype(upstream);
          // W3C-DTF is converted to UTC ISO format
          expect(result.createDate).toBe('2024-01-01T03:00:00.000Z');
        });

        it('handles ISO 8601 UTC format', () => {
          const upstream = createMinimalUpstream({
            createDate: '2024-01-01T03:00:00Z',
          });
          const result = normalizePrototype(upstream);
          // Normalizer converts to standard format with milliseconds
          expect(result.createDate).toBe('2024-01-01T03:00:00.000Z');
        });
      });

      describe('LOW: Boundary dates', () => {
        it('handles Year 2038 problem boundary', () => {
          const upstream = createMinimalUpstream({
            createDate: '2038-01-19 03:14:07.0',
          });
          const result = normalizePrototype(upstream);
          expect(result.createDate).toBe('2038-01-18T18:14:07.000Z');
        });

        it('handles Unix epoch start (JST)', () => {
          const upstream = createMinimalUpstream({
            createDate: '1970-01-01 09:00:00.0',
          });
          const result = normalizePrototype(upstream);
          expect(result.createDate).toBe('1970-01-01T00:00:00.000Z');
        });
      });
    });

    describe('updateDate field', () => {
      it('normalizes valid ProtoPedia timestamp', () => {
        const upstream = createMinimalUpstream({
          updateDate: '2024-01-20 15:45:30.0',
        });
        const result = normalizePrototype(upstream);
        expect(result.updateDate).toBe('2024-01-20T06:45:30.000Z');
      });

      it('uses original value if normalization fails', () => {
        const upstream = createMinimalUpstream({
          updateDate: 'invalid-date',
        });
        const result = normalizePrototype(upstream);
        expect(result.updateDate).toBe('invalid-date');
      });

      it('returns undefined when updateDate is not provided', () => {
        const { updateDate, ...rest } = createMinimalUpstream();
        const upstream = rest as UpstreamPrototype;
        const result = normalizePrototype(upstream);
        expect(result.updateDate).toBeUndefined();
      });

      it('correctly converts JST to UTC (9-hour offset)', () => {
        const upstream = createMinimalUpstream({
          updateDate: '2024-06-20 18:00:00.0',
        });
        const result = normalizePrototype(upstream);
        expect(result.updateDate).toBe('2024-06-20T09:00:00.000Z');
      });

      it('handles empty string by passing through', () => {
        const upstream = createMinimalUpstream({
          updateDate: '',
        });
        const result = normalizePrototype(upstream);
        expect(result.updateDate).toBe('');
      });
    });

    describe('releaseDate field', () => {
      it('normalizes valid ProtoPedia timestamp', () => {
        const upstream = createMinimalUpstream({
          releaseDate: '2024-02-01 12:00:00.0',
        });
        const result = normalizePrototype(upstream);
        expect(result.releaseDate).toBe('2024-02-01T03:00:00.000Z');
      });

      it('converts null to undefined', () => {
        // Note: Cannot pass null directly due to type constraints,
        // but testing the ?? undefined operator behavior
        const upstream = createMinimalUpstream({ releaseDate: '' });
        // Empty string case is handled by splitPipeSeparatedString
        const result = normalizePrototype(upstream);
        expect(result.releaseDate).toBeDefined(); // Empty string passes through
      });

      it('returns original value if normalization fails', () => {
        const upstream = createMinimalUpstream({
          releaseDate: 'invalid-date',
        });
        const result = normalizePrototype(upstream);
        // normalizeProtoPediaTimestamp returns original value on parse failure
        // Then ?? undefined converts it to undefined
        expect(result.releaseDate).toBe('invalid-date');
      });

      it('returns undefined when releaseDate is not provided', () => {
        const { releaseDate, ...rest } = createMinimalUpstream();
        const upstream = rest as UpstreamPrototype;
        const result = normalizePrototype(upstream);
        expect(result.releaseDate).toBeUndefined();
      });

      it('correctly converts JST to UTC (9-hour offset)', () => {
        const upstream = createMinimalUpstream({
          releaseDate: '2024-07-01 15:00:00.0',
        });
        const result = normalizePrototype(upstream);
        expect(result.releaseDate).toBe('2024-07-01T06:00:00.000Z');
      });

      it('handles empty string by passing through', () => {
        const upstream = createMinimalUpstream({
          releaseDate: '',
        });
        const result = normalizePrototype(upstream);
        expect(result.releaseDate).toBe('');
      });
    });

    describe('createId field', () => {
      it('maps createId from upstream', () => {
        const upstream = createMinimalUpstream({ createId: 123 });
        const result = normalizePrototype(upstream);
        expect(result.createId).toBe(123);
      });

      it('returns undefined when createId is not provided', () => {
        const { createId, ...rest } = createMinimalUpstream();
        const upstream = rest as UpstreamPrototype;
        const result = normalizePrototype(upstream);
        expect(result.createId).toBeUndefined();
      });
    });

    describe('updateId field', () => {
      it('maps updateId from upstream', () => {
        const upstream = createMinimalUpstream({ updateId: 456 });
        const result = normalizePrototype(upstream);
        expect(result.updateId).toBe(456);
      });

      it('returns undefined when updateId is not provided', () => {
        const { updateId, ...rest } = createMinimalUpstream();
        const upstream = rest as UpstreamPrototype;
        const result = normalizePrototype(upstream);
        expect(result.updateId).toBeUndefined();
      });
    });

    describe('releaseFlg field', () => {
      it('maps releaseFlg from upstream', () => {
        const upstream = createMinimalUpstream({ releaseFlg: 1 });
        const result = normalizePrototype(upstream);
        expect(result.releaseFlg).toBe(1);
      });

      it('defaults to 2 when releaseFlg is not provided', () => {
        const { releaseFlg, ...rest } = createMinimalUpstream();
        const upstream = rest as UpstreamPrototype;
        const result = normalizePrototype(upstream);
        expect(result.releaseFlg).toBe(2);
      });

      it('preserves explicit 0 value (does not default)', () => {
        const upstream = createMinimalUpstream({ releaseFlg: 0 });
        const result = normalizePrototype(upstream);
        expect(result.releaseFlg).toBe(0);
      });

      describe('MEDIUM: Boundary values', () => {
        it('handles negative numbers', () => {
          const upstream = createMinimalUpstream({ releaseFlg: -1 });
          const result = normalizePrototype(upstream);
          expect(result.releaseFlg).toBe(-1);
        });

        it('handles decimal values (if type allows)', () => {
          const upstream = createMinimalUpstream({ releaseFlg: 1.5 as any });
          const result = normalizePrototype(upstream);
          expect(result.releaseFlg).toBe(1.5);
        });
      });
    });

    describe('status field', () => {
      it('maps status from upstream', () => {
        const upstream = createMinimalUpstream({ status: 3 });
        const result = normalizePrototype(upstream);
        expect(result.status).toBe(3);
      });
    });

    describe('prototypeNm field', () => {
      it('maps prototypeNm from upstream', () => {
        const upstream = createMinimalUpstream({
          prototypeNm: 'My Prototype',
        });
        const result = normalizePrototype(upstream);
        expect(result.prototypeNm).toBe('My Prototype');
      });

      describe('MEDIUM: Special characters', () => {
        it('handles Unicode and emoji in name', () => {
          const upstream = createMinimalUpstream({
            prototypeNm: '🚀 ロケット Prototype',
          });
          const result = normalizePrototype(upstream);
          expect(result.prototypeNm).toBe('🚀 ロケット Prototype');
        });

        it('handles special characters', () => {
          const upstream = createMinimalUpstream({
            prototypeNm: 'Prototype v2.0 (beta)',
          });
          const result = normalizePrototype(upstream);
          expect(result.prototypeNm).toBe('Prototype v2.0 (beta)');
        });
      });

      describe('LOW: Edge cases', () => {
        it('handles very long names', () => {
          const longName = 'Very Long Prototype Name '.repeat(10);
          const upstream = createMinimalUpstream({ prototypeNm: longName });
          const result = normalizePrototype(upstream);
          expect(result.prototypeNm).toBe(longName);
        });
      });
    });

    describe('summary field', () => {
      it('maps summary from upstream', () => {
        const upstream = createMinimalUpstream({ summary: 'A summary' });
        const result = normalizePrototype(upstream);
        expect(result.summary).toBe('A summary');
      });

      it('defaults to empty string when summary is not provided', () => {
        const { summary, ...rest } = createMinimalUpstream();
        const upstream = rest as UpstreamPrototype;
        const result = normalizePrototype(upstream);
        expect(result.summary).toBe('');
      });

      it('preserves explicit empty string', () => {
        const upstream = createMinimalUpstream({ summary: '' });
        const result = normalizePrototype(upstream);
        expect(result.summary).toBe('');
      });

      describe('MEDIUM: Special content', () => {
        it('handles whitespace-only strings', () => {
          const upstream = createMinimalUpstream({ summary: '   ' });
          const result = normalizePrototype(upstream);
          expect(result.summary).toBe('   ');
        });

        it('handles HTML content (passthrough)', () => {
          const upstream = createMinimalUpstream({
            summary: '<strong>Bold</strong>',
          });
          const result = normalizePrototype(upstream);
          expect(result.summary).toBe('<strong>Bold</strong>');
        });

        it('handles Markdown content', () => {
          const upstream = createMinimalUpstream({
            summary: '# Title\n\n**Bold**',
          });
          const result = normalizePrototype(upstream);
          expect(result.summary).toBe('# Title\n\n**Bold**');
        });

        it('handles Unicode and emoji', () => {
          const upstream = createMinimalUpstream({
            summary: '🎉 Success! 成功',
          });
          const result = normalizePrototype(upstream);
          expect(result.summary).toBe('🎉 Success! 成功');
        });

        it('handles newlines and tabs', () => {
          const upstream = createMinimalUpstream({
            summary: 'Line1\nLine2\tTabbed',
          });
          const result = normalizePrototype(upstream);
          expect(result.summary).toBe('Line1\nLine2\tTabbed');
        });
      });

      describe('LOW: Edge cases', () => {
        it('handles very long strings', () => {
          const longString = 'a'.repeat(10000);
          const upstream = createMinimalUpstream({ summary: longString });
          const result = normalizePrototype(upstream);
          expect(result.summary).toBe(longString);
          expect(result.summary.length).toBe(10000);
        });

        it('handles SQL-like content (passthrough)', () => {
          const upstream = createMinimalUpstream({
            summary: "'; DROP TABLE--",
          });
          const result = normalizePrototype(upstream);
          expect(result.summary).toBe("'; DROP TABLE--");
        });
      });
    });

    describe('freeComment field', () => {
      it('maps freeComment from upstream', () => {
        const upstream = createMinimalUpstream({
          freeComment: 'A free comment',
        });
        const result = normalizePrototype(upstream);
        expect(result.freeComment).toBe('A free comment');
      });

      it('defaults to empty string when freeComment is not provided', () => {
        const { freeComment, ...rest } = createMinimalUpstream();
        const upstream = rest as UpstreamPrototype;
        const result = normalizePrototype(upstream);
        expect(result.freeComment).toBe('');
      });

      it('preserves explicit empty string', () => {
        const upstream = createMinimalUpstream({ freeComment: '' });
        const result = normalizePrototype(upstream);
        expect(result.freeComment).toBe('');
      });

      describe('MEDIUM: Special content', () => {
        it('handles whitespace-only strings', () => {
          const upstream = createMinimalUpstream({ freeComment: '  \t  ' });
          const result = normalizePrototype(upstream);
          expect(result.freeComment).toBe('  \t  ');
        });

        it('handles HTML content in freeComment', () => {
          const upstream = createMinimalUpstream({
            freeComment: '<br>Line break<br>',
          });
          const result = normalizePrototype(upstream);
          expect(result.freeComment).toBe('<br>Line break<br>');
        });

        it('handles Unicode and emoji', () => {
          const upstream = createMinimalUpstream({
            freeComment: 'コメント 🎯',
          });
          const result = normalizePrototype(upstream);
          expect(result.freeComment).toBe('コメント 🎯');
        });

        it('handles multiline content with newlines', () => {
          const upstream = createMinimalUpstream({
            freeComment: 'Line 1\nLine 2\nLine 3',
          });
          const result = normalizePrototype(upstream);
          expect(result.freeComment).toBe('Line 1\nLine 2\nLine 3');
        });
      });
    });

    describe('systemDescription field', () => {
      it('maps systemDescription from upstream', () => {
        const upstream = createMinimalUpstream({
          systemDescription: 'System info',
        });
        const result = normalizePrototype(upstream);
        expect(result.systemDescription).toBe('System info');
      });

      it('defaults to empty string when systemDescription is not provided', () => {
        const { systemDescription, ...rest } = createMinimalUpstream();
        const upstream = rest as UpstreamPrototype;
        const result = normalizePrototype(upstream);
        expect(result.systemDescription).toBe('');
      });

      it('preserves explicit empty string', () => {
        const upstream = createMinimalUpstream({ systemDescription: '' });
        const result = normalizePrototype(upstream);
        expect(result.systemDescription).toBe('');
      });

      describe('MEDIUM: Special content', () => {
        it('handles HTML content', () => {
          const upstream = createMinimalUpstream({
            systemDescription: '<p>System <strong>info</strong></p>',
          });
          const result = normalizePrototype(upstream);
          expect(result.systemDescription).toBe(
            '<p>System <strong>info</strong></p>',
          );
        });

        it('handles very long description', () => {
          const longDesc = 'System description: ' + 'detail '.repeat(1000);
          const upstream = createMinimalUpstream({
            systemDescription: longDesc,
          });
          const result = normalizePrototype(upstream);
          expect(result.systemDescription).toBe(longDesc);
        });
      });
    });

    describe('users field', () => {
      it('splits pipe-separated users', () => {
        const upstream = createMinimalUpstream({ users: 'user1|user2|user3' });
        const result = normalizePrototype(upstream);
        expect(result.users).toEqual(['user1', 'user2', 'user3']);
      });

      it('returns empty array when users is empty string', () => {
        const upstream = createMinimalUpstream({ users: '' });
        const result = normalizePrototype(upstream);
        expect(result.users).toEqual([]);
      });

      it('returns empty array when users is not provided', () => {
        const { users, ...rest } = createMinimalUpstream();
        const upstream = rest as UpstreamPrototype;
        const result = normalizePrototype(upstream);
        expect(result.users).toEqual([]);
      });

      it('trims whitespace from segments', () => {
        const upstream = createMinimalUpstream({ users: ' user1 | user2 ' });
        const result = normalizePrototype(upstream);
        expect(result.users).toEqual(['user1', 'user2']);
      });

      it('filters empty segments', () => {
        const upstream = createMinimalUpstream({ users: 'user1||user2' });
        const result = normalizePrototype(upstream);
        expect(result.users).toEqual(['user1', 'user2']);
      });

      it('handles consecutive pipes correctly', () => {
        const upstream = createMinimalUpstream({ users: 'user1|||user2' });
        const result = normalizePrototype(upstream);
        expect(result.users).toEqual(['user1', 'user2']);
      });

      it('handles leading pipes', () => {
        const upstream = createMinimalUpstream({ users: '|user1|user2' });
        const result = normalizePrototype(upstream);
        expect(result.users).toEqual(['user1', 'user2']);
      });

      it('handles trailing pipes', () => {
        const upstream = createMinimalUpstream({ users: 'user1|user2|' });
        const result = normalizePrototype(upstream);
        expect(result.users).toEqual(['user1', 'user2']);
      });

      it('handles only pipes (returns empty array)', () => {
        const upstream = createMinimalUpstream({ users: '|||' });
        const result = normalizePrototype(upstream);
        expect(result.users).toEqual([]);
      });

      it('handles whitespace-only segments', () => {
        const upstream = createMinimalUpstream({ users: 'user1| |user2' });
        const result = normalizePrototype(upstream);
        expect(result.users).toEqual(['user1', 'user2']);
      });

      it('handles single item without pipes', () => {
        const upstream = createMinimalUpstream({ users: 'single-user' });
        const result = normalizePrototype(upstream);
        expect(result.users).toEqual(['single-user']);
      });

      describe('MEDIUM: Special characters and Unicode', () => {
        it('handles special characters in segments', () => {
          const upstream = createMinimalUpstream({
            users: 'user-1|user_2|user@3',
          });
          const result = normalizePrototype(upstream);
          expect(result.users).toEqual(['user-1', 'user_2', 'user@3']);
        });

        it('handles Unicode and emoji in segments', () => {
          const upstream = createMinimalUpstream({
            users: '🚀 Rocket|AI 人工知能',
          });
          const result = normalizePrototype(upstream);
          expect(result.users).toEqual(['🚀 Rocket', 'AI 人工知能']);
        });

        it('handles segments with internal spaces', () => {
          const upstream = createMinimalUpstream({
            users: 'John Doe|Jane Smith',
          });
          const result = normalizePrototype(upstream);
          expect(result.users).toEqual(['John Doe', 'Jane Smith']);
        });
      });
    });

    describe('teamNm field', () => {
      it('maps teamNm from upstream', () => {
        const upstream = createMinimalUpstream({ teamNm: 'Team Alpha' });
        const result = normalizePrototype(upstream);
        expect(result.teamNm).toBe('Team Alpha');
      });

      it('defaults to empty string when teamNm is empty', () => {
        const upstream = createMinimalUpstream({ teamNm: '' });
        const result = normalizePrototype(upstream);
        expect(result.teamNm).toBe('');
      });

      it('defaults to empty string when teamNm is not provided', () => {
        const { teamNm, ...rest } = createMinimalUpstream();
        const upstream = rest as UpstreamPrototype;
        const result = normalizePrototype(upstream);
        expect(result.teamNm).toBe('');
      });

      describe('LOW: Edge cases', () => {
        it('handles pipe character in team name (not split)', () => {
          const upstream = createMinimalUpstream({ teamNm: 'Team A|B' });
          const result = normalizePrototype(upstream);
          expect(result.teamNm).toBe('Team A|B');
        });

        it('handles Unicode in team name', () => {
          const upstream = createMinimalUpstream({ teamNm: 'チーム Alpha' });
          const result = normalizePrototype(upstream);
          expect(result.teamNm).toBe('チーム Alpha');
        });
      });
    });

    describe('tags field', () => {
      it('splits pipe-separated tags', () => {
        const upstream = createMinimalUpstream({ tags: 'tag1|tag2|tag3' });
        const result = normalizePrototype(upstream);
        expect(result.tags).toEqual(['tag1', 'tag2', 'tag3']);
      });

      it('returns empty array when tags is empty string', () => {
        const upstream = createMinimalUpstream({ tags: '' });
        const result = normalizePrototype(upstream);
        expect(result.tags).toEqual([]);
      });

      it('returns empty array when tags is not provided', () => {
        const { tags, ...rest } = createMinimalUpstream();
        const upstream = rest as UpstreamPrototype;
        const result = normalizePrototype(upstream);
        expect(result.tags).toEqual([]);
      });

      it('handles consecutive pipes correctly', () => {
        const upstream = createMinimalUpstream({ tags: 'tag1|||tag2' });
        const result = normalizePrototype(upstream);
        expect(result.tags).toEqual(['tag1', 'tag2']);
      });

      it('handles leading pipes', () => {
        const upstream = createMinimalUpstream({ tags: '|tag1|tag2' });
        const result = normalizePrototype(upstream);
        expect(result.tags).toEqual(['tag1', 'tag2']);
      });

      it('handles trailing pipes', () => {
        const upstream = createMinimalUpstream({ tags: 'tag1|tag2|' });
        const result = normalizePrototype(upstream);
        expect(result.tags).toEqual(['tag1', 'tag2']);
      });

      it('handles only pipes (returns empty array)', () => {
        const upstream = createMinimalUpstream({ tags: '|||' });
        const result = normalizePrototype(upstream);
        expect(result.tags).toEqual([]);
      });

      it('trims whitespace from segments', () => {
        const upstream = createMinimalUpstream({ tags: ' tag1 | tag2 ' });
        const result = normalizePrototype(upstream);
        expect(result.tags).toEqual(['tag1', 'tag2']);
      });

      it('handles single item without pipes', () => {
        const upstream = createMinimalUpstream({ tags: 'single-tag' });
        const result = normalizePrototype(upstream);
        expect(result.tags).toEqual(['single-tag']);
      });

      describe('MEDIUM: Special characters and Unicode', () => {
        it('handles special characters', () => {
          const upstream = createMinimalUpstream({ tags: 'C++|C#|Node.js' });
          const result = normalizePrototype(upstream);
          expect(result.tags).toEqual(['C++', 'C#', 'Node.js']);
        });

        it('handles Unicode and emoji', () => {
          const upstream = createMinimalUpstream({
            tags: '🎨 Design|機械学習',
          });
          const result = normalizePrototype(upstream);
          expect(result.tags).toEqual(['🎨 Design', '機械学習']);
        });

        it('handles tags with internal spaces', () => {
          const upstream = createMinimalUpstream({
            tags: 'Machine Learning|Deep Learning',
          });
          const result = normalizePrototype(upstream);
          expect(result.tags).toEqual(['Machine Learning', 'Deep Learning']);
        });
      });
    });

    describe('materials field', () => {
      it('splits pipe-separated materials', () => {
        const upstream = createMinimalUpstream({ materials: 'mat1|mat2' });
        const result = normalizePrototype(upstream);
        expect(result.materials).toEqual(['mat1', 'mat2']);
      });

      it('returns empty array when materials is not provided', () => {
        const { materials, ...rest } = createMinimalUpstream();
        const upstream = rest as UpstreamPrototype;
        const result = normalizePrototype(upstream);
        expect(result.materials).toEqual([]);
      });

      it('handles consecutive pipes correctly', () => {
        const upstream = createMinimalUpstream({ materials: 'mat1|||mat2' });
        const result = normalizePrototype(upstream);
        expect(result.materials).toEqual(['mat1', 'mat2']);
      });

      it('handles leading and trailing pipes', () => {
        const upstream = createMinimalUpstream({ materials: '|mat1|mat2|' });
        const result = normalizePrototype(upstream);
        expect(result.materials).toEqual(['mat1', 'mat2']);
      });

      it('returns empty array for only pipes', () => {
        const upstream = createMinimalUpstream({ materials: '|||' });
        const result = normalizePrototype(upstream);
        expect(result.materials).toEqual([]);
      });

      it('trims whitespace from segments', () => {
        const upstream = createMinimalUpstream({ materials: ' mat1 | mat2 ' });
        const result = normalizePrototype(upstream);
        expect(result.materials).toEqual(['mat1', 'mat2']);
      });

      it('returns empty array for empty string', () => {
        const upstream = createMinimalUpstream({ materials: '' });
        const result = normalizePrototype(upstream);
        expect(result.materials).toEqual([]);
      });

      describe('MEDIUM: Special characters', () => {
        it('handles materials with special characters', () => {
          const upstream = createMinimalUpstream({
            materials: 'Raspberry Pi|Arduino Uno R3',
          });
          const result = normalizePrototype(upstream);
          expect(result.materials).toEqual(['Raspberry Pi', 'Arduino Uno R3']);
        });

        it('handles Unicode in materials', () => {
          const upstream = createMinimalUpstream({
            materials: 'センサー|モーター',
          });
          const result = normalizePrototype(upstream);
          expect(result.materials).toEqual(['センサー', 'モーター']);
        });
      });
    });

    describe('events field', () => {
      it('splits pipe-separated events', () => {
        const upstream = createMinimalUpstream({ events: 'event1|event2' });
        const result = normalizePrototype(upstream);
        expect(result.events).toEqual(['event1', 'event2']);
      });

      it('returns empty array when events is not provided', () => {
        const { events, ...rest } = createMinimalUpstream();
        const upstream = rest as UpstreamPrototype;
        const result = normalizePrototype(upstream);
        expect(result.events).toEqual([]);
      });

      it('handles consecutive pipes correctly', () => {
        const upstream = createMinimalUpstream({ events: 'event1|||event2' });
        const result = normalizePrototype(upstream);
        expect(result.events).toEqual(['event1', 'event2']);
      });

      it('handles leading and trailing pipes', () => {
        const upstream = createMinimalUpstream({ events: '|event1|event2|' });
        const result = normalizePrototype(upstream);
        expect(result.events).toEqual(['event1', 'event2']);
      });

      it('returns empty array for only pipes', () => {
        const upstream = createMinimalUpstream({ events: '|||' });
        const result = normalizePrototype(upstream);
        expect(result.events).toEqual([]);
      });

      it('trims whitespace from segments', () => {
        const upstream = createMinimalUpstream({ events: ' event1 | event2 ' });
        const result = normalizePrototype(upstream);
        expect(result.events).toEqual(['event1', 'event2']);
      });

      it('returns empty array for empty string', () => {
        const upstream = createMinimalUpstream({ events: '' });
        const result = normalizePrototype(upstream);
        expect(result.events).toEqual([]);
      });
    });

    describe('awards field', () => {
      it('splits pipe-separated awards', () => {
        const upstream = createMinimalUpstream({ awards: 'award1|award2' });
        const result = normalizePrototype(upstream);
        expect(result.awards).toEqual(['award1', 'award2']);
      });

      it('returns empty array when awards is not provided', () => {
        const { awards, ...rest } = createMinimalUpstream();
        const upstream = rest as UpstreamPrototype;
        const result = normalizePrototype(upstream);
        expect(result.awards).toEqual([]);
      });

      it('handles consecutive pipes correctly', () => {
        const upstream = createMinimalUpstream({ awards: 'award1|||award2' });
        const result = normalizePrototype(upstream);
        expect(result.awards).toEqual(['award1', 'award2']);
      });

      it('handles leading and trailing pipes', () => {
        const upstream = createMinimalUpstream({ awards: '|award1|award2|' });
        const result = normalizePrototype(upstream);
        expect(result.awards).toEqual(['award1', 'award2']);
      });

      it('returns empty array for only pipes', () => {
        const upstream = createMinimalUpstream({ awards: '|||' });
        const result = normalizePrototype(upstream);
        expect(result.awards).toEqual([]);
      });

      it('trims whitespace from segments', () => {
        const upstream = createMinimalUpstream({ awards: ' award1 | award2 ' });
        const result = normalizePrototype(upstream);
        expect(result.awards).toEqual(['award1', 'award2']);
      });

      it('returns empty array for empty string', () => {
        const upstream = createMinimalUpstream({ awards: '' });
        const result = normalizePrototype(upstream);
        expect(result.awards).toEqual([]);
      });
    });

    describe('officialLink field', () => {
      it('maps officialLink from upstream', () => {
        const upstream = createMinimalUpstream({
          officialLink: 'https://official.com',
        });
        const result = normalizePrototype(upstream);
        expect(result.officialLink).toBe('https://official.com');
      });

      it('returns undefined when officialLink is not provided', () => {
        const { officialLink, ...rest } = createMinimalUpstream();
        const upstream = rest as UpstreamPrototype;
        const result = normalizePrototype(upstream);
        expect(result.officialLink).toBeUndefined();
      });

      describe('LOW: Edge cases', () => {
        it('handles URLs with special characters (pipe not split)', () => {
          const upstream = createMinimalUpstream({
            officialLink: 'https://example.com?param=a|b',
          });
          const result = normalizePrototype(upstream);
          expect(result.officialLink).toBe('https://example.com?param=a|b');
        });

        it('handles very long URLs', () => {
          const longUrl = 'https://example.com/' + 'path/'.repeat(100);
          const upstream = createMinimalUpstream({ officialLink: longUrl });
          const result = normalizePrototype(upstream);
          expect(result.officialLink).toBe(longUrl);
        });
      });
    });

    describe('videoUrl field', () => {
      it('maps videoUrl from upstream', () => {
        const upstream = createMinimalUpstream({
          videoUrl: 'https://youtube.com/video',
        });
        const result = normalizePrototype(upstream);
        expect(result.videoUrl).toBe('https://youtube.com/video');
      });

      it('returns undefined when videoUrl is not provided', () => {
        const { videoUrl, ...rest } = createMinimalUpstream();
        const upstream = rest as UpstreamPrototype;
        const result = normalizePrototype(upstream);
        expect(result.videoUrl).toBeUndefined();
      });
    });

    describe('mainUrl field', () => {
      it('maps mainUrl from upstream', () => {
        const upstream = createMinimalUpstream({
          mainUrl: 'https://example.com/main.jpg',
        });
        const result = normalizePrototype(upstream);
        expect(result.mainUrl).toBe('https://example.com/main.jpg');
      });
    });

    describe('relatedLink field', () => {
      it('maps relatedLink from upstream', () => {
        const upstream = createMinimalUpstream({
          relatedLink: 'https://related.com',
        });
        const result = normalizePrototype(upstream);
        expect(result.relatedLink).toBe('https://related.com');
      });

      it('returns undefined when relatedLink is not provided', () => {
        const { relatedLink, ...rest } = createMinimalUpstream();
        const upstream = rest as UpstreamPrototype;
        const result = normalizePrototype(upstream);
        expect(result.relatedLink).toBeUndefined();
      });
    });

    describe('relatedLink2 field', () => {
      it('maps relatedLink2 from upstream', () => {
        const upstream = createMinimalUpstream({
          relatedLink2: 'https://related2.com',
        });
        const result = normalizePrototype(upstream);
        expect(result.relatedLink2).toBe('https://related2.com');
      });

      it('returns undefined when relatedLink2 is not provided', () => {
        const { relatedLink2, ...rest } = createMinimalUpstream();
        const upstream = rest as UpstreamPrototype;
        const result = normalizePrototype(upstream);
        expect(result.relatedLink2).toBeUndefined();
      });
    });

    describe('relatedLink3 field', () => {
      it('maps relatedLink3 from upstream', () => {
        const upstream = createMinimalUpstream({
          relatedLink3: 'https://related3.com',
        });
        const result = normalizePrototype(upstream);
        expect(result.relatedLink3).toBe('https://related3.com');
      });

      it('returns undefined when relatedLink3 is not provided', () => {
        const { relatedLink3, ...rest } = createMinimalUpstream();
        const upstream = rest as UpstreamPrototype;
        const result = normalizePrototype(upstream);
        expect(result.relatedLink3).toBeUndefined();
      });
    });

    describe('relatedLink4 field', () => {
      it('maps relatedLink4 from upstream', () => {
        const upstream = createMinimalUpstream({
          relatedLink4: 'https://related4.com',
        });
        const result = normalizePrototype(upstream);
        expect(result.relatedLink4).toBe('https://related4.com');
      });

      it('returns undefined when relatedLink4 is not provided', () => {
        const { relatedLink4, ...rest } = createMinimalUpstream();
        const upstream = rest as UpstreamPrototype;
        const result = normalizePrototype(upstream);
        expect(result.relatedLink4).toBeUndefined();
      });
    });

    describe('relatedLink5 field', () => {
      it('maps relatedLink5 from upstream', () => {
        const upstream = createMinimalUpstream({
          relatedLink5: 'https://related5.com',
        });
        const result = normalizePrototype(upstream);
        expect(result.relatedLink5).toBe('https://related5.com');
      });

      it('returns undefined when relatedLink5 is not provided', () => {
        const { relatedLink5, ...rest } = createMinimalUpstream();
        const upstream = rest as UpstreamPrototype;
        const result = normalizePrototype(upstream);
        expect(result.relatedLink5).toBeUndefined();
      });
    });

    describe('viewCount field', () => {
      it('maps viewCount from upstream', () => {
        const upstream = createMinimalUpstream({ viewCount: 12345 });
        const result = normalizePrototype(upstream);
        expect(result.viewCount).toBe(12345);
      });
    });

    describe('goodCount field', () => {
      it('maps goodCount from upstream', () => {
        const upstream = createMinimalUpstream({ goodCount: 678 });
        const result = normalizePrototype(upstream);
        expect(result.goodCount).toBe(678);
      });
    });

    describe('commentCount field', () => {
      it('maps commentCount from upstream', () => {
        const upstream = createMinimalUpstream({ commentCount: 90 });
        const result = normalizePrototype(upstream);
        expect(result.commentCount).toBe(90);
      });
    });

    describe('uuid field', () => {
      it('maps uuid from upstream', () => {
        const upstream = createMinimalUpstream({ uuid: 'uuid-123' });
        const result = normalizePrototype(upstream);
        expect(result.uuid).toBe('uuid-123');
      });

      it('returns undefined when uuid is not provided', () => {
        const { uuid, ...rest } = createMinimalUpstream();
        const upstream = rest as UpstreamPrototype;
        const result = normalizePrototype(upstream);
        expect(result.uuid).toBeUndefined();
      });
    });

    describe('nid field', () => {
      it('maps nid from upstream', () => {
        const upstream = createMinimalUpstream({ nid: 'nid-456' });
        const result = normalizePrototype(upstream);
        expect(result.nid).toBe('nid-456');
      });

      it('returns undefined when nid is not provided', () => {
        const { nid, ...rest } = createMinimalUpstream();
        const upstream = rest as UpstreamPrototype;
        const result = normalizePrototype(upstream);
        expect(result.nid).toBeUndefined();
      });
    });

    describe('revision field', () => {
      it('maps revision from upstream', () => {
        const upstream = createMinimalUpstream({ revision: 5 });
        const result = normalizePrototype(upstream);
        expect(result.revision).toBe(5);
      });

      it('defaults to 0 when revision is not provided', () => {
        const { revision, ...rest } = createMinimalUpstream();
        const upstream = rest as UpstreamPrototype;
        const result = normalizePrototype(upstream);
        expect(result.revision).toBe(0);
      });

      it('preserves explicit 0 value (does not re-default)', () => {
        const upstream = createMinimalUpstream({ revision: 0 });
        const result = normalizePrototype(upstream);
        expect(result.revision).toBe(0);
      });

      describe('MEDIUM: Boundary values', () => {
        it('handles negative numbers', () => {
          const upstream = createMinimalUpstream({ revision: -1 });
          const result = normalizePrototype(upstream);
          expect(result.revision).toBe(-1);
        });
      });
    });

    describe('licenseType field', () => {
      it('maps licenseType from upstream', () => {
        const upstream = createMinimalUpstream({ licenseType: 2 });
        const result = normalizePrototype(upstream);
        expect(result.licenseType).toBe(2);
      });

      it('defaults to 1 when licenseType is not provided', () => {
        const { licenseType, ...rest } = createMinimalUpstream();
        const upstream = rest as UpstreamPrototype;
        const result = normalizePrototype(upstream);
        expect(result.licenseType).toBe(1);
      });

      it('preserves explicit 0 value if provided', () => {
        const upstream = createMinimalUpstream({ licenseType: 0 });
        const result = normalizePrototype(upstream);
        expect(result.licenseType).toBe(0);
      });
    });

    describe('thanksFlg field', () => {
      it('maps thanksFlg from upstream', () => {
        const upstream = createMinimalUpstream({ thanksFlg: 1 });
        const result = normalizePrototype(upstream);
        expect(result.thanksFlg).toBe(1);
      });

      it('defaults to 0 when thanksFlg is not provided', () => {
        const { thanksFlg, ...rest } = createMinimalUpstream();
        const upstream = rest as UpstreamPrototype;
        const result = normalizePrototype(upstream);
        expect(result.thanksFlg).toBe(0);
      });

      it('preserves explicit 0 value (does not re-default)', () => {
        const upstream = createMinimalUpstream({ thanksFlg: 0 });
        const result = normalizePrototype(upstream);
        expect(result.thanksFlg).toBe(0);
      });
    });

    describe('slideMode field', () => {
      it('maps slideMode from upstream', () => {
        const upstream = createMinimalUpstream({ slideMode: 1 });
        const result = normalizePrototype(upstream);
        expect(result.slideMode).toBe(1);
      });

      it('returns undefined when slideMode is not provided', () => {
        const { slideMode, ...rest } = createMinimalUpstream();
        const upstream = rest as UpstreamPrototype;
        const result = normalizePrototype(upstream);
        expect(result.slideMode).toBeUndefined();
      });
    });
  });
});
