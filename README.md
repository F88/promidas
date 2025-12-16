# PROMIDAS

[![CI](https://github.com/F88/promidas/actions/workflows/ci.yml/badge.svg)](https://github.com/F88/promidas/actions/workflows/ci.yml)
[![CodeQL](https://github.com/F88/promidas/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/F88/promidas/actions/workflows/github-code-scanning/codeql)
[![Publish package to GitHub Packages](https://github.com/F88/promidas/actions/workflows/publish-package-to-github-packages.yml/badge.svg)](https://github.com/F88/promidas/actions/workflows/publish-package-to-github-packages.yml)

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/F88/promidas)
[![codecov](https://codecov.io/github/F88/promidas/graph/badge.svg)](https://codecov.io/github/F88/promidas)

ProtoPedia Resource Organized Management In-memory Data Access Store

A toolset library for ProtoPedia providing independent store and fetcher components, and a high-level repository for easy data management.

## クイックスタート

**[📖 ドキュメントサイト](https://f88.github.io/promidas/)** - 使い方とサンプルコード

**初めての方へ:**

1. [Getting Started](https://f88.github.io/promidas/getting-started.html) - インストールと最初の一歩
2. [Use Cases](https://f88.github.io/promidas/usecase.html) - あなたの利用シーンを選ぶ
3. [ローカル開発ガイド](https://f88.github.io/promidas/usecase-local.html) - スクリプトとデータ分析

**今すぐ試す:**

```bash
npm install github:F88/promidas protopedia-api-v2-client
export PROTOPEDIA_API_V2_TOKEN="your-token-here"
npx tsx scripts/try-protopedia-repository.ts
```

**デモサイト:** [PROMIDAS Demo](https://f88.github.io/PROMIDAS-demo/) (開発中)

---

## Project Overview

This repository provides a modular toolset for managing ProtoPedia data, consisting of independent components and a high-level repository:

1. **`NormalizedPrototype`** - Standardized data model (`NormalizedPrototype`)
    - Type-safe, normalized representation of ProtoPedia prototypes
    - Consistent handling of dates, arrays, and optional fields
    - Shared across all layers of the library

2. **`lib/utils`** - Utility Functions and Converters
    - Type-safe converters for ProtoPedia data (status, license, flags)
    - Timestamp parsers (ProtoPedia JST format and W3C-DTF)
    - Shared type definitions and constants
    - Independent utilities usable across all modules
    - [📘 README](lib/utils/README.md) | [Usage Guide](lib/utils/docs/USAGE.md) | [Design Document](lib/utils/docs/DESIGN.md)

3. **`lib/store`** - Standalone In-memory Store (`PrototypeInMemoryStore`)
    - Generic snapshot management with TTL support
    - O(1) lookups by ID via internal index
    - Independent of any specific API client
    - [📘 README](lib/store/README.md) | [Usage Guide](lib/store/docs/USAGE.md) | [Design Document](lib/store/docs/DESIGN.md)

4. **`lib/fetcher`** - API Client Utilities (`ProtopediaApiCustomClient`)
    - Utilities to fetch and normalize ProtoPedia prototypes
    - Error handling and network helpers for `protopedia-api-v2-client`
    - Supports custom logger configuration for unified diagnostic output
    - Can be used independently to build custom data pipelines
    - [📘 README](lib/fetcher/README.md) | [Usage Guide](lib/fetcher/docs/USAGE.md) | [Design Document](lib/fetcher/docs/DESIGN.md)

5. **`lib/logger`** - Logger Interface (`Logger`)
    - Type-safe logging interface compatible with `protopedia-api-v2-client`
    - Used internally by Store, Fetcher, and Repository
    - Can be replaced with custom logger (e.g., Winston, Pino)
    - No `level` property for SDK compatibility (level managed by factory functions)
    - [📘 README](lib/logger/README.md) | [Usage Guide](lib/logger/docs/USAGE.md) | [Design Document](lib/logger/docs/DESIGN.md)

6. **`lib/repository`** - Ready-to-use Repository (`ProtopediaInMemoryRepository`)
    - Integrates `lib/store` and `lib/fetcher` into a single easy-to-use package
    - Best for most use cases requiring caching and automatic refreshing
    - [📘 README](lib/repository/README.md) | [Usage Guide](lib/repository/docs/USAGE.md) | [Design Document](lib/repository/docs/DESIGN.md)

7. **High-Level APIs** - Factory Functions and Builder
    - **Factory Functions** (`lib/factory.ts`): Pre-configured for common scenarios
        - `createPromidasForLocal()` - Optimized for local/development (30min TTL, 90s timeout, verbose logging)
        - `createPromidasForServer()` - Optimized for server/production (10min TTL, 30s timeout, minimal logging)
    - **Builder Pattern** (`lib/builder.ts`): Step-by-step configuration for advanced use cases
        - `PromidasRepositoryBuilder` - Fluent API for complex configurations
    - Exported from main module: `import { createPromidasForLocal, PromidasRepositoryBuilder } from '@f88/promidas'`

This project extracts and generalizes the data-fetching and in-memory data management capabilities originally implemented in [F88/mugen-protopedia](https://github.com/F88/mugen-protopedia/), providing them as a standalone, reusable library for various applications.

## ProtoPedia API Ver 2.0

This library uses ProtoPedia API Ver 2.0.
To use the API, you need an Access Token (Bearer Token).

Please refer to the API documentation for details:
[ProtoPedia API Ver 2.0 · Apiary](https://protopediav2.docs.apiary.io/)

## Full Supported API Client

This library fully supports [protopedia-api-v2-client](https://www.npmjs.com/package/protopedia-api-v2-client) v3.0.0 and later.

For details on how to integrate with `protopedia-api-v2-client` and use custom fetchers (e.g. for Next.js), please refer to [`lib/fetcher/docs/USAGE.md`](lib/fetcher/docs/USAGE.md).

## Subpath Exports

Each module can be imported independently using subpath exports:

```typescript
// Type definitions
import type { NormalizedPrototype, StatusCode } from '@f88/promidas/types';

// Utility functions
import {
    parseProtoPediaTimestamp,
    getPrototypeStatusLabel,
} from '@f88/promidas/utils';

// Logger
import { createConsoleLogger, type Logger } from '@f88/promidas/logger';

// API client and fetcher
import {
    ProtopediaApiCustomClient,
    normalizePrototype,
} from '@f88/promidas/fetcher';

// In-memory store
import {
    PrototypeInMemoryStore,
    type NormalizedPrototype,
} from '@f88/promidas/store';

// Repository (same as root import)
import { createPromidasRepository } from '@f88/promidas/repository';
```

**Available subpath exports:**

- `@f88/promidas` — High-level repository (recommended for most use cases)
- `@f88/promidas/types` — Type definitions
- `@f88/promidas/utils` — Utility functions and converters
- `@f88/promidas/logger` — Logger interface and implementations
- `@f88/promidas/fetcher` — API client and data fetching
- `@f88/promidas/store` — In-memory store
- `@f88/promidas/repository` — Repository factory (same as root)

## For Contributors

**Development:**

- [DEVELOPMENT.md](DEVELOPMENT.md) - Setup development environment and workflows
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines
- [RELEASE.md](RELEASE.md) - Release process and versioning

**Project History:**

- [CHANGELOG.md](CHANGELOG.md) - Version history and release notes
