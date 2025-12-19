import {
  createProtoPediaClient,
  ProtoPediaApiError,
} from 'protopedia-api-v2-client';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { Logger } from '../../../../../logger/index.js';
import { ProtopediaApiCustomClient } from '../../../../client/protopedia-api-custom-client.js';
import { PromidasTimeoutError } from '../../../../utils/errors/timeout-error.js';

vi.mock('protopedia-api-v2-client', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('protopedia-api-v2-client')>();
  return {
    ...actual,
    createProtoPediaClient: vi.fn(),
  };
});

describe('ProtopediaApiCustomClient - Error Handling - AbortError', () => {
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

  it('handles AbortError (aborted)', async () => {
    const abortError = new DOMException('Aborted', 'AbortError');
    const clientInstance = {
      listPrototypes: vi.fn().mockRejectedValue(abortError),
    };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    const client = new ProtopediaApiCustomClient({ logger: mockLogger });
    const result = await client.fetchPrototypes({ offset: 0, limit: 10 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('Upstream request aborted');
      expect(result.status).toBeUndefined();
      expect(result.details).toEqual({
        res: {
          code: 'ABORTED',
        },
      });
    }
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('logs AbortError with correct message', async () => {
    const abortError = new DOMException(
      'The operation was aborted',
      'AbortError',
    );
    const clientInstance = {
      listPrototypes: vi.fn().mockRejectedValue(abortError),
    };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    const client = new ProtopediaApiCustomClient({ logger: mockLogger });
    await client.fetchPrototypes({ offset: 0, limit: 10 });

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Upstream request aborted',
      expect.objectContaining({
        ok: false,
        error: 'Upstream request aborted',
      }),
    );
  });

  it('handles PromidasTimeoutError (timeout)', async () => {
    const timeoutError = new PromidasTimeoutError(5000);
    const clientInstance = {
      listPrototypes: vi.fn().mockRejectedValue(timeoutError),
    };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    const client = new ProtopediaApiCustomClient({ logger: mockLogger });
    const result = await client.fetchPrototypes({ offset: 0, limit: 10 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('Upstream request timed out');
      expect(result.status).toBeUndefined();
      expect(result.details).toEqual({
        res: {
          code: 'TIMEOUT',
        },
      });
    }
  });

  it('never throws exception for AbortError', async () => {
    const abortError = new DOMException('Aborted', 'AbortError');
    const clientInstance = {
      listPrototypes: vi.fn().mockRejectedValue(abortError),
    };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    const client = new ProtopediaApiCustomClient({ logger: mockLogger });

    await expect(
      client.fetchPrototypes({ offset: 0, limit: 10 }),
    ).resolves.toBeDefined();
  });
});
