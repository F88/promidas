---
lang: en
title: Usage of ProtopediaInMemoryRepository
title-en: Usage of ProtopediaInMemoryRepository
title-ja: ProtopediaInMemoryRepository の使用法
related:
    - ../../../README.md "Project Overview"
instructions-for-ais:
    - This document should be written in English for AI readability.
    - Content within code fences may be written in languages other than English.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document.
---

# ProtopediaInMemoryRepository Usage Guide

This document describes how to use the ProtoPedia-specific in-memory
repository built on top of the generic `PrototypeInMemoryStore` core.

The main entry point is the `createProtopediaInMemoryRepository` factory
exported from `lib/repository`.

## Overview

`ProtopediaInMemoryRepository` is a snapshot-based, in-memory repository
for ProtoPedia prototypes. It is designed for environments such as
server-side applications or long-lived workers that want to:

- fetch prototypes from the ProtoPedia HTTP API,
- keep a snapshot of them in memory for fast lookups, and
- decide when to refresh that snapshot using TTL or custom policies.

All read operations work only against the current in-memory snapshot.
Network calls are performed only by `setupSnapshot` and
`refreshSnapshot`.

## Public API summary

The repository interface looks like this:

```ts
import type { NormalizedPrototype } from '../types/index.js';
import type { ListPrototypesParams } from 'protopedia-api-v2-client';

export interface ProtopediaInMemoryRepositoryStats {
    size: number;
    cachedAt: number | null;
    isExpired: boolean;
}

export interface ProtopediaInMemoryRepository {
    /**
     * Fetch prototypes from ProtoPedia and populate the in-memory snapshot.
     *
     * Only this method and `refreshSnapshot` perform HTTP calls.
     *
     * @throws {Error} When the underlying ProtoPedia API call fails
     * (for example, due to network issues, invalid credentials, or
     * unexpected upstream errors). In case of failure, any existing
     * in-memory snapshot remains unchanged.
     */
    setupSnapshot(params: ListPrototypesParams): Promise<void>;

    /**
     * Refresh the snapshot using the same strategy as the last
     * `setupSnapshot` call, or a reasonable default when it has not
     * been called yet.
     *
     * @throws {Error} When the underlying ProtoPedia API call fails
     * (for example, due to network issues, invalid credentials, or
     * unexpected upstream errors). In case of failure, the current
     * in-memory snapshot is preserved.
     */
    refreshSnapshot(): Promise<void>;
    getPrototypeFromSnapshotByPrototypeId(
        prototypeId: number,
    ): Promise<DeepReadonly<NormalizedPrototype> | null>;
    getRandomPrototypeFromSnapshot(): Promise<DeepReadonly<NormalizedPrototype> | null>;
    getRandomSampleFromSnapshot(
        size: number,
    ): Promise<readonly DeepReadonly<NormalizedPrototype>[]>;
    getPrototypeIdsFromSnapshot(): Promise<readonly number[]>;
    analyzePrototypes(): Promise<{ min: number | null; max: number | null }>;
    getStats(): ProtopediaInMemoryRepositoryStats;
}
```

The factory type is:

```ts
import type { PrototypeInMemoryStoreConfig } from '../store/index.js';

export type CreateProtopediaInMemoryRepository = (
    storeConfig: PrototypeInMemoryStoreConfig,
    protopediaApiClientOptions?: ProtopediaApiClientOptions,
) => ProtopediaInMemoryRepository;
```

`ProtopediaApiClientOptions` is the same as the first argument of the
underlying `createProtoPediaClient` helper used to talk to the
ProtoPedia HTTP API.

## Typical usage pattern

### 1. Create a repository instance

```ts
import { createProtopediaInMemoryRepository } from 'in-memory-snapshot-manager-for-protopedia';

const repo = createProtopediaInMemoryRepository(
    {
        // PrototypeInMemoryStoreConfig
        ttlMs: 30 * 60 * 1000, // 30 minutes
        maxDataSizeBytes: 10 * 1024 * 1024, // 10 MiB (default)
    },
    {
        // ProtopediaApiClientOptions
        token: process.env.PROTOPEDIA_API_V2_TOKEN,
        logLevel: 'info', // 'debug' | 'info' | 'warn' | 'error' | 'silent'
    },
);
```

### 2. Populate the initial snapshot

