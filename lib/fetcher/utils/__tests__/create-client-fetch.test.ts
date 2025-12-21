import { describe, expect, it, vi, beforeEach } from 'vitest';

import { ConsoleLogger } from '../../../logger/index.js';
import { createFetchWithTimeout } from '../../client/fetch-with-timeout.js';
import { selectCustomFetch } from '../../client/select-custom-fetch.js';
import { createClientFetch } from '../create-client-fetch.js';

vi.mock('../../client/fetch-with-timeout.js', () => ({
  createFetchWithTimeout: vi.fn(),
}));

vi.mock('../../client/select-custom-fetch.js', () => ({
  selectCustomFetch: vi.fn(),
}));

describe('createClientFetch', () => {
  const createFetchWithTimeoutMock =
    createFetchWithTimeout as unknown as ReturnType<typeof vi.fn>;
  const selectCustomFetchMock = selectCustomFetch as unknown as ReturnType<
    typeof vi.fn
  >;

  beforeEach(() => {
    createFetchWithTimeoutMock.mockReset();
    selectCustomFetchMock.mockReset();
  });

  it('returns strippedFetch when progress wrapper is disabled (selected undefined)', () => {
    const logger = new ConsoleLogger('info');
    const providedFetch = vi.fn();

    selectCustomFetchMock.mockReturnValue(undefined);

    const result = createClientFetch({
      logger,
      enableProgressLog: false,
      progressCallback: undefined,
      timeoutMs: undefined,
      providedFetch,
      stripHeaders: ['x-client-user-agent'],
    });

    expect(result).toBeTypeOf('function');
  });

  it('returns undefined when stripping is requested but no fetch is available', () => {
    const logger = new ConsoleLogger('info');

    const originalGlobalFetch = globalThis.fetch;
    // Simulate an environment where global fetch is not available.
     
    (globalThis as { fetch?: unknown }).fetch = undefined;

    selectCustomFetchMock.mockReturnValue(undefined);

    const result = createClientFetch({
      logger,
      enableProgressLog: false,
      progressCallback: undefined,
      timeoutMs: undefined,
      providedFetch: undefined,
      stripHeaders: ['x-client-user-agent'],
    });

    expect(result).toBeUndefined();

    // Restore global fetch for other tests.
    globalThis.fetch = originalGlobalFetch;
  });

  it('returns fetch returned by selectCustomFetch', () => {
    const logger = new ConsoleLogger('info');
    const expectedFetch = vi.fn();

    selectCustomFetchMock.mockReturnValue(expectedFetch);

    const result = createClientFetch({
      logger,
      enableProgressLog: true,
      progressCallback: undefined,
      timeoutMs: undefined,
      providedFetch: undefined,
    });

    expect(result).toBe(expectedFetch);
    expect(selectCustomFetchMock).toHaveBeenCalledWith({
      logger,
      enableProgressLog: true,
    });
    expect(createFetchWithTimeoutMock).not.toHaveBeenCalled();
  });

  it('wraps provided fetch with timeout when timeoutMs is set', () => {
    const logger = new ConsoleLogger('info');
    const providedFetch = vi.fn();
    const wrappedFetch = vi.fn();

    createFetchWithTimeoutMock.mockReturnValue(wrappedFetch);

    const expectedFetch = vi.fn();
    selectCustomFetchMock.mockReturnValue(expectedFetch);

    const result = createClientFetch({
      logger,
      enableProgressLog: false,
      progressCallback: undefined,
      timeoutMs: 1234,
      providedFetch,
    });

    expect(createFetchWithTimeoutMock).toHaveBeenCalledWith({
      timeoutMs: 1234,
      baseFetch: providedFetch,
    });

    expect(selectCustomFetchMock).toHaveBeenCalledWith({
      logger,
      enableProgressLog: false,
      baseFetch: wrappedFetch,
    });

    expect(result).toBe(expectedFetch);
  });

  it('passes progress callbacks when provided', () => {
    const logger = new ConsoleLogger('info');

    const onStart = vi.fn();
    const onProgress = vi.fn();
    const onComplete = vi.fn();

    const expectedFetch = vi.fn();
    selectCustomFetchMock.mockReturnValue(expectedFetch);

    const result = createClientFetch({
      logger,
      enableProgressLog: true,
      progressCallback: {
        onStart,
        onProgress,
        onComplete,
      },
      timeoutMs: undefined,
      providedFetch: undefined,
    });

    expect(selectCustomFetchMock).toHaveBeenCalledWith({
      logger,
      enableProgressLog: true,
      onProgressStart: onStart,
      onProgress,
      onProgressComplete: onComplete,
    });

    expect(result).toBe(expectedFetch);
  });
});
