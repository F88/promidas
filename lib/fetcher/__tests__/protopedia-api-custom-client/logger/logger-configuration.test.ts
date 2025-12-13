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

describe('ProtopediaApiCustomClient - Logger Configuration', () => {
  const createProtoPediaClientMock =
    createProtoPediaClient as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createProtoPediaClientMock.mockReset();
  });

  it('accepts custom logger instance', () => {
    const clientInstance = { listPrototypes: vi.fn() };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    const customLogger: Logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const client = new ProtopediaApiCustomClient({
      logger: customLogger,
    });

    expect(client).toBeInstanceOf(ProtopediaApiCustomClient);
  });

  it('accepts logLevel configuration', () => {
    const clientInstance = { listPrototypes: vi.fn() };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    const client = new ProtopediaApiCustomClient({
      logLevel: 'debug',
    });

    expect(client).toBeInstanceOf(ProtopediaApiCustomClient);
  });

  it('accepts both logger and logLevel', () => {
    const clientInstance = { listPrototypes: vi.fn() };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    const customLogger: Logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const client = new ProtopediaApiCustomClient({
      logger: customLogger,
      logLevel: 'warn',
    });

    expect(client).toBeInstanceOf(ProtopediaApiCustomClient);
  });

  it('uses default console logger when no logger provided', () => {
    const clientInstance = { listPrototypes: vi.fn() };
    createProtoPediaClientMock.mockReturnValue(clientInstance);

    const client = new ProtopediaApiCustomClient();

    expect(client).toBeInstanceOf(ProtopediaApiCustomClient);
  });
});
