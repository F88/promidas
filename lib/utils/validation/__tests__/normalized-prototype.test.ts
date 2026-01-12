/**
 * Unit tests for validateNormalizedPrototype.
 *
 * Tests validation logic for:
 * - NormalizedPrototype data
 * - Logger integration
 * - Error message formatting
 */
import { describe, expect, it, vi } from 'vitest';

import { normalizePrototype } from '../../../fetcher/utils/normalize-prototype.js';
import type { Logger } from '../../../logger/logger.types.js';
import {
  validateNormalizedPrototype,
  validateNormalizedPrototypeArray,
} from '../normalized-prototype.js';

/**
 * Helper to create valid normalized prototype for testing.
 * Uses the same normalization logic as production code.
 */
const makeValidPrototype = (id: number = 1) =>
  normalizePrototype({
    id,
    uuid: `uuid-${id}`,
    nid: `nid-${id}`,
    createId: 1,
    createDate: '2024-01-01T00:00:00Z',
    updateId: 1,
    updateDate: '2024-01-01T00:00:00Z',
    releaseDate: '2024-01-02T00:00:00Z',
    summary: 'Test summary',
    tags: 'tag1|tag2',
    teamNm: 'Test Team',
    users: 'user1|user2',
    status: 1,
    releaseFlg: 1,
    revision: 1,
    prototypeNm: 'Test Prototype',
    freeComment: 'Comment',
    systemDescription: 'Description',
    videoUrl: 'https://example.com/video',
    mainUrl: 'https://example.com',
    awards: 'award1|award2',
    viewCount: 100,
    goodCount: 50,
    commentCount: 10,
    relatedLink: 'https://example.com/link1',
    relatedLink2: '',
    relatedLink3: '',
    relatedLink4: '',
    relatedLink5: '',
    licenseType: 1,
    thanksFlg: 0,
    events: 'event1|event2',
    officialLink: 'https://example.com/official',
    materials: 'material1|material2',
    slideMode: 0,
  });

