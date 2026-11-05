import { describe, expect, it, vi, beforeEach } from 'vitest';

import { ConsoleLogger } from '../../../logger/index.js';
import { selectCustomFetch } from '../../client/select-custom-fetch.js';
import { createClientFetch } from '../create-client-fetch.js';

vi.mock('../../client/select-custom-fetch.js', () => ({
  selectCustomFetch: vi.fn(),
}));

describe('createClientFetch', () => {
  const selectCustomFetchMock = selectCustomFetch as unknown as ReturnType<
    typeof vi.fn
  >;

  beforeEach(() => {
    selectCustomFetchMock.mockReset();
  });

  it('returns strippedFetch when stripping is enabled and progress wrapper is disabled', () => {
    const logger = new ConsoleLogger('info');
    const providedFetch = vi.fn();

    selectCustomFetchMock.mockImplementation(
      (args: { baseFetch?: typeof fetch | undefined }) => args.baseFetch,
    );

    const result = createClientFetch({
      logger,
      enableProgressLog: false,
      progressCallback: undefined,
      providedFetch,
      stripHeaders: ['x-client-user-agent'],
    });

    expect(result).toBeTypeOf('function');
    expect(selectCustomFetchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        logger,
        enableProgressLog: false,
        baseFetch: expect.any(Function),
      }),
    );
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
      providedFetch: undefined,
    });

    expect(result).toBe(expectedFetch);
    expect(selectCustomFetchMock).toHaveBeenCalledWith({
      logger,
      enableProgressLog: true,
    });
  });

  it('passes progress callbacks when provided', () => {
    const logger = new ConsoleLogger('info');

    const onProgressEvent = vi.fn();

    const expectedFetch = vi.fn();
    selectCustomFetchMock.mockReturnValue(expectedFetch);

    const result = createClientFetch({
      logger,
      enableProgressLog: true,
      progressCallback: onProgressEvent,
      providedFetch: undefined,
    });

    expect(selectCustomFetchMock).toHaveBeenCalledWith({
      logger,
      enableProgressLog: true,
      onProgressEvent,
    });

    expect(result).toBe(expectedFetch);
  });
});
