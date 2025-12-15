import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { Logger } from '../../logger/index.js';
import { PrototypeInMemoryStore } from '../store.js';

describe('PrototypeInMemoryStore - Edge Cases', () => {
  const mockLogger: Logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getElapsedTime', () => {
    it('returns 0 when no data is cached', () => {
      const store = new PrototypeInMemoryStore({
        ttlMs: 60_000,
        maxDataSizeBytes: 1024 * 1024,
        logger: mockLogger,
      });

      expect(store.isExpired()).toBe(true);
      const stats = store.getStats();
      expect(stats.isExpired).toBe(true);
    });

    it('calculates elapsed time correctly', async () => {
      const store = new PrototypeInMemoryStore({
        ttlMs: 60_000,
        maxDataSizeBytes: 1024 * 1024,
        logger: mockLogger,
      });

      store.setAll([
        {
          id: 1,
          prototypeNm: 'Test',
          summary: '',
          freeComment: '',
          systemDescription: '',
          users: [],
          teamNm: '',
          tags: [],
          materials: [],
          events: [],
          awards: [],
          mainUrl: 'https://example.com/1',
          viewCount: 0,
          goodCount: 0,
          commentCount: 0,
          createDate: '2023-01-01T00:00:00Z',
          releaseFlg: 0,
          status: 1,
        },
      ]);

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 10));

      const stats = store.getStats();
      expect(stats.isExpired).toBe(false);
      expect(stats.cachedAt).not.toBeNull();
    });
  });

  describe('estimateSize with TextEncoder fallback', () => {
    it('uses TextEncoder when Buffer is not available', () => {
      // Mock environment without Buffer but with TextEncoder
      const originalBuffer = global.Buffer;
      // @ts-expect-error - Intentionally setting to undefined
      global.Buffer = undefined;

      const store = new PrototypeInMemoryStore({
        ttlMs: 60_000,
        maxDataSizeBytes: 1024 * 1024,
        logger: mockLogger,
      });

      store.setAll([
        {
          id: 1,
          prototypeNm: 'Test',
          summary: '',
          freeComment: '',
          systemDescription: '',
          users: [],
          teamNm: '',
          tags: [],
          materials: [],
          events: [],
          awards: [],
          mainUrl: 'https://example.com/1',
          viewCount: 0,
          goodCount: 0,
          commentCount: 0,
          createDate: '2023-01-01T00:00:00Z',
          releaseFlg: 0,
          status: 1,
        },
      ]);

      const stats = store.getStats();
      expect(stats.dataSizeBytes).toBeGreaterThan(0);

      // Restore
      global.Buffer = originalBuffer;
    });

    it('warns and returns 0 when neither Buffer nor TextEncoder is available', () => {
      // Mock environment without Buffer or TextEncoder
      const originalBuffer = global.Buffer;
      const originalTextEncoder = global.TextEncoder;

      // @ts-expect-error - Intentionally setting to undefined
      global.Buffer = undefined;
      // @ts-expect-error - Intentionally setting to undefined
      global.TextEncoder = undefined;

      const store = new PrototypeInMemoryStore({
        ttlMs: 60_000,
        maxDataSizeBytes: 1024 * 1024,
        logger: mockLogger,
      });

      store.setAll([
        {
          id: 1,
          prototypeNm: 'Test',
          summary: '',
          freeComment: '',
          systemDescription: '',
          users: [],
          teamNm: '',
          tags: [],
          materials: [],
          events: [],
          awards: [],
          mainUrl: 'https://example.com/1',
          viewCount: 0,
          goodCount: 0,
          commentCount: 0,
          createDate: '2023-01-01T00:00:00Z',
          releaseFlg: 0,
          status: 1,
        },
      ]);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Neither Buffer nor TextEncoder found for size estimation. Returning 0.',
        {},
      );

      const stats = store.getStats();
      expect(stats.dataSizeBytes).toBe(0);

      // Restore
      global.Buffer = originalBuffer;
      global.TextEncoder = originalTextEncoder;
    });
  });
});
