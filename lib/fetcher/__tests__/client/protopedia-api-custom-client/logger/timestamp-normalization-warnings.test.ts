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

describe('ProtopediaApiCustomClient - Timestamp Normalization Warnings', () => {
  const createProtoPediaClientMock =
    createProtoPediaClient as unknown as ReturnType<typeof vi.fn>;

  const mockLogger: Logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    level: 'info',
  };

  beforeEach(() => {
    createProtoPediaClientMock.mockReset();
    vi.clearAllMocks();
  });

  it('logs warning when createDate normalization fails', async () => {
    const mockResults = [
      {
        id: 123,
        prototypeNm: 'Test',
        createDate: 'invalid-date-format',
      },
    ];

    const clientInstance = {
      listPrototypes: vi.fn().mockResolvedValue({ results: mockResults }),
    };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    const client = new ProtopediaApiCustomClient({ logger: mockLogger });
    await client.fetchPrototypes({ limit: 1 });

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Failed to parse and normalize createDate',
      expect.objectContaining({
        originalValue: 'invalid-date-format',
      }),
    );
  });

  it('logs warning when updateDate normalization fails', async () => {
    const mockResults = [
      {
        id: 123,
        prototypeNm: 'Test',
        updateDate: 'invalid-date-format',
      },
    ];

    const clientInstance = {
      listPrototypes: vi.fn().mockResolvedValue({ results: mockResults }),
    };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    const client = new ProtopediaApiCustomClient({ logger: mockLogger });
    await client.fetchPrototypes({ limit: 1 });

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Failed to parse and normalize updateDate',
      expect.objectContaining({
        originalValue: 'invalid-date-format',
      }),
    );
  });

  it('logs warning when releaseDate normalization fails', async () => {
    const mockResults = [
      {
        id: 123,
        prototypeNm: 'Test',
        releaseDate: 'invalid-date-format',
      },
    ];

    const clientInstance = {
      listPrototypes: vi.fn().mockResolvedValue({ results: mockResults }),
    };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    const client = new ProtopediaApiCustomClient({ logger: mockLogger });
    await client.fetchPrototypes({ limit: 1 });

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Failed to parse and normalize releaseDate',
      expect.objectContaining({
        originalValue: 'invalid-date-format',
      }),
    );
  });

  it('updates logger level when logLevel is provided', () => {
    const mutableLogger: Logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      level: 'info',
    };

    new ProtopediaApiCustomClient({
      logger: mutableLogger,
      logLevel: 'debug',
    });

    expect(mutableLogger.level).toBe('debug');
  });
});
