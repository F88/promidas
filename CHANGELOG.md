<!-- markdownlint-disable MD024 -->

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.10.0] - 2025-12-17

### Changed

- **Logger Output Format**: Changed ConsoleLogger output format to prefix-based style
    - Before: `message, { level: 'info', meta: ... }`
    - After: `[INFO] message` (with optional metadata if provided)
    - Benefits:
        - Log level is always visible at the start of each message
        - No redundant output when metadata is undefined
        - Cleaner console output for better readability
    - All 38 tests updated to reflect the new format
    - Documentation updated in DESIGN.md and USAGE.md

### Added

- **Download Progress Tracking**: Implemented download progress tracking for prototype fetching (#44)
    - Three-module architecture:
        - `fetch-with-progress`: Core progress tracking with callbacks
        - `select-custom-fetch`: Smart fetch selection with progress integration
        - `protopedia-api-custom-client`: Updated to use progress tracking by default
    - Export `shouldProgressLog` for fine-grained control over stderr output
    - Progress callbacks: `onStart`, `onProgress`, `onComplete`
    - Automatic logging with logger level filtering
    - Default `progressLog: true` enables automatic download progress tracking
    - Comprehensive test coverage: 22 tests (15 integration + 7 unit)

- **User-Agent Support in ProtopediaApiCustomClient**: Automatically sets library-specific User-Agent for API requests (#45)
    - Default User-Agent: `ProtopediaApiCustomClient/{VERSION} (promidas)`
    - Identifies requests from promidas library for better analytics and debugging
    - Customizable via `protoPediaApiClientOptions.userAgent` option
    - Comprehensive test coverage with 4 dedicated tests

- **Event Notification System**: Implemented optional event system for repository snapshot operations (#19)
    - Three event types:
        - `snapshotStarted` - Emitted when setup/refresh begins
        - `snapshotCompleted` - Emitted when operation succeeds (includes stats)
        - `snapshotFailed` - Emitted when operation fails (includes error details)
    - Opt-in design: Events disabled by default, enable via `enableEvents: true`
    - Type-safe event interface using `typed-emitter` package
    - Promise coalescing aware: Events fire once per actual API call
    - Memory management: `dispose()` method for cleanup
    - Comprehensive documentation:
        - DESIGN_EVENTS.md - Complete design rationale and implementation details
        - Event system section in DESIGN.md
        - Event usage examples in USAGE.md
    - Test coverage: 16 new tests for event system (1040 total tests)
    - Dependencies added: `events@^3.3.0`, `typed-emitter@^2.1.0` (devDependency)

### Fixed

- **Progress Callback Triggering**: Fixed `onProgressStart` callback to trigger correctly when Content-Length header is present (#44)
- **Documentation Accuracy**: Fixed 17 critical issues in fetcher documentation (#45)
    - Removed non-existent types: `ApiErrorDetails`, `ApiResult`, `ListPrototypesClient`
    - Fixed `FetchPrototypesResult` type definition to match actual implementation
    - Corrected `constructDisplayMessage` import path
    - Updated error handling flow documentation to reflect try/catch implementation
    - Fixed all code examples to work correctly

## [0.9.0] - 2025-12-16

### Added

- **Beginner-Friendly Factory Functions**: Implemented two environment-specific factory functions for common use cases (#35)
    - `createPromidasForLocal()` - Optimized for local/development environments
        - Parameters: `protopediaApiToken` (required), `logLevel` (optional, default: `'info'`)
        - Pre-configured: 30-minute TTL, 90-second timeout (supports 1-2 Mbps connections), verbose logging
        - User-Agent: `PromidasForLocal/${VERSION}`
    - `createPromidasForServer()` - Optimized for server/production environments
        - Parameters: `logLevel` (optional, default: `'warn'`)
        - Requires environment variable: `PROTOPEDIA_API_V2_TOKEN`
        - Pre-configured: 10-minute TTL, 30-second timeout, minimal logging (errors/warnings only)
        - User-Agent: `PromidasForServer/${VERSION}`
    - Both factories use 30 MiB data size limit (`LIMIT_DATA_SIZE_BYTES`)
    - Comprehensive test coverage: 96 tests (59 factory + 37 builder) with 100% coverage on factory.ts and builder.ts
    - Exported from main module: `import { createPromidasForLocal, createPromidasForServer } from '@f88/promidas'`

- **Version Management System**: Integrated automatic version generation for User-Agent strings (#35)
    - `scripts/generate-version.mjs` - Auto-generates `lib/version.ts` from `package.json` version
    - Integrated into prebuild script (runs before TypeScript compilation)
    - `lib/version.ts` - Auto-generated version constant, committed to repository
    - Used in factory function User-Agent headers for better API tracking

### Changed

- **Data Size Constant Renamed**: `MAX_DATA_SIZE_BYTES` → `LIMIT_DATA_SIZE_BYTES` (#35)
    - New name better indicates hard constraint vs configurable maximum
    - Re-exported from `lib/store/index.ts` for external use
    - Value unchanged: 30 MiB (31,457,280 bytes)
    - Updated all internal references and documentation

## [0.8.0] - 2025-12-15

### Breaking Changes

#### `createConsoleLogger()` No Longer Accepts Parameters

The `createConsoleLogger()` factory function no longer accepts log level parameters. For specific log levels, use the `ConsoleLogger` constructor directly. The `ConsoleLogger` implementation now includes a mutable `level` property for runtime log level changes.

**For Custom Logger Implementations:**

The `Logger` interface does not require a `level` property. To support runtime log level changes (used by `logLevel` configuration options), optionally add a mutable `level` property. The library checks dynamically using `'level' in logger`.

**Files affected:**

- `lib/logger/console-logger.ts` (renamed from `logger.ts`)
- `lib/logger/factory.ts` (new - separated factory functions)
- Test files reorganized for better structure

#### Main Module Now Exports Builder Instead of Factory Function

The `createProtopediaInMemoryRepository()` factory function has been removed from the main module in favor of `PromidasRepositoryBuilder`. Use the builder pattern, or import the factory function from `@f88/promidas/repository` subpath.

#### Removed `fetchAndNormalizePrototypes()` Standalone Function

Use the client method instead for better logger lifecycle management.

**Files removed:**

- `lib/fetcher/fetch-prototypes.ts`
- `lib/fetcher/__tests__/fetch-prototypes.test.ts`

### Added

- **PromidasRepositoryBuilder**: Introduced fluent builder interface for constructing repository instances with step-by-step configuration (#32)
    - Provides alternative to factory function for complex configuration scenarios
    - Deep merge support for multiple configuration calls
    - Configuration immutability protection
    - Comprehensive test coverage covering all configuration scenarios
    - Exported from main module: `import { PromidasRepositoryBuilder } from '@f88/promidas'`

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

- **Type Exports**: Type definitions are no longer exported from `@f88/promidas/utils`. Import types from `@f88/promidas/types` instead.

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
