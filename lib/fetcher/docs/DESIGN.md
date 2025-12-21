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
- [Download Progress Tracking](#download-progress-tracking)
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
    error: string;
} & Omit<NetworkFailure, 'error'>;

// This includes: status?: number, details: { req?: {...}, res?: {...} }
```

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

## Download Progress Tracking

### Architecture

The download progress tracking system implements a three-module architecture:

```plaintext
┌─────────────────────────────────────────────────────────┐
│  ProtopediaApiCustomClient                              │
│  - progressLog: boolean (default: true)                 │
│  - onProgressStart, onProgress, onProgressComplete      │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  select-custom-fetch                                    │
│  - Wraps fetch with progress tracking                   │
│  - Integrates createFetchWithProgress                   │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  fetch-with-progress                                    │
│  - Core progress tracking logic                         │
│  - Streaming response processing                        │
│  - Callback management                                  │
└─────────────────────────────────────────────────────────┘
```

### Module Responsibilities

#### 1. fetch-with-progress

**Purpose**: Core progress tracking implementation

**Key Functions**:

```typescript
export function createFetchWithProgress(
    config: FetchWithProgressConfig,
): typeof fetch {
    return async (url, init) => {
        // 1. Execute baseFetch (or globalThis.fetch if not provided)
        // 2. Check Content-Length header (or estimate from URL)
        // 3. Stream response body with progress updates
        // 4. Trigger callbacks and logging at appropriate times
    };
}

export function shouldProgressLog(logger: Logger): boolean {
    // Returns true for 'debug' or 'info' levels
    // Controls stderr output filtering
}
```

**Design Decisions**:

- Uses `Response.body.getReader()` for streaming
- Estimates download size from limit parameter (2670 bytes per prototype)
- Falls back to estimation when Content-Length header is missing
- Wraps user's `baseFetch` to preserve custom behavior (timeouts, retries, etc.)
- Separate timing for preparation vs. download phases
  Callbacks fire when `Content-Length` is present or when the total size can be estimated

#### 2. select-custom-fetch

**Purpose**: Smart fetch selection with progress integration

**Implementation**:

```typescript
export function selectCustomFetch(
    config: CustomFetchConfig,
): typeof fetch | undefined {
    // 1. Check if progress tracking is needed
    // 2. If needed, wrap baseFetch (or global fetch) with progress tracking
    // 3. If not needed, return baseFetch (preserves custom implementations)
    // 4. Return undefined if no custom features needed
}
```

**Key Features**:

- **Wraps user's custom fetch**: If user provides `baseFetch`, it gets wrapped with progress tracking
- **Preserves custom behavior**: Timeouts, retries, caching, Next.js adapters all continue to work
- **Automatic progress**: Progress tracking is transparent to the underlying fetch
- **Conditional wrapping**: Only wraps when progress features are enabled

#### 3. protopedia-api-custom-client

**Purpose**: Integration point for progress tracking

**Constructor Logic**:

```typescript
// User's custom fetch (if provided) is passed as baseFetch
const customFetch = selectCustomFetch({
    logger: this.#logger,
    enableProgressLog: progressLog,
    baseFetch: protoPediaApiClientOptions.fetch, // User's custom fetch
    onProgressStart: progressCallback?.onStart,
    onProgress: progressCallback?.onProgress,
    onProgressComplete: progressCallback?.onComplete,
});

this.#client = createProtoPediaClient({
    ...protoPediaApiClientOptions,
    userAgent,
    fetch: customFetch, // Wrapped with progress tracking
});
```

**Flow**:

1. User provides `protoPediaApiClientOptions.fetch` (e.g., with timeout/retry)
2. `selectCustomFetch` wraps it with progress tracking
3. Wrapped fetch is passed to SDK
4. Both custom behavior and progress tracking work together

### Progress Estimation Algorithm

```typescript
// Constants
const AVERAGE_PROTOTYPE_SIZE = 2670;

// Estimation function
function estimateDownloadSize(limit: number): number {
    return limit * AVERAGE_PROTOTYPE_SIZE;
}
```

**Rationale**:

- Average prototype size: ~2670 bytes per item (empirically measured from 5,000 samples)
- Based on actual ProtoPedia API data: 13,350,369 bytes / 5,000 items = 2670 bytes/item
- Simple linear calculation without overhead estimation for accuracy

### Callback Sequence

```plaintext
1. fetchPrototypes() called
   ↓
2. Preparation phase starts (SDK client initialization)
   ↓
3. fetch() executed → Response received
   ↓
4. onProgressStart() fired (if Content-Length present)
   ↓
5. Response body streamed
   ├─ onProgress() fired for each chunk
   └─ (multiple times during download)
   ↓
