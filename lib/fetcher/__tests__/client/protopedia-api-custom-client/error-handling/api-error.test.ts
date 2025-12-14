import {
  createProtoPediaClient,
  ProtoPediaApiError,
} from 'protopedia-api-v2-client';
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

describe('ProtopediaApiCustomClient - Error Handling - ProtoPediaApiError', () => {
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

  it('handles ProtoPediaApiError with 404 status', async () => {
    const apiError = new ProtoPediaApiError({
      message: 'Prototype not found',
      req: {
        url: 'https://protopedia.cc/api/prototypes',
        method: 'GET',
      },
      status: 404,
      statusText: 'Not Found',
    });

    const clientInstance = {
      listPrototypes: vi.fn().mockRejectedValue(apiError),
    };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    const client = new ProtopediaApiCustomClient({ logger: mockLogger });
    const result = await client.fetchPrototypes({ offset: 0, limit: 10 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(404);
      expect(result.error).toBe('Prototype not found');
      expect(result.details).toEqual({
        req: {
          url: 'https://protopedia.cc/api/prototypes',
          method: 'GET',
        },
        res: {
          statusText: 'Not Found',
        },
      });
    }
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it('handles ProtoPediaApiError with 500 status', async () => {
    const apiError = new ProtoPediaApiError({
      message: 'Internal Server Error',
      req: {
        url: 'https://protopedia.cc/api/prototypes',
        method: 'POST',
      },
      status: 500,
      statusText: 'Internal Server Error',
    });

    const clientInstance = {
      listPrototypes: vi.fn().mockRejectedValue(apiError),
    };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    const client = new ProtopediaApiCustomClient({ logger: mockLogger });
    const result = await client.fetchPrototypes({ offset: 0, limit: 10 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(500);
      expect(result.error).toBe('Internal Server Error');
    }
  });

  it('logs ProtoPediaApiError correctly', async () => {
    const apiError = new ProtoPediaApiError({
      message: 'Unauthorized',
      req: {
        url: 'https://protopedia.cc/api/prototypes',
        method: 'GET',
      },
      status: 401,
      statusText: 'Unauthorized',
    });

    const clientInstance = {
      listPrototypes: vi.fn().mockRejectedValue(apiError),
    };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    const client = new ProtopediaApiCustomClient({ logger: mockLogger });
    await client.fetchPrototypes({ offset: 0, limit: 10 });

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Unauthorized',
      expect.objectContaining({
        ok: false,
        status: 401,
        error: 'Unauthorized',
      }),
    );
  });
});
