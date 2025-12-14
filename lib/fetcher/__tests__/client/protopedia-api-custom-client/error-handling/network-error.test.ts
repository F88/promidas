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

describe('ProtopediaApiCustomClient - Error Handling - Network Errors', () => {
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

  it('handles ENOTFOUND error code', async () => {
    const networkError = Object.assign(new Error('getaddrinfo ENOTFOUND'), {
      code: 'ENOTFOUND',
    });

    const clientInstance = {
      listPrototypes: vi.fn().mockRejectedValue(networkError),
    };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    const client = new ProtopediaApiCustomClient({ logger: mockLogger });
    const result = await client.fetchPrototypes({ offset: 0, limit: 10 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBeUndefined();
      expect(result.error).toBe('getaddrinfo ENOTFOUND');
      expect(result.details.res?.code).toBe('ENOTFOUND');
    }
  });

  it('handles ECONNREFUSED error code', async () => {
    const networkError = Object.assign(new Error('connect ECONNREFUSED'), {
      code: 'ECONNREFUSED',
    });

    const clientInstance = {
      listPrototypes: vi.fn().mockRejectedValue(networkError),
    };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    const client = new ProtopediaApiCustomClient({ logger: mockLogger });
    const result = await client.fetchPrototypes({ offset: 0, limit: 10 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBeUndefined();
      expect(result.details.res?.code).toBe('ECONNREFUSED');
    }
  });

  it('handles nested error code in cause', async () => {
    const networkError = new Error('fetch failed');
    (networkError as any).cause = { code: 'ETIMEDOUT' };

    const clientInstance = {
      listPrototypes: vi.fn().mockRejectedValue(networkError),
    };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    const client = new ProtopediaApiCustomClient({ logger: mockLogger });
    const result = await client.fetchPrototypes({ offset: 0, limit: 10 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBeUndefined();
      expect(result.details.res?.code).toBe('ETIMEDOUT');
    }
  });

  it('logs network errors with error level', async () => {
    const networkError = Object.assign(new Error('Network failure'), {
      code: 'ENETUNREACH',
    });

    const clientInstance = {
      listPrototypes: vi.fn().mockRejectedValue(networkError),
    };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    const client = new ProtopediaApiCustomClient({ logger: mockLogger });
    await client.fetchPrototypes({ offset: 0, limit: 10 });

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Unexpected error while calling ProtoPedia API',
      expect.objectContaining({
        ok: false,
        error: 'Network failure',
      }),
    );
  });

  it('handles generic Error without code', async () => {
    const genericError = new Error('Something went wrong');

    const clientInstance = {
      listPrototypes: vi.fn().mockRejectedValue(genericError),
    };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    const client = new ProtopediaApiCustomClient({ logger: mockLogger });
    const result = await client.fetchPrototypes({ offset: 0, limit: 10 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBeUndefined();
      expect(result.error).toBe('Something went wrong');
      expect(result.details).toEqual({});
    }
  });

  it('handles non-Error thrown values', async () => {
    const unknownError = 'string error';

    const clientInstance = {
      listPrototypes: vi.fn().mockRejectedValue(unknownError),
    };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    const client = new ProtopediaApiCustomClient({ logger: mockLogger });
    const result = await client.fetchPrototypes({ offset: 0, limit: 10 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBeUndefined();
      expect(result.error).toBe('Failed to fetch prototypes');
    }
  });
});
