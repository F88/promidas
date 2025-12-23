<!-- markdownlint-disable MD024 -->

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Breaking Changes

#### Repository Snapshot Error Structure Redesigned

The `SnapshotOperationFailure` type has been completely redesigned to use discriminated unions for type-safe error handling.

**OLD**:

```typescript
const result = await repo.setupSnapshot({ limit: 100 });
if (!result.ok) {
    console.error(result.error); // string
    if (result.status === 404) {
        // optional
        // Handle HTTP error
    }
    if (result.code === 'SOME_CODE') {
        // optional
        // Handle specific error
    }
}
```

**NEW**:

```typescript
const result = await repo.setupSnapshot({ limit: 100 });
if (!result.ok) {
    switch (result.origin) {
        case 'fetcher':
            console.error(result.message); // error → message
            console.log(result.kind); // 'http' | 'network' | 'timeout' | ...
            console.log(result.code); // FetcherErrorCode (always present)
            if (result.status === 404) {
                // optional, only for HTTP errors
                // Handle HTTP error
            }
            break;
        case 'store':
            console.error(result.message);
            console.log(result.kind); // 'storage_limit' | 'serialization'
            console.log(result.code); // StoreErrorCode (always present)
            console.log(result.dataState); // 'UNCHANGED' | 'CLEARED' | 'UNKNOWN'
            break;
        case 'unknown':
            console.error(result.message);
            // No kind, code, or other fields
            break;
    }
}
```

1. Replace `result.error` with `result.message`
   **Migration Guide**:

1. Replace `result.error` with `result.message` for all repository-layer failures
1. Use `result.origin` to discriminate error types before accessing fields
1. `result.code` is now always present (type-specific)
1. `result.status` is only available for `FetcherSnapshotFailure` with HTTP errors
1. Store errors now include `dataState` instead of embedding it in the message

### Added

