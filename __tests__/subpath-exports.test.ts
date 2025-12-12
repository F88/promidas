/**
 * @file Subpath Exports Integration Test
 *
 * @description
 * Verifies that all package.json subpath exports resolve correctly and export expected symbols.
 * This test ensures that users can import from subpaths like @f88/promidas/fetcher, etc.
 *
 * @see {@link ../package.json} - exports field configuration
 */

import { describe, it, expect } from 'vitest';

describe('subpath exports', () => {
  describe('@f88/promidas (root)', () => {
    it('should export Repository module only', async () => {
      const root = await import('@f88/promidas');

      // Should export Repository factory and types
      expect(root).toHaveProperty('createProtopediaInMemoryRepository');
      expect(typeof root.createProtopediaInMemoryRepository).toBe('function');

      // Should NOT export other modules (breaking change in v0)
      expect(root).not.toHaveProperty('fetchAndNormalizePrototypes');
      expect(root).not.toHaveProperty('createConsoleLogger');
      expect(root).not.toHaveProperty('parseProtoPediaTimestamp');
    });
  });

  describe('@f88/promidas/types', () => {
    it('should export type definitions (type-only module)', async () => {
      const types = await import('@f88/promidas/types');

      // Note: types module exports only TypeScript types (no runtime exports)
      // This test verifies the module can be imported without errors
      expect(types).toBeDefined();
    });
  });

  describe('@f88/promidas/utils', () => {
    it('should export utility functions', async () => {
      const utils = await import('@f88/promidas/utils');

      // Time utilities
      expect(utils).toHaveProperty('parseProtoPediaTimestamp');
      expect(typeof utils.parseProtoPediaTimestamp).toBe('function');

      expect(utils).toHaveProperty('parseW3cDtfTimestamp');
      expect(typeof utils.parseW3cDtfTimestamp).toBe('function');

      expect(utils).toHaveProperty('JST_OFFSET_MS');
      expect(typeof utils.JST_OFFSET_MS).toBe('number');

      // Label converters
      expect(utils).toHaveProperty('getPrototypeStatusLabel');
      expect(typeof utils.getPrototypeStatusLabel).toBe('function');

      expect(utils).toHaveProperty('getPrototypeLicenseTypeLabel');
      expect(typeof utils.getPrototypeLicenseTypeLabel).toBe('function');

      expect(utils).toHaveProperty('getPrototypeReleaseFlagLabel');
      expect(typeof utils.getPrototypeReleaseFlagLabel).toBe('function');

      expect(utils).toHaveProperty('getPrototypeThanksFlagLabel');
      expect(typeof utils.getPrototypeThanksFlagLabel).toBe('function');
    });
  });

  describe('@f88/promidas/logger', () => {
    it('should export logger factories', async () => {
      const logger = await import('@f88/promidas/logger');

      expect(logger).toHaveProperty('createConsoleLogger');
      expect(typeof logger.createConsoleLogger).toBe('function');

      expect(logger).toHaveProperty('createNoopLogger');
      expect(typeof logger.createNoopLogger).toBe('function');

      // Verify createConsoleLogger works
      const instance = logger.createConsoleLogger();
      expect(instance).toHaveProperty('info');
      expect(instance).toHaveProperty('warn');
      expect(instance).toHaveProperty('error');
    });
  });

  describe('@f88/promidas/fetcher', () => {
    it('should export fetcher functions and types', async () => {
      const fetcher = await import('@f88/promidas/fetcher');

      // Main functions
      expect(fetcher).toHaveProperty('fetchAndNormalizePrototypes');
      expect(typeof fetcher.fetchAndNormalizePrototypes).toBe('function');

      expect(fetcher).toHaveProperty('normalizePrototype');
      expect(typeof fetcher.normalizePrototype).toBe('function');

      expect(fetcher).toHaveProperty('normalizeProtoPediaTimestamp');
      expect(typeof fetcher.normalizeProtoPediaTimestamp).toBe('function');

      // Utilities
      expect(fetcher).toHaveProperty('splitPipeSeparatedString');
      expect(typeof fetcher.splitPipeSeparatedString).toBe('function');

      // API client factory
      expect(fetcher).toHaveProperty('createProtopediaApiCustomClient');
      expect(typeof fetcher.createProtopediaApiCustomClient).toBe('function');

      // Error handling utilities
      expect(fetcher).toHaveProperty('constructDisplayMessage');
      expect(typeof fetcher.constructDisplayMessage).toBe('function');

      expect(fetcher).toHaveProperty('resolveErrorMessage');
      expect(typeof fetcher.resolveErrorMessage).toBe('function');
    });
  });

  describe('@f88/promidas/store', () => {
    it('should export Store class', async () => {
      const store = await import('@f88/promidas/store');

      expect(store).toHaveProperty('PrototypeInMemoryStore');
      expect(typeof store.PrototypeInMemoryStore).toBe('function');

      // Verify Store can be instantiated
      const instance = new store.PrototypeInMemoryStore();
      expect(instance).toHaveProperty('setAll');
      expect(instance).toHaveProperty('getAll');
      expect(instance).toHaveProperty('getByPrototypeId');
    });
  });

  describe('@f88/promidas/repository', () => {
    it('should export repository factory', async () => {
      const repository = await import('@f88/promidas/repository');

      expect(repository).toHaveProperty('createProtopediaInMemoryRepository');
      expect(typeof repository.createProtopediaInMemoryRepository).toBe(
        'function',
      );

      // Note: Actual instantiation requires PROTOPEDIA_API_V2_TOKEN
      // So we only verify the factory exists and is callable
    });
  });

  describe('integration: root vs subpath exports', () => {
    it('should provide same Repository from root and subpath', async () => {
      const root = await import('@f88/promidas');
      const repository = await import('@f88/promidas/repository');

      // Same factory function
      expect(root.createProtopediaInMemoryRepository).toBe(
        repository.createProtopediaInMemoryRepository,
      );
    });

    it('should allow using multiple subpaths together', async () => {
      const utils = await import('@f88/promidas/utils');
      const fetcher = await import('@f88/promidas/fetcher');
      const repository = await import('@f88/promidas/repository');

      // All modules are independent and functional
      expect(utils.parseProtoPediaTimestamp).toBeDefined();
      expect(fetcher.fetchAndNormalizePrototypes).toBeDefined();
      expect(repository.createProtopediaInMemoryRepository).toBeDefined();
    });
  });
});
