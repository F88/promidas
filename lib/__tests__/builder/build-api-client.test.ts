import { describe, expect, it, vi, beforeEach } from 'vitest';

import { PromidasRepositoryBuilder } from '../../builder.js';

vi.mock('../../fetcher/index', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../fetcher/index.js')>();

  return {
    ...actual,
    ProtopediaApiCustomClient: vi.fn(function (this: any, config: any) {
      if (config?.protoPediaApiClientOptions?.token === 'throw') {
        throw new Error('API client construction failed');
      }

      this.listPrototypes = vi.fn();
    }),
  };
});

describe('PromidasRepositoryBuilder - buildApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('success cases', () => {
    it('creates API client successfully with valid config', () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        level: 'info' as const,
      };

      const builder = new PromidasRepositoryBuilder().setApiClientConfig({
        protoPediaApiClientOptions: {
          token: 'test-token',
        },
      });

      const apiClientConfig = {
        protoPediaApiClientOptions: {
          token: 'test-token',
        },
        logger: mockLogger,
      };

      // Access private method for testing
      const apiClient = (builder as any).buildApiClient(
        apiClientConfig,
        mockLogger,
      );

      expect(apiClient).toBeDefined();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('creates API client successfully with token from config', () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        level: 'info' as const,
      };

      const builder = new PromidasRepositoryBuilder();

      const apiClientConfig = {
        protoPediaApiClientOptions: {
          token: 'test-config-token',
        },
        logger: mockLogger,
      };

      // Access private method for testing
      const apiClient = (builder as any).buildApiClient(
        apiClientConfig,
        mockLogger,
      );

      expect(apiClient).toBeDefined();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('logs and re-throws when API client construction fails', () => {
      const repositoryLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        level: 'info' as const,
      };

      const builder = new PromidasRepositoryBuilder().setApiClientConfig({
        protoPediaApiClientOptions: {
          token: 'throw',
        },
      });

      const apiClientConfig = {
        protoPediaApiClientOptions: {
          token: 'throw',
        },
        logger: repositoryLogger,
      };

      expect(() =>
        (builder as any).buildApiClient(apiClientConfig, repositoryLogger),
      ).toThrow('API client construction failed');
      expect(repositoryLogger.error).toHaveBeenCalledWith(
        'Failed to create ProtopediaApiCustomClient',
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

      const builder = new PromidasRepositoryBuilder().setApiClientConfig({
        protoPediaApiClientOptions: {
          token: 'throw',
        },
      });

      const apiClientConfig = {
        protoPediaApiClientOptions: {
          token: 'throw',
        },
        logger: repositoryLogger as any,
      };

      expect(() =>
        (builder as any).buildApiClient(
          apiClientConfig,
          repositoryLogger as any,
        ),
      ).toThrow('API client construction failed');
    });
  });
});
