import { createProtoPediaClient } from 'protopedia-api-v2-client';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { Logger } from '../../../../logger/index.js';
import { ProtopediaApiCustomClient } from '../../../client/protopedia-api-custom-client.js';

vi.mock('protopedia-api-v2-client', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('protopedia-api-v2-client')>();
  return {
    ...actual,
    createProtoPediaClient: vi.fn(),
  };
});

describe('ProtopediaApiCustomClient - Methods - fetchPrototypes', () => {
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

  it('returns success result with normalized data', async () => {
    const mockResults = [
      {
        id: 123,
        prototypeNm: 'Test Prototype',
        summary: 'Test description',
        mainImageUrl: 'https://example.com/thumb.jpg',
        createDate: '2023-01-10 08:00:00.0',
        updateDate: '2023-01-12 09:15:00.0',
        teamNm: 'Test Team',
      },
    ];

    const clientInstance = {
      listPrototypes: vi.fn().mockResolvedValue({ results: mockResults }),
    };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    const client = new ProtopediaApiCustomClient({ logger: mockLogger });
    const result = await client.fetchPrototypes({ offset: 0, limit: 10 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0]!.id).toBe(123);
      expect(result.data[0]!.prototypeNm).toBe('Test Prototype');
    }
  });

  it('returns empty array when no results', async () => {
    const clientInstance = {
      listPrototypes: vi.fn().mockResolvedValue({ results: [] }),
    };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    const client = new ProtopediaApiCustomClient({ logger: mockLogger });
    const result = await client.fetchPrototypes({ offset: 0, limit: 10 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(0);
    }
  });

  it('handles undefined results array', async () => {
    const clientInstance = {
      listPrototypes: vi.fn().mockResolvedValue({}),
    };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    const client = new ProtopediaApiCustomClient({ logger: mockLogger });
    const result = await client.fetchPrototypes({ offset: 0, limit: 10 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(0);
    }
  });

  it('passes query parameters to underlying SDK client', async () => {
    const clientInstance = {
      listPrototypes: vi.fn().mockResolvedValue({ results: [] }),
    };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    const client = new ProtopediaApiCustomClient({ logger: mockLogger });
    const params = { offset: 100, limit: 50, prototypeId: 999 };
    await client.fetchPrototypes(params);

    expect(clientInstance.listPrototypes).toHaveBeenCalledWith(params);
  });

  it('handles multiple sequential calls', async () => {
    const clientInstance = {
      listPrototypes: vi
        .fn()
        .mockResolvedValueOnce({ results: [] })
        .mockResolvedValueOnce({ results: [] }),
    };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    const client = new ProtopediaApiCustomClient({ logger: mockLogger });

    const result1 = await client.fetchPrototypes({ offset: 0, limit: 10 });
    const result2 = await client.fetchPrototypes({ offset: 10, limit: 10 });

    expect(result1.ok).toBe(true);
    expect(result2.ok).toBe(true);
    expect(clientInstance.listPrototypes).toHaveBeenCalledTimes(2);
  });

  it('handles concurrent calls', async () => {
    const clientInstance = {
      listPrototypes: vi.fn().mockResolvedValue({ results: [] }),
    };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    const client = new ProtopediaApiCustomClient({ logger: mockLogger });

    const [result1, result2] = await Promise.all([
      client.fetchPrototypes({ offset: 0, limit: 10 }),
      client.fetchPrototypes({ offset: 10, limit: 10 }),
    ]);

    expect(result1.ok).toBe(true);
    expect(result2.ok).toBe(true);
    expect(clientInstance.listPrototypes).toHaveBeenCalledTimes(2);
  });
});
