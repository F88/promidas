import { createProtoPediaClient } from 'protopedia-api-v2-client';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import * as fetchPrototypesModule from '../fetch-prototypes.js';
import { createProtopediaApiCustomClient } from '../protopedia-api-custom-client.js';

vi.mock('protopedia-api-v2-client', () => ({
  createProtoPediaClient: vi.fn(),
}));

vi.mock('../fetch-prototypes', () => ({
  fetchAndNormalizePrototypes: vi.fn(),
}));

describe('createProtopediaApiCustomClient', () => {
  const createProtoPediaClientMock =
    createProtoPediaClient as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createProtoPediaClientMock.mockReset();
  });

  describe('client creation', () => {
    it('forwards config to the official SDK client', () => {
      const token = 'test-token';
      const baseUrl = 'https://example.test';

      const clientInstance = { listPrototypes: vi.fn() };
      createProtoPediaClientMock.mockReturnValue(clientInstance);

      const result = createProtopediaApiCustomClient({ token, baseUrl });

      expect(createProtoPediaClientMock).toHaveBeenCalledWith({
        token,
        baseUrl,
      });
      expect(result).toHaveProperty('listPrototypes');
    });

    it('respects all SDK client options including logLevel', () => {
      const token = 'another-token';
      const baseUrl = 'https://protopedia.test';
      const logLevel = 'debug' as const;

      const clientInstance = { listPrototypes: vi.fn() };
      createProtoPediaClientMock.mockReturnValue(clientInstance);

      const result = createProtopediaApiCustomClient({
        token,
        baseUrl,
        logLevel,
      });

      expect(createProtoPediaClientMock).toHaveBeenCalledWith({
        token,
        baseUrl,
        logLevel,
      });
      expect(result).toHaveProperty('listPrototypes');
    });

    it('accepts being called with no config and uses SDK defaults', () => {
      const clientInstance = { listPrototypes: vi.fn() };
      createProtoPediaClientMock.mockReturnValue(clientInstance);

      const result = createProtopediaApiCustomClient();

      expect(createProtoPediaClientMock).toHaveBeenCalledWith({});
      expect(result).toHaveProperty('listPrototypes');
    });

    it('accepts custom fetch and timeout options', () => {
      const customFetch = vi.fn();
      const timeoutMs = 5000;

      const clientInstance = { listPrototypes: vi.fn() };
      createProtoPediaClientMock.mockReturnValue(clientInstance);

      const result = createProtopediaApiCustomClient({
        fetch: customFetch,
        timeoutMs,
      });

      expect(createProtoPediaClientMock).toHaveBeenCalledWith({
        fetch: customFetch,
        timeoutMs,
      });
      expect(result).toHaveProperty('listPrototypes');
    });
  });

  describe('fetchPrototypes method', () => {
    it('adds fetchPrototypes method to the client instance', () => {
      const clientInstance = { listPrototypes: vi.fn() };
      createProtoPediaClientMock.mockReturnValue(clientInstance);

      const result = createProtopediaApiCustomClient();

      expect(result).toHaveProperty('fetchPrototypes');
      expect(typeof result.fetchPrototypes).toBe('function');
    });

    it('preserves all original SDK client methods', () => {
      const clientInstance = {
        listPrototypes: vi.fn(),
      };
      createProtoPediaClientMock.mockReturnValue(clientInstance);

      const result = createProtopediaApiCustomClient();

      expect(result.listPrototypes).toBe(clientInstance.listPrototypes);
      expect(result).toHaveProperty('fetchPrototypes');
    });

    it('calls fetchAndNormalizePrototypes with correct arguments', async () => {
      const clientInstance = { listPrototypes: vi.fn() };
      createProtoPediaClientMock.mockReturnValue(clientInstance);

      const mockResult = { ok: true, data: [] };
      const fetchAndNormalizePrototypesMock =
        fetchPrototypesModule.fetchAndNormalizePrototypes as ReturnType<
          typeof vi.fn
        >;
      fetchAndNormalizePrototypesMock.mockResolvedValue(mockResult as any);

      const client = createProtopediaApiCustomClient();
      const params = { offset: 0, limit: 10 };
      const result = await client.fetchPrototypes(params);

      expect(fetchAndNormalizePrototypesMock).toHaveBeenCalledWith(
        clientInstance,
        params,
      );
      expect(result).toBe(mockResult);
    });

    it('returns the result from fetchAndNormalizePrototypes', async () => {
      const clientInstance = { listPrototypes: vi.fn() };
      createProtoPediaClientMock.mockReturnValue(clientInstance);

      const mockSuccessResult = {
        ok: true,
        data: [{ id: 1, prototypeNm: 'test' }],
      };
      const fetchAndNormalizePrototypesMock =
        fetchPrototypesModule.fetchAndNormalizePrototypes as ReturnType<
          typeof vi.fn
        >;
      fetchAndNormalizePrototypesMock.mockResolvedValue(
        mockSuccessResult as any,
      );

      const client = createProtopediaApiCustomClient();
      const result = await client.fetchPrototypes({ offset: 0, limit: 10 });

      expect(result).toEqual(mockSuccessResult);
    });

    it('handles error results from fetchAndNormalizePrototypes', async () => {
      const clientInstance = { listPrototypes: vi.fn() };
      createProtoPediaClientMock.mockReturnValue(clientInstance);

      const mockErrorResult = {
        ok: false,
        status: 500,
        message: 'Internal server error',
      };
      const fetchAndNormalizePrototypesMock =
        fetchPrototypesModule.fetchAndNormalizePrototypes as ReturnType<
          typeof vi.fn
        >;
      fetchAndNormalizePrototypesMock.mockResolvedValue(mockErrorResult as any);

      const client = createProtopediaApiCustomClient();
      const result = await client.fetchPrototypes({ offset: 0, limit: 10 });

      expect(result).toEqual(mockErrorResult);
    });
  });

  describe('multiple instances', () => {
    it('creates independent client instances', () => {
      const clientInstance1 = { listPrototypes: vi.fn() };
      const clientInstance2 = { listPrototypes: vi.fn() };

      createProtoPediaClientMock
        .mockReturnValueOnce(clientInstance1)
        .mockReturnValueOnce(clientInstance2);

      const client1 = createProtopediaApiCustomClient({ token: 'token1' });
      const client2 = createProtopediaApiCustomClient({ token: 'token2' });

      expect(client1.listPrototypes).toBe(clientInstance1.listPrototypes);
      expect(client2.listPrototypes).toBe(clientInstance2.listPrototypes);
      expect(client1.listPrototypes).not.toBe(client2.listPrototypes);
    });

    it('each instance has its own fetchPrototypes method', () => {
      const clientInstance1 = { listPrototypes: vi.fn() };
      const clientInstance2 = { listPrototypes: vi.fn() };

      createProtoPediaClientMock
        .mockReturnValueOnce(clientInstance1)
        .mockReturnValueOnce(clientInstance2);

      const client1 = createProtopediaApiCustomClient();
      const client2 = createProtopediaApiCustomClient();

      expect(client1.fetchPrototypes).toBeDefined();
      expect(client2.fetchPrototypes).toBeDefined();
      expect(client1.fetchPrototypes).not.toBe(client2.fetchPrototypes);
    });
  });

  describe('configuration variations', () => {
    it('handles all logLevel values', () => {
      const logLevels = ['debug', 'info', 'warn', 'error'] as const;

      logLevels.forEach((logLevel) => {
        const clientInstance = { listPrototypes: vi.fn() };
        createProtoPediaClientMock.mockReturnValue(clientInstance);

        const result = createProtopediaApiCustomClient({ logLevel });

        expect(createProtoPediaClientMock).toHaveBeenCalledWith({ logLevel });
        expect(result).toHaveProperty('fetchPrototypes');
      });
    });

    it('handles baseUrl variations', () => {
      const baseUrls = [
        'https://protopedia.cc',
        'http://localhost:3000',
        'https://staging.protopedia.cc',
      ];

      baseUrls.forEach((baseUrl) => {
        const clientInstance = { listPrototypes: vi.fn() };
        createProtoPediaClientMock.mockReturnValue(clientInstance);

        const result = createProtopediaApiCustomClient({ baseUrl });

        expect(createProtoPediaClientMock).toHaveBeenCalledWith({ baseUrl });
        expect(result).toHaveProperty('fetchPrototypes');
      });
    });

    it('handles timeoutMs values', () => {
      const timeoutValues = [1000, 5000, 10000, 30000];

      timeoutValues.forEach((timeoutMs) => {
        const clientInstance = { listPrototypes: vi.fn() };
        createProtoPediaClientMock.mockReturnValue(clientInstance);

        const result = createProtopediaApiCustomClient({ timeoutMs });

        expect(createProtoPediaClientMock).toHaveBeenCalledWith({ timeoutMs });
        expect(result).toHaveProperty('fetchPrototypes');
      });
    });

    it('handles custom fetch implementation', () => {
      const customFetch = vi.fn();
      const clientInstance = { listPrototypes: vi.fn() };
      createProtoPediaClientMock.mockReturnValue(clientInstance);

      const result = createProtopediaApiCustomClient({
        fetch: customFetch as any,
      });

      expect(createProtoPediaClientMock).toHaveBeenCalledWith({
        fetch: customFetch,
      });
      expect(result).toHaveProperty('fetchPrototypes');
    });

    it('handles combined configuration options', () => {
      const config = {
        token: 'test-token',
        baseUrl: 'https://example.com',
        logLevel: 'warn' as const,
        timeoutMs: 5000,
      };
      const clientInstance = { listPrototypes: vi.fn() };
      createProtoPediaClientMock.mockReturnValue(clientInstance);

      const result = createProtopediaApiCustomClient(config);

      expect(createProtoPediaClientMock).toHaveBeenCalledWith(config);
      expect(result).toHaveProperty('fetchPrototypes');
    });
  });

  describe('error handling', () => {
    it('propagates errors from SDK client creation', () => {
      const error = new Error('SDK initialization failed');
      createProtoPediaClientMock.mockImplementation(() => {
        throw error;
      });

      expect(() => createProtopediaApiCustomClient()).toThrow(
        'SDK initialization failed',
      );
    });

    it('handles null config gracefully', () => {
      const clientInstance = { listPrototypes: vi.fn() };
      createProtoPediaClientMock.mockReturnValue(clientInstance);

      const result = createProtopediaApiCustomClient(null as any);

      expect(createProtoPediaClientMock).toHaveBeenCalledWith(null);
      expect(result).toHaveProperty('fetchPrototypes');
    });
  });

  describe('type safety', () => {
    it('returns client with both SDK and custom methods', () => {
      const clientInstance = {
        listPrototypes: vi.fn(),
        someOtherMethod: vi.fn(),
      };
      createProtoPediaClientMock.mockReturnValue(clientInstance);

      const result = createProtopediaApiCustomClient();

      expect(result).toHaveProperty('listPrototypes');
      expect(result).toHaveProperty('someOtherMethod');
      expect(result).toHaveProperty('fetchPrototypes');
    });

    it('preserves SDK client method references', () => {
      const listPrototypesFn = vi.fn();
      const clientInstance = { listPrototypes: listPrototypesFn };
      createProtoPediaClientMock.mockReturnValue(clientInstance);

      const result = createProtopediaApiCustomClient();

      expect(result.listPrototypes).toBe(listPrototypesFn);
    });
  });

  describe('fetchPrototypes integration', () => {
    it('invokes fetchAndNormalizePrototypes with correct client instance', async () => {
      const clientInstance = { listPrototypes: vi.fn() };
      createProtoPediaClientMock.mockReturnValue(clientInstance);

      const mockResult = { ok: true, data: [] };
      const fetchAndNormalizePrototypesMock =
        fetchPrototypesModule.fetchAndNormalizePrototypes as ReturnType<
          typeof vi.fn
        >;
      fetchAndNormalizePrototypesMock.mockResolvedValue(mockResult as any);

      const client = createProtopediaApiCustomClient();
      await client.fetchPrototypes({ offset: 0, limit: 10 });

      expect(fetchAndNormalizePrototypesMock).toHaveBeenCalledWith(
        clientInstance,
        { offset: 0, limit: 10 },
      );
    });

    it('handles multiple sequential fetchPrototypes calls', async () => {
      const clientInstance = { listPrototypes: vi.fn() };
      createProtoPediaClientMock.mockReturnValue(clientInstance);

      const fetchAndNormalizePrototypesMock =
        fetchPrototypesModule.fetchAndNormalizePrototypes as ReturnType<
          typeof vi.fn
        >;
      fetchAndNormalizePrototypesMock.mockClear();
      fetchAndNormalizePrototypesMock
        .mockResolvedValueOnce({ ok: true, data: [{ id: 1 }] } as any)
        .mockResolvedValueOnce({ ok: true, data: [{ id: 2 }] } as any);

      const client = createProtopediaApiCustomClient();
      const result1 = await client.fetchPrototypes({ offset: 0, limit: 10 });
      const result2 = await client.fetchPrototypes({ offset: 10, limit: 10 });

      expect(result1).toEqual({ ok: true, data: [{ id: 1 }] });
      expect(result2).toEqual({ ok: true, data: [{ id: 2 }] });
      expect(fetchAndNormalizePrototypesMock).toHaveBeenCalledTimes(2);
    });

    it('handles concurrent fetchPrototypes calls', async () => {
      const clientInstance = { listPrototypes: vi.fn() };
      createProtoPediaClientMock.mockReturnValue(clientInstance);

      const fetchAndNormalizePrototypesMock =
        fetchPrototypesModule.fetchAndNormalizePrototypes as ReturnType<
          typeof vi.fn
        >;
      fetchAndNormalizePrototypesMock.mockImplementation(async (_, params) => ({
        ok: true,
        data: [{ id: params.offset }],
      }));

      const client = createProtopediaApiCustomClient();
      const [r1, r2, r3] = await Promise.all([
        client.fetchPrototypes({ offset: 0, limit: 10 }),
        client.fetchPrototypes({ offset: 10, limit: 10 }),
        client.fetchPrototypes({ offset: 20, limit: 10 }),
      ]);

      expect(r1).toEqual({ ok: true, data: [{ id: 0 }] });
      expect(r2).toEqual({ ok: true, data: [{ id: 10 }] });
      expect(r3).toEqual({ ok: true, data: [{ id: 20 }] });
    });

    it('propagates errors from fetchAndNormalizePrototypes', async () => {
      const clientInstance = { listPrototypes: vi.fn() };
      createProtoPediaClientMock.mockReturnValue(clientInstance);

      const fetchAndNormalizePrototypesMock =
        fetchPrototypesModule.fetchAndNormalizePrototypes as ReturnType<
          typeof vi.fn
        >;
      fetchAndNormalizePrototypesMock.mockResolvedValue({
        ok: false,
        status: 500,
        error: 'Server error',
      } as any);

      const client = createProtopediaApiCustomClient();
      const result = await client.fetchPrototypes({ offset: 0, limit: 10 });

      expect(result).toEqual({
        ok: false,
        status: 500,
        error: 'Server error',
      });
    });

    it('handles fetchPrototypes with prototypeId parameter', async () => {
      const clientInstance = { listPrototypes: vi.fn() };
      createProtoPediaClientMock.mockReturnValue(clientInstance);

      const fetchAndNormalizePrototypesMock =
        fetchPrototypesModule.fetchAndNormalizePrototypes as ReturnType<
          typeof vi.fn
        >;
      fetchAndNormalizePrototypesMock.mockResolvedValue({
        ok: true,
        data: [{ id: 123 }],
      } as any);

      const client = createProtopediaApiCustomClient();
      await client.fetchPrototypes({ prototypeId: 123 });

      expect(fetchAndNormalizePrototypesMock).toHaveBeenCalledWith(
        clientInstance,
        { prototypeId: 123 },
      );
    });
  });
});
