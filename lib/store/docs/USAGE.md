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
    - `logLevel?: LogLevel` – log level for default logger (only used when `logger` is not provided).

#### Logger Configuration

The store accepts both `logger` and `logLevel` parameters. When no logger is provided, a `ConsoleLogger` is created with the specified level (default: `'info'`).

```ts
import { PrototypeInMemoryStore } from '@f88/promidas/store';

// Default logger with 'info' level
const store1 = new PrototypeInMemoryStore({ ttlMs: 30000 });

// Custom log level
const store2 = new PrototypeInMemoryStore({
    ttlMs: 30000,
    logLevel: 'warn',
});

// Custom logger
import { createConsoleLogger } from '@f88/promidas/logger';
const store3 = new PrototypeInMemoryStore({
    ttlMs: 30000,
    logger: createConsoleLogger('debug'),
});
```

For custom logger integration (e.g., Winston, Pino), see [lib/logger/README.md](../../logger/README.md).

- `getConfig(): Omit<Required<PrototypeInMemoryStoreConfig>, 'logger'>`
    - Returns the resolved configuration values (TTL and max data size) that were
      set during instantiation.

### Write operations

- `setAll(prototypes: NormalizedPrototype[]): { dataSizeBytes: number }`
    - Estimates the JSON payload size of `prototypes`.
    - If the payload fits within `maxDataSizeBytes`, replaces the
      internal index and ordered array, updates metadata, and returns
      `{ dataSizeBytes }`.
    - **Throws** `DataSizeExceededError` when the payload exceeds the limit.
    - **Throws** `SizeEstimationError` when JSON serialization fails (e.g., circular references).
    - If duplicate IDs exist in the input array, the last occurrence wins
      (see [DESIGN.md](DESIGN.md#handling-duplicate-ids) for details).
    - **Error Safety**: When an error is thrown, the store is NOT modified.
      Previously stored data remains intact and accessible.

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

- `getPrototypeIds(): readonly number[]`
    - Returns an array of all cached prototype IDs.
    - Useful for ID-only operations without loading full objects.

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

## Error Handling

### Configuration Errors

The constructor throws `ConfigurationError` when invalid configuration is provided:

```typescript
import { ConfigurationError } from '@f88/promidas/store';

try {
    const store = new PrototypeInMemoryStore({
        maxDataSizeBytes: 50 * 1024 * 1024, // 50 MiB exceeds 30 MiB limit
    });
} catch (error) {
    if (error instanceof ConfigurationError) {
        console.error('Invalid configuration:', error.message);
    }
}
```

### Operation Errors

`setAll()` throws specific error types when validation fails. All errors guarantee that store data remains unchanged. For design details, see [DESIGN.md](DESIGN.md#error-handling-design).

```typescript
import {
    DataSizeExceededError,
    SizeEstimationError,
} from '@f88/promidas/store';

try {
    const result = store.setAll(prototypes);
    console.log(`Stored ${result.dataSizeBytes} bytes`);
} catch (error) {
    if (error instanceof DataSizeExceededError) {
        console.error(
            `Data too large: ${error.dataSizeBytes} bytes ` +
                `(max: ${error.maxDataSizeBytes})`,
        );
    } else if (error instanceof SizeEstimationError) {
        console.error('Invalid data structure:', error.cause);
    } else {
        throw error;
    }
}
```

## Result Types

The store module provides Result types for representing `setAll` operation outcomes in a type-safe manner:

```typescript
import {
    PrototypeInMemoryStore,
    DataSizeExceededError,
    SizeEstimationError,
    type SetResult,
} from '@f88/promidas/store';
```

**Note**: `PrototypeInMemoryStore` methods throw exceptions directly. These Result types are provided for consumers who prefer the Result pattern over exception-based error handling.

### Type Definitions

```typescript
// Success result
type SetSuccess = {
    ok: true;
    stats: PrototypeInMemoryStats;
};

// Failure result
type SetFailure = {
    ok: false;
    origin: 'store';
    kind: StoreFailureKind; // 'storage_limit' | 'serialization' | 'unknown'
    code: StoreErrorCode; // 'STORE_CAPACITY_EXCEEDED' | 'STORE_SERIALIZATION_FAILED' | 'STORE_UNKNOWN'
    message: string;
    dataState: StoreDataState; // 'UNCHANGED' | 'CLEARED' | 'UNKNOWN'
    cause?: unknown;
};

// Combined result
type SetResult = SetSuccess | SetFailure;
```

### Usage Example

```typescript
function wrapSetAll(
    store: PrototypeInMemoryStore,
    data: NormalizedPrototype[],
): SetResult {
    try {
        store.setAll(data);
        return {
            ok: true,
            stats: store.getStats(),
        };
    } catch (error) {
        if (error instanceof DataSizeExceededError) {
            return {
                ok: false,
                origin: 'store',
                kind: 'storage_limit',
                code: 'STORE_CAPACITY_EXCEEDED',
                message: error.message,
                dataState: error.dataState,
                cause: error,
            };
        }
        if (error instanceof SizeEstimationError) {
            return {
                ok: false,
                origin: 'store',
                kind: 'serialization',
                code: 'STORE_SERIALIZATION_FAILED',
                message: error.message,
                dataState: error.dataState,
                cause: error,
            };
        }
        // Fallback for unexpected errors
        return {
            ok: false,
            origin: 'store',
            kind: 'unknown',
            code: 'STORE_UNKNOWN',
            message: error instanceof Error ? error.message : String(error),
            dataState: 'UNKNOWN',
            cause: error,
        };
    }
}
```

## Notes

- The default TTL is 30 minutes.
- The default `maxDataSizeBytes` is 10 MiB; maximum allowed is 30 MiB.
  Configuring larger limits is rejected to avoid oversized payloads.
- For measured memory usage and payload sizes at 1,000–10,000 items,
  see `DESIGN.md` and `lib/store/store.perf.test.ts`.
