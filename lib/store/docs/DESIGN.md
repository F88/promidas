---
lang: en
title: Store Design
title-en: Store Design
title-ja: ストア設計
related:
    - ../../../README.md "Project Overview"
    - USAGE.md "Store Usage"
instructions-for-ais:
    - This document should be written in English for AI readability.
    - Content within code fences may be written in languages other than English.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document.
---

# Memorystore Design Notes

These notes capture how upstream ProtoPedia payload sizes influence the
in-memory `PrototypeInMemoryStore` design in this repository. In particular,
they document:

- How large the canonical `listPrototypes` responses get for different
  limits.
- How much memory a full in-memory snapshot of `NormalizedPrototype`
  objects consumes at 1,000–10,000 items.
- Why a 30 MiB payload guard is used as a safety rail for SPA and
  Node.js consumers.

## Upstream Payload Size Snapshot (2025-10-24)

| API                   | limit  | size or rows | duration (ms) | res body size (bytes) |
| --------------------- | ------ | ------------ | ------------- | --------------------- |
| listPrototypes        | 1      | 1            | 3,388         | 1,078                 |
| listPrototypes        | 100    | 100          | 3,172         | 209,569               |
| listPrototypes        | 1,000  | 1,000        | 3,405         | 2,576,303             |
| listPrototypes        | 10,000 | 5,644        | 4,777         | 15,444,297            |
| downloadPrototypesTsv | 1      | 2            | 3,332         | 749                   |
| downloadPrototypesTsv | 100    | 101          | 3,210         | 41,279                |
| downloadPrototypesTsv | 1,000  | 1,001        | 3,246         | 439,941               |
| downloadPrototypesTsv | 10,000 | 5,645        | 3,538         | 3,254,374             |

These figures originate from ProtoPedia API Ver 2.0 Client documentation and are reproduced here for ease of reference.

## Design Notes

For this project, the key takeaway from the upstream snapshot is that
the canonical `listPrototypes` payload grows roughly linearly with the
number of items and reaches about 16.5 MB (≈20 MB including metadata)
for 10,000 items.

The in-memory `PrototypeInMemoryStore` used in this repository:

- Keeps a single canonical snapshot of `NormalizedPrototype` objects.
- Enforces a hard payload guard of 30 MiB using an approximate
  size estimator.
- Targets use cases around a few thousand to ~10,000 prototypes for
  SPA and Node.js applications.

Performance and memory measurements from `lib/store/store.perf.test.ts`
show that, for the current `NormalizedPrototype` shape:

- ≈1,000 items → snapshot ≈0.3 MB
- ≈3,000 items → snapshot ≈0.9 MB
- ≈5,000 items → snapshot ≈1.6 MB
- ≈10,000 items → snapshot ≈3.2 MB

Taken together with the 30 MiB guard, this suggests that the
memorystore comfortably supports SPA use cases that keep a
full in-memory snapshot of several thousand prototypes while staying
within a single-digit MB footprint. The guard mainly protects against
future upstream growth (more fields or much larger text bodies) rather
than current data volumes.

### Handling Duplicate IDs

The `PrototypeInMemoryStore` enforces ID uniqueness to maintain data consistency within its internal state.

**Design Decision**:
When `setAll(prototypes)` is called with an array containing duplicate prototype IDs, the store processes these duplicates with a "last-one-wins" strategy. Specifically:

1. The input `prototypes` array is used to build an internal `Map` (`prototypeIdIndex`), where each `prototype.id` serves as a key. Due to the nature of `Map`s, if an ID appears multiple times, the last prototype associated with that ID in the input array will overwrite previous entries.
2. The internal ordered array (`this.prototypes`, returned by `getAll()`) is then reconstructed by taking the `values()` from this `prototypeIdIndex`.

**Rationale**:

- **Consistency**: This approach guarantees that `store.size` (the number of unique prototypes by ID) always matches `store.getAll().length`. This prevents confusing inconsistencies where the total count might differ from the number of items actually accessible via `getByPrototypeId()`.
- **Predictability**: `getByPrototypeId(id)` will consistently retrieve the same object instance found in the `getAll()` list, which corresponds to the last prototype provided for that ID during the `setAll` call.
- **Simplicity**: Avoids complex error handling or explicit deduplication logic at the input stage, relying on standard `Map` behavior. Callers are implicitly informed that ID uniqueness is enforced internally.

## Test Coverage

The memorystore implementation is thoroughly tested:

- **Performance tests**: `lib/store/store.perf.test.ts` validates performance characteristics with 1,000–10,000 items
- **Unit tests**: `lib/store/store.test.ts` with 50 test cases covering all core functionality
- **Integration tests**: `lib/repository/__tests__/` with 44 test cases
- **Overall coverage**: 98.01% statements, 92.15% branches, 100% functions

These measurements are based on the test suite as of 2025-12-05 and should be revisited if the upstream schema or `NormalizedPrototype` shape changes significantly.

## Logger Configuration Design

The `PrototypeInMemoryStore` follows the Fastify-style logger configuration pattern, accepting both `logger?: Logger` and `logLevel?: LogLevel` parameters.

### Configuration Patterns

#### Pattern 1: Default Logger with Custom Level

When no logger is provided, the store creates a `ConsoleLogger` with the specified log level:

```ts
const store = new PrototypeInMemoryStore({
    logLevel: 'debug', // Creates ConsoleLogger('debug')
});
```

#### Pattern 2: Custom Logger with Level Override

When a custom logger is provided with a log level, the store attempts to update the logger's level property if mutable:

```ts
import { createConsoleLogger } from '@f88/promidas/logger';

const logger = createConsoleLogger(); // level: 'info'
const store = new PrototypeInMemoryStore({
    logger,
    logLevel: 'warn', // Updates logger.level to 'warn' if mutable
});
```