- **Discriminated Union Error Types**: Repository snapshot failures now use type-discriminated errors (#72)
    - `SnapshotOperationFailure` discriminated by `origin` field: `'fetcher' | 'store' | 'unknown'`
    - Each origin has specific `kind` and `code` fields for precise error classification
    - `FetcherSnapshotFailure`: HTTP/network errors with `FetcherErrorCode` and detailed request/response metadata
    - `StoreSnapshotFailure`: Storage limit and serialization errors with `StoreErrorCode` and `dataState`
    - `UnknownSnapshotFailure`: Fallback for unexpected errors
    - Enables deterministic error handling without message parsing

### Changed

- **Repository Error Structure**: Standardized error field names
    - Repository layer uses `message` field (consistent with discriminated union pattern)
    - Fetcher layer maintains `error` field for backward compatibility
    - All error types now include structured metadata for programmatic handling

### Removed

- **Legacy Error Types**: Removed deprecated error structures (#72)
    - `LegacySnapshotOperationFailure` type and related TODO comments
    - All code migrated to discriminated union pattern

### Fixed

- **Test Coverage**: Updated all repository and fetcher tests for new error structure
    - 554 fetcher tests updated to expect `origin`, `kind`, and `code` fields
    - 190 repository tests updated to use discriminated error types
    - Fixed error message expectations to use actual error messages instead of generic fallbacks

### Documentation

- Nothing yet.

## [0.15.0] - 2025-12-23

### Added

- **Error Event for Stream Reading Failures**: New `error` event type in progress tracking system (#69)
    - Emitted when stream reading fails after response is received (e.g., 401, network timeout)
    - `FetchProgressErrorEvent` type with error message, received bytes, and timing information
    - Ensures progress callbacks receive completion notification even on errors
    - Exported `FetchProgressErrorEvent` type from `@f88/promidas/fetcher`

### Fixed

- **Progress Event Lifecycle**: Stream reading errors now properly emit error event (#69)
    - Previously, errors during response body streaming would leave progress listeners waiting indefinitely
    - Now emits `error` event with partial download information and timing data
    - Fixes incomplete event lifecycle: `request-start` → `response-received` → `download-progress` (optional) → `error`

### Documentation

- **Split DESIGN.md**: Created separate `DESIGN_PROGRESS.md` for progress tracking design
    - DESIGN.md reduced from 1401 to 680 lines for better maintainability
    - Progress tracking architecture, event design, and implementation details moved to DESIGN_PROGRESS.md
    - Follows same pattern as lib/repository (DESIGN_EVENTS.md)

## [0.14.0] - 2025-12-22

### Breaking Changes

#### Progress Tracking API Redesigned to Event-Driven Architecture

The progress tracking system has been completely redesigned from callback-based to event-driven architecture for better extensibility and type safety.

**OLD**:

```typescript
const client = new ProtopediaApiCustomClient({
    progressCallback: {
        onStart: (estimatedTotal, limit, prepareTime) => {
            /* prepareTime in seconds */
        },
        onProgress: (received, total, percentage) => {
            /* ... */
        },
        onComplete: (received, estimatedTotal, downloadTime, totalTime) => {
            /* times in seconds */
        },
    },
});
```

**NEW**:

```typescript
const client = new ProtopediaApiCustomClient({
    progressCallback: (event) => {
        switch (event.type) {
            case 'request-start':
                // NEW: Fired before fetch() call
                // No properties other than `type`
                break;
            case 'response-received':
                // Replaces onStart
                // Properties: prepareTimeMs (milliseconds), estimatedTotal, limit
                break;
            case 'download-progress':
                // Replaces onProgress
                // Properties: received, total, percentage
                break;
            case 'complete':
                // Replaces onComplete
                // Properties: received, estimatedTotal, downloadTimeMs, totalTimeMs (all in milliseconds)
                break;
        }
    },
});
```

**Migration Steps**:

1. Replace callback object with single event handler function
2. Use `switch(event.type)` pattern for type-safe event handling
3. Update timing references: seconds → milliseconds (multiply by 1000 if needed)
4. Add handling for new `request-start` event type (captures complete lifecycle)
5. Rename timing properties: `prepareTime` → `prepareTimeMs`, `downloadTime` → `downloadTimeMs`, `totalTime` → `totalTimeMs`

**Impact**: Affects all users who use `progressCallback` option in `ProtopediaApiCustomClient` configuration.

**Files affected**:

- `lib/fetcher/types/progress-event.types.ts` - NEW: Event type definitions
- `lib/fetcher/client/config.ts` - Updated `progressCallback` type
- `lib/fetcher/client/fetch-with-progress.ts` - Complete rewrite for event emission
- `lib/fetcher/client/select-custom-fetch.ts` - Updated to pass event handler
- `lib/fetcher/utils/create-client-fetch.ts` - Updated type signatures
- All documentation files updated to reflect new API

### Added

- **Progress Event System**: Event-driven architecture for complete fetch lifecycle tracking (#67)
    - New `request-start` event fires before fetch() call (captures complete request lifecycle)
    - `FetchProgressEvent` discriminated union type for type-safe event handling
    - Four event types: `request-start`, `response-received`, `download-progress`, `complete`
    - All timing values now in milliseconds for consistency and precision
    - Exported `FetchProgressEvent` and all event type definitions from `@f88/promidas/fetcher`

### Changed

- **Progress Tracking API**: Complete redesign to event-driven architecture (#67)
    - `progressCallback` now accepts single event handler function: `(event: FetchProgressEvent) => void`
    - Timing properties renamed: `downloadStartTime` → `requestStartTime`, `prepareTime` → `prepareTimeMs`
    - All timing values changed from seconds (number) to milliseconds (number)
    - Event types use discriminated union pattern for type-safe `switch(event.type)` handling

### Fixed

## [0.13.1] - 2025-12-22

### Fixed

- **protopedia-api-v2-client logging**: Propagate `logger` and `logLevel` from factory defaults so HTTP request/response logs can be enabled when desired
- **ConsoleLogger receiver loss**: Bind logger methods to avoid runtime errors when log methods are called without a receiver

## [0.13.0] - 2025-12-21

### Fixed

- **Browser CORS**: Strip `x-client-user-agent` in browser runtimes to avoid blocked preflight requests (#55)

## [0.12.2] - 2025-12-20

### Fixed

- **Network error code**: Adds a stable `NETWORK_ERROR` code for browser-like fetch failures so `SnapshotOperationFailure.code` is no longer `undefined` (#56)

## [0.12.1] - 2025-12-19

### Fixed

- **Fetcher Timeout vs Abort**: Distinguishes request timeouts from caller-initiated aborts in fetcher error handling (#60)

## [0.12.0] - 2025-12-19

### Added

- **Store Custom Error Classes**: Implemented custom error classes for `PrototypeInMemoryStore` (#58)
    - `ConfigurationError`: Invalid constructor configuration
    - `DataSizeExceededError`: Data exceeds `maxDataSizeBytes` limit
    - `SizeEstimationError`: JSON serialization failure
    - All errors include `dataState` property indicating store state
    - Exported from `@f88/promidas/store` with comprehensive documentation

### Changed

- **Store Error Handling**: `setAll()` now throws exceptions instead of returning `null` (#58)
    - Throws `DataSizeExceededError` when data size limit exceeded (previously returned `null`)
    - Throws `SizeEstimationError` when size estimation fails (previously silently returned 0)
- **Store Constructor**: Logs before validation to capture failed initialization attempts

### Breaking Changes

#### Store `setAll()` Method Now Throws Exceptions Instead of Returning Null

The `setAll()` method return type changed from `{ dataSizeBytes: number } | null` to `{ dataSizeBytes: number }`. Instead of returning `null` on failure, it now throws custom error classes:

- Throws `DataSizeExceededError` when data size exceeds `maxDataSizeBytes` limit (previously returned `null`)
- Throws `SizeEstimationError` when JSON serialization fails (previously silently returned 0)

Wrap `setAll()` calls in try-catch blocks to handle exceptions properly.

**Note**: Repository layer internally handles these exceptions and converts them to `SnapshotOperationResult` with `ok: false`. Repository users are not directly affected.

**Files affected:**

- `lib/store/store.ts` - Updated error handling
- `lib/store/errors/store-error.ts` - New error classes
- `lib/store/index.ts` - Export error classes
- `lib/repository/protopedia-in-memory-repository.ts` - Added exception handling in fetchAndStore

#### Store Constructor Now Throws `ConfigurationError`

The constructor now throws `ConfigurationError` instead of generic `Error` when `maxDataSizeBytes` exceeds 30 MiB limit.

**Impact**: Affects all users who instantiate `PrototypeInMemoryStore` directly or through builder/factory functions.

## [0.11.0] - 2025-12-17

### Added

- **ValidationError for Better Error Handling**: Implemented custom `ValidationError` class to improve validation error handling (#13)
    - Wraps Zod validation errors with user-friendly messages and hides internal validation library from public API
    - Includes `field` property to identify which parameter failed validation
    - Applied to `getPrototypeFromSnapshotByPrototypeId()` and `getRandomSampleFromSnapshot()` parameter validation
    - Exported from `@f88/promidas/repository` with comprehensive documentation

- **Documentation Structure Improvements**: Major documentation reorganization for better user experience (#37)
    - Added beginner-friendly guides: `quickstart-beginners.md`, `troubleshooting.md`
    - Added feature documentation: Repository, Factory, and Builder pattern guides
    - Reorganized use case documentation into `docs/use-case/` directory structure
    - Renamed `docs/core-concepts/` to `docs/features/` for clarity
    - Enhanced `docs/index.md` with "What is PROMIDAS" section and improved navigation
    - Updated sidebar navigation with "主な機能" (Main Features) section

### Changed

- **Documentation Corrections**: Fixed critical documentation errors across multiple files
    - Node.js version requirement corrected from 18+ to 20+ (matches package.json)
    - TTL behavior clarified: marks expiration, does not auto-fetch (requires explicit `refreshSnapshot()`)
    - Error handling examples fixed: `result.error` is string type, not object with `.message`
    - Fixed field name: `stats.count` → `stats.size`
    - Corrected default values: 30min TTL, 30MiB size (was incorrectly documented as 1hr, 10MB)

### Dependencies

- Updated development dependencies to latest versions
- Updated GitHub Actions versions in workflows

## [0.10.0] - 2025-12-17

### Changed

- **Logger Output Format**: Changed ConsoleLogger output format to prefix-based style for better readability
    - Before: `message, { level: 'info', meta: ... }`
    - After: `[INFO] message` (with optional metadata if provided)
    - Log level is now always visible at the start of each message
    - All 38 tests updated to reflect the new format

### Added

- **Download Progress Tracking**: Implemented download progress tracking for prototype fetching (#44)
    - Three-module architecture: `fetch-with-progress`, `select-custom-fetch`, and `protopedia-api-custom-client`
    - Progress callbacks: `onStart`, `onProgress`, `onComplete` with automatic logger integration
    - Default `progressLog: true` enables automatic download progress tracking
    - Export `shouldProgressLog` for fine-grained control over stderr output

- **User-Agent Support in ProtopediaApiCustomClient**: Automatically sets library-specific User-Agent for API requests (#45)
    - Default User-Agent: `ProtopediaApiCustomClient/{VERSION} (promidas)`
    - Customizable via `protoPediaApiClientOptions.userAgent` option
    - Improves request identification for analytics and debugging

- **Event Notification System**: Implemented optional event system for repository snapshot operations (#19)
    - Three event types: `snapshotStarted`, `snapshotCompleted`, `snapshotFailed`
    - Opt-in design: Events disabled by default, enable via `enableEvents: true`
    - Type-safe event interface using `typed-emitter` package with Promise coalescing support
    - Memory management: `dispose()` method for cleanup
    - Comprehensive documentation in DESIGN_EVENTS.md, DESIGN.md, and USAGE.md
    - Dependencies added: `events@^3.3.0`, `typed-emitter@^2.1.0` (devDependency)

### Fixed

- **Progress Callback Triggering**: Fixed `onProgressStart` callback to trigger correctly when Content-Length header is present (#44)
- **Documentation Accuracy**: Fixed 17 critical issues in fetcher documentation including type definitions, import paths, and code examples (#45)

## [0.9.0] - 2025-12-16

### Added

- **Beginner-Friendly Factory Functions**: Implemented two environment-specific factory functions for common use cases (#35)
    - `createPromidasForLocal()` - Optimized for local/development with 30-minute TTL, 90-second timeout, verbose logging
    - `createPromidasForServer()` - Optimized for server/production with 10-minute TTL, 30-second timeout, minimal logging
    - Both use environment-appropriate User-Agent headers and 30 MiB data size limit
    - Exported from main module with comprehensive test coverage (96 tests, 100% coverage)

- **Version Management System**: Integrated automatic version generation for User-Agent strings (#35)
    - Auto-generates `lib/version.ts` from `package.json` version during prebuild
    - Used in factory function User-Agent headers for better API tracking

### Changed

- **Data Size Constant Renamed**: `MAX_DATA_SIZE_BYTES` → `LIMIT_DATA_SIZE_BYTES` (#35)
    - New name better indicates hard constraint vs configurable maximum
    - Value unchanged: 30 MiB (31,457,280 bytes)

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
