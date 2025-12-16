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
        const apiResult = await this.#client.listPrototypes(params);
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

### 4. User-Agent Management

**Purpose**: Identify requests from promidas library for API provider analytics and debugging

**Implementation**:

```typescript
constructor(config?: ProtopediaApiCustomClientConfig | null) {
    const { protoPediaApiClientOptions = {}, logger, logLevel } = config ?? {};

    // Set ProtopediaApiCustomClient User-Agent if not provided
    const userAgent =
        protoPediaApiClientOptions.userAgent ??
        `ProtopediaApiCustomClient/${VERSION} (promidas)`;

    this.#client = createProtoPediaClient({
        ...protoPediaApiClientOptions,
        userAgent,
    });
}
```

**User-Agent Format**:

```text
ProtopediaApiCustomClient/{version} (promidas)
```

Example: `ProtopediaApiCustomClient/0.9.0 (promidas)`

**Design Rationale**:

- **Automatic**: No configuration required from users
- **Identifiable**: API provider can track promidas library usage
- **Versioned**: Includes library version for debugging
- **Overridable**: Users can provide custom User-Agent if needed

**Benefits**:

- API provider can identify requests from promidas library
- Enables analytics on library adoption and usage patterns
- Helps with troubleshooting library-specific issues
- Default behavior works out-of-the-box
- Power users retain full control via explicit configuration

**Comparison with SDK Default**:

| Source                         | User-Agent                                    |
| ------------------------------ | --------------------------------------------- |
| SDK (protopedia-api-v2-client) | `ProtoPedia API Ver 2.0 Node.js Client/3.0.0` |
| Promidas (auto-set)            | `ProtopediaApiCustomClient/0.9.0 (promidas)`  |
| Custom (user-provided)         | `MyApp/1.0.0` (or any custom value)           |

### 5. Normalization Layer

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

### 6. Error Message Construction

**Purpose**: User-friendly error messages with actionable context

**Design Decision**: Separate display message construction from error handling

**Implementation**:

```typescript
// lib/fetcher/utils/errors/messages.ts
export const constructDisplayMessage = (failure: NetworkFailure): string => {
    const { error, status, details } = failure;
    const statusText = details?.res?.statusText;
    const code = details?.res?.code;
    let message = resolveErrorMessage(error);

    const prefix = statusText || code;
    if (prefix && !message.startsWith(prefix)) {
        message = `${prefix}: ${message}`;
    }

    // HTTP errors include status code, network errors don't
    return status !== undefined ? `${message} (${status})` : message;
};
```

**Usage**:

```typescript
if (!result.ok) {
    const displayMessage = constructDisplayMessage({
        error: result.error,
        status: result.status,
        details: result.details,
    });
    logger.error(displayMessage);
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
      └─> handleApiError(error, this.#logger)
          └─> this.#logger.error() for diagnostics
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

**Location**:

- `lib/fetcher/__tests__/utils/string-parsers.test.ts`
- `lib/fetcher/__tests__/utils/normalize-protopedia-timestamp.test.ts`
- `lib/fetcher/__tests__/utils/normalize-prototype/` (field-specific tests)

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

1. Accept any client implementing `ListPrototypesClient`
2. Provide `ProtopediaApiCustomClient` class for convenience
3. Allow custom configurations (fetch, timeout, logger)

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
const customClientForNextJs = new ProtopediaApiCustomClient({
    protoPediaApiClientOptions: {
        token: process.env.PROTOPEDIA_API_V2_TOKEN,
        fetch: async (url, init) => {
            return await globalThis.fetch(url, {
                ...init,
                cache: 'force-cache',
                next: { revalidate: 60 },
            });
        },
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

### 5. Why Pre-format Error Messages?

**Decision**: Format error messages internally during error handling

**Reasoning**:

- Simpler API - users get ready-to-display messages
- Consistent error presentation across all error types
- No need to import additional utilities
- Error details still available separately if needed

**Trade-off**: Less customization vs. simpler usage

---

**Document Version**: 2.0.0
**Last Updated**: 2025-12-16
**Related Modules**: lib/repository, lib/logger
