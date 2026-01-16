# PROMIDAS

[![CI](https://github.com/F88/promidas/actions/workflows/ci.yml/badge.svg)](https://github.com/F88/promidas/actions/workflows/ci.yml)
[![CodeQL](https://github.com/F88/promidas/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/F88/promidas/actions/workflows/github-code-scanning/codeql)
[![codecov](https://codecov.io/github/F88/promidas/graph/badge.svg)](https://codecov.io/github/F88/promidas)
[![Publish package to npmjs.com](https://github.com/F88/promidas/actions/workflows/publish-package-to-npmjs.yml/badge.svg)](https://github.com/F88/promidas/actions/workflows/publish-package-to-npmjs.yml)
[![Deploy VitePress site to Pages](https://github.com/F88/promidas/actions/workflows/deploy-docs.yml/badge.svg)](https://github.com/F88/promidas/actions/workflows/deploy-docs.yml)

![Release](https://img.shields.io/github/v/release/F88/promidas?label=release)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Issues](https://img.shields.io/github/issues/F88/promidas?label=issues)

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/F88/promidas)
[![View Code Wiki](https://www.gstatic.com/_/boq-sdlc-agents-ui/_/r/YUi5dj2UWvE.svg)](https://codewiki.google/github.com/f88/promidas)

ProtoPedia Resource Organized Management In-memory Data Access Store

A toolset library for ProtoPedia providing independent store and fetcher components, and a high-level repository for easy data management.

## クイックスタート

**[📖 ドキュメントサイト](https://f88.github.io/promidas/)** - 使い方とサンプルコード

**[🛝 PROMIDAS Playground](https://f88.github.io/PROMIDAS-demo/)** - デモ

**初めての方へ:**

1. [スタートガイド](https://f88.github.io/promidas/getting-started.html) - インストールと最初の一歩
2. [ユースケース](https://f88.github.io/promidas/use-case/) - あなたの利用シーンを選ぶ

**今すぐ試す:**

```bash
npm install promidas
export PROTOPEDIA_API_V2_TOKEN="your-token-here"
npx tsx scripts/try-protopedia-repository.ts
```

---

## Project Overview

This repository provides a modular toolset for managing ProtoPedia data, consisting of independent components and a high-level repository:

1. **`lib/types`** - Compile-time Type Definitions (`NormalizedPrototype`, `StatusCode`, etc.)
    - Type-safe TypeScript definitions for ProtoPedia data structures
    - Normalized representation with consistent handling of dates, arrays, and optional fields
    - Shared across all layers: fetcher, store, repository, and validation utilities
    - Foundation for compile-time type safety (complements runtime validation in lib/schemas)
    - [📘 README](lib/types/README.md) | [Usage Guide](lib/types/docs/USAGE.md) | [Design Document](lib/types/docs/DESIGN.md)

2. **`lib/schemas`** - Runtime Validation Schemas (`normalizedPrototypeSchema`)
    - Zod-based runtime validation for external data (API responses, snapshots, files)
    - Complements compile-time types for complete type safety (TypeScript + runtime)
    - Shared across fetcher, repository, and validation utilities
    - Strict code value validation (e.g., status: 1|2|3|4, not just any number)
    - [📘 README](lib/schemas/README.md) | [Usage Guide](lib/schemas/docs/USAGE.md) | [Design Document](lib/schemas/docs/DESIGN.md)

3. **`lib/utils`** - Utility Functions and Converters
    - Type-safe converters for ProtoPedia data (status, license, flags)
    - Timestamp parsers (ProtoPedia JST format and W3C-DTF)
    - Shared type definitions and constants
    - Independent utilities usable across all modules
    - [📘 README](lib/utils/README.md) | [Usage Guide](lib/utils/docs/USAGE.md) | [Design Document](lib/utils/docs/DESIGN.md)

4. **`lib/store`** - Standalone In-memory Store (`PrototypeInMemoryStore`)
    - Generic snapshot management with TTL support
    - O(1) lookups by ID via internal index
    - Independent of any specific API client
    - [📘 README](lib/store/README.md) | [Usage Guide](lib/store/docs/USAGE.md) | [Design Document](lib/store/docs/DESIGN.md)

5. **`lib/fetcher`** - API Client Utilities (`ProtopediaApiCustomClient`)
    - Utilities to fetch and normalize ProtoPedia prototypes
    - Error handling and network helpers for `protopedia-api-v2-client`
    - Supports custom logger configuration for unified diagnostic output
    - Can be used independently to build custom data pipelines
    - [📘 README](lib/fetcher/README.md) | [Usage Guide](lib/fetcher/docs/USAGE.md) | [Design Document](lib/fetcher/docs/DESIGN.md)

6. **`lib/logger`** - Logger Interface (`Logger`)
    - Type-safe logging interface compatible with `protopedia-api-v2-client`
    - Used internally by Store, Fetcher, and Repository
    - Can be replaced with custom logger (e.g., Winston, Pino)
    - No `level` property for SDK compatibility (level managed by factory functions)
    - [📘 README](lib/logger/README.md) | [Usage Guide](lib/logger/docs/USAGE.md) | [Design Document](lib/logger/docs/DESIGN.md)

7. **`lib/repository`** - Ready-to-use Repository (`ProtopediaInMemoryRepository`)
    - Integrates `lib/store` and `lib/fetcher` into a single easy-to-use package
    - Best for most use cases requiring caching and automatic refreshing
    - [📘 README](lib/repository/README.md) | [Usage Guide](lib/repository/docs/USAGE.md) | [Design Document](lib/repository/docs/DESIGN.md)

8. **High-Level APIs** - Factory Functions and Builder
    - **Factory Functions** (`lib/factory.ts`): Pre-configured for common scenarios
        - `createPromidasForLocal()` - Optimized for local/development (30min TTL, 90s timeout, verbose logging)
        - `createPromidasForServer()` - Optimized for server/production (10min TTL, 30s timeout, minimal logging)
    - **Builder Pattern** (`lib/builder.ts`): Step-by-step configuration for advanced use cases
        - `PromidasRepositoryBuilder` - Fluent API for complex configurations
    - Exported from main module: `import { createPromidasForLocal, PromidasRepositoryBuilder } from 'promidas'`

This project extracts and generalizes the data-fetching and in-memory data management capabilities originally implemented in [F88/mugen-protopedia](https://github.com/F88/mugen-protopedia/), providing them as a standalone, reusable library for various applications.

## ProtoPedia API Ver 2.0

This library uses ProtoPedia API Ver 2.0.
To use the API, you need an Access Token (Bearer Token).

Please refer to the API documentation for details:
[ProtoPedia API Ver 2.0 · Apiary](https://protopediav2.docs.apiary.io/)

## Fully Supported API Client

This library fully supports [protopedia-api-v2-client](https://www.npmjs.com/package/protopedia-api-v2-client) v3.0.0 and later.

For details on how to integrate with `protopedia-api-v2-client` and use custom fetchers (e.g. for Next.js), please refer to [`lib/fetcher/docs/USAGE.md`](lib/fetcher/docs/USAGE.md).

## Subpath Exports

Each module can be imported independently using subpath exports:

```typescript
// Type definitions
import type { NormalizedPrototype, StatusCode } from 'promidas/types';

// Runtime validation schemas
import { normalizedPrototypeSchema } from 'promidas/schemas';

// Utility functions
import {
    parseProtoPediaTimestamp,
    getPrototypeStatusLabel,
} from 'promidas/utils';

// Logger
import { createConsoleLogger, type Logger } from 'promidas/logger';

// API client and fetcher
import {
    ProtopediaApiCustomClient,
    normalizePrototype,
} from 'promidas/fetcher';

// In-memory store
import {
    PrototypeInMemoryStore,
    type NormalizedPrototype,
} from 'promidas/store';

// Repository implementation
import { ProtopediaInMemoryRepositoryImpl } from 'promidas/repository';

// Factory functions and Builder (main module)
import {
    createPromidasForLocal,
    createPromidasForServer,
    PromidasRepositoryBuilder,
} from 'promidas';
```

**Available subpath exports:**

- `promidas` — High-level APIs: Factory functions and Builder (recommended)
- `promidas/types` — Type definitions
- `promidas/schemas` — Runtime validation schemas (Zod)
- `promidas/utils` — Utility functions and converters
- `promidas/logger` — Logger interface and implementations
- `promidas/fetcher` — API client and data fetching
- `promidas/store` — In-memory store
- `promidas/repository` — Repository implementation

## For Contributors

**Development:**

- [DEVELOPMENT.md](DEVELOPMENT.md) - Setup development environment and workflows
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines
- [DOCUMENTATION.md](DOCUMENTATION.md) - Documentation standards and guidelines
- [RELEASE.md](RELEASE.md) - Release process and versioning

**Project History:**

- [CHANGELOG.md](CHANGELOG.md) - Version history and release notes