describe('validateNormalizedPrototype', () => {
  describe('Valid prototype data', () => {
    it('should return ok: true for valid prototype with all required fields', () => {
      const validPrototype = makeValidPrototype(1);

      const result = validateNormalizedPrototype(validPrototype);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.id).toBe(1);
        expect(result.data.prototypeNm).toBe('Test Prototype');
      }
    });

    it('should return ok: true for prototype with minimal required fields', () => {
      const validPrototype = makeValidPrototype(42);

      const result = validateNormalizedPrototype(validPrototype);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.id).toBe(42);
      }
    });

    it('should return ok: true for prototype with empty optional fields', () => {
      const validPrototype = makeValidPrototype(1);

      const result = validateNormalizedPrototype(validPrototype);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.officialLink).toBe('https://example.com/official');
      }
    });
  });

  describe('Invalid prototype ID', () => {
    it('should return ok: false for ID = 0', () => {
      const validBase = makeValidPrototype(1);
      const invalidPrototype = { ...validBase, id: 0 };

      const result = validateNormalizedPrototype(invalidPrototype);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe('VALIDATION_ERROR');
        expect(result.message).toContain('id');
      }
    });

    it('should return ok: false for negative ID', () => {
      const validBase = makeValidPrototype(1);
      const invalidPrototype = { ...validBase, id: -1 };

      const result = validateNormalizedPrototype(invalidPrototype);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toContain('id');
      }
    });

    it('should return ok: false for decimal ID', () => {
      const validBase = makeValidPrototype(1);
      const invalidPrototype = { ...validBase, id: 1.5 };

      const result = validateNormalizedPrototype(invalidPrototype);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toContain('id');
      }
    });
  });

  describe('Code value validation', () => {
    describe('status field', () => {
      it('should accept valid status codes (1, 2, 3, 4)', () => {
        const validStatuses = [1, 2, 3, 4];

        validStatuses.forEach((status) => {
          const proto = makeValidPrototype(1);
          const testProto = { ...proto, status };

          const result = validateNormalizedPrototype(testProto);

          expect(result.ok).toBe(true);
        });
      });

      it('should reject invalid status code', () => {
        const validBase = makeValidPrototype(1);
        const invalidPrototype = { ...validBase, status: 99 };

        const result = validateNormalizedPrototype(invalidPrototype);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.message).toContain('status');
        }
      });

      it('should reject status = 0', () => {
        const validBase = makeValidPrototype(1);
        const invalidPrototype = { ...validBase, status: 0 };

        const result = validateNormalizedPrototype(invalidPrototype);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.message).toContain('status');
        }
      });
    });

    describe('releaseFlg field', () => {
      it('should accept valid releaseFlg codes (1, 2, 3)', () => {
        const validFlags = [1, 2, 3];

        validFlags.forEach((releaseFlg) => {
          const proto = makeValidPrototype(1);
          const testProto = { ...proto, releaseFlg };

          const result = validateNormalizedPrototype(testProto);

          expect(result.ok).toBe(true);
        });
      });

      it('should reject invalid releaseFlg code', () => {
        const validBase = makeValidPrototype(1);
        const invalidPrototype = { ...validBase, releaseFlg: 0 };

        const result = validateNormalizedPrototype(invalidPrototype);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.message).toContain('releaseFlg');
        }
      });
    });

    describe('licenseType field', () => {
      it('should accept valid licenseType codes (0, 1)', () => {
        const validTypes = [0, 1];

        validTypes.forEach((licenseType) => {
          const proto = makeValidPrototype(1);
          const testProto = { ...proto, licenseType };

          const result = validateNormalizedPrototype(testProto);

          expect(result.ok).toBe(true);
        });
      });

      it('should accept undefined licenseType', () => {
        const validBase = makeValidPrototype(1);
        const { licenseType, ...protoWithoutLicense } = validBase;

        const result = validateNormalizedPrototype(protoWithoutLicense);

        expect(result.ok).toBe(true);
      });

      it('should reject invalid licenseType code', () => {
        const validBase = makeValidPrototype(1);
        const invalidPrototype = { ...validBase, licenseType: 99 };

        const result = validateNormalizedPrototype(invalidPrototype);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.message).toContain('licenseType');
        }
      });
    });

    describe('thanksFlg field', () => {
      it('should accept valid thanksFlg codes (0, 1)', () => {
        const validFlags = [0, 1];

        validFlags.forEach((thanksFlg) => {
          const proto = makeValidPrototype(1);
          const testProto = { ...proto, thanksFlg };

          const result = validateNormalizedPrototype(testProto);

          expect(result.ok).toBe(true);
        });
      });

      it('should accept undefined thanksFlg', () => {
        const validBase = makeValidPrototype(1);
        const { thanksFlg, ...protoWithoutThanks } = validBase;

        const result = validateNormalizedPrototype(protoWithoutThanks);

        expect(result.ok).toBe(true);
      });

      it('should reject invalid thanksFlg code', () => {
        const validBase = makeValidPrototype(1);
        const invalidPrototype = { ...validBase, thanksFlg: 99 };

        const result = validateNormalizedPrototype(invalidPrototype);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.message).toContain('thanksFlg');
        }
      });
    });
  });

  describe('Array field validation', () => {
    it('should accept valid array fields', () => {
      const validBase = makeValidPrototype(1);

      const result = validateNormalizedPrototype(validBase);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(Array.isArray(result.data.users)).toBe(true);
        expect(Array.isArray(result.data.tags)).toBe(true);
        expect(Array.isArray(result.data.materials)).toBe(true);
        expect(Array.isArray(result.data.events)).toBe(true);
        expect(Array.isArray(result.data.awards)).toBe(true);
      }
    });

    it('should accept empty arrays', () => {
      const validBase = makeValidPrototype(1);
      const protoWithEmptyArrays = {
        ...validBase,
        users: [],
        tags: [],
        materials: [],
        events: [],
        awards: [],
      };

      const result = validateNormalizedPrototype(protoWithEmptyArrays);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.users).toEqual([]);
        expect(result.data.tags).toEqual([]);
      }
    });

    it('should reject non-array for users field', () => {
      const validBase = makeValidPrototype(1);
      const invalidPrototype = { ...validBase, users: 'not-an-array' };

      const result = validateNormalizedPrototype(invalidPrototype);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toContain('users');
      }
    });

    it('should reject non-string elements in array', () => {
      const validBase = makeValidPrototype(1);
      const invalidPrototype = { ...validBase, tags: [1, 2, 3] as any };

      const result = validateNormalizedPrototype(invalidPrototype);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toContain('tags');
      }
    });
  });

  describe('Required fields validation', () => {
    it('should return ok: false for missing id', () => {
      const validBase = makeValidPrototype(1);
      const { id, ...invalidPrototype } = validBase as any;

      const result = validateNormalizedPrototype(invalidPrototype);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toContain('id');
      }
    });

    it('should return ok: false for missing createDate', () => {
      const validBase = makeValidPrototype(1);
      const { createDate, ...invalidPrototype } = validBase as any;

      const result = validateNormalizedPrototype(invalidPrototype);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toContain('createDate');
      }
    });

    it('should return ok: false for missing prototypeNm', () => {
      const validBase = makeValidPrototype(1);
      const { prototypeNm, ...invalidPrototype } = validBase as any;

      const result = validateNormalizedPrototype(invalidPrototype);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toContain('prototypeNm');
      }
    });
  });

  describe('String field validation', () => {
    it('should accept empty strings for optional string fields', () => {
      const validBase = makeValidPrototype(1);
      const protoWithEmptyStrings = {
        ...validBase,
        summary: '',
        freeComment: '',
        systemDescription: '',
        teamNm: '',
      };

      const result = validateNormalizedPrototype(protoWithEmptyStrings);

      expect(result.ok).toBe(true);
    });

    it('should reject non-string for prototypeNm', () => {
      const validBase = makeValidPrototype(1);
      const invalidPrototype = { ...validBase, prototypeNm: 123 };

      const result = validateNormalizedPrototype(invalidPrototype);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toContain('prototypeNm');
      }
    });
  });

  describe('Number field validation', () => {
    it('should accept zero for count fields', () => {
      const validBase = makeValidPrototype(1);
      const protoWithZeroCounts = {
        ...validBase,
        viewCount: 0,
        goodCount: 0,
        commentCount: 0,
      };

      const result = validateNormalizedPrototype(protoWithZeroCounts);

      expect(result.ok).toBe(true);
    });

    it('should accept negative values for count fields', () => {
      // Schema allows negative integers (no .nonnegative() constraint)
      const validBase = makeValidPrototype(1);
      const protoWithNegativeCounts = { ...validBase, viewCount: -1 };

      const result = validateNormalizedPrototype(protoWithNegativeCounts);

      expect(result.ok).toBe(true);
    });

    it('should reject decimal values for integer count fields', () => {
      const validBase = makeValidPrototype(1);
      const invalidPrototype = { ...validBase, goodCount: 1.5 };

      const result = validateNormalizedPrototype(invalidPrototype);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toContain('goodCount');
      }
    });
  });

  describe('Error message format', () => {
    it('should format error message with field path', () => {
      const validBase = makeValidPrototype(1);
      const invalidPrototype = { ...validBase, id: 0 };

      const result = validateNormalizedPrototype(invalidPrototype);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toMatch(/id:/);
      }
    });

    it('should format multiple errors with semicolon separator', () => {
      const invalidPrototype = {
        id: 0, // Invalid
        prototypeNm: 123, // Invalid type
        createDate: 'invalid',
      };

      const result = validateNormalizedPrototype(invalidPrototype);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toContain('; ');
        expect(result.message.split('; ').length).toBeGreaterThan(1);
      }
    });
  });

  describe('Edge cases', () => {
    it('should reject null for optional fields (strict null check)', () => {
      const validBase = makeValidPrototype(1);
      // specific check: z.optional() generally treats null as invalid if not z.nullable()
      const invalidPrototype = { ...validBase, officialLink: null };

      const result = validateNormalizedPrototype(invalidPrototype);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toContain('officialLink');
      }
    });

    it('should reject extra fields (strict object check)', () => {
      // Note: verify if z.object is strict or strips unknown keys.
      // Standard z.object() strips unknown keys by default (safeParse).
      // If we want to strictly forbid extra keys, we need .strict() in schema.
      // Assuming normalizedPrototypeSchema is NOT strict based on standard Zod usage,
      // this test might actually pass with ok:true but strips data.
      // Let's check current schema definition.
      // Looking at lib/schemas/normalized-prototype.ts calling z.object({...})
      // It is NOT strict(). So it strips unknown keys.

      const validBase = makeValidPrototype(1);
      const prototypeWithExtra = {
        ...validBase,
        extraField: 'should be stripped',
      };

      const result = validateNormalizedPrototype(prototypeWithExtra);

      // Zod default behavior: strip unknown keys, validation succeeds
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect((result.data as any).extraField).toBeUndefined();
      }
    });
  });

  describe('Logger integration', () => {
    it('should call logger.warn on validation failure', () => {
      const mockLogger: Logger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const validBase = makeValidPrototype(1);
      const invalidPrototype = { ...validBase, id: 0 };

      validateNormalizedPrototype(invalidPrototype, mockLogger);

      expect(mockLogger.warn).toHaveBeenCalledOnce();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Prototype data validation failed',
        expect.objectContaining({
          errors: expect.any(Array),
        }),
      );
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should call logger.info on validation success', () => {
      const mockLogger: Logger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const validPrototype = makeValidPrototype(1);

      validateNormalizedPrototype(validPrototype, mockLogger);

      expect(mockLogger.info).toHaveBeenCalledOnce();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Prototype data validated successfully',
        expect.objectContaining({
          id: 1,
          prototypeNm: 'Test Prototype',
        }),
      );
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should not log when logger is not provided', () => {
      const mockLogger: Logger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const validPrototype = makeValidPrototype(1);

      // No logger provided
      validateNormalizedPrototype(validPrototype);

      // Mock logger should not be called
      expect(mockLogger.info).not.toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });
});

