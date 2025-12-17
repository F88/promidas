import { describe, expect, it, vi } from 'vitest';

import type { Logger } from '../../../../logger/index.js';
import { selectCustomFetch } from '../../../client/select-custom-fetch.js';

describe('select-custom-fetch', () => {
  const createMockLogger = (): Logger => ({
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  });

  describe('progress tracking enablement', () => {
    it('returns undefined when no progress features are enabled', () => {
      const logger = createMockLogger();

      const result = selectCustomFetch({
        logger,
        enableProgressLog: false,
        // No callbacks provided
      });

      expect(result).toBeUndefined();
    });

    it('returns custom fetch when enableProgressLog is true', () => {
      const logger = createMockLogger();

      const result = selectCustomFetch({
        logger,
        enableProgressLog: true,
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe('function');
    });

    it('returns custom fetch when onProgressStart is provided', () => {
      const logger = createMockLogger();

      const result = selectCustomFetch({
        logger,
        enableProgressLog: false,
        onProgressStart: () => {},
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe('function');
    });

    it('returns custom fetch when onProgress is provided', () => {
      const logger = createMockLogger();

      const result = selectCustomFetch({
        logger,
        enableProgressLog: false,
        onProgress: () => {},
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe('function');
    });

    it('returns custom fetch when onProgressComplete is provided', () => {
      const logger = createMockLogger();

      const result = selectCustomFetch({
        logger,
        enableProgressLog: false,
        onProgressComplete: () => {},
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe('function');
    });
  });

  describe('callback combinations', () => {
    it('returns custom fetch when multiple callbacks are provided', () => {
      const logger = createMockLogger();

      const result = selectCustomFetch({
        logger,
        enableProgressLog: false,
        onProgressStart: () => {},
        onProgress: () => {},
        onProgressComplete: () => {},
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe('function');
    });

    it('returns custom fetch when enableProgressLog and callbacks are combined', () => {
      const logger = createMockLogger();

      const result = selectCustomFetch({
        logger,
        enableProgressLog: true,
        onProgress: () => {},
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe('function');
    });
  });

  describe('returned fetch function', () => {
    it('returns a valid fetch-compatible function', async () => {
      const logger = createMockLogger();

      const customFetch = selectCustomFetch({
        logger,
        enableProgressLog: true,
      });

      expect(customFetch).toBeDefined();

      if (customFetch) {
        // Mock global fetch for testing
        const mockResponse = new Response('test', {
          status: 200,
          headers: { 'Content-Length': '4' },
        });

        global.fetch = vi.fn(async () => mockResponse);

        // Should be callable like fetch
        const result = await customFetch('http://example.com', {});
        expect(result).toBeInstanceOf(Response);
      }
    });

    it('passes logger to createFetchWithProgress', async () => {
      const logger = createMockLogger();
      let loggerUsed = false;

      const loggerWithTracking = {
        ...logger,
        info: () => {
          loggerUsed = true;
        },
      };

      const customFetch = selectCustomFetch({
        logger: loggerWithTracking,
        enableProgressLog: true,
      });

      expect(customFetch).toBeDefined();

      if (customFetch) {
        // Create logger with level to enable logging
        const loggerWithLevel = {
          ...loggerWithTracking,
          level: 'info',
        };

        const customFetchWithLevel = selectCustomFetch({
          logger: loggerWithLevel,
          enableProgressLog: true,
        });

        const mockResponse = new Response('test', {
          status: 200,
          headers: {}, // No Content-Length, will estimate
        });

        global.fetch = vi.fn(async () => mockResponse);

        await customFetchWithLevel!('http://example.com?limit=1', {});

        // Logger should have been used for progress logging
        expect(loggerUsed).toBe(true);
      }
    });
  });

  describe('conditional spread operator usage', () => {
    it('correctly handles undefined callbacks', () => {
      const logger = createMockLogger();

      // This should not throw with exactOptionalPropertyTypes
      // Simply omit the properties instead of passing undefined
      const result = selectCustomFetch({
        logger,
        enableProgressLog: true,
        // onProgressStart, onProgress, onProgressComplete are omitted
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe('function');
    });

    it('correctly passes defined callbacks to createFetchWithProgress', async () => {
      const logger = createMockLogger();
      let startCalled = false;
      let progressCalled = false;
      let completeCalled = false;

      const customFetch = selectCustomFetch({
        logger,
        enableProgressLog: false,
        onProgressStart: () => {
          startCalled = true;
        },
        onProgress: () => {
          progressCalled = true;
        },
        onProgressComplete: () => {
          completeCalled = true;
        },
      });

      expect(customFetch).toBeDefined();

      if (customFetch) {
        const mockResponse = new Response('test', {
          status: 200,
          headers: {}, // No Content-Length to trigger estimation
        });

        global.fetch = vi.fn(async () => mockResponse);

        const response = await customFetch('http://example.com?limit=1', {}); // Add limit param

        // Consume the response body to trigger progress tracking
        await response.text();

        // All callbacks should have been invoked
        expect(startCalled).toBe(true);
        expect(progressCalled).toBe(true);
        expect(completeCalled).toBe(true);
      }
    });
  });

  describe('default fetch behavior', () => {
    it('returns undefined for minimal configuration', () => {
      const logger = createMockLogger();

      const result = selectCustomFetch({
        logger,
        enableProgressLog: false,
      });

      expect(result).toBeUndefined();
    });

    it('allows SDK to use default fetch when undefined is returned', async () => {
      const logger = createMockLogger();

      const customFetch = selectCustomFetch({
        logger,
        enableProgressLog: false,
      });

      expect(customFetch).toBeUndefined();

      // When undefined, SDK should use its default fetch
      // This is the expected behavior - no custom fetch is needed
    });
  });
});
