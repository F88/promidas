import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type BuilderModule = typeof import('../../builder.js');
type StoreModule = typeof import('../../store/index.js');

async function importBuilder(): Promise<BuilderModule> {
  vi.resetModules();
  vi.doUnmock('../../store/store.js');
  return await import('../../builder.js');
}

async function importBuilderWithStoreConstructorThrowing(
  getThrown: (storeModule: StoreModule) => unknown,
): Promise<{ builderModule: BuilderModule; storeModule: StoreModule }> {
  vi.resetModules();

  let thrown: unknown;
  vi.doMock('../../store/store.js', () => ({
    PrototypeInMemoryStore: class PrototypeInMemoryStoreMock {
      constructor() {
        throw thrown;
      }
    },
  }));

  const builderModule = await import('../../builder.js');
  const storeModule = await import('../../store/index.js');
  thrown = getThrown(storeModule);
  return { builderModule, storeModule };
}

function captureThrown(fn: () => unknown): unknown {
  try {
    fn();
    throw new Error('Expected function to throw');
  } catch (error) {
    return error;
  }
}

function expectErrorName(error: unknown, errorName: string): void {
  const actualName = (error as { name?: unknown } | null | undefined)?.name;
  expect(actualName).toBe(errorName);
}

describe('PromidasRepositoryBuilder - buildStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    vi.doUnmock('../../store/store.js');
  });

  describe('success cases', () => {
    it('creates store successfully with valid config', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        level: 'info' as const,
      };

      const { PromidasRepositoryBuilder } = await importBuilder();
      const builder = new PromidasRepositoryBuilder().setStoreConfig({
        ttlMs: 60000,
        maxDataSizeBytes: 1024 * 1024,
      });

      const storeConfig = {
        ttlMs: 60000,
        maxDataSizeBytes: 1024 * 1024,
        logger: mockLogger,
      };

      // Access private method for testing
      const store = (builder as any).buildStore(storeConfig, mockLogger);

      expect(store).toBeDefined();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });
  });

  describe('error cases', () => {
    it('logs detailed error with dataState when ConfigurationError occurs', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        level: 'info' as const,
      };

      const { PromidasRepositoryBuilder } = await importBuilder();
      const builder = new PromidasRepositoryBuilder();

      const invalidConfig = {
        ttlMs: 60000,
        maxDataSizeBytes: 100_000_000, // Exceeds 30 MiB limit
        logger: mockLogger,
      };

      const thrown = captureThrown(() => {
        (builder as any).buildStore(invalidConfig, mockLogger);
      });
      expectErrorName(thrown, 'ConfigurationError');

      expect(mockLogger.error).toHaveBeenCalled();

      // Check logged details
      const errorCall = mockLogger.error.mock.calls[0];
      expect(errorCall).toBeDefined();
      expect(errorCall![0]).toBe('Failed to create PrototypeInMemoryStore');
      expect(errorCall![1].error.name).toBe('ConfigurationError');
      expect(errorCall![1].dataState).toBe('UNKNOWN');
    });

    it('logs error without dataState for non-StoreError exceptions', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        level: 'info' as const,
      };

      const { builderModule } = await importBuilderWithStoreConstructorThrowing(
        () => new TypeError('Invalid type'),
      );
      const { PromidasRepositoryBuilder } = builderModule;

      const builder = new PromidasRepositoryBuilder();
      const config = { maxDataSizeBytes: 10_000_000, logger: mockLogger };

      const thrown = captureThrown(() => {
        (builder as any).buildStore(config, mockLogger);
      });
      expectErrorName(thrown, 'TypeError');

      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      const errorCall = mockLogger.error.mock.calls[0];
      expect(errorCall![0]).toBe('Failed to create PrototypeInMemoryStore');
      expect(errorCall![1].error.name).toBe('TypeError');
      expect(errorCall![1].error.message).toBe('Invalid type');
      expect(errorCall![1].dataState).toBeUndefined();
      expect(errorCall![1].dataSizeBytes).toBeUndefined();
      expect(errorCall![1].maxDataSizeBytes).toBeUndefined();
      expect(errorCall![1].cause).toBeUndefined();
    });

    it('does not log when logger.error is not a function', async () => {
      const mockLoggerWithoutError = {
        info: vi.fn(),
        warn: vi.fn(),
        // error is not a function
        error: undefined,
        debug: vi.fn(),
        level: 'info' as const,
      };

      const { PromidasRepositoryBuilder } = await importBuilder();
      const builder = new PromidasRepositoryBuilder();

      const invalidConfig = {
        ttlMs: 60000,
        maxDataSizeBytes: 100_000_000, // Exceeds limit
        logger: mockLoggerWithoutError,
      };

      const thrown = captureThrown(() => {
        (builder as any).buildStore(
          invalidConfig,
          mockLoggerWithoutError as any,
        );
      });
      expectErrorName(thrown, 'ConfigurationError');

      // Should not crash, just skip logging
      expect(mockLoggerWithoutError.error).toBeUndefined();
    });
  });

  describe('error details extraction', () => {
    it('includes dataState for ConfigurationError', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        level: 'info' as const,
      };

      const { PromidasRepositoryBuilder } = await importBuilder();
      const builder = new PromidasRepositoryBuilder();

      const invalidConfig = {
        ttlMs: 60000,
        maxDataSizeBytes: 100_000_000,
        logger: mockLogger,
      };

      const thrown = captureThrown(() => {
        (builder as any).buildStore(invalidConfig, mockLogger);
      });
      expectErrorName(thrown, 'ConfigurationError');

      const errorCall = mockLogger.error.mock.calls[0]?.[1];
      expect(errorCall).toBeDefined();
      expect(errorCall!).toHaveProperty('dataState', 'UNKNOWN');
      expect(errorCall!.error.name).toBe('ConfigurationError');
    });

    it('includes dataState, dataSizeBytes, maxDataSizeBytes for DataSizeExceededError', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        level: 'info' as const,
      };

      const { builderModule, storeModule } =
        await importBuilderWithStoreConstructorThrowing((m) => {
          return new m.DataSizeExceededError(
            'UNCHANGED',
            50_000_000,
            10_000_000,
          );
        });
      const { PromidasRepositoryBuilder } = builderModule;
      const builder = new PromidasRepositoryBuilder();
      const config = { maxDataSizeBytes: 10_000_000, logger: mockLogger };

      const thrown = captureThrown(() => {
        (builder as any).buildStore(config, mockLogger);
      });
      expectErrorName(thrown, 'DataSizeExceededError');

      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      const errorCall = mockLogger.error.mock.calls[0];
      expect(errorCall![0]).toBe('Failed to create PrototypeInMemoryStore');
      expect(errorCall![1].error.name).toBe('DataSizeExceededError');
      expect(errorCall![1].dataState).toBe('UNCHANGED');
      expect(errorCall![1].dataSizeBytes).toBe(50_000_000);
      expect(errorCall![1].maxDataSizeBytes).toBe(10_000_000);
      expect(errorCall![1].cause).toBeUndefined();
    });

    it('includes dataState and cause for SizeEstimationError', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        level: 'info' as const,
      };

      const underlyingError = new Error('Estimation failed');
      const { builderModule } = await importBuilderWithStoreConstructorThrowing(
        (m) => {
          return new m.SizeEstimationError('UNCHANGED', underlyingError);
        },
      );
      const { PromidasRepositoryBuilder } = builderModule;
      const builder = new PromidasRepositoryBuilder();
      const config = { maxDataSizeBytes: 10_000_000, logger: mockLogger };

      const thrown = captureThrown(() => {
        (builder as any).buildStore(config, mockLogger);
      });
      expectErrorName(thrown, 'SizeEstimationError');

      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      const errorCall = mockLogger.error.mock.calls[0];
      // DEBUG: inspect payload shape under ESM mocking

      console.log('SizeEstimationError payload:', errorCall?.[1]);
      expect(errorCall![0]).toBe('Failed to create PrototypeInMemoryStore');
      expect(errorCall![1].error.name).toBe('SizeEstimationError');
      expect(errorCall![1].dataState).toBe('UNCHANGED');
      expect(errorCall![1].cause.name).toBe('Error');
      expect(errorCall![1].cause.message).toBe('Estimation failed');
      expect(errorCall![1].dataSizeBytes).toBeUndefined();
      expect(errorCall![1].maxDataSizeBytes).toBeUndefined();
    });

    it('includes only dataState for generic StoreError', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        level: 'info' as const,
      };

      const { builderModule } = await importBuilderWithStoreConstructorThrowing(
        (m) => {
          return new m.StoreError('Generic store error', 'UNCHANGED');
        },
      );
      const { PromidasRepositoryBuilder } = builderModule;
      const builder = new PromidasRepositoryBuilder();
      const config = { maxDataSizeBytes: 10_000_000, logger: mockLogger };

      const thrown = captureThrown(() => {
        (builder as any).buildStore(config, mockLogger);
      });
      expectErrorName(thrown, 'StoreError');

      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      const errorCall = mockLogger.error.mock.calls[0];
      expect(errorCall![0]).toBe('Failed to create PrototypeInMemoryStore');
      expect(errorCall![1].error.name).toBe('StoreError');
      expect(errorCall![1].dataState).toBe('UNCHANGED');
      expect(errorCall![1].dataSizeBytes).toBeUndefined();
      expect(errorCall![1].maxDataSizeBytes).toBeUndefined();
      expect(errorCall![1].cause).toBeUndefined();
    });
  });

  describe('integration tests via build()', () => {
    it('logs error when build fails with custom logger', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        level: 'info' as const,
      };

      const { PromidasRepositoryBuilder } = await importBuilder();
      const builder = new PromidasRepositoryBuilder()
        .setRepositoryConfig({ logger: mockLogger })
        .setStoreConfig({
          maxDataSizeBytes: 100_000_000, // Exceeds limit
        });

      const thrown = captureThrown(() => builder.build());
      expectErrorName(thrown, 'ConfigurationError');
      expect(mockLogger.error).toHaveBeenCalledTimes(1);

      const errorCall = mockLogger.error.mock.calls[0];
      expect(errorCall).toBeDefined();
      expect(errorCall![0]).toBe('Failed to create PrototypeInMemoryStore');
      expect(errorCall![1].error.name).toBe('ConfigurationError');
      expect(errorCall![1].dataState).toBe('UNKNOWN');
    });

    it('logs error when build fails with independent logger', async () => {
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

      const { PromidasRepositoryBuilder } = await importBuilder();
      const builder = new PromidasRepositoryBuilder()
        .setApiClientConfig({ logger: mockLogger })
        .setStoreConfig({
          maxDataSizeBytes: 100_000_000, // Exceeds limit
        });

      expect(() => builder.build()).toThrow();

      // Repository's independent logger (ConsoleLogger) should log the error
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const errorCall = consoleErrorSpy.mock.calls[0];
      expect(errorCall).toBeDefined();
      expect(errorCall![0]).toContain(
        'Failed to create PrototypeInMemoryStore',
      );
      expect(errorCall![1].error.name).toBe('ConfigurationError');
      expect(errorCall![1].dataState).toBe('UNKNOWN');

      // apiClient logger should NOT be used for error logging
      expect(mockLogger.error).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('logs error to console when no logger is available', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const { PromidasRepositoryBuilder } = await importBuilder();
      const builder = new PromidasRepositoryBuilder().setStoreConfig({
        maxDataSizeBytes: 100_000_000, // Exceeds limit
      });

      expect(() => builder.build()).toThrow();

      // Console.error should have been called as fallback
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const errorCall = consoleErrorSpy.mock.calls[0];
      expect(errorCall).toBeDefined();
      expect(errorCall![0]).toContain(
        'Failed to create PrototypeInMemoryStore',
      );
      expect(errorCall![1].error.name).toBe('ConfigurationError');
      expect(errorCall![1].dataState).toBe('UNKNOWN');

      consoleErrorSpy.mockRestore();
    });

    it('does not log error when logger.error is not a function via build()', async () => {
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

      const { PromidasRepositoryBuilder } = await importBuilder();
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
});
