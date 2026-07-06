import { describe, expect, it } from 'vitest';

import {
  splitPipeSeparatedString,
  splitPipeSeparatedUsers,
} from '../../utils/string-parsers.js';

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

describe('splitPipeSeparatedUsers', () => {
  // Spec: split the `users` string into username substrings. A username is
  // `displayName@profileId`; the display name may contain `|` (un-escaped), so a
  // token without `@` is a display-name fragment and is merged forward until a
  // token with `@` closes the username. The splitter does NOT trim: each username
  // is returned as its exact API substring (only `|`-fragmented display names are
  // re-merged). Whitespace is authoritative — ProtoPedia itself renders leading
  // spaces (e.g. `<h1> とりさん</h1>` for id 2781), so trimming would diverge from
  // the real display name. The correct display name is knowable only from the API.

  describe('1 user', () => {
    it('returns a well-formed displayName@profileId username', () => {
      expect(splitPipeSeparatedUsers('ばんの@tomoki_banno')).toEqual([
        'ばんの@tomoki_banno',
      ]);
    });

    it('keeps an empty display name (@profileId)', () => {
      expect(splitPipeSeparatedUsers('@yuukankin')).toEqual(['@yuukankin']);
    });

    it('keeps a display name that contains @ (multi-@) as one username', () => {
      expect(
        splitPipeSeparatedUsers('げんろく@Karakuri-Musha@genroku'),
      ).toEqual(['げんろく@Karakuri-Musha@genroku']);
    });

    it('preserves a space before @ (real data, e.g. id 1991 / covao)', () => {
      // "displayName @profileId" (space before @) occurs in real data; the
      // space is internal to the token, so it is preserved.
      expect(splitPipeSeparatedUsers('一瀬大智 @daichiichinose1')).toEqual([
        '一瀬大智 @daichiichinose1',
      ]);
      expect(splitPipeSeparatedUsers('covao @covao')).toEqual(['covao @covao']);
    });

    it('preserves a leading space verbatim (real data, id 2781 / 6978)', () => {
      // trim is FORBIDDEN for users: ProtoPedia renders the leading space
      // (`<h1> とりさん</h1>`), so it is part of the display name and must be kept.
      expect(splitPipeSeparatedUsers(' とりさん@torisan')).toEqual([
        ' とりさん@torisan',
      ]);
      expect(splitPipeSeparatedUsers(' 士龍 @24_2111')).toEqual([
        ' 士龍 @24_2111',
      ]);
    });

    it('preserves surrounding and inner spaces verbatim (synthetic)', () => {
      // "displayName @ profileId" (space *after* @) does not occur in the real
      // dataset, but the splitter must return the exact API substring untouched.
      expect(splitPipeSeparatedUsers(' username @ id1 ')).toEqual([
        ' username @ id1 ',
      ]);
    });

    it('re-merges a single user whose display name contains "|"', () => {
      expect(splitPipeSeparatedUsers('nisshi.dev | にっし@nishida24')).toEqual([
        'nisshi.dev | にっし@nishida24',
      ]);
    });

    it('keeps the troll account "@@._.@" as a single username', () => {
      // issue #112 "Limits": real user is /prototyper/@._.@ (the FIRST @ is the
      // delimiter). The split yields one token; recovering the real profileId is
      // a separate downstream concern, out of scope for this splitter.
      expect(splitPipeSeparatedUsers('@@._.@')).toEqual(['@@._.@']);
    });

    it('falls back to the single token when it contains no @', () => {
      expect(splitPipeSeparatedUsers('alice')).toEqual(['alice']);
    });
  });

  describe('multi users', () => {
    it('splits well-formed usernames (naive-equivalent)', () => {
      expect(
        splitPipeSeparatedUsers(
          'ばんの@tomoki_banno|ひで@blue_islands|成沢彩音@shirahamaayane',
        ),
      ).toEqual([
        'ばんの@tomoki_banno',
        'ひで@blue_islands',
        '成沢彩音@shirahamaayane',
      ]);
    });

    it('keeps empty display name and multi-@ usernames', () => {
      expect(
        splitPipeSeparatedUsers(
          '@yuukankin|ひさやん@hisayan|片山 均@八幡浜の三瀬医院@katabomb2',
        ),
      ).toEqual([
        '@yuukankin',
        'ひさやん@hisayan',
        '片山 均@八幡浜の三瀬医院@katabomb2',
      ]);
    });

    it('re-merges a "|"-fragmented display name (real data, id 3571)', () => {
      expect(
        splitPipeSeparatedUsers(
          'nisshi.dev | にっし@nishida24|もちゃ@mochagram|当真楽時@gakuto0307',
        ),
      ).toEqual([
        'nisshi.dev | にっし@nishida24',
        'もちゃ@mochagram',
        '当真楽時@gakuto0307',
      ]);
    });

    it('re-merges when the "|" is in a middle user, not the first', () => {
      expect(
        splitPipeSeparatedUsers('first@id1|foo | bar@id2|last@id3'),
      ).toEqual(['first@id1', 'foo | bar@id2', 'last@id3']);
    });

    it('re-merges when multiple users each contain "|"', () => {
      expect(splitPipeSeparatedUsers('a | b@id1|c | d@id2')).toEqual([
        'a | b@id1',
        'c | d@id2',
      ]);
    });

    it('re-merges a display name with multiple "|"', () => {
      expect(splitPipeSeparatedUsers('x | y | z@id1|next@id2')).toEqual([
        'x | y | z@id1',
        'next@id2',
      ]);
    });

    it('re-merges a "|" display name that has an empty profileId', () => {
      expect(splitPipeSeparatedUsers('foo | bar@|next@id2')).toEqual([
        'foo | bar@',
        'next@id2',
      ]);
    });

    it('keeps a trailing no-@ token as its own element (R4)', () => {
      // Pathological (no such real data): "xxx" has no @ to close it, so it is
      // kept as-is rather than dropped or merged backward.
      expect(splitPipeSeparatedUsers('a | @ hoge|xxx')).toEqual([
        'a | @ hoge',
        'xxx',
      ]);
    });

    it('keeps "@@RyokeSan" / "@@zizi4n5" style tokens intact', () => {
      expect(splitPipeSeparatedUsers('@@RyokeSan|@@zizi4n5')).toEqual([
        '@@RyokeSan',
        '@@zizi4n5',
      ]);
    });

    it('treats a no-@ string as a single username (no | is a delimiter)', () => {
      // With no @ anywhere, no | can be a delimiter, so the whole string is one
      // username. Not valid input (every real username has @); never occurs.
      expect(splitPipeSeparatedUsers('alice|bob')).toEqual(['alice|bob']);
    });
  });

  describe('empty input', () => {
    it('returns empty array for null / undefined / empty string', () => {
      expect(splitPipeSeparatedUsers(null)).toEqual([]);
      expect(splitPipeSeparatedUsers(undefined)).toEqual([]);
      expect(splitPipeSeparatedUsers('')).toEqual([]);
    });
  });

  describe('constraint-violating input (total, non-destructive)', () => {
    it('keeps a no-@ string as a single element', () => {
      // G1 violated (no @): no | is a delimiter -> whole string.
      expect(splitPipeSeparatedUsers('xxx')).toEqual(['xxx']);
    });

    it('keeps a trailing no-@ unit as its own element', () => {
      // The | after "aaa@xxx" is a delimiter (@ already seen); the trailing "xxx"
      // never gets an @, so it is kept as-is rather than dropped or merged back.
      expect(splitPipeSeparatedUsers('aaa@xxx|xxx')).toEqual([
        'aaa@xxx',
        'xxx',
      ]);
    });

    it('treats a leading no-@ fragment before the first @ as display (Case A)', () => {
      expect(splitPipeSeparatedUsers('xxx|yyy@id')).toEqual(['xxx|yyy@id']);
    });

    it('treats a "|"-only string as one element (| before any @ is literal)', () => {
      // NOT naive split (which would give ['', '']): with no @, the | is a
      // display-name char, so the whole string is one element.
      expect(splitPipeSeparatedUsers('|')).toEqual(['|']);
    });

    it('emits a trailing empty element for a delimiter "|" at the end', () => {
      // The | after "@" is a delimiter (@ seen), so a trailing empty username
      // is produced. Never occurs in real data (no trailing |).
      expect(splitPipeSeparatedUsers('@|')).toEqual(['@', '']);
      expect(splitPipeSeparatedUsers(' a @ a |')).toEqual([' a @ a ', '']);
    });
  });
});
