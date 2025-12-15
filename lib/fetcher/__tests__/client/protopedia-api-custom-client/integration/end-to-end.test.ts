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

describe('ProtopediaApiCustomClient - Integration Tests', () => {
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

  it('completes end-to-end flow from creation to fetching', async () => {
    const mockResults = [
      {
        id: 1,
        prototypeNm: 'Prototype 1',
        summary: 'Description 1',
        mainImageUrl: 'https://example.com/1.jpg',
        createDate: '2023-01-01 00:00:00.0',
        updateDate: '2023-01-01 00:00:00.0',
        teamNm: 'Team 1',
      },
    ];

    const clientInstance = {
      listPrototypes: vi.fn().mockResolvedValue({ results: mockResults }),
    };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    const client = new ProtopediaApiCustomClient({
      protoPediaApiClientOptions: { token: 'test-token' },
      logger: mockLogger,
      logLevel: 'info',
    });

    const result = await client.fetchPrototypes({ offset: 0, limit: 10 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0]!.id).toBe(1);
    }
    expect(mockLogger.info).toHaveBeenCalled();
  });

  it('handles error recovery with retry pattern', async () => {
    const clientInstance = {
      listPrototypes: vi
        .fn()
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({ results: [] }),
    };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    const client = new ProtopediaApiCustomClient({ logger: mockLogger });

    // First call fails
    const result1 = await client.fetchPrototypes({ offset: 0, limit: 10 });
    expect(result1.ok).toBe(false);

    // Second call succeeds
    const result2 = await client.fetchPrototypes({ offset: 0, limit: 10 });
    expect(result2.ok).toBe(true);
  });

  it('maintains independence between client instances', async () => {
    const clientInstance1 = {
      listPrototypes: vi
        .fn()
        .mockResolvedValue({ results: [{ prototype_id: 1 }] }),
    };
    const clientInstance2 = {
      listPrototypes: vi
        .fn()
        .mockResolvedValue({ results: [{ prototype_id: 2 }] }),
    };

    createProtoPediaClientMock
      .mockReturnValueOnce(clientInstance1)
      .mockReturnValueOnce(clientInstance2);

    const client1 = new ProtopediaApiCustomClient();
    const client2 = new ProtopediaApiCustomClient();

    await client1.fetchPrototypes({ offset: 0, limit: 10 });
    await client2.fetchPrototypes({ offset: 0, limit: 10 });

    expect(clientInstance1.listPrototypes).toHaveBeenCalledTimes(1);
    expect(clientInstance2.listPrototypes).toHaveBeenCalledTimes(1);
  });

  it('handles large datasets efficiently', async () => {
    const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      prototypeNm: `Prototype ${i}`,
      summary: `Description ${i}`,
      mainImageUrl: `https://example.com/${i}.jpg`,
      createDate: '2023-01-01 00:00:00.0',
      updateDate: '2023-01-01 00:00:00.0',
      teamNm: `Team ${i}`,
    }));

    const clientInstance = {
      listPrototypes: vi.fn().mockResolvedValue({ results: largeDataset }),
    };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    const client = new ProtopediaApiCustomClient({ logger: mockLogger });
    const result = await client.fetchPrototypes({ offset: 0, limit: 1000 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(1000);
      expect(result.data[999]!.id).toBe(999);
    }
  });

  it('uses both fetchPrototypes and listPrototypes methods', async () => {
    const mockResults = [{ id: 42, prototypeNm: 'Test' }];
    const clientInstance = {
      listPrototypes: vi.fn().mockResolvedValue({ results: mockResults }),
    };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    const client = new ProtopediaApiCustomClient({ logger: mockLogger });

    // Use fetchPrototypes (normalized)
    const normalizedResult = await client.fetchPrototypes({
      offset: 0,
      limit: 10,
    });
    expect(normalizedResult.ok).toBe(true);
    if (normalizedResult.ok) {
      expect(normalizedResult.data[0]!.id).toBe(42);
    }

    // Use listPrototypes (raw)
    const rawResult = await client.listPrototypes({ offset: 0, limit: 10 });
    expect(rawResult.results?.[0]?.id).toBe(42);

    expect(clientInstance.listPrototypes).toHaveBeenCalledTimes(2);
  });
});
