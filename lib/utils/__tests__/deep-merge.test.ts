import { describe, expect, it } from 'vitest';

import { deepMerge, isPlainObject } from '../deep-merge.js';

describe('deep-merge', () => {
  describe('isPlainObject', () => {
    it('should return true for plain objects', () => {
      expect(isPlainObject({})).toBe(true);
      expect(isPlainObject({ a: 1 })).toBe(true);
      expect(isPlainObject(new Object())).toBe(true);
      expect(isPlainObject(Object.create(null))).toBe(true);
    });

    it('should return false for non-plain objects and primitives', () => {
      expect(isPlainObject(null)).toBe(false);
      expect(isPlainObject(undefined)).toBe(false);
      expect(isPlainObject('string')).toBe(false);
      expect(isPlainObject(123)).toBe(false);
      expect(isPlainObject([])).toBe(false);
      expect(isPlainObject(new Date())).toBe(false);
      expect(isPlainObject(/regex/)).toBe(false);
      expect(isPlainObject(new Map())).toBe(false);
      expect(isPlainObject(new Set())).toBe(false);
      class Test {}
      expect(isPlainObject(new Test())).toBe(false);
    });
  });

  describe('deepMerge', () => {
    it('should merge two plain objects', () => {
      const target = { a: 1, b: 2 };
      const source = { b: 3, c: 4 };
      const result = deepMerge(target, source);

      expect(result).toEqual({ a: 1, b: 3, c: 4 });
      expect(result).not.toBe(target); // Should result in new object
    });

    it('should deeply merge nested objects', () => {
      const target = {
        nested: {
          a: 1,
          b: 2,
        },
      };
      const source = {
        nested: {
          b: 3,
          c: 4,
        } as any,
      };
      const result = deepMerge(target, source as any);

      expect(result).toEqual({
        nested: {
          a: 1,
          b: 3,
          c: 4,
        },
      });
    });

    it('should overwrite primitives with non-plain objects and vice versa', () => {
      const target = { a: 1 as number | Date };
      const source = { a: new Date('2023-01-01') };
      const result = deepMerge(target, source);

      expect(result.a).toBeInstanceOf(Date);
      expect((result.a as Date).toISOString()).toBe('2023-01-01T00:00:00.000Z');
    });

    it('should handle non-plain objects correctly (not deep merge them)', () => {
      const date = new Date('2023-01-01');
      const customInstance = new (class Custom {
        value = 1;
      })();

      const target = {
        customDate: new Date('2020-01-01'),
        customObj: {},
      };
      const source = {
        customDate: date,
        customObj: customInstance,
      };

      const result = deepMerge(target, source as any);

      // Should be assigned directly, not deep merged
      expect(result.customDate).toBe(date);
      expect(result.customDate).toBeInstanceOf(Date);
      expect(result.customObj).toBe(customInstance);
    });

    it('should ignore undefined values in source', () => {
      const target = { a: 1 };
      const source: Partial<typeof target> = {};
      source.a = undefined as any;
      const result = deepMerge(target, source);

      expect(result.a).toBe(1);
    });

    it('should not ignore null values in source', () => {
      const target = { a: 1 };
      const source = { a: null };
      // @ts-expect-error - testing null injection
      const result = deepMerge(target, source);

      expect(result.a).toBeNull();
    });

    it('should prevent prototype pollution', () => {
      const target = {};
      const source = JSON.parse(
        '{"__proto__":{"polluted":true}, "constructor":{"prototype":{"polluted":true}}}',
      );

      const result = deepMerge(target, source);

      // Check that pollution didn't happen on the result object
      expect((result as any).polluted).toBeUndefined();
      expect((Object.prototype as any).polluted).toBeUndefined();
      expect(result.constructor.prototype.polluted).toBeUndefined();
    });

    it('should handle circular references without stack overflow', () => {
      const target = { a: 1 };
      const source: any = { b: 2 };
      source.self = source;

      let result: any;
      expect(() => {
        result = deepMerge(target, source);
      }).not.toThrow();

      // Main goal is stack overflow prevention.
      // Basic properties should still be present.
      expect(result.a).toBe(1);
      expect(result.b).toBe(2);
    });

    it('should allow shared references (diamond dependency)', () => {
      // Shared object referenced by two parents
      const shared = { value: 'shared' };
      const source = {
        left: { shared },
        right: { shared },
      };
      const target = {};

      const result = deepMerge(target, source) as any;

      expect(result.left.shared.value).toBe('shared');
      expect(result.right.shared.value).toBe('shared');
      // In a deep merge that clones structure, references might be split or preserved depending on implementation.
      // Current implementation re-merges the object. Since we pass a new 'seen' map down but only track current path,
      // 'left' branch finishes and removes 'shared' from seen. 'right' branch starts and sees 'shared' as new.
      // So 'shared' is merged twice. The result will have two distinct objects with same content.
      // This is acceptable behavior for config merging (often safer than keeping refs).
      expect(result.left.shared).toEqual(result.right.shared);
    });

    it('should clone arrays instead of sharing references', () => {
      const sourceArr = [1, 2, 3];
      const target = {};
      const source = { list: sourceArr };

      const result = deepMerge(target, source) as any;

      expect(result.list).toEqual([1, 2, 3]);
      expect(result.list).not.toBe(sourceArr); // Should be a new array instance

      // Mutation test
      sourceArr.push(4);
      expect(result.list).toHaveLength(3); // Result should not change
    });

    it('should merge arrays by replacing them (not merging elements)', () => {
      const target = { arr: [1, 2] };
      const source = { arr: [3, 4] };
      const result = deepMerge(target, source);

      expect(result.arr).toEqual([3, 4]);
    });
  });
});
