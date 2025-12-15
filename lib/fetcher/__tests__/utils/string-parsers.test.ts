import { describe, expect, it } from 'vitest';

import { splitPipeSeparatedString } from '../../utils/string-parsers.js';

describe('splitPipeSeparatedString', () => {
  describe('valid input', () => {
    it('splits pipe-separated string into array', () => {
      const result = splitPipeSeparatedString('tag1|tag2|tag3');
      expect(result).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('trims whitespace from each segment', () => {
      const result = splitPipeSeparatedString('tag1 | tag2|tag3 ');
      expect(result).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('handles single value without pipe', () => {
      const result = splitPipeSeparatedString('single');
      expect(result).toEqual(['single']);
    });

    it('handles Japanese characters', () => {
      const result = splitPipeSeparatedString('タグ1|タグ2|タグ3');
      expect(result).toEqual(['タグ1', 'タグ2', 'タグ3']);
    });

    it('handles special characters', () => {
      const result = splitPipeSeparatedString('tag@1|tag#2|tag$3');
      expect(result).toEqual(['tag@1', 'tag#2', 'tag$3']);
    });

    it('trims whitespace within and around segments', () => {
      const result = splitPipeSeparatedString('a|  b  |c  |  d');
      expect(result).toEqual(['a', 'b', 'c', 'd']);
    });
  });

  describe('empty segments filtering', () => {
    it('filters out empty segments between pipes', () => {
      const result = splitPipeSeparatedString('tag1||tag3');
      expect(result).toEqual(['tag1', 'tag3']);
    });

    it('returns empty array for string with only pipes', () => {
      const result = splitPipeSeparatedString('|||');
      expect(result).toEqual([]);
    });

    it('filters out empty segment from trailing pipe', () => {
      const result = splitPipeSeparatedString('tag1|tag2|');
      expect(result).toEqual(['tag1', 'tag2']);
    });

    it('filters out empty segment from leading pipe', () => {
      const result = splitPipeSeparatedString('|tag1|tag2');
      expect(result).toEqual(['tag1', 'tag2']);
    });

    it('filters out whitespace-only segments', () => {
      const result = splitPipeSeparatedString('tag1|  |tag3');
      expect(result).toEqual(['tag1', 'tag3']);
    });

    it('filters out multiple empty segments', () => {
      const result = splitPipeSeparatedString('a|b||c|||d');
      expect(result).toEqual(['a', 'b', 'c', 'd']);
    });
  });

  describe('edge cases', () => {
    it('returns empty array for empty string', () => {
      const result = splitPipeSeparatedString('');
      expect(result).toEqual([]);
    });

    it('returns empty array for null', () => {
      const result = splitPipeSeparatedString(null);
      expect(result).toEqual([]);
    });

    it('returns empty array for undefined', () => {
      const result = splitPipeSeparatedString(undefined);
      expect(result).toEqual([]);
    });

    it('handles very long string', () => {
      const longString = Array(100).fill('tag').join('|');
      const result = splitPipeSeparatedString(longString);
      expect(result).toHaveLength(100);
      expect(result.every((s: string) => s === 'tag')).toBe(true);
    });

    it('returns empty array for single pipe character', () => {
      const result = splitPipeSeparatedString('|');
      expect(result).toEqual([]);
    });

    it('returns empty array for whitespace-only string', () => {
      const result = splitPipeSeparatedString('   ');
      expect(result).toEqual([]);
    });
  });

  describe('real ProtoPedia data patterns', () => {
    it('handles typical tags format', () => {
      const result = splitPipeSeparatedString('IoT|AI|Robotics');
      expect(result).toEqual(['IoT', 'AI', 'Robotics']);
    });

    it('trims whitespace in users format', () => {
      const result = splitPipeSeparatedString('user1 | user2 | user3');
      expect(result).toEqual(['user1', 'user2', 'user3']);
    });

    it('handles awards with Japanese text', () => {
      const result = splitPipeSeparatedString('最優秀賞|特別賞');
      expect(result).toEqual(['最優秀賞', '特別賞']);
    });

    it('handles events with mixed content', () => {
      const result = splitPipeSeparatedString(
        'IoT Challenge 2024|Maker Faire Tokyo',
      );
      expect(result).toEqual(['IoT Challenge 2024', 'Maker Faire Tokyo']);
    });
  });
});
