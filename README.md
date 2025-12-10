# PROMIDAS

[![CI](https://github.com/F88/promidas/actions/workflows/ci.yml/badge.svg)](https://github.com/F88/promidas/actions/workflows/ci.yml)
[![CodeQL](https://github.com/F88/promidas/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/F88/promidas/actions/workflows/github-code-scanning/codeql)
[![Publish package to GitHub Packages](https://github.com/F88/promidas/actions/workflows/publish-package-to-github-packages.yml/badge.svg)](https://github.com/F88/promidas/actions/workflows/publish-package-to-github-packages.yml)

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/F88/promidas)
[![codecov](https://codecov.io/github/F88/promidas/graph/badge.svg)](https://codecov.io/github/F88/promidas)

ProtoPedia Resource Organized Management In-memory Data Access Store

A toolset library for ProtoPedia providing independent store and fetcher components, and a high-level repository for easy data management.

## Project Overview

This repository provides a modular toolset for managing ProtoPedia data, consisting of independent components and a high-level repository:

1. **`NormalizedPrototype`** - Standardized data model (`NormalizedPrototype`)
    - Type-safe, normalized representation of ProtoPedia prototypes
    - Consistent handling of dates, arrays, and optional fields
    - Shared across all layers of the library

2. **`lib/store`** - Standalone In-memory Store (`PrototypeInMemoryStore`)
    - Generic snapshot management with TTL support
    - O(1) lookups by ID via internal index
    - Independent of any specific API client
    - [Usage Guide](lib/store/docs/USAGE.md) | [Design Document](lib/store/docs/DESIGN.md)

3. **`lib/fetcher`** - API Client Utilities (`ProtopediaApiCustomClient`)
    - Utilities to fetch and normalize ProtoPedia prototypes
    - Error handling and network helpers for `protopedia-api-v2-client`
    - Supports custom logger configuration for unified diagnostic output
    - Can be used independently to build custom data pipelines
    - [Usage Guide](lib/fetcher/docs/USAGE.md) | [Design Document](lib/fetcher/docs/DESIGN.md)

4. **`lib/logger`** - Logger Interface (`Logger`)
    - Type-safe logging interface compatible with `protopedia-api-v2-client`
    - Used internally by Store, Fetcher, and Repository
    - Can be replaced with custom logger (e.g., Winston, Pino)
    - No `level` property for SDK compatibility (level managed by factory functions)
    - [Usage Guide](lib/logger/docs/USAGE.md) | [Design Document](lib/logger/docs/DESIGN.md)

5. **`lib/repository`** - Ready-to-use Repository (`ProtopediaInMemoryRepository`)
    - Integrates `lib/store` and `lib/fetcher` into a single easy-to-use package
    - Provides `createProtopediaInMemoryRepository` factory
    - Best for most use cases requiring caching and automatic refreshing
    - [Usage Guide](lib/repository/docs/USAGE.md) | [Design Document](lib/repository/docs/DESIGN.md)

This project extracts and generalizes the data-fetching and in-memory data management capabilities originally implemented in [F88/mugen-protopedia](https://github.com/F88/mugen-protopedia/), providing them as a standalone, reusable library for various applications.

## ProtoPedia API Ver 2.0

This library uses ProtoPedia API Ver 2.0.
To use the API, you need an Access Token (Bearer Token).

Please refer to the API documentation for details:
[ProtoPedia API Ver 2.0 · Apiary](https://protopediav2.docs.apiary.io/)

## Full Supported API Client

This library fully supports [protopedia-api-v2-client](https://www.npmjs.com/package/protopedia-api-v2-client).

For details on how to integrate with `protopedia-api-v2-client` and use custom fetchers (e.g. for Next.js), please refer to [`lib/fetcher/docs/USAGE.md`](lib/fetcher/docs/USAGE.md).

## Quick Start

### Installation

```bash
npm install github:F88/promidas protopedia-api-v2-client
```

### Usage

```typescript
import { createProtopediaInMemoryRepository } from '@f88/promidas';

// Create repository with custom configuration
const repo = createProtopediaInMemoryRepository(
    {
        ttlMs: 30 * 60 * 1000, // 30 minutes TTL
        maxDataSizeBytes: 10 * 1024 * 1024, // 10 MiB limit (default)
    },
    {
        token: process.env.PROTOPEDIA_API_V2_TOKEN,
        logLevel: 'info',
    },
);

// Setup initial snapshot
await repo.setupSnapshot({ offset: 0, limit: 100 });

// Get random prototype
const random = await repo.getRandomPrototypeFromSnapshot();
console.log(random?.prototypeNm);

// Get specific prototype by ID
const prototype = await repo.getPrototypeFromSnapshotById(123);

// Check snapshot stats
const stats = repo.getStats();
console.log(`Snapshot size: ${stats.size}`);
console.log(`Is expired: ${stats.isExpired}`);

// Refresh snapshot when needed
if (stats.isExpired) {
    await repo.refreshSnapshot();
}
```

### Example Script

See `scripts/try-protopedia-repository.ts` for a complete example that demonstrates:

- Repository initialization with custom TTL
- Snapshot setup and refresh
- Random and ID-based prototype retrieval
- Stats monitoring and cache validation

Run the example:

```bash
export PROTOPEDIA_API_V2_TOKEN="your-token-here"
npx tsx scripts/try-protopedia-repository.ts
```
