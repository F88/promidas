/**
 * Unit tests for validateSerializableSnapshot function.
 *
 * Tests validation logic for:
 * - SerializableSnapshot data
 * - Logger integration
 * - Error message formatting
 */
import { describe, expect, it, vi } from 'vitest';

import { normalizePrototype } from '../../../fetcher/utils/normalize-prototype.js';
import type { Logger } from '../../../logger/logger.types.js';
import { validateSerializableSnapshot } from '../serializable-snapshot.js';

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
    users: 'user1@id1|user2@id2',
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

describe('validateSerializableSnapshot', () => {
  describe('Valid snapshot data', () => {
    it('should return ok: true for valid snapshot', () => {
      const validSnapshot = {
        version: '1.0.0',
        serializedAt: '2024-01-01T00:00:00.000Z',
        prototypes: [makeValidPrototype(1)],
      };

      const result = validateSerializableSnapshot(validSnapshot);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.version).toBe('1.0.0');
        expect(result.data.prototypes).toHaveLength(1);
      }
    });

    it('should return ok: true for empty prototypes array', () => {
      const validSnapshot = {
        version: '2.0.0',
        serializedAt: '2024-01-01T00:00:00.000Z',
        prototypes: [],
      };

      const result = validateSerializableSnapshot(validSnapshot);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.prototypes).toHaveLength(0);
      }
    });
  });

  describe('Invalid version format', () => {
    it('should return ok: false for non-semver version', () => {
      const invalidSnapshot = {
        version: '1.0', // Invalid: must be x.y.z format
        serializedAt: '2024-01-01T00:00:00.000Z',
        prototypes: [],
      };

      const result = validateSerializableSnapshot(invalidSnapshot);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe('SERIALIZABLE_SNAPSHOT_VALIDATION_ERROR');
        expect(result.message).toContain('version');
        expect(result.message).toContain('semver');
      }
    });

    it('should return ok: false for version with extra components', () => {
      const invalidSnapshot = {
        version: '1.0.0.0', // Invalid: too many components
        serializedAt: '2024-01-01T00:00:00.000Z',
        prototypes: [],
      };

      const result = validateSerializableSnapshot(invalidSnapshot);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toContain('version');
      }
    });
  });

  describe('Invalid timestamp format', () => {
    it('should return ok: false for non-ISO timestamp', () => {
      const invalidSnapshot = {
        version: '1.0.0',
        serializedAt: '2024-01-01', // Invalid: not ISO-8601 datetime
        prototypes: [],
      };

      const result = validateSerializableSnapshot(invalidSnapshot);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toContain('serializedAt');
        expect(result.message).toContain('ISO-8601');
      }
    });

    it('should return ok: false for invalid datetime string', () => {
      const invalidSnapshot = {
        version: '1.0.0',
        serializedAt: 'not-a-date',
        prototypes: [],
      };

      const result = validateSerializableSnapshot(invalidSnapshot);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toContain('serializedAt');
      }
    });
  });

  describe('Invalid prototypes array', () => {
    it('should return ok: false for non-array prototypes', () => {
      const invalidSnapshot = {
        version: '1.0.0',
        serializedAt: '2024-01-01T00:00:00.000Z',
        prototypes: 'not-an-array', // Invalid: must be array
      };

      const result = validateSerializableSnapshot(invalidSnapshot);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toContain('prototypes');
      }
    });

    it('should return ok: false for invalid prototype in array', () => {
      const validBase = makeValidPrototype(1);
      const invalidSnapshot = {
        version: '1.0.0',
        serializedAt: '2024-01-01T00:00:00.000Z',
        prototypes: [{ ...validBase, id: 0 }], // Invalid ID
      };

      const result = validateSerializableSnapshot(invalidSnapshot);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toContain('prototypes:');
        expect(result.message).toContain('0.id');
      }
    });
  });

  describe('Missing required fields', () => {
    it('should return ok: false when version is missing', () => {
      const invalidSnapshot = {
        // version is missing
        serializedAt: '2024-01-01T00:00:00.000Z',
        prototypes: [],
      };

      const result = validateSerializableSnapshot(invalidSnapshot);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toContain('version');
      }
    });

    it('should return ok: false when serializedAt is missing', () => {
      const invalidSnapshot = {
        version: '1.0.0',
        // serializedAt is missing
        prototypes: [],
      };

      const result = validateSerializableSnapshot(invalidSnapshot);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toContain('serializedAt');
      }
    });

    it('should return ok: false when prototypes is missing', () => {
      const invalidSnapshot = {
        version: '1.0.0',
        serializedAt: '2024-01-01T00:00:00.000Z',
        // prototypes is missing
      };

      const result = validateSerializableSnapshot(invalidSnapshot);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toContain('prototypes');
      }
    });
  });

  describe('Error message format', () => {
    it('should return first validation error (fail-fast)', () => {
      const invalidSnapshot = {
        version: 'invalid', // Error 1 (will be caught first)
        serializedAt: 'invalid', // Error 2
        prototypes: 'not-array', // Error 3
      };

      const result = validateSerializableSnapshot(invalidSnapshot);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        // Should catch first error (version)
        expect(result.message).toContain('version');
        expect(result.message).toContain('semver');
      }
    });

    it('should include field path in error message', () => {
      const validBase = makeValidPrototype(1);
      const invalidSnapshot = {
        version: '1.0.0',
        serializedAt: '2024-01-01T00:00:00.000Z',
        prototypes: [{ ...validBase, users: 'invalid' }], // Invalid: should be array
      };

      const result = validateSerializableSnapshot(invalidSnapshot);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        // Error path should be in format: 'prototypes: 0.users: ...'
        expect(result.message).toContain('prototypes:');
        expect(result.message).toContain('0.users');
      }
    });
  });

  describe('Logger integration', () => {
    it('should call logger.warn when data is not a plain object', () => {
      const mockLogger: Logger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      validateSerializableSnapshot('not-an-object', mockLogger);

      expect(mockLogger.warn).toHaveBeenCalledOnce();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Snapshot data validation failed',
        expect.objectContaining({
          reason: 'not a plain object',
          type: 'string',
        }),
      );
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should call logger.warn on validation failure', () => {
      const mockLogger: Logger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const invalidSnapshot = {
        version: 'invalid',
        serializedAt: '2024-01-01T00:00:00.000Z',
        prototypes: [],
      };

      validateSerializableSnapshot(invalidSnapshot, mockLogger);

      expect(mockLogger.warn).toHaveBeenCalledOnce();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Snapshot data validation failed',
        expect.objectContaining({
          reason: 'invalid version format',
          version: 'invalid',
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

      const validSnapshot = {
        version: '1.0.0',
        serializedAt: '2024-01-01T00:00:00.000Z',
        prototypes: [makeValidPrototype(1), makeValidPrototype(2)],
      };

      validateSerializableSnapshot(validSnapshot, mockLogger);

      // validateNormalizedPrototypeArray also calls logger.info
      expect(mockLogger.info).toHaveBeenCalledTimes(2);
      expect(mockLogger.info).toHaveBeenLastCalledWith(
        'Snapshot data validated successfully',
        expect.objectContaining({
          version: '1.0.0',
          serializedAt: '2024-01-01T00:00:00.000Z',
          prototypeCount: 2,
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

      const validSnapshot = {
        version: '1.0.0',
        serializedAt: '2024-01-01T00:00:00.000Z',
        prototypes: [],
      };

      // No logger provided
      validateSerializableSnapshot(validSnapshot);

      // Mock logger should not be called
      expect(mockLogger.info).not.toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });
});
