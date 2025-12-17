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

**📌 Note**: For getting started with PROMIDAS, please refer to the [Getting Started Guide](https://f88.github.io/promidas/getting-started.html) which covers the recommended factory functions (`createPromidasForLocal`, `createPromidasForServer`).

This document describes the advanced usage of the ProtoPedia-specific in-memory repository and the `PromidasRepositoryBuilder` for custom configurations.

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
    cachedAt: Date | null;
    isExpired: boolean;
}

export interface ProtopediaInMemoryRepository {
    /**
     * Fetch prototypes from ProtoPedia and populate the in-memory snapshot.
     *
     * Only this method and `refreshSnapshot` perform HTTP calls.
     *
     * Returns a Result type indicating success with stats or failure with error details.
     * In case of failure, any existing in-memory snapshot remains unchanged.
     *
     * @returns SnapshotOperationResult with ok: true and stats on success,
     *          or ok: false with error details on failure
     */
    setupSnapshot(
        params: ListPrototypesParams,
    ): Promise<SnapshotOperationResult>;

    /**
     * Refresh the snapshot using the same strategy as the last
     * `setupSnapshot` call, or a reasonable default when it has not
     * been called yet.
     *
     * Returns a Result type indicating success with stats or failure with error details.
     * In case of failure, the current in-memory snapshot is preserved.
     *
     * @returns SnapshotOperationResult with ok: true and stats on success,
     *          or ok: false with error details on failure
     */
    refreshSnapshot(): Promise<SnapshotOperationResult>;
    getPrototypeFromSnapshotByPrototypeId(
        prototypeId: number,
    ): Promise<DeepReadonly<NormalizedPrototype> | null>;
    getRandomPrototypeFromSnapshot(): Promise<DeepReadonly<NormalizedPrototype> | null>;
    getRandomSampleFromSnapshot(
        size: number,
    ): Promise<readonly DeepReadonly<NormalizedPrototype>[]>;
    getAllFromSnapshot(): Promise<readonly DeepReadonly<NormalizedPrototype>[]>;
    getPrototypeIdsFromSnapshot(): Promise<readonly number[]>;
    analyzePrototypes(): Promise<{ min: number | null; max: number | null }>;
    getStats(): ProtopediaInMemoryRepositoryStats;
}
```

## Typical usage pattern

### 1. Create a repository instance

For most use cases, use the factory functions:

```ts
import { createPromidasForLocal } from '@f88/promidas';

const repo = createPromidasForLocal({
    protopediaApiToken: process.env.PROTOPEDIA_API_V2_TOKEN,
});
```

**Note**: For advanced configuration options including Builder patterns and factory functions, please refer to the [Getting Started Guide](../../../docs/getting-started.md) or [API Documentation](../../../README.md).

### 2. Populate the initial snapshot

Call `setupSnapshot` once on startup or before the first read. The
concrete fetch strategy (all prototypes vs a subset, page size, etc.) is
an implementation detail of the repository.

```ts
const result = await repo.setupSnapshot({ offset: 0, limit: 10 });

if (result.ok) {
    console.log('Setup successful, cached:', result.stats.size);
} else {
    console.error('Setup failed:', result.error, result.status);
    // Handle error appropriately
}
```

At this point (if successful), the underlying store holds a snapshot of prototypes, and
all read methods will operate only on that snapshot.

### 3. Inspect stats and refresh when needed

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
        const result = await repo.setupSnapshot({ offset: 0, limit: 100 });
        if (!result.ok) {
            throw new Error(`Setup failed: ${result.error}`);
        }
        return;
    }

    // If snapshot is expired based on TTL, refresh it
    if (stats.isExpired) {
        const result = await repo.refreshSnapshot();
        if (!result.ok) {
            console.warn(`Refresh failed: ${result.error}, using stale data`);
            // Decide whether to throw or use stale data
        }
    }
}
```

You can call this helper before serving requests or on a periodic timer,
depending on your application needs.

### 4. Read from the snapshot

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

Get all prototypes from the snapshot:

```ts
const allPrototypes = await repo.getAllFromSnapshot();
console.log(`Total prototypes in snapshot: ${allPrototypes.length}`);
// Returns read-only array of all prototypes
```

### 5. Extracting specific data

For best performance, use `getAllFromSnapshot()` combined with `.map()` to extract
or transform specific fields. Performance testing has shown this approach to be
optimal for creating custom data structures.

Example: Extract only ID and name from all prototypes:

```ts
const allPrototypes = await repo.getAllFromSnapshot();

// Transform to simple { id, name } objects
const idNameList = allPrototypes.map((p) => ({
    id: p.id,
    name: p.prototypeNm,
}));

console.log(idNameList);
// [
//   { id: 1, name: 'First Prototype' },
//   { id: 2, name: 'Second Prototype' },
//   ...
// ]
```

This pattern is recommended over creating specialized repository methods for
each data transformation need. The single `getAllFromSnapshot()` method combined
with standard array operations provides maximum flexibility with optimal performance.

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

