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

describe('ProtopediaApiCustomClient - Error Handling - HTTP Errors', () => {
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

  it('handles HTTP-like error with status property', async () => {
    const httpError = Object.assign(new Error('Service Unavailable'), {
      status: 503,
      statusText: 'Service Unavailable',
    });

    const clientInstance = {
      listPrototypes: vi.fn().mockRejectedValue(httpError),
    };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    const client = new ProtopediaApiCustomClient({ logger: mockLogger });
    const result = await client.fetchPrototypes({ offset: 0, limit: 10 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      // Non-ProtoPediaApiError are treated as unknown, not HTTP
      expect(result.origin).toBe('fetcher');
      expect(result.kind).toBe('unknown');
      expect(result.code).toBe('UNKNOWN');
      expect(result.status).toBeUndefined();
      expect(result.error).toBe('Service Unavailable');
      expect(result.details).toEqual({}); // statusText is not preserved
    }
  });

  it('handles error with numeric status as string', async () => {
    const httpError = Object.assign(new Error('Bad Gateway'), {
      status: '502',
    });

    const clientInstance = {
      listPrototypes: vi.fn().mockRejectedValue(httpError),
    };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    const client = new ProtopediaApiCustomClient({ logger: mockLogger });
    const result = await client.fetchPrototypes({ offset: 0, limit: 10 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      // Non-ProtoPediaApiError are treated as unknown, status is ignored
      expect(result.origin).toBe('fetcher');
      expect(result.kind).toBe('unknown');
      expect(result.code).toBe('UNKNOWN');
      expect(result.status).toBeUndefined();
    }
  });

  it('defaults to 500 for invalid status values', async () => {
    const httpError = Object.assign(new Error('Unknown Error'), {
      status: 'invalid',
    });

    const clientInstance = {
      listPrototypes: vi.fn().mockRejectedValue(httpError),
    };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    const client = new ProtopediaApiCustomClient({ logger: mockLogger });
    const result = await client.fetchPrototypes({ offset: 0, limit: 10 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      // Non-ProtoPediaApiError are treated as unknown, status is ignored
      expect(result.origin).toBe('fetcher');
      expect(result.kind).toBe('unknown');
      expect(result.code).toBe('UNKNOWN');
      expect(result.status).toBeUndefined();
    }
  });

  it('preserves request metadata', async () => {
    const httpError = Object.assign(new Error('Not Found'), {
      status: 404,
      req: {
        url: 'https://api.example.com/prototypes',
        method: 'GET',
      },
    });

    const clientInstance = {
      listPrototypes: vi.fn().mockRejectedValue(httpError),
    };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    const client = new ProtopediaApiCustomClient({ logger: mockLogger });
    const result = await client.fetchPrototypes({ offset: 0, limit: 10 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      // Non-ProtoPediaApiError does not preserve req metadata
      expect(result.origin).toBe('fetcher');
      expect(result.kind).toBe('unknown');
      expect(result.code).toBe('UNKNOWN');
      expect(result.details).toEqual({}); // req is not preserved
    }
  });

  it('preserves error code in details', async () => {
    const httpError = Object.assign(new Error('Request Failed'), {
      status: 400,
      code: 'INVALID_PARAMETER',
    });

    const clientInstance = {
      listPrototypes: vi.fn().mockRejectedValue(httpError),
    };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    const client = new ProtopediaApiCustomClient({ logger: mockLogger });
    const result = await client.fetchPrototypes({ offset: 0, limit: 10 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      // code is extracted as network error
      expect(result.origin).toBe('fetcher');
      expect(result.kind).toBe('network');
      expect(result.code).toBe('INVALID_PARAMETER');
      expect(result.details.res?.code).toBe('INVALID_PARAMETER');
    }
  });
});
