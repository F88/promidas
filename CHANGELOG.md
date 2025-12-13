# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Breaking Changes

- **Logger API Simplification**: Simplified `createConsoleLogger()` to always create loggers with default 'info' level (#32)
    - `createConsoleLogger()` no longer accepts a `level` parameter
    - For specific log levels, use `new ConsoleLogger(level)` directly
    - `ConsoleLogger` class is now exported for direct instantiation
    - This change enforces the separation of logger creation from level configuration, aligning with the Fastify-style pattern used throughout the project
    - Module structure improved: factory functions separated into `factory.ts`, tests split into focused files

    ```typescript
    // Before (v0.7.0 and earlier)
    const logger = createConsoleLogger('debug');

    // After (v0.8.0)
    const logger = new ConsoleLogger('debug');
    // OR use default and change level later
    const logger = createConsoleLogger();
    logger.level = 'debug';
    ```

    **Migration Guide:**
    - Replace `createConsoleLogger('level')` with `new ConsoleLogger('level')`
    - Or use `createConsoleLogger()` and set `logger.level = 'level'` if dynamic
    - When using with Repository/Store, prefer the pattern: `createConsoleLogger()` + `logLevel` option

    **Files Affected:**
    - `lib/logger/console-logger.ts` (renamed from `logger.ts`)
    - `lib/logger/factory.ts` (new - separated factory functions)
    - `lib/logger/__tests__/console-logger.test.ts` (new - class tests)
    - `lib/logger/__tests__/factory.test.ts` (new - factory tests)
    - `lib/logger/__tests__/logger.test.ts` (removed - split into above)

### Added

- **Repository Concurrency Control**: Implemented Promise Coalescing pattern for `setupSnapshot()` and `refreshSnapshot()` to prevent duplicate API requests during concurrent calls (#17)
    - Multiple concurrent calls now share a single in-flight request
    - Comprehensive test coverage with 34 tests including stress testing (100 concurrent calls)
    - No breaking changes to public API

### Improved

- **Logger Configuration Documentation**: Enhanced documentation for logger configuration in `lib/store` (#12)
    - Added Japanese user guide in `README.md`
    - Added English technical documentation in `USAGE.md` and `DESIGN.md`
    - Documented design rationale for logger-only configuration approach
    - Noted current limitations and future considerations

- **Repository Configuration Structure**: Unified repository factory function signature for better consistency (#32)
    - Consolidated all configuration into a single options object
    - Added `ProtopediaInMemoryRepositoryConfig` type for repository-level logging
    - Improved separation of concerns: repositoryConfig, storeConfig, and apiClientOptions
    - Updated documentation (DESIGN.md, USAGE.md) to reflect new patterns
    - All 182 repository tests updated and passing
    - No breaking changes to public API (backward compatible)

## [0.7.0] - 2025-12-13

### Changed

- **Repository Factory API**: Refactored `createProtopediaInMemoryRepository` to use named parameters instead of positional parameters for improved API usability and flexibility

### Breaking Changes

- **`createProtopediaInMemoryRepository` Signature Change**: The factory function now accepts a single options object with named parameters instead of two positional parameters.

    ```typescript
    // Before (v0.6.0)
    const repo = createProtopediaInMemoryRepository(
        { ttlMs: 30000 },
        { token: 'xxx' },
    );

    // After (v0.7.0)
    const repo = createProtopediaInMemoryRepository({
        storeConfig: { ttlMs: 30000 },
        apiClientOptions: { token: 'xxx' },
    });
    ```

    **Migration Guide:**

    Both parameters are now optional properties of a single options object:
    - Use `{ storeConfig, apiClientOptions }` to specify both
    - Use `{ storeConfig }` to specify only store configuration
    - Use `{ apiClientOptions }` to specify only API client options
    - Use `{}` or omit the argument entirely for all defaults

    **Benefits:**
    - No need to remember parameter order
    - Specify only the options you need (no empty objects required)
    - Better IDE autocomplete support
    - More intuitive API for TypeScript users
    - Easier to extend in the future without breaking changes

### Added

- **Type Export**: Added `CreateProtopediaInMemoryRepositoryOptions` interface to `@f88/promidas/repository` for type-safe factory usage

### Improved

- **Test Coverage**: Enhanced factory test suite from 6 to 64 comprehensive tests (967% increase), covering:
    - Basic instantiation and configuration handling
    - Edge cases and boundary values
    - Realistic usage scenarios (production, development, testing environments)
    - Runtime safety for JavaScript users
    - Stress testing (1000 rapid instance creations)
    - Configuration immutability and independence

## [0.6.0] - 2025-12-12

### Added

- **API Client Upgrade**: Upgraded to `protopedia-api-v2-client` v3.0.0 with improved type safety and error handling
- **Module Exports**: Added comprehensive subpath exports for standalone module usage:
    - `@f88/promidas/types` - Type definitions
    - `@f88/promidas/utils` - Utility functions and converters
    - `@f88/promidas/logger` - Logger interface and implementations
    - `@f88/promidas/fetcher` - API client and data fetching
    - `@f88/promidas/store` - In-memory store
    - `@f88/promidas/repository` - Repository factory
- **Type Exports**: Added `PrototypeInMemoryStoreConfig` to main entrypoint for better API ergonomics
- **Documentation**:
    - Added `DEVELOPMENT.md` for development workflow and environment setup
    - Added `CONTRIBUTING.md` for contribution guidelines
    - Added `RELEASE.md` for maintainer-specific release procedures
    - Enhanced all module README files with usage examples and design documentation
- **Testing**:
    - Added exports validation test (`npm run test:exports`)
    - Added performance tests (`npm run test:perf`)
    - Improved test coverage for time parsers to 93.54%
- **CI/CD**:
    - Added type checking step to CI workflow
    - Added exports validation to CI
    - Added performance regression tests to CI
    - Added formatting and linting checks

### Changed

- **Module Structure**: Reorganized exports for clearer module boundaries and standalone usage
- **Documentation**: Comprehensive documentation updates across all modules
- **Type Imports**: Clarified type definition import sources for better developer experience

### Breaking Changes

- **Type Exports**: Type definitions are no longer exported from `@f88/promidas/utils`. Import types from `@f88/promidas/types` instead:

    ```typescript
    // Before
    import type { NormalizedPrototype } from '@f88/promidas/utils';

    // After
    import type { NormalizedPrototype } from '@f88/promidas/types';
    ```

- **API Client**: Upgraded to `protopedia-api-v2-client` v3.0.0. See the API client's changelog for migration details.

## [0.5.0] - 2024-12-10

### Added

- **lib/types**: Shared type definitions including `NormalizedPrototype`.
- **lib/utils**: Utility functions for timestamp parsing and code-to-label conversion.
- **lib/logger**: Minimal logger interface and console implementation.
- **lib/fetcher**: API client wrapper and data normalization logic.
- **lib/store**: Generic in-memory snapshot store with TTL and size limits.
- **lib/repository**: High-level repository integrating store and fetcher.
- **scripts**: Example scripts and data analysis tools.
- Comprehensive documentation (`README.md`, `DESIGN.md`, `USAGE.md`) for all modules.
