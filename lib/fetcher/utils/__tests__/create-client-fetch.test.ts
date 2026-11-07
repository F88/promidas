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