6. onProgressComplete() fired
   ↓
7. fetchPrototypes() returns result
```

### Logger Integration

**stderr Output Control**:

```typescript
function shouldProgressLog(logger: Logger): boolean {
    const level = logger.level;
    return level === 'debug' || level === 'info';
}
```

**Output Format**:

```plaintext
Download starting (limit=10000, 2670000 bytes (estimated)) (prepared in 0.05s)
Download complete: 2670000 bytes received (estimated 2670000 bytes) in 1.23s (total: 1.28s)
```

**Design Decisions**:

- Uses stderr to avoid interfering with stdout
- Only logs when logger level permits (debug/info)
- Respects existing logger configuration
- Can be completely disabled via `progressLog: false`

### Type Definitions

```typescript
export type ProgressCallbacks = {
    onStart?: (
        estimatedTotal: number,
        limit: number,
        prepareTime: number,
    ) => void;
    onProgress?: (received: number, total: number, percentage: number) => void;
    onComplete?: (
        received: number,
        estimatedTotal: number,
        downloadTime: number,
        totalTime: number,
    ) => void;
};

export type ProtopediaApiCustomClientConfig = {
    protoPediaApiClientOptions?: ProtoPediaApiClientOptions;
    logger?: Logger;
    logLevel?: LogLevel;
    progressLog?: boolean; // Default: true
    progressCallback?: {
        onStart?: ProgressCallbacks['onStart'];
        onProgress?: ProgressCallbacks['onProgress'];
        onComplete?: ProgressCallbacks['onComplete'];
    };
};
```

### Testing Strategy

**Unit Tests** (7 tests in `should-progress-log.test.ts`):

- Logger level filtering logic
- All log levels tested
- Edge cases (invalid levels)

**Integration Tests** (15 tests in `fetch-with-progress.test.ts`):

- Mock Response with streaming body
- Callback firing sequence
- Progress calculation accuracy
- Logger integration
- Error handling

**Test Coverage**:

- ✅ Normal download flow
- ✅ Missing Content-Length header
- ✅ Empty response body
- ✅ Large downloads (chunked transfer)
- ✅ Logger level filtering
- ✅ Custom callbacks
- ✅ Disabled progress tracking

### Performance Considerations

**Overhead**:

- Minimal: Only wraps fetch when `progressLog: true` (progress tracking) or when browser-only header stripping is enabled
- Streaming processing: No buffering of entire response
- Callback execution: Synchronous, non-blocking

**Memory**:

- Uses `ReadableStream.getReader()` for chunk processing
- No full response buffering
- Releases chunks after processing

### Backward Compatibility

**Default Behavior**:

- `progressLog: true` by default
- Existing code without progress config: Works with automatic logging
- Can be disabled: `progressLog: false`

**API Surface**:

- No breaking changes to existing methods
- All progress parameters optional
- Extends `ProtopediaApiCustomClientConfig` interface

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
    const {
        protoPediaApiClientOptions = {},
        logger,
        logLevel,
        progressLog = true,
        progressCallback,
    } = config ?? {};

    const { timeoutMs, fetch: providedFetch, ...sdkOptions } =
        protoPediaApiClientOptions;

    const hasWindow =
        typeof (globalThis as { window?: unknown }).window !== 'undefined';
    const hasDocument =
        typeof (globalThis as { document?: unknown }).document !== 'undefined';
    const isBrowserRuntime = hasWindow && hasDocument;

    // Set ProtopediaApiCustomClient User-Agent if not provided
    const userAgent =
        sdkOptions.userAgent ??
        `ProtopediaApiCustomClient/${VERSION} (promidas)`;

    // Browser-only CORS mitigation:
    // `protopedia-api-v2-client` adds `x-client-user-agent` derived from
    // `userAgent` by design. In browsers, custom request headers trigger a
    // CORS preflight and the request may be blocked by the server.
    // Promidas strips `x-client-user-agent` in a fetch wrapper for browser runtimes.
    const customFetch = createClientFetch({
        logger: logger ?? new ConsoleLogger(logLevel ?? 'info'),
        enableProgressLog: progressLog,
        progressCallback,
        timeoutMs,
        providedFetch,
        ...(isBrowserRuntime && { stripHeaders: ['x-client-user-agent'] }),
    });

    this.#client = createProtoPediaClient({
        ...sdkOptions,
        userAgent,
        ...(customFetch !== undefined && { fetch: customFetch }),
    });
}
```

**Browser Runtime Note (Issue #55)**:

In browser runtimes, Promidas strips `x-client-user-agent` to avoid triggering
CORS preflight failures on servers that do not allow this custom header.
This does not change server-side Node.js behavior.

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
