---
lang: en
title: Usage of PrototypeMapStore
title-en: Usage of PrototypeMapStore
title-ja: PrototypeMapStoreの使用法
related:
    - README.md "Project Overview"
    - STORE-DESIGN.md "Store Design"
instructions-for-ais:
    - This document should be written in English for AI readability.
    - Content within code fences may be written in languages other than English.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document.
---

# Memorystore Usage Notes

This document describes how to use the `PrototypeMapStore` defined in
`lib/core/store.ts`. It focuses on the public API, typical access
patterns, and how to combine the store-wide TTL with background
refresh.

For payload size and memory characteristics of the store, see
`STORE-DESIGN.md`.

## Overview

`PrototypeMapStore` is an in-memory snapshot store for
`NormalizedPrototype[]` that provides:

- O(1) lookups by numeric prototype ID.
- Constant-time random selection from the current snapshot.
- A store-wide TTL to help decide when to refresh data.
- A simple concurrency guard for refresh tasks.

The store is **snapshot-based**:

- `setAll` replaces the entire snapshot at once.
- There is no per-record TTL; the TTL applies to the snapshot as a
  whole.
- Even after TTL expiry, data remains readable (stale-while-revalidate).

## Public API Summary

All methods live on `PrototypeMapStore` in `lib/core/store.ts`.

### Construction

- `constructor(config?: PrototypeMapStoreConfig)`
    - `ttlMs?: number` – store-wide TTL in milliseconds.
    - `maxPayloadSizeBytes?: number` – maximum allowed payload size in
      bytes (default: 30 MiB). Values above 30 MiB are rejected.

### Write operations

- `setAll(prototypes: NormalizedPrototype[]): { approxSizeBytes: number } | null`
    - Estimates the JSON payload size of `prototypes`.
    - If the payload fits within `maxPayloadSizeBytes`, replaces the
      internal map and ordered array, updates metadata, and returns
      `{ approxSizeBytes }`.
    - If the payload exceeds the limit, leaves the store unchanged and
      returns `null`.

- `clear(): void`
    - Resets the store to an empty state and clears all metadata.

### Read operations

- `size: number`
    - The number of prototypes currently stored.

- `getAll(): NormalizedPrototype[]`
    - Returns the latest snapshot array in its original order.

- `getById(id: number): NormalizedPrototype | undefined`
    - O(1) lookup by numeric ID.

- `getRandom(): NormalizedPrototype | null`
    - Returns a random prototype from the current snapshot, or `null`
      when the store is empty.

- `getMaxId(): number | null`
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

- `getSnapshot(): { data: NormalizedPrototype[]; cachedAt: Date | null; isExpired: boolean }`
    - Returns a lightweight view of the snapshot and its expiry state.

### Refresh coordination and stats

- `runExclusive(task: () => Promise<void>): Promise<void>`
    - Runs a refresh task while preventing concurrent execution.
    - If a refresh is already in flight, returns the existing promise and
      does **not** start another task.

- `isRefreshInFlight(): boolean`
    - Returns `true` if a refresh task started via `runExclusive` is still
      running.

- `getStats(): { size: number; cachedAt: Date | null; ttlMs: number; isExpired: boolean; approxSizeBytes: number; refreshInFlight: boolean }`
    - Returns a summary of the cache state and configuration.

## TTL and Refresh Pattern

The TTL is applied to the snapshot as a whole:

- There is no per-record expiry.
- Even after `isExpired()` becomes `true`, callers can continue to read
  data via `getById`, `getRandom`, and `getAll`.
- Expiry is a **hint to refresh**, not an access control mechanism.

A typical usage pattern is stale-while-revalidate:

1. Always serve data from the store when available.
2. When the snapshot is expired, trigger a background refresh via
   `runExclusive`.

### Example: Ensure Fresh Snapshot

```ts
import { PrototypeMapStore } from './lib/core/store';

async function ensureFreshSnapshot(
    store: PrototypeMapStore,
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
async function getRandomPrototype(
    store: PrototypeMapStore,
    refresh: () => Promise<void>,
) {
    await ensureFreshSnapshot(store, refresh);

    // May still return stale data while the refresh is in flight.
    // This is usually acceptable for ProtoPedia-like use cases.
    return store.getRandom();
}
```

## Example Refresh Function

A refresh function is responsible for fetching the canonical dataset,
normalizing it, and calling `setAll`. The exact fetching logic lives
outside the store.

```ts
import type { ProtoPediaApiClient } from 'protopedia-api-v2-client';
import { PrototypeMapStore } from './lib/core/store';

async function fetchAllPrototypesNormalized(
    client: ProtoPediaApiClient,
): Promise<NormalizedPrototype[]> {
    // Pseudo-code: perform paginated or bulk fetch and normalize.
    // This function is application-specific and lives outside the store.
}

async function refreshAll(
    store: PrototypeMapStore,
    client: ProtoPediaApiClient,
): Promise<void> {
    const data = await fetchAllPrototypesNormalized(client);
    store.setAll(data);
}
```

In practice, you would wire these pieces together as follows:

```ts
const store = new PrototypeMapStore();

async function refreshTask(client: ProtoPediaApiClient): Promise<void> {
    await refreshAll(store, client);
}

// Somewhere in your request handling or UI logic:
await ensureFreshSnapshot(store, refreshTask);
const prototype = store.getRandom();
```

## Notes

- The default TTL is 30 minutes.
- The default `maxPayloadSizeBytes` is 30 MiB; configuring larger limits
  is rejected to avoid oversized payloads.
- For measured memory usage and payload sizes at 1,000–10,000 items,
  see `STORE-DESIGN-NOTES.md` and `lib/core/store.perf.test.ts`.
