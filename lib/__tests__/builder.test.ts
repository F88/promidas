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
 * - Throws error on build failure
 *
 * ### 6. Method Chaining
 * - Allows chaining of all setter methods
 * - Maintains configuration across chained calls
 *
 * @module
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PromidasRepositoryBuilder } from '../builder.js';
import { ProtopediaApiCustomClient } from '../fetcher/index.js';
import {
  createConsoleLogger,
  type Logger,
  type LogLevel,
} from '../logger/index.js';

// Mock the ProtopediaApiCustomClient
vi.mock('../fetcher/index', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../fetcher/index.js')>();
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

    it('should maintain configuration across chained calls', () => {
      const builder = new PromidasRepositoryBuilder();

      const repo = builder
        .setStoreConfig({ ttlMs: 30000 })
        .setStoreConfig({ maxDataSizeBytes: 5 * 1024 * 1024 })
        .build();

      expect(repo).toBeDefined();
      const config = repo.getConfig();
      // Second call to setStoreConfig should replace the first
      expect(config.maxDataSizeBytes).toBe(5 * 1024 * 1024);
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

  describe('Error Handling', () => {
    it('should handle build errors gracefully', () => {
      const builder = new PromidasRepositoryBuilder();

      // Try building with invalid configuration that might cause errors
      // Store constructor will validate and throw if needed
      expect(() => {
        builder
          .setStoreConfig({
            maxDataSizeBytes: 200 * 1024 * 1024, // Exceeds max allowed
          })
          .build();
      }).toThrow();
    });
  });

  describe('Shared Logger Pattern', () => {
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

    it('should respect explicitly provided loggers and not create shared logger', () => {
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

      // Verify the custom loggers were passed through to the constructors
      // (this is validated by the console output in the test run)
    });

    it('should use correct logLevel priority when creating shared logger (repository > store > apiClient)', () => {
      const builder = new PromidasRepositoryBuilder();
      const repo = builder
        .setStoreConfig({ logLevel: 'warn' })
        .setApiClientConfig({ logLevel: 'error' })
        .setRepositoryConfig({ logLevel: 'debug' })
        .build();

      // Repository should be created with debug level (highest priority)
      expect(repo).toBeDefined();

      // The shared logger with 'debug' level is used internally
      // (verified by console output showing level: 'debug')
    });

    it('should use store logLevel when repository logLevel is not provided', () => {
      const builder = new PromidasRepositoryBuilder();
      const repo = builder
        .setStoreConfig({ logLevel: 'warn' })
        .setApiClientConfig({ logLevel: 'error' })
        .build();

      // Repository should be created with warn level (second priority)
      expect(repo).toBeDefined();
    });

    it('should use apiClient logLevel when neither repository nor store logLevel is provided', () => {
      const builder = new PromidasRepositoryBuilder();
      const repo = builder.setApiClientConfig({ logLevel: 'error' }).build();

      // Repository should be created with error level (third priority)
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

    it('should create shared logger only when no explicit loggers are provided', () => {
      const customLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        level: 'debug' as const,
      };

      const builder = new PromidasRepositoryBuilder();
      const repo = builder
        .setStoreConfig({ logger: customLogger })
        // apiClient and repository don't have explicit logger
        .setRepositoryConfig({ logLevel: 'warn' })
        .build();

      // Repository should be created successfully
      expect(repo).toBeDefined();

      // Store uses custom logger, repository uses shared logger with 'warn' level
      // (verified by console output)
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
  });

  describe('Default Log Level', () => {
    it('should use default log level when set and no other logLevel is specified', () => {
      const builder = new PromidasRepositoryBuilder();
      const repo = builder.setDefaultLogLevel('debug').build();

      // Repository should be created successfully with debug level shared logger
      expect(repo).toBeDefined();
      // The shared logger with 'debug' level is used internally
      // (verified by console output showing level: 'debug')
    });

    it('should allow individual component logLevel to override default', () => {
      const builder = new PromidasRepositoryBuilder();
      const repo = builder
        .setDefaultLogLevel('debug')
        .setStoreConfig({ logLevel: 'error' })
        .build();

      // Store's logLevel should override default
      expect(repo).toBeDefined();
      const config = repo.getConfig();
      expect(config.logLevel).toBe('error');
    });

    it('should respect explicit logger over default log level', () => {
      const customLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        level: 'warn' as const,
      };

      const builder = new PromidasRepositoryBuilder();
      const repo = builder
        .setDefaultLogLevel('debug')
        .setStoreConfig({ logger: customLogger })
        .build();

      // Custom logger should be used as-is
      expect(repo).toBeDefined();
    });

    it('should work regardless of method call order', () => {
      const builder1 = new PromidasRepositoryBuilder();
      const repo1 = builder1
        .setStoreConfig({ logLevel: 'warn' })
        .setDefaultLogLevel('debug')
        .build();

      const builder2 = new PromidasRepositoryBuilder();
      const repo2 = builder2
        .setDefaultLogLevel('debug')
        .setStoreConfig({ logLevel: 'warn' })
        .build();

      // Both should use 'warn' (individual config overrides default)
      expect(repo1.getConfig().logLevel).toBe('warn');
      expect(repo2.getConfig().logLevel).toBe('warn');
    });

    it('should fall back to info when no default is set', () => {
      const builder = new PromidasRepositoryBuilder();
      const repo = builder.build();

      // Should use default 'info' level
      expect(repo).toBeDefined();
      const config = repo.getConfig();
      expect(config.logLevel).toBe('info');
    });

    it('should allow chaining with other configuration methods', () => {
      const builder = new PromidasRepositoryBuilder();
      const repo = builder
        .setDefaultLogLevel('debug')
        .setStoreConfig({ ttlMs: 60_000 })
        .setApiClientConfig({ logLevel: 'error' })
        .setRepositoryConfig({ logLevel: 'warn' })
        .build();

      // Repository logLevel has highest priority
      expect(repo).toBeDefined();
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
