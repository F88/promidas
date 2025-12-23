import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ConsoleLogger,
  createConsoleLogger,
} from '../../../../logger/index.js';
import { createFetchWithProgress } from '../../../client/fetch-with-progress.js';
import type { FetchProgressEvent } from '../../../types/progress-event.types.js';

describe('createFetchWithProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('factory basics', () => {
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

  describe('progress events', () => {
    it('calls onProgressEvent callback for download-progress events', async () => {
      const logger = createConsoleLogger();
      const onProgressEvent = vi.fn();

      const customFetch = createFetchWithProgress({
        logger,
        enableProgressLog: false,
        onProgressEvent,
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

      const progressEvents = onProgressEvent.mock.calls.filter(
        (call) => call[0].type === 'download-progress',
      );
      expect(progressEvents.length).toBeGreaterThan(0);
    });

    it('fires all lifecycle events in correct order', async () => {
      const logger = createConsoleLogger();
      const events: string[] = [];
      const onProgressEvent = vi.fn((event) => {
        events.push(event.type);
      });

      const customFetch = createFetchWithProgress({
        logger,
        enableProgressLog: false,
        onProgressEvent,
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

      expect(events[0]).toBe('request-start');
      expect(events[1]).toBe('response-received');
      expect(events[events.length - 1]).toBe('complete');
      expect(events.includes('download-progress')).toBe(true);
    });

    it('fires response-received event with correct data', async () => {
      const logger = createConsoleLogger();
      const onProgressEvent = vi.fn();

      const customFetch = createFetchWithProgress({
        logger,
        enableProgressLog: false,
        onProgressEvent,
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

      const responseReceivedEvent = onProgressEvent.mock.calls.find(
        (call) => call[0].type === 'response-received',
      );
      expect(responseReceivedEvent).toBeDefined();
      expect(responseReceivedEvent![0]).toMatchObject({
        type: 'response-received',
        prepareTimeMs: expect.any(Number),
        estimatedTotal: expect.any(Number),
        limit: 100,
      });
    });

    it('fires complete event with correct data', async () => {
      const logger = createConsoleLogger();
      const onProgressEvent = vi.fn();

      const customFetch = createFetchWithProgress({
        logger,
        enableProgressLog: false,
        onProgressEvent,
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

      const completeEvent = onProgressEvent.mock.calls.find(
        (call) => call[0].type === 'complete',
      );
      expect(completeEvent).toBeDefined();
      expect(completeEvent![0]).toMatchObject({
        type: 'complete',
        received: 4,
        estimatedTotal: expect.any(Number),
        downloadTimeMs: expect.any(Number),
        totalTimeMs: expect.any(Number),
      });
    });

    it('fires request-start and complete events', async () => {
      const logger = createConsoleLogger();
      const events: string[] = [];
      const onProgressEvent = vi.fn((event) => {
        events.push(event.type);
      });

      const customFetch = createFetchWithProgress({
        logger,
        enableProgressLog: false,
        onProgressEvent,
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

      expect(events).toContain('request-start');
      expect(events).toContain('complete');
    });

    it('omits download-progress when response has no body', async () => {
      const logger = createConsoleLogger();
      const onProgressEvent = vi.fn();

      const mockResponse = new Response(null, {
        status: 204,
        headers: new Headers({
          'content-type': 'application/json',
        }),
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const customFetch = createFetchWithProgress({
        logger,
        enableProgressLog: false,
        onProgressEvent,
      });

      const response = await customFetch('https://api.example.com/data');

      expect(response.status).toBe(204);
      expect(response.body).toBeNull();

      const eventTypes = onProgressEvent.mock.calls.map((call) => call[0].type);
      expect(eventTypes).toContain('request-start');
      expect(eventTypes).toContain('response-received');
      expect(eventTypes).toContain('complete');
      expect(eventTypes).not.toContain('download-progress');

      const completeEvent = onProgressEvent.mock.calls.find(
        (call) => call[0].type === 'complete',
      );
      expect(completeEvent).toBeDefined();
      expect(completeEvent![0]).toMatchObject({
        type: 'complete',
        received: 0,
        estimatedTotal: expect.any(Number),
        downloadTimeMs: 0,
        totalTimeMs: expect.any(Number),
      });
    });
  });

  describe('response surface', () => {
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
        onProgressEvent: () => {},
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

      expect(stderrSpy).not.toHaveBeenCalled();
      stderrSpy.mockRestore();
    });

    it('allows stderr output when logger level is info', async () => {
      const logger = new ConsoleLogger('info');
      const stderrSpy = vi.spyOn(process.stderr, 'write');

      const customFetch = createFetchWithProgress({
        logger,
        enableProgressLog: true,
        onProgressEvent: () => {},
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

      expect(stderrSpy).toHaveBeenCalled();
      stderrSpy.mockRestore();
    });

    it('allows stderr output when logger level is debug', async () => {
      const logger = new ConsoleLogger('debug');
      const stderrSpy = vi.spyOn(process.stderr, 'write');

      const customFetch = createFetchWithProgress({
        logger,
        enableProgressLog: true,
        onProgressEvent: () => {},
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

      expect(stderrSpy).toHaveBeenCalled();
      stderrSpy.mockRestore();
    });

    it('logs completion for empty body with estimated size to stderr', async () => {
      const logger = createConsoleLogger();
      const stderrSpy = vi.spyOn(process.stderr, 'write');

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

      const response = await customFetch('https://api.example.com/data?limit=2');
      expect(response.status).toBe(204);

      expect(stderrSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Download complete: 0 bytes received (estimated 5340 bytes)',
        ),
      );

      stderrSpy.mockRestore();
    });

    it('logs completion for empty body via logger when stderr is unavailable', async () => {
      const logger = createConsoleLogger();
      const loggerSpy = vi.spyOn(logger, 'info');

      const originalWrite = process.stderr.write;
      // @ts-expect-error - Simulating browser environment
      process.stderr.write = undefined;

      const mockResponse = new Response(null, {
        status: 204,
        headers: new Headers({
          'content-type': 'application/json',
          'content-length': '0',
        }),
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const customFetch = createFetchWithProgress({
        logger,
        enableProgressLog: true,
      });

      try {
        const response = await customFetch('https://api.example.com/data');
        expect(response.status).toBe(204);

        expect(loggerSpy).toHaveBeenCalledWith(
          expect.stringContaining('Download complete: 0 / 0 bytes'),
        );
      } finally {
        process.stderr.write = originalWrite;
      }
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
        onProgressEvent: () => {},
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

      expect(loggerSpy).not.toHaveBeenCalled();
    });
  });

  describe('error and fallback handling', () => {
    it('handles invalid limit parameter gracefully', async () => {
      const logger = createConsoleLogger();

      const customFetch = createFetchWithProgress({
        logger,
        enableProgressLog: true,
      });

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

      const customFetch = createFetchWithProgress({
        logger,
        enableProgressLog: true,
      });

      const response = await customFetch('not-a-valid-url://test');
      const text = await response.text();

      expect(text).toBe('test data');
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

      await expect(response.text()).rejects.toThrow('Stream read error');
    });

    it('emits error event when stream reading fails', async () => {
      const logger = createConsoleLogger();
      const events: FetchProgressEvent[] = [];
      const onProgressEvent = vi.fn((event) => {
        events.push(event);
      });

      let pullCount = 0;
      const errorStream = new ReadableStream({
        pull(controller) {
          pullCount++;
          if (pullCount === 1) {
            controller.enqueue(new Uint8Array([1, 2, 3]));
          } else {
            controller.error(new Error('Stream read error'));
          }
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
        enableProgressLog: false,
        onProgressEvent,
      });

      const response = await customFetch(
        'https://api.example.com/data?limit=100',
      );

      await expect(response.text()).rejects.toThrow('Stream read error');

      // Verify error event was emitted
      const errorEvents = events.filter((e) => e.type === 'error');
      expect(errorEvents).toHaveLength(1);
      expect(errorEvents[0]).toMatchObject({
        type: 'error',
        error: 'Stream read error',
        received: 3,
        estimatedTotal: 100,
        downloadTimeMs: expect.any(Number),
        totalTimeMs: expect.any(Number),
      });
    });

    it('uses logger.info fallback when process.stderr is not available', async () => {
      const logger = createConsoleLogger();

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

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Download complete'),
      );

      process.stderr.write = originalWrite;
    });
  });

  describe('progress calculation', () => {
    it('uses Content-Length header when available', async () => {
      const logger = createConsoleLogger();
      const onProgressEvent = vi.fn();

      const customFetch = createFetchWithProgress({
        logger,
        enableProgressLog: false,
        onProgressEvent,
      });

      const mockBody = 'x'.repeat(100);
      const mockResponse = new Response(mockBody, {
        status: 200,
        headers: { 'Content-Length': '100' },
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await customFetch('https://api.example.com/data');
      await response.text();

      const responseEvent = onProgressEvent.mock.calls.find(
        (call) => call[0].type === 'response-received',
      );
      expect(responseEvent![0].estimatedTotal).toBe(100);
    });

    it('falls back to estimation when Content-Length is missing', async () => {
      const logger = createConsoleLogger();
      const onProgressEvent = vi.fn();

      const customFetch = createFetchWithProgress({
        logger,
        enableProgressLog: false,
        onProgressEvent,
      });

      const mockResponse = new Response('test', {
        status: 200,
        headers: {},
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await customFetch(
        'https://api.example.com/data?limit=10',
      );
      await response.text();

      const responseEvent = onProgressEvent.mock.calls.find(
        (call) => call[0].type === 'response-received',
      );
      expect(responseEvent![0].estimatedTotal).toBe(26700);
    });

    it('sets estimatedTotal to zero when limit is invalid', async () => {
      const logger = createConsoleLogger();
      const onProgressEvent = vi.fn();

      const customFetch = createFetchWithProgress({
        logger,
        enableProgressLog: false,
        onProgressEvent,
      });

      const mockResponse = new Response('invalid-limit-body', {
        status: 200,
        headers: {},
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await customFetch(
        'https://api.example.com/data?limit=-5',
        { method: 'GET' },
      );
      await response.text();

      const responseEvent = onProgressEvent.mock.calls.find(
        (call) => call[0].type === 'response-received',
      );

      expect(responseEvent).toBeDefined();
      expect(responseEvent![0]).toMatchObject({
        estimatedTotal: 0,
        limit: 0,
      });

      const completeEvent = onProgressEvent.mock.calls.find(
        (call) => call[0].type === 'complete',
      );

      expect(completeEvent).toBeDefined();
      expect(completeEvent![0].estimatedTotal).toBe(0);
    });

    it('emits zero totals when Content-Length and limit are both missing', async () => {
      const logger = createConsoleLogger();
      const onProgressEvent = vi.fn();

      const customFetch = createFetchWithProgress({
        logger,
        enableProgressLog: false,
        onProgressEvent,
      });

      const mockResponse = new Response('body-without-length', {
        status: 200,
        headers: {},
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await customFetch('https://api.example.com/data');
      await response.text();

      const responseEvent = onProgressEvent.mock.calls.find(
        (call) => call[0].type === 'response-received',
      );
      expect(responseEvent![0].estimatedTotal).toBe(0);

      const progressEvent = onProgressEvent.mock.calls.find(
        (call) => call[0].type === 'download-progress',
      );
      expect(progressEvent).toBeDefined();
      expect(progressEvent![0]).toMatchObject({
        total: 0,
        percentage: 0,
      });
    });

    it('handles invalid Content-Length gracefully', async () => {
      const logger = createConsoleLogger();
      const onProgressEvent = vi.fn();

      const customFetch = createFetchWithProgress({
        logger,
        enableProgressLog: false,
        onProgressEvent,
      });

      const mockResponse = new Response('test', {
        status: 200,
        headers: { 'Content-Length': 'invalid' },
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await customFetch('https://api.example.com/data');
      await response.text();

      const responseEvent = onProgressEvent.mock.calls.find(
        (call) => call[0].type === 'response-received',
      );
      expect(responseEvent![0].estimatedTotal).toBe(0);
    });

    it('uses estimated size in download-progress events when Content-Length is missing', async () => {
      const logger = createConsoleLogger();
      const onProgressEvent = vi.fn();

      const customFetch = createFetchWithProgress({
        logger,
        enableProgressLog: false,
        onProgressEvent,
      });

      const mockBody = 'abcdefghij';
      const mockResponse = new Response(mockBody, {
        status: 200,
        headers: {},
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await customFetch(
        'https://api.example.com/data?limit=2',
      );
      await response.text();

      const progressEvent = onProgressEvent.mock.calls.find(
        (call) => call[0].type === 'download-progress',
      );

      expect(progressEvent).toBeDefined();
      expect(progressEvent![0].total).toBe(5340);
    });

    it('propagates estimated total to complete event when Content-Length is missing', async () => {
      const logger = createConsoleLogger();
      const onProgressEvent = vi.fn();

      const customFetch = createFetchWithProgress({
        logger,
        enableProgressLog: false,
        onProgressEvent,
      });

      const mockResponse = new Response('abcdefghij', {
        status: 200,
        headers: {},
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await customFetch(
        'https://api.example.com/data?limit=2',
      );
      await response.text();

      const completeEvent = onProgressEvent.mock.calls.find(
        (call) => call[0].type === 'complete',
      );

      expect(completeEvent).toBeDefined();
      expect(completeEvent![0].estimatedTotal).toBe(5340);
    });

    it('throttles download-progress events', async () => {
      vi.useFakeTimers();

      try {
        const logger = createConsoleLogger();
        const onProgressEvent = vi.fn();

        const customFetch = createFetchWithProgress({
          logger,
          enableProgressLog: false,
          onProgressEvent,
        });

        const stream = new ReadableStream({
          start(controller) {
            const enqueue = (delayMs: number) =>
              setTimeout(() => controller.enqueue(new Uint8Array(10)), delayMs);

            enqueue(0);
            enqueue(100);
            enqueue(200);
            setTimeout(() => {
              controller.enqueue(new Uint8Array(10));
              controller.close();
            }, 600);
          },
        });

        const mockResponse = new Response(stream, {
          status: 200,
          headers: { 'Content-Length': '40' },
        });

        global.fetch = vi.fn().mockResolvedValue(mockResponse);

        const response = await customFetch('https://api.example.com/data');
        const textPromise = response.text();

        await vi.advanceTimersByTimeAsync(1000);
        await textPromise;

        const progressEvents = onProgressEvent.mock.calls.filter(
          (call) => call[0].type === 'download-progress',
        );

        expect(progressEvents.length).toBe(2);
      } finally {
        vi.useRealTimers();
      }
    });

    it('handles zero Content-Length correctly', async () => {
      const logger = createConsoleLogger();
      const onProgressEvent = vi.fn();

      const customFetch = createFetchWithProgress({
        logger,
        enableProgressLog: false,
        onProgressEvent,
      });

      const mockResponse = new Response('', {
        status: 200,
        headers: { 'Content-Length': '0' },
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await customFetch('https://api.example.com/data');
      await response.text();

      const responseEvent = onProgressEvent.mock.calls.find(
        (call) => call[0].type === 'response-received',
      );
      expect(responseEvent![0].estimatedTotal).toBe(0);

      const completeEvent = onProgressEvent.mock.calls.find(
        (call) => call[0].type === 'complete',
      );
      expect(completeEvent![0].received).toBe(0);
    });
  });

  describe('custom fetch support', () => {
    it('uses provided baseFetch instead of global fetch', async () => {
      const logger = createConsoleLogger();
      const customFetchSpy = vi.fn().mockResolvedValue(
        new Response('custom fetch result', {
          status: 200,
          headers: new Headers({
            'X-Custom': 'true',
          }),
        }),
      );

      const fetchWithProgress = createFetchWithProgress({
        logger,
        enableProgressLog: false,
        baseFetch: customFetchSpy,
      });

      const response = await fetchWithProgress('https://api.example.com/data');
      const text = await response.text();

      expect(customFetchSpy).toHaveBeenCalledOnce();
      expect(customFetchSpy).toHaveBeenCalledWith(
        'https://api.example.com/data',
        undefined,
      );
      expect(text).toBe('custom fetch result');
      expect(response.headers.get('X-Custom')).toBe('true');
    });

    it('passes init options through to baseFetch', async () => {
      const logger = createConsoleLogger();
      const onProgressEvent = vi.fn();
      const baseFetch = vi.fn().mockResolvedValue(
        new Response('with-init', {
          status: 201,
          headers: new Headers({
            'X-From-Base': 'yes',
          }),
        }),
      );

      const fetchWithProgress = createFetchWithProgress({
        logger,
        enableProgressLog: false,
        baseFetch,
        onProgressEvent,
      });

      const init = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Req': 'abc',
        },
        body: JSON.stringify({ hello: 'world' }),
      } as const;

      const response = await fetchWithProgress(
        'https://api.example.com/data',
        init,
      );
      const text = await response.text();

      expect(baseFetch).toHaveBeenCalledOnce();
      expect(baseFetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Req': 'abc',
          }),
          body: JSON.stringify({ hello: 'world' }),
        }),
      );
      expect(text).toBe('with-init');
      expect(response.status).toBe(201);

      const events = onProgressEvent.mock.calls.map((call) => call[0].type);
      expect(events).toContain('request-start');
      expect(events).toContain('complete');
    });

    it('wraps custom fetch with progress tracking', async () => {
      const logger = createConsoleLogger();
      const onProgressEvent = vi.fn();

      const customFetch = vi.fn().mockImplementation((url, init) => {
        return globalThis.fetch(url, {
          ...init,
          headers: {
            ...init?.headers,
            'X-Custom-Header': 'test-value',
          },
        });
      });

      const mockResponse = new Response('test data', {
        status: 200,
        headers: new Headers({
          'Content-Length': '9',
          'X-From-Custom': 'yes',
        }),
      });
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const fetchWithProgress = createFetchWithProgress({
        logger,
        enableProgressLog: true,
        baseFetch: customFetch,
        onProgressEvent,
      });

      const response = await fetchWithProgress('https://api.example.com/data');
      await response.text();

      expect(customFetch).toHaveBeenCalledOnce();
      const events = onProgressEvent.mock.calls.map((call) => call[0].type);
      expect(events).toContain('request-start');
      expect(events).toContain('complete');
    });
  });
});