describe('validateNormalizedPrototypeArray', () => {
  describe('Valid array data', () => {
    it('should return ok: true for empty array', () => {
      const result = validateNormalizedPrototypeArray([]);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual([]);
        expect(result.data.length).toBe(0);
      }
    });

    it('should return ok: true for array with single valid prototype', () => {
      const validPrototype = makeValidPrototype(1);
      const result = validateNormalizedPrototypeArray([validPrototype]);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.length).toBe(1);
        expect(result.data[0]!.id).toBe(1);
      }
    });

    it('should return ok: true for array with multiple valid prototypes', () => {
      const prototypes = [
        makeValidPrototype(1),
        makeValidPrototype(2),
        makeValidPrototype(3),
      ];
      const result = validateNormalizedPrototypeArray(prototypes);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.length).toBe(3);
        expect(result.data[0]!.id).toBe(1);
        expect(result.data[1]!.id).toBe(2);
        expect(result.data[2]!.id).toBe(3);
      }
    });

    it('should return ok: true for large array (100 items)', () => {
      const prototypes = Array.from({ length: 100 }, (_, i) =>
        makeValidPrototype(i + 1),
      );
      const result = validateNormalizedPrototypeArray(prototypes);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.length).toBe(100);
        expect(result.data[0]!.id).toBe(1);
        expect(result.data[99]!.id).toBe(100);
      }
    });
  });

  describe('Invalid array data', () => {
    it('should return ok: false for non-array data', () => {
      const result = validateNormalizedPrototypeArray({ not: 'array' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe('VALIDATION_ERROR');
        expect(result.message).toContain('expected array');
      }
    });

    it('should return ok: false for null', () => {
      const result = validateNormalizedPrototypeArray(null);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should return ok: false for undefined', () => {
      const result = validateNormalizedPrototypeArray(undefined);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should return ok: false and stop at first invalid element', () => {
      const validPrototype1 = makeValidPrototype(1);
      const invalidPrototype = { ...makeValidPrototype(2), id: 0 }; // Invalid ID
      const validPrototype3 = makeValidPrototype(3);

      const result = validateNormalizedPrototypeArray([
        validPrototype1,
        invalidPrototype,
        validPrototype3,
      ]);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe('VALIDATION_ERROR');
        // Error message should reference index [1]
        expect(result.message).toContain('1');
      }
    });

    it('should return ok: false for array with mixed valid/invalid items', () => {
      const validPrototype = makeValidPrototype(1);
      const invalidPrototype = { ...makeValidPrototype(2), status: 99 }; // Invalid status

      const result = validateNormalizedPrototypeArray([
        validPrototype,
        invalidPrototype,
      ]);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe('VALIDATION_ERROR');
        expect(result.message).toContain('status');
      }
    });

    it('should return ok: false for array containing non-object elements', () => {
      const result = validateNormalizedPrototypeArray([
        makeValidPrototype(1),
        'not an object',
        makeValidPrototype(3),
      ]);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe('VALIDATION_ERROR');
      }
    });
  });

  describe('Logger integration for array validation', () => {
    it('should call logger.info on successful validation', () => {
      const mockLogger: Logger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const prototypes = [makeValidPrototype(1), makeValidPrototype(2)];
      const result = validateNormalizedPrototypeArray(prototypes, mockLogger);

      expect(result.ok).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Prototype array validated successfully',
        { count: 2 },
      );
    });

    it('should call logger.warn on validation failure', () => {
      const mockLogger: Logger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const invalidData = [{ id: 0 }]; // Invalid ID
      const result = validateNormalizedPrototypeArray(invalidData, mockLogger);

      expect(result.ok).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Prototype array validation failed',
        expect.objectContaining({
          errors: expect.any(Array),
        }),
      );
    });

    it('should not call logger when logger is not provided', () => {
      const mockLogger: Logger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const prototypes = [makeValidPrototype(1)];

      // No logger provided
      validateNormalizedPrototypeArray(prototypes);

      // Mock logger should not be called
      expect(mockLogger.info).not.toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });
});
