---
lang: en
title: Fetcher Design
title-en: Fetcher Design
title-ja: フェッチャー設計
related:
    - ../../../README.md "Project Overview"
    - USAGE.md "Fetcher Usage"
instructions-for-ais:
    - This document should be written in English for AI readability.
    - Content within code fences may be written in languages other than English.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document.
---

# Fetcher Design

This document describes the architecture, design decisions, and implementation patterns of the ProtoPedia API fetcher layer.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Design Patterns](#design-patterns)
- [Error Handling Strategy](#error-handling-strategy)
- [Normalization Approach](#normalization-approach)
- [Type Safety](#type-safety)
- [Integration Points](#integration-points)

For download progress tracking design, see [DESIGN_PROGRESS.md](DESIGN_PROGRESS.md).

## Architecture Overview

### Component Structure

```plaintext
┌─────────────────────────────────────────────────────────┐
│  Consumer Code (Repository, Application)                │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  ProtopediaApiCustomClient (Class)                      │
│  - fetchPrototypes() (high-level method)                │
│  - listPrototypes() (raw API access)                    │
│  - Logger management (Fastify-style)                    │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┴─────────────────┐
        ▼                                   ▼
┌───────────────────────┐         ┌───────────────────────┐
│  ProtopediaApi        │         │  Normalization Layer  │
│  CustomClient         │         │  - Data transformation│
│  - fetchPrototypes    │         │  - Type conversion    │
│  - Error handling     │         │  - Field mapping      │
└───────────────────────┘         └───────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│  protopedia-api-v2-client                               │
│  (Official ProtoPedia API Client)                       │
└─────────────────────────────────────────────────────────┘
```

### Dependency Flow

- **Consumer → ProtopediaApiCustomClient**: Requests normalized prototype data
- **Client → listPrototypes**: Delegates HTTP operations to API client
- **Client → Normalization**: Transforms raw API responses
- **API Client → HTTP**: Network communication with ProtoPedia API

### Responsibility Separation

| Layer         | Responsibility               | Does NOT Handle    |
| ------------- | ---------------------------- | ------------------ |
| Fetcher       | Result types, error messages | Direct HTTP calls  |
| API Client    | HTTP, request/response       | Data normalization |
| Normalization | Type conversion, defaults    | Network errors     |

## Design Patterns

### 1. Client-Based Pattern

**Purpose**: Encapsulate API client and provide normalized data access

**Implementation**:

```typescript
// Client class encapsulates API access and normalization
export class ProtopediaApiCustomClient {
    async fetchPrototypes(
        params: ListPrototypesParams,
    ): Promise<FetchPrototypesResult> {
        // Handles API call, error handling, and normalization
    }

    async listPrototypes(params: ListPrototypesParams) {
        // Direct access to raw API response
    }
}
```

**Benefits**:

- Single source of truth for API interactions
- Proper logger lifecycle management
- Clear separation between normalized and raw API access
- Testable with standard mocking approaches

### 2. Class-Based Client Architecture

**Purpose**: Proper state management for logger and client lifecycle

**Implementation**:

```typescript
// Client class with managed logger instance
export class ProtopediaApiCustomClient {
    readonly #client: ProtoPediaApiClient;
    readonly #logger: Logger;
    readonly #logLevel: LogLevel;

    constructor(config?: ProtopediaApiCustomClientConfig | null) {
        // Fastify-style logger configuration
        // ...logger setup...

        // SDK client creation (separate from our logger)
        this.#client = createProtoPediaClient(
            config?.protoPediaApiClientOptions ?? {},
        );
    }

    async fetchPrototypes(
        params: ListPrototypesParams,
    ): Promise<FetchPrototypesResult> {
        // Internally handles API call and normalization
        const upstream = await this.#client.listPrototypes(params);
        // ... error handling and normalization ...
        return result;
    }

    async listPrototypes(params: ListPrototypesParams) {
        return this.#client.listPrototypes(params);
    }
}
```

**Configuration Structure**:

```typescript
export type ProtopediaApiCustomClientConfig = {
    // SDK client configuration (nested)
    protoPediaApiClientOptions?: ProtoPediaApiClientOptions;
    // Our logger configuration (top-level)
    logger?: Logger;
    logLevel?: LogLevel;
};
```

**Design Rationale**:

- **Nested Config**: Clear separation between SDK settings and our logger
- **Independent Loggers**: SDK client and our error handler use separate logger instances
    - SDK client logging controlled via `protoPediaApiClientOptions.logger`
    - Error diagnostics use the class's managed logger
- **Private Fields**: Encapsulation via `#field` syntax
- **Explicit Methods**: Only expose `fetchPrototypes()` and `listPrototypes()`

**Benefits**:

- Proper logger lifecycle management
- Constructor logging for debugging instantiation
- Logger passed throughout the call chain (client → fetcher → error handler)
- Consistent with lib/store and lib/repository architecture

### 3. Result Type Pattern

**Purpose**: Type-safe error handling without exceptions

**Implementation**:

```typescript
export type FetchPrototypesResult =
    | { ok: true; data: NormalizedPrototype[] }
    | FetchPrototypesFailure;

type FetchPrototypesFailure = {
    ok: false;
    origin: 'fetcher';
    kind: FetchFailureKind; // http | cors | network | timeout | abort | unknown
    error: string;
    status?: number;
    code: FetcherErrorCode; // canonical code; details.res.code keeps upstream/raw
    details: NetworkFailure['details'];
};

// This includes: status?: number, details: { req?: {...}, res?: {...} }
```

The fetcher always sets `origin: 'fetcher'`, a coarse `kind`, and a canonical
`code` (with fallback `UNKNOWN`) so consumers can branch without parsing
messages. Upstream or socket codes remain in `details.res.code` for diagnostics.

**Benefits**:

- Compile-time guarantee that errors are handled
- Rich error context (status codes, API error details)
- No hidden exceptions in network layer
- Easier to test both success and failure paths

**Comparison with exception-based approach**:

| Approach        | Error Handling              | Type Safety  | Testing        |
| --------------- | --------------------------- | ------------ | -------------- |
| Result Type     | Explicit in return type     | Compile-time | Easy to mock   |
| Exception-based | Hidden (try/catch required) | Runtime      | Harder to test |

**Benefits**:

- Consistent error formatting
- Testable message logic
- Separates presentation from error handling
- Easy to internationalize later

## Download Progress Tracking

For download progress tracking design, including event types, error handling, and architecture, see [DESIGN_PROGRESS.md](DESIGN_PROGRESS.md).

## Error Handling Strategy

### Error Categories

| Error Type       | Source                    | Handling Strategy                        |
| ---------------- | ------------------------- | ---------------------------------------- |
| Network Error    | Connection failure        | Caught by try/catch, converted to Result |
| HTTP Error       | 4xx, 5xx status           | Caught by try/catch, converted to Result |
| API Error        | ProtoPedia error response | Caught by try/catch, converted to Result |
| Validation Error | Invalid parameters        | Let protopedia-api-v2-client handle      |

### Error Flow

```typescript
// Within ProtopediaApiCustomClient.#fetchAndNormalizePrototypes()
async #fetchAndNormalizePrototypes(
    params: ListPrototypesParams,
): Promise<FetchPrototypesResult> {
    try {
        const upstream = await this.#client.listPrototypes(params);

        // Normalize data
        const data = upstream.results.map(normalizePrototype);
        return { ok: true, data };
    } catch (error) {
        // handleApiError converts thrown exceptions to Result type
        const errorResult = handleApiError(error);

        // Log based on severity
        if (!errorResult.ok) {
            if (errorResult.status === undefined || errorResult.status >= 500) {
                this.#logger.error(errorResult.error, errorResult);
            } else {
                this.#logger.warn(errorResult.error, errorResult);
            }
        }
        return errorResult;
    }
}
```

### Error Context Preservation

**Design Principle**: Never lose error context during transformation

**Examples**:

- HTTP status codes preserved in `status` field
- API error details preserved in `details` field
- Original error message preserved in `error` field

**Trade-off**: Slightly larger error objects vs. complete diagnostic information

**Decision**: Complete context is more valuable for debugging

## Logger Management

### Fastify-Style Logger Configuration

**Design Pattern**: Follows Fastify's logger configuration approach

**Three Configuration Patterns**:

```typescript
// Pattern 1: logLevel only
const client = new ProtopediaApiCustomClient({
    protoPediaApiClientOptions: { token },
    logLevel: 'debug', // Creates ConsoleLogger internally
});

// Pattern 2: Custom logger + logLevel
const client = new ProtopediaApiCustomClient({
    protoPediaApiClientOptions: { token },
    logger: myLogger,
    logLevel: 'warn', // Updates logger's level if mutable
});

// Pattern 3: Custom logger only
const client = new ProtopediaApiCustomClient({
    protoPediaApiClientOptions: { token },
    logger: myLogger, // Uses logger's existing level
});
```

**Logger Resolution Logic**:

```typescript
constructor(config?: ProtopediaApiCustomClientConfig | null) {
    const { protoPediaApiClientOptions = {}, logger, logLevel } = config ?? {};

    if (logger) {
        this.#logger = logger;
        this.#logLevel = logLevel ?? 'info';
        // If logLevel specified, update logger's level (if mutable)
        if (logLevel !== undefined && 'level' in logger) {
            (logger as { level: LogLevel }).level = logLevel;
        }
    } else {
        const resolvedLogLevel = logLevel ?? 'info';
        this.#logger = new ConsoleLogger(resolvedLogLevel);
        this.#logLevel = resolvedLogLevel;
    }
}
```

**Logger Usage Throughout Call Chain**:

```plaintext
ProtopediaApiCustomClient
  └─> fetchPrototypes()
      └─> try/catch block
          ├─> handleApiError(error) → returns FetchPrototypesResult
          └─> this.#logger.error/warn() logs the result
```

**Design Rationale**:

- **Separation of Concerns**: SDK client logging vs. our error diagnostics
    - `protoPediaApiClientOptions.logger` → SDK HTTP operation logging
    - Class-managed logger → Error handler diagnostics
- **Constructor Logging**: All config logged at 'info' level for debugging
- **Consistent Pattern**: Aligns with lib/store and lib/repository

**Benefits**:

- Flexible logger configuration
- No fixed logger in error handler
- Constructor visibility for debugging
- Logger available throughout the call chain

## Normalization Approach

### Design Principles

1. **Explicit is better than implicit**: Use `null` instead of `undefined`
2. **Consistent types**: Arrays always arrays, numbers always numbers
3. **UTC timestamps**: All dates normalized to ISO 8601 in UTC
4. **Defensive defaults**: Handle missing fields gracefully

### Normalization Rules

#### Pipe-Separated Strings → Arrays

**Input**: `"javascript|typescript|react"`
**Output**: `["javascript", "typescript", "react"]`

**Implementation**:

```typescript
export function splitPipeSeparatedString(
    value: string | null | undefined,
): string[] {
    if (!value) return [];
    return value.split('|').filter((s) => s.trim() !== '');
}
```

**Edge cases**:

- Empty string → `[]`
- Null/undefined → `[]`
- Whitespace-only segments → filtered out
- Single value (no pipes) → `["value"]`

#### Date/Time Normalization

**Strategy**: Always return ISO 8601 in UTC

**Implementation**:

```typescript
export function normalizeDateTime(
    value: string | null | undefined,
): string | null {
    if (!value) return null;

    try {
        const date = new Date(value);
        if (isNaN(date.getTime())) return null;
        return date.toISOString();
    } catch {
        return null;
    }
}
```

**Benefits**:

- Timezone-independent comparisons
- Standard format for JSON serialization
- Compatible with Date constructor

#### Count Field Normalization

**Strategy**: Parse to number, default to 0 for invalid values

**Implementation**:

```typescript
export function normalizeCount(
    value: string | number | null | undefined,
): number {
    if (value === null || value === undefined) return 0;
    const num = typeof value === 'number' ? value : parseInt(value, 10);
    return isNaN(num) ? 0 : num;
}
```

**Rationale**: Count should never be negative or NaN

### Normalization Testing Strategy

**Approach**: Dedicated test suite for each normalizer function

**Test Files**:

- `lib/fetcher/__tests__/utils/string-parsers.test.ts`
- `lib/fetcher/__tests__/utils/normalize-protopedia-timestamp.test.ts`

**Coverage**:

- Happy path (valid input)
- Edge cases (empty, null, undefined)
- Invalid input (malformed dates, non-numeric counts)
- Whitespace handling
- Special characters

**Location**:

- `lib/fetcher/__tests__/utils/string-parsers.test.ts`
- `lib/fetcher/__tests__/utils/normalize-protopedia-timestamp.test.ts`
- `lib/fetcher/__tests__/utils/normalize-prototype/` (field-specific tests)

## Type Safety

### Interface Contracts

**Design Principle**: Use minimal interfaces for better flexibility

**Example**:

```typescript
// The actual implementation uses a concrete class
export class ProtopediaApiCustomClient {
    async fetchPrototypes(
        params: ListPrototypesParams,
    ): Promise<FetchPrototypesResult> {
        // Fetches, normalizes, and handles errors
    }
}
```

**Benefits**:

- Single concrete implementation
- Clear responsibility (fetch + normalize + error handling)
- Easy to test with actual behavior

### Type Guards

**Usage**: Discriminated unions with type guards

**Example**:

```typescript
const result = await client.fetchPrototypes(params);

if (result.ok) {
    // TypeScript knows: result.data is NormalizedPrototype[]
    result.data.forEach((prototype) => {
        console.log(prototype.name);
    });
} else {
    // TypeScript knows: result.error is string, result.status may exist
    console.error(result.error, result.status);
}
```

**Benefits**: No runtime type checking needed

### Type Exports

**Strategy**: Export all types that consumers might need

**Categories**:

1. **Public API types**: `FetchPrototypesResult`, `ProtopediaApiCustomClient`
2. **Configuration types**: `ProtopediaApiCustomClientConfig`
3. **Helper types**: `Logger`, `LogLevel` (re-exported from logger)

**Location**: `lib/fetcher/index.ts` (single entry point)

## Integration Points

### With protopedia-api-v2-client

**Design Decision**: Wrapper, not replacement

**Integration Strategy**:

1. Provide `ProtopediaApiCustomClient` class that wraps protopedia-api-v2-client
2. Allow custom configurations (fetch, timeout, logger)
3. Normalize and handle errors automatically

**Example**:

```typescript
// Create client with custom configuration
const client = new ProtopediaApiCustomClient({
    protoPediaApiClientOptions: {
        token: process.env.TOKEN,
        baseUrl: 'https://api.protopedia.net',
    },
    logLevel: 'error',
});

// Use client's methods
const result = await client.fetchPrototypes(params);
```

### With Repository Layer

**Integration**: Repository uses fetcher for data acquisition

**Contract**:

```typescript
// Repository expects FetchPrototypesResult
async setupSnapshot(params: ListPrototypesParams) {
  const fetchResult = await this.#apiClient.fetchPrototypes(params);

  if (!fetchResult.ok) {
    return {
      ok: false,
      error: fetchResult.error,
      status: fetchResult.status
    };
  }

  // Store operation may throw - handle exceptions
  try {
    await this.#store.setAll(fetchResult.data);
    return { ok: true, size: fetchResult.data.length };
  } catch (storeError) {
    // Store exception (DataSizeExceededError, SizeEstimationError)
    return {
      ok: false,
      error: storeError instanceof Error ? storeError.message : 'Store operation failed'
    };
  }
}
```

**Benefits**:

- Repository doesn't need to know about HTTP
- Fetcher doesn't need to know about storage
- Clear separation of concerns

### Custom Fetch Implementations

**Use Case**: Adapt to different runtimes (Node.js, browser, Next.js)

**Example (Next.js with progress tracking)**:

```typescript
const customClientForNextJs = new ProtopediaApiCustomClient({
    logger: myLogger,
    progressLog: true, // Progress tracking enabled
    protoPediaApiClientOptions: {
        token: process.env.PROTOPEDIA_API_V2_TOKEN,
        fetch: async (url, init) => {
            // Custom fetch with Next.js features
            return await globalThis.fetch(url, {
                ...init,
                cache: 'force-cache',
                next: { revalidate: 60 },
            });
        },
    },
});
```

**Key Point**: Custom fetch is automatically wrapped with progress tracking.
Your custom behavior (caching, timeouts, etc.) is preserved while progress
tracking is added transparently.

**Supported Scenarios**:

- Custom timeouts (AbortController)
- Caching strategies (Next.js cache)
- Retry logic
- Request/response middleware
- **All of the above + progress tracking** ✨

## Design Decisions Log

### 1. Why Adapter Pattern?

**Decision**: Wrap protopedia-api-v2-client instead of direct usage

**Reasoning**:

- Insulates application from client API changes
- Enables testing without network calls
- Allows custom error handling
- Provides normalization layer

**Trade-off**: Extra abstraction vs. flexibility

### 2. Why Normalization Layer?

**Decision**: Transform API responses into application-friendly format

**Reasoning**:

- API format may change over time
- Different frontends need different formats
- Centralized transformation logic easier to test
- Consistent data shape simplifies queries

**Trade-off**: Performance cost of transformation vs. developer experience

### 3. Why Result Type over Exceptions?

**Decision**: Use discriminated union for success/failure

**Reasoning**:

- Network errors are expected, not exceptional
- TypeScript ensures error handling at compile time
- Better developer experience (no hidden exceptions)
- Easier to test both paths

**Trade-off**: More verbose vs. better type safety

### 4. Why Concrete Class Instead of Interface?

**Decision**: Use `ProtopediaApiCustomClient` concrete class, not an interface

**Reasoning**:

- Simpler to use (no need to understand abstraction)
- Easier to test (can mock the class directly)
- Reduces over-engineering for single implementation
- Can evolve to interface pattern if multiple implementations needed

**Trade-off**: Less discoverability vs. better flexibility

### 5. Why Pre-format Error Messages?

**Decision**: Format error messages internally during error handling

**Reasoning**:

- Simpler API - users get ready-to-display messages
- Consistent error presentation across all error types
- No need to import additional utilities
- Error details still available separately if needed

**Trade-off**: Less customization vs. simpler usage
