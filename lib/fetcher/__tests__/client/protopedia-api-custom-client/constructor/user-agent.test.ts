import { createProtoPediaClient } from 'protopedia-api-v2-client';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { VERSION } from '../../../../../version.js';
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
  });

  it('sets default User-Agent with version when not provided', () => {
    const clientInstance = { listPrototypes: vi.fn() };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    new ProtopediaApiCustomClient({
      protoPediaApiClientOptions: {
        token: 'test-token',
      },
    });

    expect(createProtoPediaClientMock).toHaveBeenCalledWith({
      token: 'test-token',
      userAgent: `ProtopediaApiCustomClient/${VERSION} (promidas)`,
    });
  });

  it('preserves custom User-Agent when explicitly provided', () => {
    const customUserAgent = 'MyApp/1.0.0 (custom-client)';
    const clientInstance = { listPrototypes: vi.fn() };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    new ProtopediaApiCustomClient({
      protoPediaApiClientOptions: {
        token: 'test-token',
        userAgent: customUserAgent,
      },
    });

    expect(createProtoPediaClientMock).toHaveBeenCalledWith({
      token: 'test-token',
      userAgent: customUserAgent,
    });
  });

  it('sets default User-Agent even with no config', () => {
    const clientInstance = { listPrototypes: vi.fn() };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    new ProtopediaApiCustomClient();

    expect(createProtoPediaClientMock).toHaveBeenCalledWith({
      userAgent: `ProtopediaApiCustomClient/${VERSION} (promidas)`,
    });
  });

  it('User-Agent format includes version and promidas identifier', () => {
    const clientInstance = { listPrototypes: vi.fn() };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    new ProtopediaApiCustomClient();

    expect(createProtoPediaClientMock).toHaveBeenCalledTimes(1);
    const callArgs = createProtoPediaClientMock.mock.calls[0]?.[0];
    expect(callArgs).toBeDefined();
    expect(callArgs?.userAgent).toMatch(
      /^ProtopediaApiCustomClient\/\d+\.\d+\.\d+ \(promidas\)$/,
    );
  });
});
