# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **lib/types**: Shared type definitions including `NormalizedPrototype`.
- **lib/utils**: Utility functions for timestamp parsing and code-to-label conversion.
- **lib/logger**: Minimal logger interface and console implementation.
- **lib/fetcher**: API client wrapper and data normalization logic.
- **lib/store**: Generic in-memory snapshot store with TTL and size limits.
- **lib/repository**: High-level repository integrating store and fetcher.
- **scripts**: Example scripts and data analysis tools.
- Comprehensive documentation (`README.md`, `DESIGN.md`, `USAGE.md`) for all modules.
