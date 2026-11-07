import { createProtoPediaClient } from 'protopedia-api-v2-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProtopediaApiCustomClient } from '../../../../client/protopedia-api-custom-client.js';

vi.mock('protopedia-api-v2-client', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('protopedia-api-v2-client')>();
  return {
    ...actual,
    createProtoPediaClient: vi.fn(),
  };
});

describe('ProtopediaApiCustomClient - Constructor - User-Agent', () => {
  const createProtoPediaClientMock =
    createProtoPediaClient as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createProtoPediaClientMock.mockReset();
    createProtoPediaClientMock.mockReturnValue({ listPrototypes: vi.fn() });
  });

  it('does not pass userAgent by default', () => {
    new ProtopediaApiCustomClient({
      protoPediaApiClientOptions: {
        token: 'test-token',
      },
    });

    const callArgs = createProtoPediaClientMock.mock.calls[0]?.[0];
    expect(callArgs).toBeDefined();
    expect(callArgs).not.toHaveProperty('userAgent');
  });

  it('passes userAgent when the caller specifies it', () => {
    new ProtopediaApiCustomClient({
      protoPediaApiClientOptions: {
        token: 'test-token',
        userAgent: 'MyApp/1.0.0',
      },
    });

    expect(createProtoPediaClientMock).toHaveBeenCalledWith(
      expect.objectContaining({ userAgent: 'MyApp/1.0.0' }),
    );
  });
});