Call `setupSnapshot` once on startup or before the first read. The
concrete fetch strategy (all prototypes vs a subset, page size, etc.) is
an implementation detail of the repository.

```ts
await repo.setupSnapshot({ offset: 0, limit: 10 });
```

At this point, the underlying store holds a snapshot of prototypes, and
all read methods will operate only on that snapshot.

### 3. Read from the snapshot

Get a specific prototype by id:

```ts
const prototype = await repo.getPrototypeFromSnapshotByPrototypeId(123);

if (!prototype) {
    // Not present in the current snapshot
}
```

Get a random prototype from the snapshot:

```ts
const randomPrototype = await repo.getRandomPrototypeFromSnapshot();

if (!randomPrototype) {
    // Snapshot is empty
}
```

Get random samples (multiple prototypes without duplicates):

```ts
const samples = await repo.getRandomSampleFromSnapshot(5);
// Returns up to 5 random prototypes
// If snapshot has fewer than 5, returns all available
```

Get all prototype IDs from the snapshot:

```ts
const ids = await repo.getPrototypeIdsFromSnapshot();
console.log(`Available prototype IDs: ${ids.join(', ')}`);
```

Analyze the ID range of prototypes in the snapshot:

```ts
const { min, max } = await repo.analyzePrototypes();
if (min !== null && max !== null) {
    console.log(`Prototype ID range: ${min} - ${max}`);
}
```

### 4. Inspect stats and refresh when needed

Use `getStats` to understand the current snapshot state and drive
refresh policies.

```ts
const stats = repo.getStats();

console.log('Snapshot size:', stats.size);
console.log('Snapshot cachedAt:', stats.cachedAt);
console.log('Snapshot isExpired:', stats.isExpired);
```

A simple TTL-based refresh helper can look like this:

```ts
async function ensureFreshSnapshot(
    repo: ProtopediaInMemoryRepository,
): Promise<void> {
    const stats = repo.getStats();

    // If no snapshot exists, set up initial one
    if (stats.cachedAt === null) {
        await repo.setupSnapshot({ offset: 0, limit: 100 });
        return;
    }

    // If snapshot is expired based on TTL, refresh it
    if (stats.isExpired) {
        await repo.refreshSnapshot();
    }
}
```

You can call this helper before serving requests or on a periodic timer,
depending on your application needs.

## Common Use Cases

This library is intended to sit between your application code and the
ProtoPedia API. It is designed to work in both client-side (SPA) and server-side
environments.

### Client-side (SPA) examples

- **Random one prototype in a view**
    - On first load, fetch a page of prototypes.
    - Normalize and push all results into the repository.
    - When the user clicks a "Show me something" button, call
      `repo.getRandomPrototypeFromSnapshot()` and render the result.

- **Detail view by id with in-memory cache**
    - When rendering a list, fill the repository with all
      prototypes from the list response.
    - On a detail page or modal, first call `repo.getPrototypeFromSnapshotByPrototypeId(id)`.
    - If the prototype is not found in the store, fall back to a
      single-item fetch (using the client directly or extending the repository),
      insert it into the store, and then render it.

### Server-side examples

- **Node.js process with an in-memory cache**
    - Keep a single `ProtopediaInMemoryRepository` instance in your Node.js
      process.
    - On each incoming request, first try to satisfy reads from the
      store (by id, or via random).
    - When the store is empty or past a configured TTL, refresh it via
      `refreshSnapshot` and repopulate the store before serving results.

- **Batch or CLI processing of multiple prototypes**
    - From a CLI or batch script, use the repository to fetch multiple prototypes in a
      single call.
    - Work against the normalized data for tasks like exporting to CSV,
      generating static content, or populating another database.
    - The repository makes it easy to perform repeated lookups or random sampling
      during the batch job.

## Notes

- `setupSnapshot` and `refreshSnapshot` are the only methods that
  perform HTTP calls. All other methods are pure in-memory operations.
- The repository does not enforce a particular snapshot size or fetch
  strategy at the type level. Those decisions live in the concrete
  implementation and can evolve without changing the public API.
- `isExpired` in `ProtopediaInMemoryRepositoryStats` comes from the
  underlying `PrototypeInMemoryStore` TTL logic. You can use it directly or
  implement your own policy based on `cachedAt`.
