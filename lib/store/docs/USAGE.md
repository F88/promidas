---
lang: en
title: Usage of PrototypeInMemoryStore
title-en: Usage of PrototypeInMemoryStore
title-ja: PrototypeInMemoryStoreの使用法
related:
    - ../../../README.md "Project Overview"
    - DESIGN.md "Store Design"
instructions-for-ais:
    - This document should be written in English for AI readability.
    - Content within code fences may be written in languages other than English.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document.
---

# Memorystore Usage Notes

This document describes how to use the `PrototypeInMemoryStore` defined in
`lib/store/store.ts`. It focuses on the public API, typical access
patterns, and how to combine the store-wide TTL with background
refresh.

For payload size and memory characteristics of the store, see
`DESIGN.md`.

## Overview

`PrototypeInMemoryStore` is an in-memory snapshot store for
`NormalizedPrototype[]` that provides:

- O(1) lookups by numeric prototype ID via an internal index.
- A store-wide TTL to help decide when to refresh data.
- A simple concurrency guard for refresh tasks.

The store is **snapshot-based**:

- `setAll` replaces the entire snapshot at once.
- There is no per-record TTL; the TTL applies to the snapshot as a
  whole.
- Even after TTL expiry, data remains readable (stale-while-revalidate).

## Public API Summary

All methods live on `PrototypeInMemoryStore` in `lib/store/store.ts`.

### Construction

- `constructor(config?: PrototypeInMemoryStoreConfig)`
    - `ttlMs?: number` – store-wide TTL in milliseconds (default: 30 minutes).
    - `maxDataSizeBytes?: number` – maximum allowed payload size in
      bytes (default: 10 MiB). Values above 30 MiB are rejected.
    - `logger?: Logger` – custom logger instance. Defaults to console logger with 'info' level.

- `getConfig(): Omit<Required<PrototypeInMemoryStoreConfig>, 'logger'>`
    - Returns the resolved configuration values (TTL and max data size) that were
      set during instantiation.

### Write operations

- `setAll(prototypes: NormalizedPrototype[]): { dataSizeBytes: number } | null`
    - Estimates the JSON payload size of `prototypes`.
    - If the payload fits within `maxDataSizeBytes`, replaces the
      internal index and ordered array, updates metadata, and returns
      `{ dataSizeBytes }`.
    - If the payload exceeds the limit, leaves the store unchanged and
      returns `null`.

- `clear(): void`
    - Resets the store to an empty state and clears all metadata.

### Read operations

- `size: number`
    - The number of prototypes currently stored.

- `getAll(): readonly DeepReadonly<NormalizedPrototype>[]`
    - Returns the latest snapshot array in its original order with
      type-level immutability protection.

- `getByPrototypeId(id: number): DeepReadonly<NormalizedPrototype> | null`
    - O(1) lookup by numeric ID via the internal prototypeIdIndex.

- `getMinPrototypeId(): number | null`
    - Returns the lowest prototype ID in the snapshot, or `null` when
      the store is empty.

- `getMaxPrototypeId(): number | null`
    - Returns the highest prototype ID in the snapshot, or `null` when
      the store is empty.

### TTL and snapshot helpers

- `getCachedAt(): Date | null`
    - Timestamp when `setAll` last updated the snapshot, or `null` if the
      store has never been populated.

- `isExpired(): boolean`
    - Returns `true` when either:
        - the store has never been populated, or
        - the duration since `cachedAt` exceeds `ttlMs`.
    - Expiry does **not** clear data; it is only a signal to refresh.

- `getSnapshot(): { data: readonly DeepReadonly<NormalizedPrototype>[]; cachedAt: Date | null; isExpired: boolean }`
    - Returns a lightweight view of the snapshot and its expiry state.

### Refresh coordination and stats

- `runExclusive(task: () => Promise<void>): Promise<void>`
    - Runs a refresh task while preventing concurrent execution.
    - If a refresh is already in flight, returns the existing promise and
      does **not** start another task.

- `isRefreshInFlight(): boolean`
    - Returns `true` if a refresh task started via `runExclusive` is still
      running.

- `getStats(): PrototypeInMemoryStats`
    - Returns a summary of the cache state and configuration.
    - Includes: size, cachedAt, isExpired, remainingTtlMs, dataSizeBytes, refreshInFlight.

## TTL and Refresh Pattern

The TTL is applied to the snapshot as a whole:

- There is no per-record expiry.
- Even after `isExpired()` becomes `true`, callers can continue to read
  data via `getByPrototypeId` and `getAll`.
- Expiry is a **hint to refresh**, not an access control mechanism.

A typical usage pattern is stale-while-revalidate:

1. Always serve data from the store when available.
2. When the snapshot is expired, trigger a background refresh via
   `runExclusive`.

### Example: Ensure Fresh Snapshot

```ts
import { PrototypeInMemoryStore } from '@f88/promidas';

async function ensureFreshSnapshot(
    store: PrototypeInMemoryStore,
    refresh: () => Promise<void>,
): Promise<void> {
    if (!store.isExpired()) {
        return;
    }

    // Fire and forget: callers do not need to await the refresh
    void store.runExclusive(refresh);
}
```

### Example: Read-Then-Refresh Flow

```ts
async function getPrototypeById(
    store: PrototypeInMemoryStore,
    id: number,
    refresh: () => Promise<void>,
) {
    await ensureFreshSnapshot(store, refresh);

    // May still return stale data while the refresh is in flight.
    // This is usually acceptable for ProtoPedia-like use cases.
    return store.getByPrototypeId(id);
}
```

## Example Refresh Function

A refresh function is responsible for fetching the canonical dataset,
normalizing it, and calling `setAll`. The exact fetching logic lives
outside the store.

```ts
import type { ProtoPediaApiClient } from 'protopedia-api-v2-client';
import { PrototypeInMemoryStore } from './lib/store';

async function fetchAllPrototypesNormalized(
    client: ProtoPediaApiClient,
): Promise<NormalizedPrototype[]> {
    // Pseudo-code: perform paginated or bulk fetch and normalize.
    // This function is application-specific and lives outside the store.
}

async function refreshAll(
    store: PrototypeInMemoryStore,
    client: ProtoPediaApiClient,
): Promise<void> {
    const data = await fetchAllPrototypesNormalized(client);
    store.setAll(data);
}
```

In practice, you would wire these pieces together as follows:

```ts
const store = new PrototypeInMemoryStore();

async function refreshTask(client: ProtoPediaApiClient): Promise<void> {
    await refreshAll(store, client);
}

// Somewhere in your request handling or UI logic:
await ensureFreshSnapshot(store, refreshTask);
const prototype = store.getByPrototypeId(123);
```

## Notes

- The default TTL is 30 minutes.
- The default `maxDataSizeBytes` is 10 MiB; maximum allowed is 30 MiB.
  Configuring larger limits is rejected to avoid oversized payloads.
- For measured memory usage and payload sizes at 1,000–10,000 items,
  see `DESIGN.md` and `lib/store/store.perf.test.ts`.
