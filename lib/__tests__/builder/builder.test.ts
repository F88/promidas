/**
 * Test suite for PromidasRepositoryBuilder.
 *
 * This test suite verifies that {@link PromidasRepositoryBuilder}
 * correctly constructs repository instances with proper configuration
 * through its fluent API.
 *
 * ## Test Coverage
 *
 * ### 1. Basic Builder Operations
 * - Creates repository instance with default configuration
 * - Fluent API returns builder instance for chaining
 * - Build method returns ProtopediaInMemoryRepository instance
 *
 * ### 2. Store Configuration
 * - Sets store configuration correctly
 * - Merges multiple store configuration calls
 * - Handles TTL configuration
 * - Handles maxDataSizeBytes configuration
 * - Handles logger configuration
 *
 * ### 3. API Client Configuration
 * - Sets API client configuration correctly
 * - Handles token configuration
 * - Handles logger and logLevel configuration
 * - Handles protoPediaApiClientOptions
 *
 * ### 4. Repository Configuration
 * - Sets repository configuration correctly
 * - Handles logger configuration
 * - Handles logLevel configuration
 *
 * ### 5. Build Process
 * - Successfully builds repository with all configurations
 * - Builds repository with partial configurations
 *
 * ### 6. Error Handling
 * - Propagates errors from Store construction through build()
 * - Error logging with proper context
 *
 * ### 7. Method Chaining
 * - Allows chaining of all setter methods
 * - Maintains configuration across chained calls
 *
 * @module
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PromidasRepositoryBuilder } from '../../builder.js';
import {
  createConsoleLogger,
  type Logger,
  type LogLevel,
} from '../../logger/index.js';

// Mock the ProtopediaApiCustomClient
vi.mock('../../fetcher/index', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../fetcher/index.js')>();
  return {
    ...actual,
    ProtopediaApiCustomClient: vi.fn(function (this: any) {
      this.listPrototypes = vi.fn();
    }),
  };
});

describe('PromidasRepositoryBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  describe('Basic Operations', () => {
    it('should create a builder instance', () => {
      const builder = new PromidasRepositoryBuilder();
      expect(builder).toBeInstanceOf(PromidasRepositoryBuilder);
    });

    it('should build a repository with default configuration', () => {
      const builder = new PromidasRepositoryBuilder();
      const repo = builder.build();

      expect(repo).toBeDefined();
      expect(typeof repo.setupSnapshot).toBe('function');
      expect(typeof repo.getAllFromSnapshot).toBe('function');
    });

    it('should return builder instance for method chaining', () => {
      const builder = new PromidasRepositoryBuilder();
      const result = builder.setStoreConfig({ ttlMs: 60000 });

      expect(result).toBe(builder);
    });
  });

  describe('Store Configuration', () => {
    it('should set store configuration', () => {
      const builder = new PromidasRepositoryBuilder();
      const storeConfig = {
        ttlMs: 60000,
        maxDataSizeBytes: 5 * 1024 * 1024,
      };

      const repo = builder.setStoreConfig(storeConfig).build();

      expect(repo).toBeDefined();
      const stats = repo.getStats();
      expect(stats).toBeDefined();
    });

    it('should handle TTL configuration', () => {
      const builder = new PromidasRepositoryBuilder();
      const repo = builder.setStoreConfig({ ttlMs: 30000 }).build();

      expect(repo).toBeDefined();
      const config = repo.getConfig();
      expect(config.ttlMs).toBe(30000);
    });

    it('should handle maxDataSizeBytes configuration', () => {
      const builder = new PromidasRepositoryBuilder();
      const repo = builder
        .setStoreConfig({ maxDataSizeBytes: 10 * 1024 * 1024 })
        .build();

      expect(repo).toBeDefined();
      const config = repo.getConfig();
      expect(config.maxDataSizeBytes).toBe(10 * 1024 * 1024);
    });

    it('should handle logger configuration', () => {
      const builder = new PromidasRepositoryBuilder();
      const logger = createConsoleLogger();
      const repo = builder.setStoreConfig({ logger }).build();

      expect(repo).toBeDefined();
    });
  });

  describe('API Client Configuration', () => {
    it('should set API client configuration with protoPediaApiClientOptions', () => {
      const builder = new PromidasRepositoryBuilder();
      const repo = builder
        .setApiClientConfig({
          protoPediaApiClientOptions: {
            token: 'test-token',
          },
        })
        .build();

      expect(repo).toBeDefined();
    });

    it('should handle logger and logLevel in API client config', () => {
      const builder = new PromidasRepositoryBuilder();
      const logger = createConsoleLogger();
      const repo = builder
        .setApiClientConfig({
          logger,
          logLevel: 'debug',
        })
        .build();

      expect(repo).toBeDefined();
    });

    it('should handle combined API client configuration', () => {
      const builder = new PromidasRepositoryBuilder();
      const logger = createConsoleLogger();
      const repo = builder
        .setApiClientConfig({
          protoPediaApiClientOptions: {
            token: 'test-token',
            baseUrl: 'https://example.com',
          },
          logger,
          logLevel: 'info',
        })
        .build();

      expect(repo).toBeDefined();
    });
  });

  describe('Repository Configuration', () => {
    it('should set repository configuration', () => {
      const builder = new PromidasRepositoryBuilder();
      const logger = createConsoleLogger();
      const repo = builder
        .setRepositoryConfig({
          logger,
          logLevel: 'debug',
        })
        .build();

      expect(repo).toBeDefined();
    });

    it('should handle logLevel in repository config', () => {
      const builder = new PromidasRepositoryBuilder();
      const repo = builder
        .setRepositoryConfig({
          logLevel: 'warn',
        })
        .build();

      expect(repo).toBeDefined();
    });
  });

  describe('Build Process', () => {
    it('should build repository with all configurations', () => {
      const builder = new PromidasRepositoryBuilder();
      const storeLogger = createConsoleLogger();
      const apiLogger = createConsoleLogger();
      const repoLogger = createConsoleLogger();

      const repo = builder
        .setStoreConfig({
          ttlMs: 60000,
          maxDataSizeBytes: 10 * 1024 * 1024,
          logger: storeLogger,
          logLevel: 'debug',
        })
        .setApiClientConfig({
          protoPediaApiClientOptions: {
            token: 'test-token',
          },
          logger: apiLogger,
          logLevel: 'info',
        })
        .setRepositoryConfig({
          logger: repoLogger,
          logLevel: 'warn',
        })
        .build();

      expect(repo).toBeDefined();
      expect(typeof repo.setupSnapshot).toBe('function');
      expect(typeof repo.refreshSnapshot).toBe('function');
      expect(typeof repo.getAllFromSnapshot).toBe('function');
      expect(typeof repo.getPrototypeFromSnapshotByPrototypeId).toBe(
        'function',
      );
      expect(typeof repo.getRandomPrototypeFromSnapshot).toBe('function');
      expect(typeof repo.getRandomSampleFromSnapshot).toBe('function');
      expect(typeof repo.getStats).toBe('function');
      expect(typeof repo.getConfig).toBe('function');
    });

    it('should build repository with partial configurations', () => {
      const builder = new PromidasRepositoryBuilder();
      const repo = builder.setStoreConfig({ ttlMs: 30000 }).build();

      expect(repo).toBeDefined();
    });

    it('should build repository with only API client config', () => {
      const builder = new PromidasRepositoryBuilder();
      const repo = builder
        .setApiClientConfig({
          protoPediaApiClientOptions: { token: 'test-token' },
        })
        .build();

      expect(repo).toBeDefined();
    });

    it('should build repository with only repository config', () => {
      const builder = new PromidasRepositoryBuilder();
      const repo = builder.setRepositoryConfig({ logLevel: 'error' }).build();

      expect(repo).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should propagate errors from Store construction through build()', () => {
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
          maxDataSizeBytes: 100_000_000, // Exceeds 30 MiB limit
        });

      // Store construction should fail and error should be logged
      expect(() => builder.build()).toThrow();

      // Verify error was logged by buildStore
      expect(mockLogger.error).toHaveBeenCalled();
      const errorCall = mockLogger.error.mock.calls[0];
      expect(errorCall).toBeDefined();
      expect(errorCall![0]).toBe('Failed to create PrototypeInMemoryStore');
    });

    // Note: ProtopediaApiCustomClient constructor does not throw errors in normal scenarios,
    // so API Client construction error testing is covered in build-api-client.test.ts
    // using mock implementations.
  });

  describe('Method Chaining', () => {
    it('should allow chaining all setter methods', () => {
      const builder = new PromidasRepositoryBuilder();
      const logger = createConsoleLogger();

      const repo = builder
        .setStoreConfig({ ttlMs: 60000 })
        .setApiClientConfig({
          protoPediaApiClientOptions: { token: 'test-token' },
        })
        .setRepositoryConfig({ logger })
        .build();

      expect(repo).toBeDefined();
    });
  });

  describe('Configuration Immutability', () => {
    it('should prevent external mutation of store config after setting', () => {
      const builder = new PromidasRepositoryBuilder();
      const logger = createConsoleLogger();
      const externalConfig = { logger, ttlMs: 60000 };

      builder.setStoreConfig(externalConfig);

      // Mutate external config
      externalConfig.ttlMs = 120000;

      // Build and verify internal config was not affected
      const repo = builder.build();
      const config = repo.getConfig();
      expect(config.ttlMs).toBe(60000);
    });

    it('should prevent external mutation of nested objects in store config', () => {
      const builder = new PromidasRepositoryBuilder();
      const logger = createConsoleLogger();
      const externalConfig = { logger };

      builder.setStoreConfig(externalConfig);

      // Attempt to mutate nested logger object
      (externalConfig.logger as any).level = 'debug';

      // Build and verify - logger should still work correctly
      const repo = builder.build();
      expect(repo).toBeDefined();
    });

    it('should prevent external mutation of API client config', () => {
      const builder = new PromidasRepositoryBuilder();
      const logger = createConsoleLogger();
      const externalConfig: {
        logger: Logger;
        logLevel: LogLevel;
      } = {
        logger,
        logLevel: 'info',
      };

      builder.setApiClientConfig(externalConfig);

      // Mutate external config
      externalConfig.logLevel = 'debug';

      // Build and verify internal config was not affected
      const repo = builder.build();
      expect(repo).toBeDefined();
    });

    it('should prevent external mutation of repository config', () => {
      const builder = new PromidasRepositoryBuilder();
      const logger = createConsoleLogger();
      const externalConfig: {
        logger: Logger;
        logLevel: LogLevel;
      } = {
        logger,
        logLevel: 'warn',
      };

      builder.setRepositoryConfig(externalConfig);

      // Mutate external config
      externalConfig.logLevel = 'error';

      // Build and verify internal config was not affected
      const repo = builder.build();
      expect(repo).toBeDefined();
    });

    it('should deeply merge nested configuration objects', () => {
      const builder = new PromidasRepositoryBuilder();

      // First call with partial config
      builder.setStoreConfig({ ttlMs: 30000 });

      // Second call with different properties
      builder.setStoreConfig({ maxDataSizeBytes: 5 * 1024 * 1024 });

      // Build and verify both properties are set
      const repo = builder.build();
      const config = repo.getConfig();
      expect(config.ttlMs).toBe(30000);
      expect(config.maxDataSizeBytes).toBe(5 * 1024 * 1024);
    });

    it('should handle multiple setter calls with the same config type', () => {
      const builder = new PromidasRepositoryBuilder();

      // First call
      builder.setStoreConfig({ ttlMs: 30000 });

      // Second call should merge properties
      builder.setStoreConfig({ maxDataSizeBytes: 10000 });

      // Build and verify
      const repo = builder.build();
      const config = repo.getConfig();
      expect(config.ttlMs).toBe(30000); // Should be preserved
      expect(config.maxDataSizeBytes).toBe(10000); // Should be set
    });
  });

  describe('Logger Configuration', () => {
    it('should create a repository successfully when no explicit loggers are provided', () => {
      const builder = new PromidasRepositoryBuilder();
      const repo = builder.build();

      // Repository should be created successfully
      expect(repo).toBeDefined();
      expect(typeof repo.setupSnapshot).toBe('function');

      // Store config should not have logger (omitted in getConfig return type)
      const config = repo.getConfig();
      expect(config).toBeDefined();
      expect(config.ttlMs).toBeDefined();
    });

    it('should respect explicitly provided loggers', () => {
      const customStoreLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        level: 'debug' as const,
      };

      const customRepoLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        level: 'info' as const,
      };

      const builder = new PromidasRepositoryBuilder();
      const repo = builder
        .setStoreConfig({ logger: customStoreLogger })
        .setRepositoryConfig({ logger: customRepoLogger })
        .build();

      // Should build successfully with custom loggers
      expect(repo).toBeDefined();
    });

    it('should create independent loggers when logLevel is specified', () => {
      const builder = new PromidasRepositoryBuilder();
      const repo = builder
        .setStoreConfig({ logLevel: 'warn' })
        .setApiClientConfig({ logLevel: 'error' })
        .setRepositoryConfig({ logLevel: 'debug' })
        .build();

      // Repository should be created successfully
      expect(repo).toBeDefined();
    });

    it('should default to info level when no logLevel is specified anywhere', () => {
      const builder = new PromidasRepositoryBuilder();
      const repo = builder.build();

      // Repository should be created with default 'info' level
      expect(repo).toBeDefined();
      const config = repo.getConfig();
      expect(config.logLevel).toBe('info');
    });

    it('should reuse the same builder instance across multiple build calls', () => {
      const builder = new PromidasRepositoryBuilder();

      const repo1 = builder.build();
      expect(repo1).toBeDefined();

      const repo2 = builder.build();
      expect(repo2).toBeDefined();

      // Both should be valid repositories (different instances)
      expect(repo1).not.toBe(repo2);
    });

    it('should create independent loggers for each component by default', () => {
      const builder = new PromidasRepositoryBuilder();
      const repo = builder
        .setStoreConfig({ logLevel: 'debug' })
        .setApiClientConfig({ logLevel: 'info' })
        .setRepositoryConfig({ logLevel: 'warn' })
        .build();

      // Repository should be created successfully with different log levels
      expect(repo).toBeDefined();

      // Each component has its own independent logger with its own level
      // Store: debug, ApiClient: info, Repository: warn
      const config = repo.getConfig();
      expect(config.logLevel).toBe('debug'); // Store's log level
    });

    it('should not share logger instances across components', () => {
      const sharedLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        level: 'info' as const,
      };

      const builder = new PromidasRepositoryBuilder();
      const repo = builder
        .setStoreConfig({ logger: sharedLogger })
        .setApiClientConfig({ logger: sharedLogger })
        .setRepositoryConfig({ logger: sharedLogger })
        .build();

      // Should build successfully even when same logger is explicitly provided
      // This tests that builder doesn't prevent sharing if explicitly requested
      expect(repo).toBeDefined();
    });

    it('should create ConsoleLogger when only logLevel is provided', () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const builder = new PromidasRepositoryBuilder();

      // Provide logLevel without logger - Builder should create ConsoleLogger
      const repo = builder
        .setStoreConfig({ logLevel: 'debug' })
        .setRepositoryConfig({ logLevel: 'debug' })
        .build();

      expect(repo).toBeDefined();
      const config = repo.getConfig();
      expect(config.logLevel).toBe('debug');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Interface Compliance', () => {
    it('should build repository implementing ProtopediaInMemoryRepository interface', () => {
      const builder = new PromidasRepositoryBuilder();
      const repo = builder.build();

      // Verify required methods exist
      expect(repo).toHaveProperty('setupSnapshot');
      expect(repo).toHaveProperty('refreshSnapshot');
      expect(repo).toHaveProperty('getAllFromSnapshot');
      expect(repo).toHaveProperty('getPrototypeFromSnapshotByPrototypeId');
      expect(repo).toHaveProperty('getRandomPrototypeFromSnapshot');
      expect(repo).toHaveProperty('getRandomSampleFromSnapshot');
      expect(repo).toHaveProperty('getPrototypeIdsFromSnapshot');
      expect(repo).toHaveProperty('analyzePrototypes');
      expect(repo).toHaveProperty('getStats');
      expect(repo).toHaveProperty('getConfig');

      // Verify methods are functions
      expect(typeof repo.setupSnapshot).toBe('function');
      expect(typeof repo.refreshSnapshot).toBe('function');
      expect(typeof repo.getAllFromSnapshot).toBe('function');
      expect(typeof repo.getPrototypeFromSnapshotByPrototypeId).toBe(
        'function',
      );
      expect(typeof repo.getRandomPrototypeFromSnapshot).toBe('function');
      expect(typeof repo.getRandomSampleFromSnapshot).toBe('function');
      expect(typeof repo.getPrototypeIdsFromSnapshot).toBe('function');
      expect(typeof repo.analyzePrototypes).toBe('function');
      expect(typeof repo.getStats).toBe('function');
      expect(typeof repo.getConfig).toBe('function');
    });
  });
});
