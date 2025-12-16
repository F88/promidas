import { describe, expect, it, vi, beforeEach } from 'vitest';

import { PromidasRepositoryBuilder } from '../../builder.js';

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

  it('logs error when build fails with independent logger', () => {
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      level: 'info' as const,
    };

    // Spy on console.error since store creates its own ConsoleLogger
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const builder = new PromidasRepositoryBuilder()
      .setApiClientConfig({ logger: mockLogger })
      .setStoreConfig({
        maxDataSizeBytes: 100_000_000, // Exceeds limit
      });

    expect(() => builder.build()).toThrow();

    // Repository's independent logger (ConsoleLogger) should log the error
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to build ProtopediaInMemoryRepository',
      expect.objectContaining({
        error: expect.any(Object),
      }),
    );

    // apiClient logger should NOT be used for error logging
    expect(mockLogger.error).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
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

  it('does not log error when logger.error is not a function', () => {
    const mockLoggerWithoutError = {
      info: vi.fn(),
      warn: vi.fn(),
      // error is not a function
      error: undefined,
      debug: vi.fn(),
      level: 'info' as const,
    };

    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const builder = new PromidasRepositoryBuilder()
      .setRepositoryConfig({ logger: mockLoggerWithoutError as any })
      .setStoreConfig({
        maxDataSizeBytes: 100_000_000, // Exceeds limit
      });

    expect(() => builder.build()).toThrow();

    // Logger's error should not be called (it's not a function)
    expect(mockLoggerWithoutError.error).toBeUndefined();

    // Console.error should not be used either (logger exists but error is not a function)
    expect(consoleErrorSpy).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