#### Pattern 3: Custom Logger Only

When only a custom logger is provided, it is used as-is without modification:

```ts
const customLogger = new MyCustomLogger();
const store = new PrototypeInMemoryStore({
    logger: customLogger, // Used without modification
});
```

### Design Rationale

1. **Consistency**: Follows the same pattern as other components in the library (fetcher, repository), providing a unified configuration experience.

2. **Flexibility**: Supports both simple (logLevel-only) and advanced (custom logger) use cases without forcing users to create logger instances for basic scenarios.

3. **Fastify Compatibility**: Aligns with widely-adopted patterns from the Fastify ecosystem, making the API familiar to Node.js developers.

4. **Type Safety**: The `logLevel` parameter is type-checked against the `LogLevel` union type, preventing invalid level strings at compile time.

### Logger Usage in Store Operations

The store uses logging for:

- **Initialization**: Records TTL, size limits, and log level configuration
- **Snapshot Updates**: Logs when prototypes are cached via `setAll()`
- **Size Violations**: Warns when payload size exceeds configured limits
- **State Changes**: Tracks refresh operations and cache invalidation

## Error Handling Design

The store uses exception-based error handling with explicit data state tracking to ensure safe and predictable failure behavior.

### Design Rationale

**Why Exceptions Over Null Returns**:

- **Explicit Error Information**: Exceptions carry rich context (data sizes, error causes) that null values cannot provide
- **Type Safety**: Return type is non-nullable, eliminating need for null checks at call sites
- **Fail-Fast**: Errors surface immediately rather than propagating as silent null values
- **Composability**: Exceptions naturally propagate through async call stacks without explicit checks

### Error Classes Hierarchy

```typescript
StoreError (base)
├── ConfigurationError
├── DataSizeExceededError
└── SizeEstimationError
```

**Base Class**: `StoreError`

- Extends native `Error`
- Includes `dataState: StoreDataState` property
- Provides common foundation for all store-specific errors

**Specialized Errors**:

- `ConfigurationError`: Invalid store configuration
    - Thrown during construction when configuration parameters are invalid
    - Example: `maxDataSizeBytes` exceeds 30 MiB hard limit
    - Context: No store instance exists yet, so `dataState` is always `'UNKNOWN'`

- `DataSizeExceededError`: Payload exceeds `maxDataSizeBytes`
    - Properties: `dataSizeBytes`, `maxDataSizeBytes`
    - Context: Includes both actual and maximum sizes for debugging

- `SizeEstimationError`: JSON serialization failure
    - Property: `cause?: Error` (original error, e.g., circular reference)
    - Context: Preserves stack trace of underlying serialization error

### Data State Tracking

The `dataState` property indicates whether the store's data was affected when an error occurred:

```typescript
type StoreDataState = 'UNCHANGED' | 'UNKNOWN';
```

- **`'UNCHANGED'`**: Store data remains intact (safe to continue using)
- **`'UNKNOWN'`**: Data state is uncertain (extensibility for future cases)

### Atomic Operations Guarantee

The store guarantees atomicity for `setAll()` operations:

1. **Validation Phase** (before any store updates):
    - Deduplication: Creates local `Map` (no store mutation)
    - Size estimation: Calculates size (may throw `SizeEstimationError`)
    - Size check: Validates against limit (may throw `DataSizeExceededError`)

2. **Update Phase** (after all validation passes):
    - Replace `prototypeIdIndex` and `prototypes` atomically
    - Update metadata (`cachedAt`, `dataSizeBytes`)

**Key Property**: If any error occurs during validation, the store remains in its previous state (`dataState: 'UNCHANGED'`). The update phase contains only simple assignments that cannot fail under normal conditions.

### Error Constructor Design

Error constructors accept `dataState` as the first parameter:

```typescript
throw new DataSizeExceededError('UNCHANGED', dataSizeBytes, maxDataSizeBytes);
throw new SizeEstimationError('UNKNOWN', cause);
```

**Rationale**:

- **Explicit State**: Forces callers to consider data state at throw site
- **Default to Unknown**: Constructor defaults to `'UNKNOWN'` for safety
- **Context-Specific**: Each call site can specify appropriate state

### Layer-Specific Responsibilities

**Low-level methods** (e.g., `estimateSize()`):

- Pure calculation functions without store context
- Throw errors with `dataState: 'UNKNOWN'` (context-agnostic)

**High-level methods** (e.g., `setAll()`):

- Catch low-level errors
- Re-throw with accurate `dataState: 'UNCHANGED'` when validation fails
- Know store update hasn't occurred yet

This layered approach keeps pure functions context-free while allowing call sites to provide accurate state information.

## Result Types

The store module provides `SetResult` types for representing `setAll` operation outcomes:

```typescript
type SetSuccess = {
    ok: true;
    stats: PrototypeInMemoryStats;
};

type SetFailure = {
    ok: false;
    origin: 'store';
    kind: StoreFailureKind;
    code: StoreErrorCode;
    message: string;
    dataState: StoreDataState;
    cause?: unknown;
};

type SetResult = SetSuccess | SetFailure;
```

**Design Decision**: The store implementation itself uses exception-based error handling (`throw`). Result types are provided as an alternative representation for consumers who prefer the Result pattern.

**Rationale**:

- **Separation of Concerns**: The store's internal implementation remains simple with exception-based flow control
- **Consumer Choice**: Callers can choose between catching exceptions or wrapping operations to return Result types
- **Type Safety**: Result types provide discriminated unions for type-safe error handling
- **Compatibility**: Aligns with the Fetcher module's Result pattern (`FetchPrototypesResult`)

See [USAGE.md](USAGE.md#result-types) for usage examples.
