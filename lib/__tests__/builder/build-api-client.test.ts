import { describe, expect, it, vi, beforeEach } from 'vitest';

import { PromidasRepositoryBuilder } from '../../builder.js';

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
});
