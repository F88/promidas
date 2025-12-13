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

## Architecture Overview

### Component Structure

```plaintext
┌─────────────────────────────────────────────────────────┐
│  Consumer Code (Repository, Application)               │
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
│  Fetcher Functions    │         │  Normalization Layer  │
│  - fetchAndNormalize  │         │  - Data transformation│
│  - Error handling     │         │  - Type conversion    │
│  - Result types       │         │  - Field mapping      │
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
- **Client → fetchAndNormalizePrototypes**: Delegates fetch and normalization
- **Fetcher → API Client**: Delegates HTTP operations
- **Fetcher → Normalization**: Transforms raw API responses
- **API Client → HTTP**: Network communication with ProtoPedia API

### Responsibility Separation

| Layer         | Responsibility               | Does NOT Handle    |
| ------------- | ---------------------------- | ------------------ |
| Fetcher       | Result types, error messages | Direct HTTP calls  |
| API Client    | HTTP, request/response       | Data normalization |
| Normalization | Type conversion, defaults    | Network errors     |

## Design Patterns

### 1. Adapter Pattern

**Purpose**: Adapt the official API client to application needs

**Implementation**:

```typescript
// Minimal interface for listing prototypes
export interface ListPrototypesClient {
    listPrototypes(
        params: ListPrototypesParams,
    ): Promise<ApiResult<ResultOfListPrototypesApiResponse>>;
}

// Consumer doesn't depend on full client implementation
export async function fetchAndNormalizePrototypes(
    client: ListPrototypesClient,
    params: ListPrototypesParams,
    logger: Logger,
): Promise<FetchPrototypesResult>;
```

**Benefits**:

- Decouples from specific client implementation
- Enables testing with mock clients
- Future-proof against client API changes
- Supports alternative clients with same interface

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
        return fetchAndNormalizePrototypes(this.#client, params, this.#logger);
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
    | { ok: false; error: string; status?: number; details?: ApiErrorDetails };
```

**Benefits**:

- Compile-time guarantee that errors are handled
- Rich error context (status codes, API error details)
- No hidden exceptions in network layer
- Easier to test both success and failure paths

**Comparison with exception-based approach**:

| Approach  | Type Safety | Testability | Caller Burden      |
| --------- | ----------- | ----------- | ------------------ |
| Result    | ✅ Strong   | ✅ Easy     | ⚠️ Must check `ok` |
| Exception | ❌ Weak     | ⚠️ Harder   | ✅ Less verbose    |

**Decision**: Type safety outweighs convenience for library code

### 3. Normalization Layer

**Purpose**: Transform API responses into application-friendly format

**Key Transformations**:

1. **String to Array** (tags, users):

    ```typescript
    // API: "tag1|tag2|tag3"
    // Normalized: ["tag1", "tag2", "tag3"]
    ```

2. **Date Normalization**:

    ```typescript
    // API: Various formats from ProtoPedia
    // Normalized: ISO 8601 strings in UTC
    ```

3. **Count Fields**:

    ```typescript
    // API: String counts like "5"
    // Normalized: Numeric 5
    ```

4. **Null Handling**:

    ```typescript
    // API: Missing or undefined
    // Normalized: Explicit null or reasonable default
    ```

**Benefits**:

- Consistent data shape across application
- Easier querying and filtering
- Better type inference
- No ad-hoc transformations scattered in code

### 4. Error Message Construction

**Purpose**: User-friendly error messages with actionable context

**Design Decision**: Separate display message construction from error handling

**Implementation**:

```typescript
// lib/fetcher/utils/errors/messages.ts
export function constructDisplayMessage(
    error: string,
    status?: number,
): string {
    // HTTP errors get status code context
    if (status !== undefined) {
        return `API request failed with status ${status}: ${error}`;
    }
    // Network errors get clear description
    return `Network error: ${error}`;
}
```

**Usage**:

```typescript
if (!result.ok) {
    const displayMessage = constructDisplayMessage(result.error, result.status);
    logger.error(displayMessage);
    // Or show to user
}
```

**Benefits**:

- Consistent error formatting
- Testable message logic
- Separates presentation from error handling
- Easy to internationalize later

## Error Handling Strategy

### Error Categories

| Error Type       | Source                    | Handling Strategy                   |
| ---------------- | ------------------------- | ----------------------------------- |
| Network Error    | Connection failure        | Return as Result (`ok: false`)      |
| HTTP Error       | 4xx, 5xx status           | Return with status code             |
| API Error        | ProtoPedia error response | Return with details object          |
| Validation Error | Invalid parameters        | Let protopedia-api-v2-client handle |

### Error Flow

