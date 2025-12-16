/**
 * @file Subpath Exports Integration Test
 *
 * @description
 * Verifies that all package.json subpath exports resolve correctly and export expected symbols.
 * This test ensures that users can import from subpaths like @f88/promidas/fetcher, etc.
 *
 * @see {@link ../package.json} - exports field configuration
 */

import { describe, it, expect, beforeAll } from 'vitest';

describe('subpath exports', () => {
  beforeAll(() => {
    console.log('\n');
    console.log(
      '═══════════════════════════════════════════════════════════════',
    );
    console.log('  📦 Subpath Exports Integration Test');
    console.log(
      '═══════════════════════════════════════════════════════════════',
    );
    console.log('');
    console.log('🎯 PURPOSE:');
    console.log(
      '  This test validates that package.json subpath exports match',
    );
    console.log('  the actual exports in lib/*/index.ts files.');
    console.log('');
    console.log('⚠️  IMPORTANT:');
    console.log('  When you modify exports in lib/*/index.ts, you MUST update');
    console.log(
      '  this test accordingly. This is not just a "pass/fail" test,',
    );
    console.log('  but a specification of the public API contract.');
    console.log('');
    console.log('📋 EXPECTED EXPORTS BY MODULE:');
    console.log('');
    console.log('  • @f88/promidas/types');
    console.log(
      '    ✓ StatusCode, ReleaseFlagCode, LicenseTypeCode, ThanksFlagCode (type-only)',
    );
    console.log('    ✓ NormalizedPrototype (type-only)');
    console.log('    ℹ All exports are type-only, no runtime values');
    console.log('');
    console.log('  • @f88/promidas/utils');
    console.log('    ✓ Converter functions (getPrototype*Label)');
    console.log(
      '    ✓ Time parsers (parseProtoPediaTimestamp, parseW3cDtfTimestamp)',
    );
    console.log('    ✗ Code types (moved to @f88/promidas/types)');
    console.log('');
    console.log('  • @f88/promidas/logger');
    console.log('    ✓ Logger, LogLevel (types)');
    console.log('    ✓ createConsoleLogger, createNoopLogger (factories)');
    console.log('');
    console.log('  • @f88/promidas/fetcher');
    console.log('    ✓ fetchAndNormalizePrototypes, normalizePrototype');
    console.log(
      '    ✓ NormalizedPrototype, Logger, LogLevel (re-exported for convenience)',
    );
    console.log('');
    console.log('  • @f88/promidas/store');
    console.log('    ✓ PrototypeInMemoryStore (class)');
    console.log(
      '    ✓ NormalizedPrototype, Logger, LogLevel (re-exported for convenience)',
    );
    console.log('');
    console.log('  • @f88/promidas/repository');
    console.log('    ✓ createPromidasRepository (factory)');
    console.log(
      '    ✓ NormalizedPrototype, Logger, LogLevel (re-exported for convenience)',
    );
    console.log('');
    console.log(
      '═══════════════════════════════════════════════════════════════',
    );
    console.log('\n');
  });

  describe('@f88/promidas (root)', () => {
    it('should export factory functions and Builder', async () => {
      const root = await import('@f88/promidas');

      // Should export beginner-friendly factory functions
      expect(root).toHaveProperty('createPromidasForLocal');
      expect(typeof root.createPromidasForLocal).toBe('function');
      expect(root).toHaveProperty('createPromidasForServer');
      expect(typeof root.createPromidasForServer).toBe('function');

      // Should export Builder class for advanced usage
      expect(root).toHaveProperty('PromidasRepositoryBuilder');
      expect(typeof root.PromidasRepositoryBuilder).toBe('function');

      // Should NOT export low-level modules directly
      expect(root).not.toHaveProperty('fetchAndNormalizePrototypes');
      expect(root).not.toHaveProperty('createConsoleLogger');
      expect(root).not.toHaveProperty('parseProtoPediaTimestamp');
    });
  });

  describe('@f88/promidas/types', () => {
    it('should export type definitions (type-only module)', async () => {
      const types = await import('@f88/promidas/types');

      // Note: All exports are type-only (no runtime values)
      // NormalizedPrototype, StatusCode, ReleaseFlagCode, LicenseTypeCode, ThanksFlagCode
      // are all exported as `export type`, so they don't exist at runtime

      // This test verifies the module can be imported without errors
      // The actual type checking happens at compile time, not runtime
      expect(types).toBeDefined();

      // Since all exports are type-only, the module should be essentially empty at runtime
      // (or contain only Symbol.toStringTag from module system)
      const runtimeKeys = Object.keys(types);
      expect(runtimeKeys.length).toBe(0);
    });
  });

  describe('@f88/promidas/utils', () => {
    it('should export utility functions only (no types)', async () => {
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

      // Should NOT export code types (breaking change: removed in refactor)
      // Import from @f88/promidas/types instead
      expect(utils).not.toHaveProperty('StatusCode');
      expect(utils).not.toHaveProperty('ReleaseFlagCode');
      expect(utils).not.toHaveProperty('LicenseTypeCode');
      expect(utils).not.toHaveProperty('ThanksFlagCode');
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
    it('should export fetcher class', async () => {
      const fetcher = await import('@f88/promidas/fetcher');

      // API client class
      expect(fetcher).toHaveProperty('ProtopediaApiCustomClient');
      expect(typeof fetcher.ProtopediaApiCustomClient).toBe('function');

      // Utility function
      expect(fetcher).toHaveProperty('normalizePrototype');
      expect(typeof fetcher.normalizePrototype).toBe('function');

      // Re-exported types for convenience (NormalizedPrototype is type-only)
      // Logger and LogLevel are also type-only exports
      // Note: Type-only exports don't have runtime values, so we can't test them here
    });
  });

  describe('@f88/promidas/store', () => {
    it('should export Store class and re-exported types', async () => {
      const store = await import('@f88/promidas/store');

      expect(store).toHaveProperty('PrototypeInMemoryStore');
      expect(typeof store.PrototypeInMemoryStore).toBe('function');

      // Verify Store can be instantiated
      const instance = new store.PrototypeInMemoryStore();
      expect(instance).toHaveProperty('setAll');
      expect(instance).toHaveProperty('getAll');
      expect(instance).toHaveProperty('getByPrototypeId');

      // Re-exported types for convenience (NormalizedPrototype, Logger, LogLevel)
      // Note: These are type-only exports, so no runtime values to test
      // Users can import types like: import type { NormalizedPrototype } from '@f88/promidas/store'
    });
  });

  describe('@f88/promidas/repository', () => {
    it('should export repository types', async () => {
      const repository = await import('@f88/promidas/repository');

      // Repository module exports types only (no factory function in current implementation)
      // The factory function was moved to the Builder pattern in main module
      // This module provides type definitions for use with Builder
      // Note: Type-only exports don't have runtime values to test

      // Verify the module loads without errors
      expect(repository).toBeDefined();
    });
  });

  describe('integration: root vs subpath exports', () => {
    it('should provide Builder from root', async () => {
      const root = await import('@f88/promidas');

      // Builder in root
      expect(root.PromidasRepositoryBuilder).toBeDefined();
      expect(typeof root.PromidasRepositoryBuilder).toBe('function');
    });

    it('should allow using multiple subpaths together', async () => {
      const utils = await import('@f88/promidas/utils');
      const fetcher = await import('@f88/promidas/fetcher');

      // All modules are independent and functional
      expect(utils.parseProtoPediaTimestamp).toBeDefined();
      expect(fetcher.ProtopediaApiCustomClient).toBeDefined();
    });
  });
});
