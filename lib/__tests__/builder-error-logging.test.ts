import { describe, expect, it, vi, beforeEach } from 'vitest';

import { PromidasRepositoryBuilder } from '../builder.js';

describe('PromidasRepositoryBuilder - Error Logging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logs error when build fails with custom logger', () => {
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      level: 'info' as const,
    };

    const builder = new PromidasRepositoryBuilder()
      .setRepositoryConfig({ logger: mockLogger })
      .setStoreConfig({
        maxDataSizeBytes: 100_000_000, // Exceeds limit
      });

    expect(() => builder.build()).toThrow();
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed to build ProtopediaInMemoryRepository',
      expect.objectContaining({
        error: expect.any(Object),
      }),
    );
  });

  it.skip('logs error when build fails with shared logger', () => {
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      level: 'info' as const,
    };

    const builder = new PromidasRepositoryBuilder()
      .setDefaultLogLevel('debug')
      .setApiClientConfig({ logger: mockLogger })
      .setStoreConfig({
        maxDataSizeBytes: 100_000_000, // Exceeds limit
      });

    expect(() => builder.build()).toThrow();
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed to build ProtopediaInMemoryRepository',
      expect.objectContaining({
        error: expect.any(Object),
      }),
    );
  });

  it('logs error to console when no logger is available', () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const builder = new PromidasRepositoryBuilder().setStoreConfig({
      maxDataSizeBytes: 100_000_000, // Exceeds limit
    });

    expect(() => builder.build()).toThrow();

    // Console.error should have been called as fallback
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to build ProtopediaInMemoryRepository',
      expect.objectContaining({
        error: expect.any(Object),
      }),
    );

    consoleErrorSpy.mockRestore();
  });
});