```typescript
async function fetchAndNormalizePrototypes(
    client: ListPrototypesClient,
    params: ListPrototypesParams,
): Promise<FetchPrototypesResult> {
    const apiResult = await client.listPrototypes(params);

    // API client already returns Result type
    if (!apiResult.ok) {
        // Pass through with optional enhancement
        return {
            ok: false,
            error: apiResult.error,
            status: apiResult.status,
            details: apiResult.details,
        };
    }

    // Success path: normalize data
    const normalized = apiResult.data.prototypes.map(normalizePrototype);
    return { ok: true, data: normalized };
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
const client = createProtopediaApiCustomClient({
    protoPediaApiClientOptions: { token },
    logLevel: 'debug', // Creates ConsoleLogger internally
});

// Pattern 2: Custom logger + logLevel
const client = createProtopediaApiCustomClient({
    protoPediaApiClientOptions: { token },
    logger: myLogger,
    logLevel: 'warn', // Updates logger's level if mutable
});

// Pattern 3: Custom logger only
const client = createProtopediaApiCustomClient({
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
      └─> fetchAndNormalizePrototypes(client, params, logger)
          └─> handleApiError(error, logger)
              └─> logger.error() for diagnostics
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

**Coverage**:

- Happy path (valid input)
- Edge cases (empty, null, undefined)
- Invalid input (malformed dates, non-numeric counts)
- Whitespace handling
- Special characters

**Location**: `lib/fetcher/__tests__/utils/normalizers.test.ts`

## Type Safety

### Interface Contracts

**Design Principle**: Use minimal interfaces for better flexibility

**Example**:

```typescript
// Minimal client interface
export interface ListPrototypesClient {
    listPrototypes(
        params: ListPrototypesParams,
    ): Promise<ApiResult<ResultOfListPrototypesApiResponse>>;
}

// Implementation can have more methods
class FullClient implements ListPrototypesClient {
    listPrototypes() {
        /* ... */
    }
    getPrototype() {
        /* ... */
    } // Not required by interface
    searchPrototypes() {
        /* ... */
    } // Not required by interface
}
```

**Benefits**:

- Easier mocking in tests
- Dependency inversion (depend on abstraction)
- Supports multiple client implementations

### Type Guards

**Usage**: Discriminated unions with type guards

**Example**:

```typescript
const result = await fetchAndNormalizePrototypes(client, params);

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

1. **Public API types**: `FetchPrototypesResult`, `ListPrototypesClient`
2. **Configuration types**: `ProtoPediaApiClientOptions`
3. **Helper types**: `Logger`, `LogLevel` (re-exported from logger)

**Location**: `lib/fetcher/index.ts` (single entry point)

## Integration Points

### With protopedia-api-v2-client

**Design Decision**: Wrapper, not replacement

**Integration Strategy**:

1. Accept any client implementing `ListPrototypesClient`
2. Provide factory (`createProtopediaApiCustomClient`) for convenience
3. Allow custom configurations (fetch, timeout, logger)

**Example**:

```typescript
// Option 1: Use library's factory
const client = createProtopediaApiCustomClient({
    token: process.env.TOKEN,
    baseUrl: 'https://api.protopedia.net',
    logLevel: 'error',
});

// Option 2: Bring your own client
import { createProtoPediaClient } from 'protopedia-api-v2-client';
const customClient = createProtoPediaClient({
    /* custom config */
});

// Both work the same
const result = await fetchAndNormalizePrototypes(client, params);
```

### With Repository Layer

**Integration**: Repository uses fetcher for data acquisition

**Contract**:

```typescript
// Repository expects FetchPrototypesResult
async setupSnapshot(params: ListPrototypesParams) {
  const fetchResult = await fetchAndNormalizePrototypes(this.#apiClient, params);

  if (!fetchResult.ok) {
    return {
      ok: false,
      error: fetchResult.error,
      status: fetchResult.status
    };
  }

  await this.#store.setAll(fetchResult.data);
  return { ok: true, size: fetchResult.data.length };
}
```

**Benefits**:

- Repository doesn't need to know about HTTP
- Fetcher doesn't need to know about storage
- Clear separation of concerns

### Custom Fetch Implementations

**Use Case**: Adapt to different runtimes (Node.js, browser, Next.js)

**Example (Next.js)**:

```typescript
const customClientForNextJs = createProtopediaApiCustomClient({
    token: process.env.PROTOPEDIA_API_TOKEN,
    fetch: async (url, init) => {
        return await globalThis.fetch(url, {
            ...init,
            cache: 'force-cache',
            next: { revalidate: 60 },
        });
    },
});
```

**Supported Scenarios**:

- Custom timeouts (AbortController)
- Caching strategies (Next.js cache)
- Retry logic
- Request/response middleware

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

### 4. Why Minimal Client Interface?

**Decision**: `ListPrototypesClient` only requires `listPrototypes()`

**Reasoning**:

- Easier to mock in tests
- Supports future alternative clients
- Follows interface segregation principle
- Reduces coupling

**Trade-off**: Less discoverability vs. better flexibility

### 5. Why Separate Error Message Construction?

**Decision**: `constructDisplayMessage()` as standalone utility

**Reasoning**:

- Testable message formatting logic
- Consistent error presentation
- Easier to internationalize later
- Separates presentation from error handling

**Trade-off**: Extra function vs. better separation of concerns

---

**Document Version**: 1.0.0
**Last Updated**: 2025-12-10
**Related Modules**: lib/repository, lib/logger
