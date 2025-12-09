# PROMIDAS

[![CI](https://github.com/F88/promidas/actions/workflows/ci.yml/badge.svg)](https://github.com/F88/promidas/actions/workflows/ci.yml)
[![CodeQL](https://github.com/F88/promidas/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/F88/promidas/actions/workflows/github-code-scanning/codeql)
[![Publish package to GitHub Packages](https://github.com/F88/promidas/actions/workflows/publish-package-to-github-packages.yml/badge.svg)](https://github.com/F88/promidas/actions/workflows/publish-package-to-github-packages.yml)

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/F88/promidas)
[![codecov](https://codecov.io/github/F88/promidas/graph/badge.svg)](https://codecov.io/github/F88/promidas)

ProtoPedia Resource Organized Management In-memory Data Access Store

Featuring a core in-memory snapshot manager, this project provides TTL and efficient data access for ProtoPedia prototypes.
It also bundles a ready-to-use utility tool for combining with an API client.

## Project Overview

This repository provides a comprehensive solution for managing ProtoPedia data in memory, consisting of three key layers:

1. **`lib/core`** - Core in-memory snapshot store (`PrototypeMapStore`)
    - TTL-based snapshot management
    - O(1) lookups by ID and efficient random selection
    - Payload size guards and refresh coordination

2. **`lib/protopedia`** - Reference implementation for ProtoPedia API Ver 2.0 Client
    - Fetch and normalize ProtoPedia prototypes
    - Error handling and network utilities
    - Type-safe integration with `protopedia-api-v2-client`

3. **`lib/simple-store-for-protopedia`** - Sample repository implementation
    - Combines `PrototypeMapStore` with ProtoPedia API client
    - Ready-to-use `createProtopediaInMemoryRepository` factory
    - Demonstrates best practices for snapshot-based data management

This project extracts and generalizes the data-fetching and in-memory data management capabilities originally implemented in [F88/mugen-protopedia](https://github.com/F88/mugen-protopedia/), providing them as a standalone, reusable library for various applications.

## ProtoPedia API Ver 2.0

ProtoPedia API Ver 2.0 · Apiary
<https://protopediav2.docs.apiary.io/#>

## Full Supported API Client

This library is designed to work very closely with the official
[protopedia-api-v2-client](https://www.npmjs.com/package/protopedia-api-v2-client).

If you are happy to use `protopedia-api-v2-client` as your ProtoPedia
API client, this library already **fully supports it** out of the box.
You can plug an existing client instance into the memorystore layer, or
let this library create and manage the client for you.

In practice, you can treat this library as a reference implementation
of how to integrate `ProtoPedia API Ver 2.0 Client for Javascript`
into real-world applications.

### Example: custom fetcher for Next.js

You can pass any `fetch` implementation to the official client factory
via its options. This makes it easy to adapt to different runtimes such
as Node.js, browsers, or Next.js server components.

```ts
import { createProtoPediaClient } from 'protopedia-api-v2-client';

const CONNECTION_AND_HEADER_TIMEOUT_MS = 5_000;

export const customClientForNextJs = createProtoPediaClient({
    token: process.env.PROTOPEDIA_API_TOKEN ?? '',
    baseUrl: 'https://api.protopedia.net',
    fetch: async (url, init) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(
            () => controller.abort(),
            CONNECTION_AND_HEADER_TIMEOUT_MS,
        );

        try {
            return await globalThis.fetch(url, {
                ...init,
                signal: controller.signal,
                cache: 'force-cache',
                next: {
                    revalidate: 60,
                },
            });
        } finally {
            clearTimeout(timeoutId);
        }
    },
    // Reduce noisy logs in development; can be overridden via env
    logLevel: process.env.NODE_ENV === 'production' ? 'error' : 'debug',
});
```

The resulting client can then be passed into this library's
memorystore layer, or you can let this library create a compatible
client internally by providing the same options shape.

## Specifications

### Goals

- Provide a thin, runtime-agnostic layer for working with ProtoPedia
  API v2 from both Node.js and browser environments.
- Normalize upstream ProtoPedia responses into a stable, well-typed
  `NormalizedPrototype` structure.
- Offer an in-memory store that keeps a snapshot of ProtoPedia
  prototypes and provides fast lookups and random selection.
- Integrate smoothly with the official
  `protopedia-api-v2-client` package.

### Normalized Data Model

- The core normalized type is `NormalizedPrototype` (see
  `lib/protopedia/types/normalized-prototype.ts`).
- It is derived from `ResultOfListPrototypesApiResponse` provided by
  `protopedia-api-v2-client`.
- Key normalization rules:
    - Pipe-separated strings (for example, tags or users) are converted
      into string arrays.
    - Date/time fields from ProtoPedia are normalized to ISO 8601
      strings in UTC.
    - Count fields are converted to numbers where needed.
    - Optional or missing fields are represented with `null` or
      reasonable defaults instead of ad-hoc falsy values.

### Fetch Layer

- The primary fetch helper is `getPrototypes` located in
  `lib/protopedia/fetch-prototypes.ts`.
- It expects an instance of `ProtoPediaApiClient` from
  `protopedia-api-v2-client` and uses `listPrototypes` under the hood.
- Request parameters are typed as `ListPrototypesParams` from
  `protopedia-api-v2-client`.
- The result type is a discriminated union:
    - `FetchPrototypesResult` with shape `{ ok: true, data: NormalizedPrototype[] }`
    - or an error branch with `{ ok: false, error: NetworkFailure }`.
- All fetch results are immediately passed through `normalizePrototype`
  to ensure consumers only handle `NormalizedPrototype` objects.

### In-Memory Prototype Store

- The in-memory store is implemented as `PrototypeMapStore` in
  `lib/core/store.ts`.
- Responsibilities:
    - Hold a map of `prototypeId -> NormalizedPrototype` with a
      consistently updated backing array for iteration and random access.
    - Provide O(1) access by id and efficient random selection.
    - Optionally enforce a TTL (time-to-live) and rough size estimation
      to avoid unbounded growth.
    - Offer `runExclusive` to coordinate refresh operations and avoid
      duplicate concurrent fetches.
- Typical usage pattern:
    - Try to read from the map store first.
    - If the store is empty or stale, fetch from ProtoPedia API v2,
      normalize the response, populate the store, and then serve the
      result from the store.

### Logger

- The library ships with a minimal, dependency-free logger interface
  defined in `lib/lib/logger.types.ts`.
- A default implementation is provided via `createConsoleLogger` in
  `lib/lib/logger.ts`.
- Log levels:
    - `debug`, `info`, `warn`, `error`, `silent`.
- The `Logger` interface exposes the following methods:
    - `debug(message: string, meta?: unknown)`
    - `info(message: string, meta?: unknown)`
    - `warn(message: string, meta?: unknown)`
    - `error(message: string, meta?: unknown)`
- In environments where logging is not desired, `createNoopLogger`
  returns a logger that discards all messages.

### Server / Client Usage

- The core fetcher and store are designed to be usable from both
  server-side and client-side code, as long as you can provide a
  configured `ProtoPediaApiClient` instance.
- Higher-level integration code (such as Next.js server actions) can
  build on top of these primitives to implement behavior like:
    - Get from the map store if present.
    - Otherwise, fetch from the ProtoPedia API v2, populate the store,
      and then return the freshly fetched data.

### Error Handling

- Network-level failures are represented by the `NetworkFailure` type
  (see `lib/protopedia/types/prototype-api.types.ts`).
- Fetch helpers like `getPrototypes` return discriminated unions so
  callers must explicitly handle both success and failure cases.
- Application-level logic can choose to log, retry, or surface these
  failures depending on the runtime environment.

## Use Cases

This library is intended to sit between your application code and the
ProtoPedia API:

- lib user
  -> API client (`protopedia-api-v2-client`)
  -> in-memory store (`PrototypeMapStore`)
  -> ProtoPedia API v2

It is designed to work in both client-side (SPA) and server-side
environments.

### Client-side (SPA) examples

- Random one prototype in a view
    - On first load, fetch a page of prototypes via
      `createProtopediaApiCustomClient` and `fetchAndNormalizePrototypes`.
    - Normalize and push all results into a shared `PrototypeMapStore`
      instance.
    - When the user clicks a "Show me something" button, call
      `store.getRandom()` and render the returned `NormalizedPrototype`.

- Detail view by id with in-memory cache
    - When rendering a list, fill the `PrototypeMapStore` with all
      `NormalizedPrototype` objects from the list response.
    - On a detail page or modal, first call `store.getById(id)`.
    - If the prototype is not found in the store, fall back to a
      single-item fetch using `createProtopediaApiCustomClient`, normalize the
      result, insert it into the store, and then render it.

### Server-side examples

- Node.js process with an in-memory cache
    - Keep a single `PrototypeMapStore` instance in your Node.js
      process.
    - On each incoming request, first try to satisfy reads from the
      store (by id, or via `getRandom`).
    - When the store is empty or past a configured TTL, refresh it via
      `getPrototypes` and repopulate the map before serving results.

- Batch or CLI processing of multiple prototypes
    - From a CLI or batch script, use `createProtopediaApiCustomClient`
      together with `fetchAndNormalizePrototypes` to fetch multiple prototypes in a
      single call.
    - Work against the normalized `NormalizedPrototype[]` result for
      tasks like exporting to CSV, generating static content, or
      populating another database.
    - Optionally, load the same data into `PrototypeMapStore` to make
      it easy to perform repeated lookups or random sampling during the
      batch job.

In addition to the examples above, the library is intended to support
more advanced patterns such as:

- Fetching prototypes filtered by tags or other query parameters.
- Using custom `PrototypeMapStore` instances with flexible TTL and
  sizing strategies per use case.

## Usage

### Installation

```bash
npm install github:F88/promidas protopedia-api-v2-client
```

### Quick Start

```typescript
import { createProtopediaInMemoryRepository } from '@f88/promidas';

// Create repository with custom configuration
const repo = createProtopediaInMemoryRepository(
    {
        ttlMs: 30 * 60 * 1000, // 30 minutes TTL
        maxPayloadSizeBytes: 30 * 1024 * 1024, // 30 MiB limit
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

See `scripts/try-protopedia-simple-store.ts` for a complete example that demonstrates:

- Repository initialization with custom TTL
- Snapshot setup and refresh
- Random and ID-based prototype retrieval
- Stats monitoring and cache validation

Run the example:

```bash
export PROTOPEDIA_API_V2_TOKEN="your-token-here"
npx tsx scripts/try-protopedia-simple-store.ts
```

### Advanced Usage

For detailed usage patterns and API documentation, see:

- [`docs/SIMPLE-STORE-FOR-PROTOPEDIA.md`](docs/SIMPLE-STORE-FOR-PROTOPEDIA.md) — High-level repository usage
- [`docs/STORE-USAGE.md`](docs/STORE-USAGE.md) — Low-level `PrototypeMapStore` API
- [`docs/STORE-DESIGN.md`](docs/STORE-DESIGN.md) — Design notes and performance characteristics

## Test Coverage

This library maintains comprehensive test coverage:

- **Overall Coverage**: 98.01% statements, 92.15% branches, 100% functions
- **Test Suite**: 314 tests across 9 test files
- **Test Categories**:
    - Unit tests for `normalizePrototype`, `PrototypeMapStore`, and fetch utilities
    - Integration tests for `ProtopediaInMemoryRepository`
    - Performance tests for large datasets (1,000–10,000 prototypes)
    - Edge case and error handling tests

Run tests with:

```bash
npm test              # Run all tests
npm run test:coverage # Run tests with coverage report
```
