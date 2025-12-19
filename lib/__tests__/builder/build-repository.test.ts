import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createNoopLogger } from '../../logger/index.js';

vi.mock('../../fetcher/index', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../fetcher/index.js')>();

  return {
    ...actual,
    ProtopediaApiCustomClient: vi.fn(function (this: any) {
      this.fetchPrototypes = vi.fn();
      this.listPrototypes = vi.fn();
    }),
  };
});

vi.mock('../../repository/protopedia-in-memory-repository.js', async () => {
  class ProtopediaInMemoryRepositoryImpl {
    constructor(params: any) {
      if (params?.repositoryConfig?.__testThrow === true) {
        throw new Error('Repository construction failed');
      }
    }
  }

  return {
    ProtopediaInMemoryRepositoryImpl,
  };
});

import { PromidasRepositoryBuilder } from '../../builder.js';

describe('PromidasRepositoryBuilder - repository construction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logs and re-throws when repository construction fails', () => {
    const repositoryLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      level: 'info' as const,
    };

    const noopLogger = createNoopLogger();

    const builder = new PromidasRepositoryBuilder()
      .setStoreConfig({ logger: noopLogger })
      .setApiClientConfig({
        protoPediaApiClientOptions: { token: 'test-token' },
        logger: noopLogger,
      })
      .setRepositoryConfig({
        logger: repositoryLogger as any,
        __testThrow: true,
      } as any);

    expect(() => builder.build()).toThrow('Repository construction failed');
    expect(repositoryLogger.error).toHaveBeenCalledWith(
      'Failed to create ProtopediaInMemoryRepositoryImpl',
      expect.anything(),
    );
  });

  it('re-throws without logging when logger.error is not a function', () => {
    const repositoryLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: null,
      debug: vi.fn(),
      level: 'info' as const,
    };

    const noopLogger = createNoopLogger();

    const builder = new PromidasRepositoryBuilder()
      .setStoreConfig({ logger: noopLogger })
      .setApiClientConfig({
        protoPediaApiClientOptions: { token: 'test-token' },
        logger: noopLogger,
      })
      .setRepositoryConfig({
        logger: repositoryLogger as any,
        __testThrow: true,
      } as any);

    expect(() => builder.build()).toThrow('Repository construction failed');
  });
});
