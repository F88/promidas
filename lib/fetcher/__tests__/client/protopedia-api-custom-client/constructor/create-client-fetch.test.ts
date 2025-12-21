import { createProtoPediaClient } from 'protopedia-api-v2-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ProtopediaApiCustomClient } from '../../../../client/protopedia-api-custom-client.js';
import { createClientFetch } from '../../../../utils/create-client-fetch.js';

vi.mock('protopedia-api-v2-client', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('protopedia-api-v2-client')>();
  return {
    ...actual,
    createProtoPediaClient: vi.fn(),
  };
});

vi.mock('../../../../utils/create-client-fetch.js', () => ({
  createClientFetch: vi.fn(),
}));

describe('ProtopediaApiCustomClient - Constructor - createClientFetch', () => {
  const createProtoPediaClientMock =
    createProtoPediaClient as unknown as ReturnType<typeof vi.fn>;
  const createClientFetchMock = createClientFetch as unknown as ReturnType<
    typeof vi.fn
  >;

  function setBrowserGlobals(): void {
    (globalThis as { window?: unknown }).window = {};
    (globalThis as { document?: unknown }).document = {};
  }

  function clearBrowserGlobals(): void {
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { document?: unknown }).document;
  }

  beforeEach(() => {
    clearBrowserGlobals();
    createProtoPediaClientMock.mockReset();
    createClientFetchMock.mockReset();
  });

  afterEach(() => {
    clearBrowserGlobals();
  });

  it('does not set stripHeaders in non-browser runtime', () => {
    const clientInstance = { listPrototypes: vi.fn() };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    const customFetch = vi.fn();
    createClientFetchMock.mockReturnValue(customFetch);

    new ProtopediaApiCustomClient({
      protoPediaApiClientOptions: {
        token: '***',
      },
      progressLog: false,
    });

    expect(createClientFetchMock).toHaveBeenCalledTimes(1);
    const firstCall = createClientFetchMock.mock.calls[0];
    const args = firstCall?.[0] as Record<string, unknown> | undefined;
    expect(args).toBeDefined();
    expect('stripHeaders' in (args ?? {})).toBe(false);
  });

  it('sets stripHeaders in browser runtime (Issue #55)', () => {
    setBrowserGlobals();

    const clientInstance = { listPrototypes: vi.fn() };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    const customFetch = vi.fn();
    createClientFetchMock.mockReturnValue(customFetch);

    new ProtopediaApiCustomClient({
      protoPediaApiClientOptions: {
        token: '***',
      },
      progressLog: false,
    });

    expect(createClientFetchMock).toHaveBeenCalledTimes(1);
    expect(createClientFetchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        stripHeaders: ['x-client-user-agent'],
      }),
    );
  });
});
