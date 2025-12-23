import { createProtoPediaClient } from 'protopedia-api-v2-client';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { Logger } from '../../../../../logger/index.js';
import { ProtopediaApiCustomClient } from '../../../../client/protopedia-api-custom-client.js';

vi.mock('protopedia-api-v2-client', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('protopedia-api-v2-client')>();
  return {
    ...actual,
    createProtoPediaClient: vi.fn(),
  };
});

describe('ProtopediaApiCustomClient - Methods - listPrototypes', () => {
  const createProtoPediaClientMock =
    createProtoPediaClient as unknown as ReturnType<typeof vi.fn>;

  const mockLogger: Logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };

  beforeEach(() => {
    createProtoPediaClientMock.mockReset();
    vi.clearAllMocks();
  });

  it('delegates to underlying SDK client', async () => {
    const mockResults = [{ prototype_id: 123 }];
    const clientInstance = {
      listPrototypes: vi.fn().mockResolvedValue({ results: mockResults }),
    };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    const client = new ProtopediaApiCustomClient({ logger: mockLogger });
    const result = await client.listPrototypes({ offset: 0, limit: 10 });

    expect(clientInstance.listPrototypes).toHaveBeenCalledWith({
      offset: 0,
      limit: 10,
    });
    expect(result).toEqual({ results: mockResults });
  });

  it('returns raw API response without normalization', async () => {
    const mockRawResponse = {
      results: [
        { prototype_id: 123, raw_field: 'raw_value' },
        { prototype_id: 456, another_field: 'test' },
      ],
      pagination: { total: 2 },
    };

    const clientInstance = {
      listPrototypes: vi.fn().mockResolvedValue(mockRawResponse),
    };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    const client = new ProtopediaApiCustomClient({ logger: mockLogger });
    const result = await client.listPrototypes({ offset: 0, limit: 10 });

    expect(result).toBe(mockRawResponse);
  });

  it('passes query parameters correctly', async () => {
    const clientInstance = {
      listPrototypes: vi.fn().mockResolvedValue({ results: [] }),
    };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    const client = new ProtopediaApiCustomClient({ logger: mockLogger });
    const params = { offset: 50, limit: 25, prototypeId: 789 };
    await client.listPrototypes(params);

    expect(clientInstance.listPrototypes).toHaveBeenCalledWith(params);
  });

  it('logs with warn for client errors (4xx status)', async () => {
    // Create a plain object that matches ProtoPediaApiError structure
    const mockError = Object.assign(new Error('Not Found'), {
      name: 'ProtoPediaApiError',
      req: { url: 'https://example.com', method: 'GET' },
      status: 404,
      statusText: 'Not Found',
      body: null,
      headers: {},
    });

    const clientInstance = {
      listPrototypes: vi.fn().mockRejectedValue(mockError),
    };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    const client = new ProtopediaApiCustomClient({ logger: mockLogger });
    const result = await client.fetchPrototypes({ offset: 0, limit: 10 });

    expect(result.ok).toBe(false);
    expect(mockLogger.warn).toHaveBeenCalled();
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('logs with error for server errors (5xx status)', async () => {
    // Create a plain object that matches ProtoPediaApiError structure
    const mockError = Object.assign(new Error('Internal Server Error'), {
      name: 'ProtoPediaApiError',
      req: { url: 'https://example.com', method: 'GET' },
      status: 500,
      statusText: 'Internal Server Error',
      body: null,
      headers: {},
    });

    const clientInstance = {
      listPrototypes: vi.fn().mockRejectedValue(mockError),
    };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    const client = new ProtopediaApiCustomClient({ logger: mockLogger });
    const result = await client.fetchPrototypes({ offset: 0, limit: 10 });

    expect(result.ok).toBe(false);
    expect(mockLogger.error).toHaveBeenCalled();
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });
});