## Event Notifications

The repository provides an optional event system for real-time state change notifications during snapshot operations. This feature is designed for interactive WebApp/SPA scenarios.

### Enabling Events

Events are **disabled by default**. Enable them via `enableEvents: true`:

```ts
import { PromidasRepositoryBuilder } from '@f88/promidas';

const repo = new PromidasRepositoryBuilder()
    .setStoreConfig({ ttlMs: 30_000 })
    .setApiClientConfig({
        protoPediaApiClientOptions: {
            token: process.env.PROTOPEDIA_API_V2_TOKEN,
        },
    })
    .setRepositoryConfig({
        enableEvents: true, // Enable event notifications
    })
    .build();
```

### Event Types

Three events are available:

#### `snapshotStarted`

Emitted when `setupSnapshot` or `refreshSnapshot` begins.

```ts
repo.events?.on('snapshotStarted', (operation: 'setup' | 'refresh') => {
    console.log(`${operation} operation started`);
    setLoading(true);
});
```

#### `snapshotCompleted`

Emitted when snapshot operation completes successfully. Includes complete stats.

```ts
repo.events?.on('snapshotCompleted', (stats) => {
    console.log(`Snapshot updated: ${stats.size} prototypes`);
    console.log(`Cached at: ${stats.cachedAt}`);
    setLoading(false);
    setData(stats);
});
```

#### `snapshotFailed`

Emitted when snapshot operation fails. Includes error details.

```ts
repo.events?.on('snapshotFailed', (error) => {
    console.error('Snapshot failed:', error.error);
    if (error.status) {
        console.error('HTTP status:', error.status);
    }
    setLoading(false);
    setError(error.error);
});
```

### WebApp Usage Example (React)

```tsx
import { useEffect, useState } from 'react';
import type { PrototypeInMemoryStats } from '@f88/promidas/store';

function PrototypeList({ repo }) {
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState<PrototypeInMemoryStats | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Subscribe to events
        repo.events?.on('snapshotStarted', () => {
            setLoading(true);
            setError(null);
        });

        repo.events?.on('snapshotCompleted', (newStats) => {
            setLoading(false);
            setStats(newStats);
        });

        repo.events?.on('snapshotFailed', (err) => {
            setLoading(false);
            setError(err.error);
        });

        // Cleanup on unmount
        return () => {
            repo.dispose();
        };
    }, []); // Empty deps: repo instance should not change during component lifetime

    const handleRefresh = async () => {
        await repo.refreshSnapshot();
    };

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;
    if (!stats) return <div>No data</div>;

    return (
        <div>
            <h2>Prototypes: {stats.size}</h2>
            <p>Cached at: {stats.cachedAt?.toLocaleString()}</p>
            <p>Expired: {stats.isExpired ? 'Yes' : 'No'}</p>
            <button onClick={handleRefresh}>Refresh</button>
        </div>
    );
}
```

### Cleanup

**Important**: Always call `dispose()` to prevent memory leaks.

#### In Tests

```ts
describe('Repository tests', () => {
    let repo: ProtopediaInMemoryRepository;

    beforeEach(() => {
        repo = new PromidasRepositoryBuilder()
            .setRepositoryConfig({ enableEvents: true })
            .build();
    });

    afterEach(() => {
        repo.dispose(); // Clean up listeners
    });

    it('should emit events', (done) => {
        repo.events?.on('snapshotCompleted', (stats) => {
            expect(stats.size).toBeGreaterThan(0);
            done();
        });

        repo.setupSnapshot({ limit: 10 });
    });
});
```

#### In React Components

```tsx
useEffect(() => {
    const handleComplete = (stats) => setStats(stats);
    repo.events?.on('snapshotCompleted', handleComplete);

    return () => {
        repo.dispose(); // Cleanup on unmount
    };
}, []); // Empty deps: repo instance should remain stable
```

### Design Notes

- **Opt-in**: Events are disabled by default (zero overhead for CLI/script users)
- **Rich Payloads**: Events include complete information (stats, error details)
- **Concurrent Calls**: Multiple concurrent calls result in one event (matches API behavior)
- **Browser Compatible**: Uses `events` package (Node.js EventEmitter polyfill)

For detailed design rationale, see [DESIGN_EVENTS.md](DESIGN_EVENTS.md).

## Notes

- `setupSnapshot` and `refreshSnapshot` are the only methods that
  perform HTTP calls. All other methods are pure in-memory operations.
- The repository does not enforce a particular snapshot size or fetch
  strategy at the type level. Those decisions live in the concrete
  implementation and can evolve without changing the public API.
- `isExpired` in `ProtopediaInMemoryRepositoryStats` comes from the
  underlying `PrototypeInMemoryStore` TTL logic. You can use it directly or
  implement your own policy based on `cachedAt`.
- Events are optional and disabled by default. Enable with `enableEvents: true` for WebApp scenarios.
