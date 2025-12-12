# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
