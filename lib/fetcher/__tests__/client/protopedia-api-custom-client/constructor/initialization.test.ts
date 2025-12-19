import { createProtoPediaClient } from 'protopedia-api-v2-client';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { ProtopediaApiCustomClient } from '../../../../client/protopedia-api-custom-client.js';

vi.mock('protopedia-api-v2-client', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('protopedia-api-v2-client')>();
  return {
    ...actual,
    createProtoPediaClient: vi.fn(),
  };
});

describe('ProtopediaApiCustomClient - Constructor - Initialization', () => {
  const createProtoPediaClientMock =
    createProtoPediaClient as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createProtoPediaClientMock.mockReset();
  });

  it('creates instance with SDK client options', () => {
    const token = 'test-token';
    const baseUrl = 'https://example.test';

    const clientInstance = { listPrototypes: vi.fn() };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    const client = new ProtopediaApiCustomClient({
      protoPediaApiClientOptions: { token, baseUrl },
    });

    expect(createProtoPediaClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        token,
        baseUrl,
        userAgent: expect.stringMatching(
          /^ProtopediaApiCustomClient\/\d+\.\d+\.\d+ \(promidas\)$/,
        ),
      }),
    );
    expect(client).toBeInstanceOf(ProtopediaApiCustomClient);
  });

  it('accepts all SDK client options including logLevel', () => {
    const token = 'another-token';
    const baseUrl = 'https://protopedia.test';
    const logLevel = 'debug' as const;

    const clientInstance = { listPrototypes: vi.fn() };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    const client = new ProtopediaApiCustomClient({
      protoPediaApiClientOptions: {
        token,
        baseUrl,
        logLevel,
      },
    });

    expect(createProtoPediaClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        token,
        baseUrl,
        logLevel,
        userAgent: expect.stringMatching(
          /^ProtopediaApiCustomClient\/\d+\.\d+\.\d+ \(promidas\)$/,
        ),
      }),
    );
    expect(client).toBeInstanceOf(ProtopediaApiCustomClient);
  });

  it('creates instance with no config using SDK defaults', () => {
    const clientInstance = { listPrototypes: vi.fn() };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    const client = new ProtopediaApiCustomClient();

    expect(createProtoPediaClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userAgent: expect.stringMatching(
          /^ProtopediaApiCustomClient\/\d+\.\d+\.\d+ \(promidas\)$/,
        ),
      }),
    );
    expect(client).toBeInstanceOf(ProtopediaApiCustomClient);
  });

  it('accepts custom fetch and timeout options', () => {
    const customFetch = vi.fn();
    const timeoutMs = 5000;

    const clientInstance = { listPrototypes: vi.fn() };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    const client = new ProtopediaApiCustomClient({
      protoPediaApiClientOptions: {
        fetch: customFetch,
        timeoutMs,
      },
    });

    expect(createProtoPediaClientMock).toHaveBeenCalledWith({
      fetch: expect.any(Function),
      userAgent: expect.stringMatching(
        /^ProtopediaApiCustomClient\/\d+\.\d+\.\d+ \(promidas\)$/,
      ),
    });
    expect(client).toBeInstanceOf(ProtopediaApiCustomClient);
  });

  it('has fetchPrototypes method', () => {
    const clientInstance = { listPrototypes: vi.fn() };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    const client = new ProtopediaApiCustomClient();

    expect(client).toHaveProperty('fetchPrototypes');
    expect(typeof client.fetchPrototypes).toBe('function');
  });

  it('has listPrototypes method', () => {
    const clientInstance = { listPrototypes: vi.fn() };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    const client = new ProtopediaApiCustomClient();

    expect(client).toHaveProperty('listPrototypes');
    expect(typeof client.listPrototypes).toBe('function');
  });
});
