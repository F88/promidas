---
lang: en
title: Repository Design
title-en: Repository Design
title-ja: リポジトリ設計
related:
    - ../../../README.md "Project Overview"
    - USAGE.md "Repository Usage"
instructions-for-ais:
    - This document should be written in English for AI readability.
    - Content within code fences may be written in languages other than English.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document.
---

# Repository Design

This document describes the architecture, design decisions, and implementation patterns of the ProtoPedia in-memory repository.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Design Patterns](#design-patterns)
- [Performance Optimizations](#performance-optimizations)
- [Error Handling Strategy](#error-handling-strategy)
- [Validation Approach](#validation-approach)
- [Concurrency Considerations](#concurrency-considerations)
- [Future Enhancements](#future-enhancements)

## Architecture Overview

### Component Layers

```plaintext
┌─────────────────────────────────────────────────────────┐
│  Application Layer (Consumer Code)                      │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  Factory Layer                                          │
│  - createPromidasForLocal() / createPromidasForServer() │
│  - PromidasRepositoryBuilder                            │
│  - Dependency injection & configuration validation      │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  Repository Layer (ProtopediaInMemoryRepositoryImpl)    │
│  - Snapshot lifecycle management                       │
│  - Data access coordination                            │
│  - Result type transformation                          │
└─────────────────────────────────────────────────────────┘
                │                         │
        ┌───────┘                         └───────┐
        ▼                                         ▼
┌──────────────────────┐              ┌──────────────────────┐
│  Store Layer         │              │  Fetcher Layer       │
│  (Memory Management) │              │  (HTTP Client)       │
│  - PrototypeInMemory │              │  - API v2 Client     │
│    Store             │              │  - Error handling    │
│  - TTL management    │              │  - Normalization     │
│  - Exclusive locking │              │                      │
└──────────────────────┘              └──────────────────────┘
```

### Dependency Flow

- **Factory → Repository**: Instantiation and configuration
- **Repository → Store**: Snapshot storage and retrieval
- **Repository → Fetcher**: API data fetching
- **Store ↔ Repository**: Bidirectional for data operations

## Design Patterns

### 1. Repository Pattern

**Purpose**: Abstracts data access logic from business logic

**Benefits**:

- Clean separation of concerns
- Easier testing through interface mocking
- Flexibility to change data source (e.g., API → database)
- Consistent data access patterns

**Implementation**:

```typescript
// Interface defines contract
export interface ProtopediaInMemoryRepository {
    setupSnapshot(
        params: ListPrototypesParams,
    ): Promise<SnapshotOperationResult>;
    getPrototypeFromSnapshotByPrototypeId(
        id: number,
    ): Promise<NormalizedPrototype | null>;
    // ... other methods
}

// Implementation is hidden behind factory functions
export const createPromidasForLocal = (options?: {
    protopediaApiToken?: string;
}): ProtopediaInMemoryRepository => {
    return new PromidasRepositoryBuilder()
        .setDefaultLogLevel('info')
        .setStoreConfig({ ttlMs: 30 * 60 * 1000 })
        .setApiClientConfig({
            protoPediaApiClientOptions: {
                token:
                    options?.protopediaApiToken ??
                    process.env.PROTOPEDIA_API_V2_TOKEN,
                timeout: 90_000,
            },
        })
        .build();
};
```

### 2. Factory Pattern

**Purpose**: Encapsulate object creation complexity

**Benefits**:

- Hides implementation details (class constructor)
- Allows dependency injection
- Future-proof: can change implementation without breaking clients
- Enables instance caching or pooling if needed

**Trade-offs**:

- Additional layer of indirection
- Slightly more complex for simple use cases

**Decision**: Benefits outweigh costs for library code

### 3. Result Type Pattern

**Purpose**: Explicit error handling without exceptions

**Implementation**:

```typescript
type SnapshotOperationResult =
    | { ok: true; size: number; cachedAt: Date }
    | { ok: false; error: string; status?: number; code?: string };
```

**Benefits**:

- Type-safe error handling
- Forces error consideration at call site
- No unexpected exceptions for network errors
- Rich error context (status codes, error codes)

**Comparison with exceptions**:

| Approach  | Type Safety | Explicit | Performance | Context    |
| --------- | ----------- | -------- | ----------- | ---------- |
| Result    | ✅ Strong   | ✅ Yes   | ✅ Fast     | ✅ Rich    |
| Exception | ⚠️ Weak     | ❌ No    | ⚠️ Slower   | ⚠️ Limited |

### 4. Snapshot Isolation

**Purpose**: Immutable, point-in-time data view

**Characteristics**:

- All reads from memory (no network I/O)
- Data is read-only (`DeepReadonly<T>`)
- Explicit refresh operations only
- TTL-based expiration tracking

**Benefits**:

- Predictable performance (O(1) or O(n))
- No race conditions between reads
- Simple consistency model
- Cache-friendly for repeated queries

### 5. Private Field Encapsulation

**Implementation**: ECMAScript private fields (`#field`)

```typescript
export class ProtopediaInMemoryRepositoryImpl {
    #store: PrototypeInMemoryStore; // Private, not accessible
    #apiClient: ApiClient; // Private
    #lastFetchParams: ListPrototypesParams; // Private state
}
```

**Benefits**:

- True privacy (not just convention)
- TypeScript and runtime enforcement
- Prevents accidental access/modification
- Better abstraction boundaries

## Performance Optimizations

### 1. Lazy Initialization

**Pattern**: Store and API client created in constructor, but no network calls

**Benefit**: Fast instantiation, deferred cost until `setupSnapshot()`

### 2. O(1) Lookups

**Implementation**: `getPrototypeFromSnapshotByPrototypeId()` uses Map internally

**Performance**: Constant time regardless of dataset size

**Trade-off**: Higher memory usage vs. linear search

### 3. Hybrid Sampling Algorithm

**Problem**: Random sampling efficiency varies with sample size

**Solution**: Adaptive strategy based on sample size ratio

```typescript
const SAMPLE_SIZE_THRESHOLD_RATIO = 0.5;

if (size / total < SAMPLE_SIZE_THRESHOLD_RATIO) {
    // Small sample: Set-based random selection (O(size))
    // Avoids shuffling entire array
} else {
    // Large sample: Fisher-Yates shuffle (O(n))
    // More efficient than repeated random selection
}
```

**Measured Results** (see `data-access.perf.test.ts`):

- 10% sample from 10,000: ~2ms
- 60% sample from 10,000: ~5ms
- Crossover point: ~50% ratio

### 4. Efficient Empty Checks

**Anti-pattern**:

```typescript
if (store.getAll().length === 0) // O(n) - creates array, counts
```

**Optimized**:

```typescript
if (store.size === 0) // O(1) - reads counter
```

**Impact**: Negligible for small datasets, significant for 10,000+ items

### 5. Parameter Validation

**Strategy**: Validate once at entry, trust internally

```typescript
// Entry point validates
async getPrototypeFromSnapshotByPrototypeId(id: number) {
  prototypeIdSchema.parse(id); // Zod validation
  return this.#store.get(id);   // Internal method trusts input
}
```

**Benefit**: Prevents redundant validation in call chains

## Error Handling Strategy

### Design Principle

**Explicit over Implicit**: Use Result types for expected failures, exceptions only for programmer errors

### Error Categories

| Category         | Example         | Handling Strategy         |
| ---------------- | --------------- | ------------------------- |
| Network Error    | ECONNREFUSED    | Result type (`ok: false`) |
| HTTP Error       | 404, 500        | Result type with status   |
| Validation Error | Invalid ID type | Throw ZodError            |
| Programmer Error | Null reference  | Let crash (fail fast)     |

### Network Error Flow

```typescript
async setupSnapshot() {
  try {
    const apiResult = await this.#apiClient.fetchPrototypes();

    if (!apiResult.ok) {
      // HTTP error - return as Result
      return {
        ok: false,
        error: apiResult.error,
        status: apiResult.status,
        code: apiResult.details?.res?.code
      };
    }

    // Success path
    await this.#store.setAll(apiResult.data);
    return { ok: true, size: apiResult.data.length, ... };

  } catch (error) {
    // Network exception - convert to Result
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

### Snapshot Preservation on Error

**Guarantee**: Failed `refreshSnapshot()` never corrupts existing snapshot

**Implementation**: Store's `runExclusive()` provides atomicity

**Benefit**: Graceful degradation - stale data better than no data

## Validation Approach

### Zod Schema Validation

**Why Zod**:

- Runtime type validation (TypeScript only at compile-time)
- Rich error messages
- Schema composition and transformation
- TypeScript integration

**Schemas**:

```typescript
// lib/repository/schemas/validation.ts
export const prototypeIdSchema = z.number().int().positive();
export const sampleSizeSchema = z.number().int();
```

### Validation Points

1. **Public API entry points**: Validate all user inputs
2. **Internal methods**: Assume valid (validated at boundary)
3. **Configuration**: Validate at factory, not constructor

### Error Propagation

```typescript
try {
    prototypeIdSchema.parse(id);
} catch (error) {
    // Let ZodError propagate to caller
    // Caller can catch and convert to Result if needed
    throw error;
}
```

**Decision**: Validation errors are programmer errors, not runtime errors

## Concurrency Considerations

### Current State

**Single-threaded assumption**: JavaScript concurrency model is sufficient

**Protection**: Store's `runExclusive()` prevents concurrent modifications

### Known Limitations

1. **No Promise reuse**: Multiple simultaneous `setupSnapshot()` calls create multiple HTTP requests
2. **Last-write-wins**: Concurrent refreshes may overwrite with older data
3. **No request coalescing**: Stampeding herd problem not addressed

### Future Considerations (See Issues)

**Issue #17**: Add concurrency control for `refreshSnapshot()`

**Proposed solution**:

```typescript
#ongoingFetch: Promise<SnapshotOperationResult> | null = null;

async refreshSnapshot() {
  if (this.#ongoingFetch) {
    return this.#ongoingFetch; // Reuse in-flight request
  }

  this.#ongoingFetch = this.#performRefresh();
  try {
    return await this.#ongoingFetch;
  } finally {
    this.#ongoingFetch = null;
  }
}
```

**Trade-off**: Increased complexity vs. better resource utilization

## Future Enhancements

### Tracked in GitHub Issues

| Issue | Enhancement            | Priority | Complexity |
| ----- | ---------------------- | -------- | ---------- |
| #17   | Concurrency control    | High     | Medium     |
| #18   | Incremental updates    | Medium   | High       |
| #19   | Event notifications    | Medium   | Medium     |
| #20   | Deterministic sampling | Low      | Low        |
| #21   | Unified config object  | Low      | Low        |

### Not Currently Planned

1. **Persistent storage**: Would change snapshot semantics fundamentally
2. **Query DSL**: Keep API simple, filtering in application code
3. **Automatic refresh**: TTL checking yes, auto-refresh no (explicit control)
4. **Pagination**: Fetch entire dataset, slice in memory

### Extensibility Points

**Custom normalization**:
Currently hardcoded in fetcher. Could be injected if needed.

**Custom sampling algorithms**:
Current hybrid approach works well. Could accept strategy pattern if use cases emerge.

**Multiple snapshots**:
Not supported. Would require significant redesign. Use multiple repository instances instead.

## Design Decisions Log

### 1. Why Factory over Constructor Export?

**Decision**: Export factory function, not class

**Reasoning**:

- Abstraction: Hide implementation details
- Flexibility: Can change implementation without breaking API
- Convention: Matches common TypeScript library patterns

**Trade-off**: Extra indirection vs. better encapsulation

### 2. Why Result Type over Exceptions?

**Decision**: Use Result type for network operations

**Reasoning**:

- Expected failures (network errors) shouldn't be exceptions
- TypeScript type system helps ensure error handling
- Better developer experience (explicit contracts)

**Trade-off**: More verbose vs. better type safety

### 3. Why Snapshot over Streaming?

**Decision**: Full snapshot replacement, not incremental updates

**Reasoning**:

- Simpler consistency model
- Predictable memory usage
- Faster reads (no partial data states)
- Sufficient for current dataset sizes (<10,000 items)

**Trade-off**: Memory/bandwidth vs. simplicity

**Reconsider when**: Dataset exceeds 50,000 items (see Issue #18)

### 4. Why Independent Logger Config?

**Decision**: Store and API client can have separate loggers

**Reasoning**:

- Granular observability (different log levels per concern)
- Flexibility for production debugging
- No coupling between components

**Trade-off**: Slight API complexity vs. better observability

### 5. Why Hybrid Sampling?

**Decision**: Adaptive algorithm based on sample size ratio

**Reasoning**:

- Performance testing showed clear crossover point at ~50%
- Set-based approach faster for small samples
- Fisher-Yates faster for large samples
- No single algorithm optimal for all cases

**Measured**: See `data-access.perf.test.ts` for benchmarks

---

**Document Version**: 1.1.0
**Last Updated**: 2025-12-13
**Related Issues**: #12, #13, #14, #15, #17-#21, #32
