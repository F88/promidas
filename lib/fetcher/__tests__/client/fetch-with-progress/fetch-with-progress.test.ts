import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  ConsoleLogger,
  createConsoleLogger,
} from '../../../../logger/index.js';
import { createFetchWithProgress } from '../../../client/fetch-with-progress.js';

describe('createFetchWithProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('returns a function', () => {
      const logger = createConsoleLogger();
      const customFetch = createFetchWithProgress({
        logger,
        enableProgressLog: true,
      });

      expect(typeof customFetch).toBe('function');
    });

    it('creates unique fetch instances for each call', () => {
      const logger = createConsoleLogger();
      const customFetch1 = createFetchWithProgress({
        logger,
        enableProgressLog: true,
      });
      const customFetch2 = createFetchWithProgress({
        logger,
        enableProgressLog: true,
      });

      expect(customFetch1).not.toBe(customFetch2);
    });
  });

  describe('callback invocation', () => {
    it('calls onProgress callback when provided', async () => {
      const logger = createConsoleLogger();
      const onProgress = vi.fn();

      const customFetch = createFetchWithProgress({
        logger,
        enableProgressLog: false,
        onProgress,
      });

      const mockBody = 'x'.repeat(10000);
      const mockResponse = new Response(mockBody, {
        status: 200,
        headers: { 'Content-Length': String(mockBody.length) },
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await customFetch(
        'https://api.example.com/data?limit=100',
      );
      await response.text();

      expect(onProgress).toHaveBeenCalled();
    });

    it('works with all callbacks enabled simultaneously', async () => {
      const logger = createConsoleLogger();
      const onProgressStart = vi.fn();
      const onProgress = vi.fn();
      const onProgressComplete = vi.fn();

      const customFetch = createFetchWithProgress({
        logger,
        enableProgressLog: false,
        onProgressStart,
        onProgress,
        onProgressComplete,
      });

      const mockBody = 'x'.repeat(5000);
      const mockResponse = new Response(mockBody, {
        status: 200,
        headers: { 'Content-Length': String(mockBody.length) },
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await customFetch(
        'https://api.example.com/data?limit=100',
      );
      await response.text();
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(onProgressStart).toHaveBeenCalled();
      expect(onProgress).toHaveBeenCalled();
      expect(onProgressComplete).toHaveBeenCalled();
    });

    it('calls onProgressStart callback even without onProgress', async () => {
      const logger = createConsoleLogger();
      const onProgressStart = vi.fn();

      const customFetch = createFetchWithProgress({
        logger,
        enableProgressLog: false,
        onProgressStart,
      });

      const mockBody = 'test';
      const mockResponse = new Response(mockBody, {
        status: 200,
        headers: { 'Content-Length': String(mockBody.length) },
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await customFetch(
        'https://api.example.com/data?limit=100',
      );
      await response.text();

      expect(onProgressStart).toHaveBeenCalled();
      expect(onProgressStart).toHaveBeenCalledWith(
        expect.any(Number), // estimatedTotal
        100, // limit
        expect.any(Number), // prepareTime (number, not string)
      );
    });

    it('calls onProgressComplete callback even without onProgress', async () => {
      const logger = createConsoleLogger();
      const onProgressComplete = vi.fn();

      const customFetch = createFetchWithProgress({
        logger,
        enableProgressLog: false,
        onProgressComplete,
      });

      const mockBody = 'test';
      const mockResponse = new Response(mockBody, {
        status: 200,
        headers: { 'Content-Length': String(mockBody.length) },
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await customFetch(
        'https://api.example.com/data?limit=100',
      );
      await response.text();
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(onProgressComplete).toHaveBeenCalled();
      expect(onProgressComplete).toHaveBeenCalledWith(
        4, // received
        expect.any(Number), // estimatedTotal
        expect.any(Number), // downloadTime (number, not string)
        expect.any(Number), // totalTime (number, not string)
      );
    });

    it('calls onProgressStart and onProgressComplete without onProgress', async () => {
      const logger = createConsoleLogger();
      const onProgressStart = vi.fn();
      const onProgressComplete = vi.fn();

      const customFetch = createFetchWithProgress({
        logger,
        enableProgressLog: false,
        onProgressStart,
        onProgressComplete,
      });

      const mockBody = 'test';
      const mockResponse = new Response(mockBody, {
        status: 200,
        headers: { 'Content-Length': String(mockBody.length) },
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await customFetch(
        'https://api.example.com/data?limit=100',
      );
      await response.text();
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(onProgressStart).toHaveBeenCalled();
      expect(onProgressComplete).toHaveBeenCalled();
    });
  });

  describe('response handling', () => {
    it('returns a response with same status code', async () => {
      const logger = createConsoleLogger();
      const customFetch = createFetchWithProgress({
        logger,
        enableProgressLog: false,
      });

      const mockResponse = new Response('test', { status: 200 });
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await customFetch('https://api.example.com/data');

      expect(response.status).toBe(200);
    });

    it('preserves response headers', async () => {
      const logger = createConsoleLogger();
      const customFetch = createFetchWithProgress({
        logger,
        enableProgressLog: false,
      });

      const mockResponse = new Response('test', {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Custom-Header': 'custom-value',
        },
      });
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await customFetch('https://api.example.com/data');

      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('X-Custom-Header')).toBe('custom-value');
    });

    it('allows response body to be consumed as text', async () => {
      const logger = createConsoleLogger();
      const customFetch = createFetchWithProgress({
        logger,
        enableProgressLog: false,
      });

      const expectedText = 'test response body';
      const mockResponse = new Response(expectedText, { status: 200 });
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await customFetch('https://api.example.com/data');
      const text = await response.text();

      expect(text).toBe(expectedText);
    });

    it('allows response body to be consumed as JSON', async () => {
      const logger = createConsoleLogger();
      const customFetch = createFetchWithProgress({
        logger,
        enableProgressLog: false,
      });

      const expectedData = { message: 'test', count: 42 };
      const mockResponse = new Response(JSON.stringify(expectedData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await customFetch('https://api.example.com/data');
      const data = await response.json();

      expect(data).toEqual(expectedData);
    });

    it('handles error responses (4xx, 5xx)', async () => {
      const logger = createConsoleLogger();
      const customFetch = createFetchWithProgress({
        logger,
        enableProgressLog: false,
      });

      const mockResponse = new Response('Not Found', { status: 404 });
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await customFetch('https://api.example.com/data');

      expect(response.status).toBe(404);
      expect(response.ok).toBe(false);
    });

    it('propagates fetch errors', async () => {
      const logger = createConsoleLogger();
      const customFetch = createFetchWithProgress({
        logger,
        enableProgressLog: false,
      });

      const networkError = new Error('Network failure');
      global.fetch = vi.fn().mockRejectedValue(networkError);

      await expect(customFetch('https://api.example.com/data')).rejects.toThrow(
        'Network failure',
      );
    });
  });

  describe('logger integration', () => {
    it('respects logger level for stderr output (warn level suppresses output)', async () => {
      const logger = new ConsoleLogger('warn');
      const stderrSpy = vi.spyOn(process.stderr, 'write');

      const customFetch = createFetchWithProgress({
        logger,
        enableProgressLog: true,
        onProgress: () => {}, // Enable tracking
      });

      const mockBody = 'test';
      const mockResponse = new Response(mockBody, {
        status: 200,
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await customFetch(
        'https://api.example.com/data?limit=100',
      );
      await response.text();
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should not write to stderr because logger level is 'warn' (higher than 'info')
      expect(stderrSpy).not.toHaveBeenCalled();
      stderrSpy.mockRestore();
    });

    it('allows stderr output when logger level is info', async () => {
      const logger = new ConsoleLogger('info');
      const stderrSpy = vi.spyOn(process.stderr, 'write');

      const customFetch = createFetchWithProgress({
        logger,
        enableProgressLog: true,
        onProgress: () => {}, // Enable tracking
      });

      const mockBody = 'test';
      const mockResponse = new Response(mockBody, {
        status: 200,
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await customFetch(
        'https://api.example.com/data?limit=100',
      );
      await response.text();
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should write to stderr because logger level is 'info'
      expect(stderrSpy).toHaveBeenCalled();
      stderrSpy.mockRestore();
    });

    it('allows stderr output when logger level is debug', async () => {
      const logger = new ConsoleLogger('debug');
      const stderrSpy = vi.spyOn(process.stderr, 'write');

      const customFetch = createFetchWithProgress({
        logger,
        enableProgressLog: true,
        onProgress: () => {}, // Enable tracking
      });

      const mockBody = 'test';
      const mockResponse = new Response(mockBody, {
        status: 200,
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await customFetch(
        'https://api.example.com/data?limit=100',
      );
      await response.text();
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should write to stderr because logger level is 'debug'
      expect(stderrSpy).toHaveBeenCalled();
      stderrSpy.mockRestore();
    });

    it('works with custom logger without level property', async () => {
      const customLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const customFetch = createFetchWithProgress({
        logger: customLogger,
        enableProgressLog: true,
        onProgress: () => {}, // Enable tracking
      });

      const mockBody = 'test';
      const mockResponse = new Response(mockBody, {
        status: 200,
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await customFetch(
        'https://api.example.com/data?limit=100',
      );
      await response.text();
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should log because custom logger without level property defaults to enabled
      expect(customLogger.info).toHaveBeenCalled();
    });

    it('does not log when enableProgressLog is false', async () => {
      const logger = createConsoleLogger();
      const loggerSpy = vi.spyOn(logger, 'info');

      const customFetch = createFetchWithProgress({
        logger,
        enableProgressLog: false,
      });

      const mockBody = 'test data';
      const mockResponse = new Response(mockBody, {
        status: 200,
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await customFetch(
        'https://api.example.com/data?limit=100',
      );
      await response.text();
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should not log because enableProgressLog is false
      expect(loggerSpy).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('handles invalid limit parameter gracefully', async () => {
      const logger = createConsoleLogger();

      const customFetch = createFetchWithProgress({
        logger,
        enableProgressLog: true,
      });

      // Test with limit=0
      const mockResponse1 = new Response('test data 1', {
        status: 200,
        headers: new Headers({
          'content-type': 'application/json',
        }),
      });
      global.fetch = vi.fn().mockResolvedValue(mockResponse1);
      const response1 = await customFetch(
        'https://api.example.com/data?limit=0',
      );
      expect(await response1.text()).toBe('test data 1');

      // Test with negative limit
      const mockResponse2 = new Response('test data 2', {
        status: 200,
        headers: new Headers({
          'content-type': 'application/json',
        }),
      });
      global.fetch = vi.fn().mockResolvedValue(mockResponse2);
      const response2 = await customFetch(
        'https://api.example.com/data?limit=-1',
      );
      expect(await response2.text()).toBe('test data 2');

      // Test with non-numeric limit
      const mockResponse3 = new Response('test data 3', {
        status: 200,
        headers: new Headers({
          'content-type': 'application/json',
        }),
      });
      global.fetch = vi.fn().mockResolvedValue(mockResponse3);
      const response3 = await customFetch(
        'https://api.example.com/data?limit=abc',
      );
      expect(await response3.text()).toBe('test data 3');
    });

    it('handles URL parsing errors in estimateResponseSize gracefully', async () => {
      const logger = createConsoleLogger();
      const mockResponse = new Response('test data', {
        status: 200,
        headers: new Headers({
          'content-type': 'application/json',
          'content-length': '4',
        }),
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      // Invalid URL that might cause parsing errors
      const customFetch = createFetchWithProgress({
        logger,
        enableProgressLog: true,
      });

      const response = await customFetch('not-a-valid-url://test');
      const text = await response.text();

      expect(text).toBe('test data');
    });

    it('handles response without body gracefully', async () => {
      const logger = createConsoleLogger();
      // 204 No Content responses have no body
      const mockResponse = new Response(null, {
        status: 204,
        headers: new Headers({
          'content-type': 'application/json',
        }),
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const customFetch = createFetchWithProgress({
        logger,
        enableProgressLog: true,
      });

      const response = await customFetch('https://api.example.com/data');

      expect(response.status).toBe(204);
      expect(response.body).toBeNull();
    });

    it('handles stream reading errors gracefully', async () => {
      const logger = createConsoleLogger();
      const errorStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3]));
          controller.error(new Error('Stream read error'));
        },
      });

      const mockResponse = new Response(errorStream, {
        status: 200,
        headers: new Headers({
          'content-type': 'application/json',
          'content-length': '100',
        }),
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const customFetch = createFetchWithProgress({
        logger,
        enableProgressLog: true,
      });

      const response = await customFetch(
        'https://api.example.com/data?limit=100',
      );

      // Stream error should be propagated
      await expect(response.text()).rejects.toThrow('Stream read error');
    });

    it('uses logger.info fallback when process.stderr is not available', async () => {
      const logger = createConsoleLogger();

      // Spy on stderr.write and make it undefined to simulate browser environment
      const originalWrite = process.stderr.write;
      // @ts-expect-error - Simulating browser environment
      process.stderr.write = undefined;

      const loggerSpy = vi.spyOn(logger, 'info');

      const mockResponse = new Response('test', {
        status: 200,
        headers: new Headers({
          'content-type': 'application/json',
          'content-length': '4',
        }),
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const customFetch = createFetchWithProgress({
        logger,
        enableProgressLog: true,
      });

      const response = await customFetch(
        'https://api.example.com/data?limit=100',
      );
      await response.text();
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should use logger.info instead of process.stderr
      // Note: "Download starting" only appears when using estimated size (no Content-Length)
      // In this test, we provide Content-Length, so we only expect progress and complete messages
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Download complete'),
      );

      // Restore original write
      process.stderr.write = originalWrite;
    });
  });
});
