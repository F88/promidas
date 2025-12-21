import { createProtoPediaClient } from 'protopedia-api-v2-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { VERSION } from '../../../../../version.js';
import { ProtopediaApiCustomClient } from '../../../../client/protopedia-api-custom-client.js';

vi.mock('protopedia-api-v2-client', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('protopedia-api-v2-client')>();
  return {
    ...actual,
    createProtoPediaClient: vi.fn(),
  };
});

describe('ProtopediaApiCustomClient - Constructor - User-Agent', () => {
  const createProtoPediaClientMock =
    createProtoPediaClient as unknown as ReturnType<typeof vi.fn>;

  const originalWindow = (globalThis as { window?: unknown }).window;
  const originalDocument = (globalThis as { document?: unknown }).document;

  beforeEach(() => {
    createProtoPediaClientMock.mockReset();
  });

  afterEach(() => {
    if (originalWindow === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window?: unknown }).window = originalWindow;
    }

    if (originalDocument === undefined) {
      delete (globalThis as { document?: unknown }).document;
    } else {
      (globalThis as { document?: unknown }).document = originalDocument;
    }
  });

  it('sets default User-Agent with version when not provided', () => {
    const clientInstance = { listPrototypes: vi.fn() };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    new ProtopediaApiCustomClient({
      protoPediaApiClientOptions: {
        token: 'test-token',
      },
    });

    expect(createProtoPediaClientMock).toHaveBeenCalledWith({
      fetch: expect.any(Function),
      token: 'test-token',
      userAgent: `ProtopediaApiCustomClient/${VERSION} (promidas)`,
    });
  });

  it('preserves custom User-Agent when explicitly provided', () => {
    const customUserAgent = 'MyApp/1.0.0 (custom-client)';
    const clientInstance = { listPrototypes: vi.fn() };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    new ProtopediaApiCustomClient({
      protoPediaApiClientOptions: {
        token: 'test-token',
        userAgent: customUserAgent,
      },
    });

    expect(createProtoPediaClientMock).toHaveBeenCalledWith({
      fetch: expect.any(Function),
      token: 'test-token',
      userAgent: customUserAgent,
    });
  });

  it('sets default User-Agent even with no config', () => {
    const clientInstance = { listPrototypes: vi.fn() };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    new ProtopediaApiCustomClient();

    expect(createProtoPediaClientMock).toHaveBeenCalledWith({
      fetch: expect.any(Function),
      userAgent: `ProtopediaApiCustomClient/${VERSION} (promidas)`,
    });
  });

  it('User-Agent format includes version and promidas identifier', () => {
    const clientInstance = { listPrototypes: vi.fn() };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    new ProtopediaApiCustomClient();

    expect(createProtoPediaClientMock).toHaveBeenCalledTimes(1);
    const callArgs = createProtoPediaClientMock.mock.calls[0]?.[0];
    expect(callArgs).toBeDefined();
    expect(callArgs?.userAgent).toMatch(
      /^ProtopediaApiCustomClient\/\d+\.\d+\.\d+ \(promidas\)$/,
    );
  });

  it('strips x-client-user-agent in browser runtime (Issue #55)', async () => {
    // Simulate a browser-like environment.
    (globalThis as { window?: unknown }).window = {};
    (globalThis as { document?: unknown }).document = {};

    const originalFetch = globalThis.fetch;
    type BaseFetch = (
      input: string | URL | Request,
      init?: RequestInit,
    ) => Promise<Response>;

    const baseFetchMock = vi.fn<BaseFetch>(async () => new Response('ok'));
    globalThis.fetch = baseFetchMock as unknown as typeof fetch;

    const clientInstance = { listPrototypes: vi.fn() };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    new ProtopediaApiCustomClient({
      protoPediaApiClientOptions: {
        token: 'test-token',
      },
      progressLog: false,
    });

    expect(createProtoPediaClientMock).toHaveBeenCalledTimes(1);
    const callArgs = createProtoPediaClientMock.mock.calls[0]?.[0];
    expect(callArgs).toBeDefined();

    expect(callArgs).toMatchObject({
      token: 'test-token',
      userAgent: `ProtopediaApiCustomClient/${VERSION} (promidas)`,
      fetch: expect.any(Function),
    });

    try {
      await callArgs.fetch('https://example.test', {
        headers: {
          'x-client-user-agent': 'SDK/1.0',
          'x-keep-me': '1',
        },
      });

      expect(baseFetchMock).toHaveBeenCalledTimes(1);
      const firstCall = baseFetchMock.mock.calls[0];
      expect(firstCall).toBeDefined();
      const passedInit = firstCall?.[1];

      const passedHeaders = new Headers(passedInit?.headers);
      expect(passedHeaders.get('x-client-user-agent')).toBeNull();
      expect(passedHeaders.get('x-keep-me')).toBe('1');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
