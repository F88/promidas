---
lang: en
title: Progress Tracking Design
title-en: Progress Tracking Design
title-ja: プログレストラッキング設計
related:
    - DESIGN.md "Fetcher Design"
    - USAGE.md "Fetcher Usage"
instructions-for-ais:
    - This document should be written in English for AI readability.
    - Content within code fences may be written in languages other than English.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document.
---

# Progress Tracking Design

This document describes the design, implementation, and rationale behind the fetcher's download progress tracking system.

## Table of Contents

- [Architecture](#architecture)
- [Module Responsibilities](#module-responsibilities)
- [Error Event Design](#error-event-design)
- [Progress Estimation Algorithm](#progress-estimation-algorithm)
- [Event Emission Sequence](#event-emission-sequence)
- [Logger Integration](#logger-integration)
- [Type Definitions](#type-definitions)
- [Testing Strategy](#testing-strategy)
- [Performance Considerations](#performance-considerations)

## Architecture

The download progress tracking system implements an event-driven architecture with three modules:

```plaintext
┌─────────────────────────────────────────────────────────┐
│  ProtopediaApiCustomClient                              │
│  - progressLog: boolean (default: true)                 │
│  - progressCallback: (event: FetchProgressEvent) => void│
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  select-custom-fetch                                    │
│  - Wraps fetch with progress tracking                   │
│  - Integrates createFetchWithProgress                   │
│  - Passes onProgressEvent to wrapped fetch              │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  fetch-with-progress                                    │
│  - Core progress tracking logic                         │
│  - Event emission (request-start → complete/error)      │
│  - Streaming response processing                        │
│  - Type-safe event management                           │
└─────────────────────────────────────────────────────────┘
```

## Module Responsibilities

### 1. fetch-with-progress

**Purpose**: Core progress tracking implementation with event-driven architecture

**Key Functions**:

```typescript
export function createFetchWithProgress(
    config: FetchWithProgressConfig,
): typeof fetch {
    return async (url, init) => {
        // 1. Emit 'request-start' event
        // 2. Execute baseFetch (or globalThis.fetch if not provided)
        // 3. Emit 'response-received' with preparation timing
        // 4. Stream response body with periodic 'download-progress' events
        // 5. Emit 'complete' or 'error' event with final timing
    };
}

export function shouldProgressLog(logger: Logger): boolean {
    // Returns true for 'debug' or 'info' levels
    // Controls stderr output filtering
}
```

**Event Lifecycle**:

```typescript
// 1. request-start: Fired immediately before fetch() call
onProgressEvent?.({ type: 'request-start' });

// 2. response-received: Fired when headers are received
onProgressEvent?.({
    type: 'response-received',
    prepareTimeMs: number, // Time from request start to headers
    estimatedTotal: number, // Estimated download size
    limit: number, // From URL parameter
});

// 3. download-progress: Fired periodically during body download (throttled to 500ms)
onProgressEvent?.({
    type: 'download-progress',
    received: number,
    total: number,
    percentage: number,
});

// 4. complete: Fired when download finishes successfully
onProgressEvent?.({
    type: 'complete',
    received: number,
    estimatedTotal: number,
    downloadTimeMs: number, // Body download time
    totalTimeMs: number, // Request start to complete
});

// 5. error: Fired when stream reading fails
onProgressEvent?.({
    type: 'error',
    error: string, // Error message
    received: number, // Bytes received before error
    estimatedTotal: number,
    downloadTimeMs: number, // Time until error
    totalTimeMs: number, // Request start to error
});
```

**Design Decisions**:

- **Event-Driven**: Uses discriminated union types for type-safe event handling
- **Complete Lifecycle**: Tracks from request initiation to completion (not just download phase)
- **Error Event Addition**: Added in v0.14.0 to address missing error lifecycle events (see [Error Event Design](#error-event-design))
- **Millisecond Precision**: All timing values in milliseconds for consistency
- Uses `Response.body.getReader()` for streaming
- Estimates download size from limit parameter (2670 bytes per prototype)
- Falls back to estimation when Content-Length header is missing
- Wraps user's `baseFetch` to preserve custom behavior (timeouts, retries, etc.)
- Separate timing for preparation (`prepareTimeMs`) vs. download (`downloadTimeMs`) phases

## Error Event Design

**Context**: Prior to v0.14.0, stream reading errors (e.g., 401 Unauthorized, network timeouts) during body download would not emit any event, leaving progress listeners without completion notification.

**Problem**:

Existing event flow:

- Success: `request-start` → `response-received` → `download-progress` → `complete` ✅
- Error: `request-start` → `response-received` → (stream error) → ❌ no event

This caused progress callbacks to wait indefinitely when errors occurred during stream reading.

**Decision**: Add separate `FetchProgressErrorEvent` type

**Alternatives Considered**:

1. **Option 1: Separate error event type** (SELECTED)

    ```typescript
    type FetchProgressErrorEvent = {
        type: 'error';
        error: string; // Error message
        received: number;
        estimatedTotal: number;
        downloadTimeMs: number;
        totalTimeMs: number;
    };
    ```

2. **Option 2: Reuse complete event with optional error field**

    ```typescript
    type FetchProgressCompleteEvent = {
        type: 'complete';
        error?: string; // Optional error message
        received: number;
        estimatedTotal: number;
        downloadTimeMs: number;
        totalTimeMs: number;
    };
    ```

**Rationale for Option 1**:

- **Type Safety**: Discriminated union enables compile-time guarantees

    ```typescript
    if (event.type === 'error') {
        // TypeScript knows event.error exists
        console.error(event.error);
    }
    ```

- **Semantic Clarity**: `type: 'error'` explicitly signals failure
- **Future Extensibility**: Can add error-specific fields (statusCode, retryable, etc.) without polluting complete event
- **Common Pattern**: WebSocket, EventEmitter, and other event systems separate success/failure events
- **User Experience**: Switch statements make error vs success handling explicit

    ```typescript
    switch (event.type) {
        case 'complete':
            showSuccess();
            break;
        case 'error':
            showError(event.error);
            break;
    }
    ```

**Consequences**:

- ✅ Clear separation of success/error paths
- ✅ Type-safe access to error message
- ✅ Future-proof for error-specific metadata
- ⚠️ One additional event type (5 instead of 4)
- ⚠️ Existing code needs to add error case (non-breaking for switch with default)

**Implementation**: See [fetch-with-progress.ts catch block](../../client/fetch-with-progress.ts)

**References**: Issue #69

### 2. select-custom-fetch

**Purpose**: Smart fetch selection with event-driven progress integration

**Implementation**:

```typescript
export function selectCustomFetch(
    config: CustomFetchConfig,
): typeof fetch | undefined {
    const { logger, enableProgressLog, baseFetch, onProgressEvent } = config;

    // Check if progress tracking is needed
    const needsProgressTracking =
        enableProgressLog || onProgressEvent !== undefined;

    if (needsProgressTracking) {
        return createFetchWithProgress({
            logger,
            enableProgressLog,
            ...(baseFetch !== undefined && { baseFetch }),
            ...(onProgressEvent !== undefined && { onProgressEvent }),
        });
    }

    return baseFetch;
}
```

**Key Features**:

- **Wraps user's custom fetch**: If user provides `baseFetch`, it gets wrapped with progress tracking
- **Preserves custom behavior**: Timeouts, retries, caching, Next.js adapters all continue to work
- **Event-driven progress**: Progress events are transparent to the underlying fetch
- **Conditional wrapping**: Only wraps when `enableProgressLog` or `onProgressEvent` is specified
- **Type-safe events**: `onProgressEvent` receives strongly-typed discriminated union events

### 3. protopedia-api-custom-client

**Purpose**: Integration point for event-driven progress tracking

**Constructor Logic**:

```typescript
constructor(config?: ProtopediaApiCustomClientConfig | null) {
    const {
        progressLog = true,
        progressCallback,
        // ... other config
    } = config ?? {};

    // Create customized fetch with progress tracking
    const clientFetch = createClientFetch({
        logger: this.#logger,
        enableProgressLog: progressLog,
        progressCallback, // Single event handler function
        timeoutMs,
        providedFetch,
        stripHeaders, // Browser compatibility
    });

    // Pass to SDK client
    this.#client = createProtoPediaClient({
        ...sdkOptions,
        fetch: clientFetch,
    });
}
```

**Configuration Interface**:

```typescript
export type ProtopediaApiCustomClientConfig = {
    protoPediaApiClientOptions?: ProtoPediaApiClientOptions;
    logger?: Logger;
    logLevel?: LogLevel;
    progressLog?: boolean; // Enable automatic logging
    progressCallback?: (event: FetchProgressEvent) => void; // Event handler
};
```

**Event Handler Usage**:

```typescript
// User's custom fetch (if provided) is passed as baseFetch
const customFetch = selectCustomFetch({
    logger: this.#logger,
    enableProgressLog: progressLog,
    baseFetch: protoPediaApiClientOptions.fetch, // User's custom fetch
    onProgressEvent: progressCallback, // Single event handler
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

**Event Handler Examples**:

```typescript
// Example 1: Simple progress logging
const client = new ProtopediaApiCustomClient({
    progressLog: true, // Uses default logger output
});

// Example 2: Custom event handler
const client = new ProtopediaApiCustomClient({
    progressLog: false,
    progressCallback: (event) => {
        switch (event.type) {
            case 'request-start':
                console.log('Request initiated');
                break;
            case 'response-received':
                console.log(`Headers received in ${event.prepareTimeMs}ms`);
                break;
            case 'download-progress':
                updateProgressBar(event.percentage);
                break;
            case 'complete':
                console.log(`Download complete in ${event.totalTimeMs}ms`);
                break;
            case 'error':
                console.error(`Download failed: ${event.error}`);
                break;
        }
    },
});

// Example 3: Combined logging and custom handler
const client = new ProtopediaApiCustomClient({
    progressLog: true, // Logs to stderr
    progressCallback: (event) => {
        // Also send to analytics
        if (event.type === 'complete') {
            analytics.track('download-complete', {
                bytes: event.received,
                duration: event.totalTimeMs,
            });
        }
    },
});
```

## Progress Estimation Algorithm

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

## Event Emission Sequence

### Success Flow

```plaintext
1. fetchPrototypes() called
   ↓
2. Preparation phase starts (SDK client initialization)
   ↓
3. 'request-start' event fired
   ↓
4. fetch() executed → Response received
   ↓
5. 'response-received' event fired
   - prepareTimeMs: time from request start to headers
   - estimatedTotal: estimated download size
   - limit: from URL parameter
   ↓
6. Response body streamed
   ├─ 'download-progress' events fired for each chunk
   └─ (throttled to max once per 500ms)
   ↓
7. 'complete' event fired
   - received: actual bytes downloaded
   - estimatedTotal: original estimate
   - downloadTimeMs: body download time
   - totalTimeMs: request start to completion
   ↓
8. fetchPrototypes() returns result
```

### Error Flow (stream reading failure)

```plaintext
1. fetchPrototypes() called
   ↓
2. 'request-start' event fired
   ↓
3. fetch() executed → Response received (may be error response like 401)
   ↓
4. 'response-received' event fired
   ↓
5. Response body streaming starts
   ↓
6. Error thrown during stream reading (e.g., network error, authentication error)
   ↓
7. 'error' event fired
   - error: error message
   - received: bytes received before error
   - downloadTimeMs: time until error
   - totalTimeMs: request start to error
   ↓
8. fetchPrototypes() returns error result
```

## Logger Integration

### stderr Output Control

```typescript
function shouldProgressLog(logger: Logger): boolean {
    const level = logger.level;
    return level === 'debug' || level === 'info';
}
```

### Output Format

```plaintext
Download starting (limit=10000, 2670000 bytes (estimated)) (prepared in 0.05s)
Download complete: 2670000 bytes received (estimated 2670000 bytes) in 1230ms (total: 1280ms)
```

**Design Decisions**:

- Uses stderr to avoid interfering with stdout
- Only logs when logger level permits (debug/info)
- Respects existing logger configuration
- Can be completely disabled via `progressLog: false`

## Type Definitions

The current type system uses event-driven architecture (v1.0+):

```typescript
export type FetchProgressEvent =
    | RequestStartEvent
    | ResponseReceivedEvent
    | DownloadProgressEvent
    | CompleteEvent
    | ErrorEvent; // Added in v0.14.0

export type ProtopediaApiCustomClientConfig = {
    protoPediaApiClientOptions?: ProtoPediaApiClientOptions;
    logger?: Logger;
    logLevel?: LogLevel;
    progressLog?: boolean; // Default: true
    progressCallback?: (event: FetchProgressEvent) => void; // Event handler
};
```

### Deprecated (v0.x - Removed in v1.0)

The old callback-based API used separate callback functions:

```typescript
// ❌ DEPRECATED - Removed in v1.0
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

// ❌ DEPRECATED - Removed in v1.0
export type ProtopediaApiCustomClientConfig = {
    progressCallback?: {
        onStart?: ProgressCallbacks['onStart'];
        onProgress?: ProgressCallbacks['onProgress'];
        onComplete?: ProgressCallbacks['onComplete'];
    };
};
```

**Migration to v1.0**:

- Replace callback object with single event handler function
- Use `switch(event.type)` pattern for type-safe event handling
- Update timing references: seconds → milliseconds
- Add handling for new `request-start` and `error` event types

## Testing Strategy

**Unit Tests** (7 tests in `should-progress-log.test.ts`):

- Logger level filtering logic
- All log levels tested
- Edge cases (invalid levels)

**Integration Tests** (38 tests in `fetch-with-progress.test.ts`):

- Mock Response with streaming body
- Callback firing sequence
- Progress calculation accuracy
- Logger integration
- Error handling
- Error event emission

**Test Coverage**:

- ✅ Normal download flow
- ✅ Missing Content-Length header
- ✅ Empty response body
- ✅ Large downloads (chunked transfer)
- ✅ Logger level filtering
- ✅ Custom callbacks
- ✅ Disabled progress tracking
- ✅ Stream reading errors with event emission

## Performance Considerations

### Overhead

- Minimal: Only wraps fetch when `progressLog: true` (progress tracking) or when browser-only header stripping is enabled
- Streaming processing: No buffering of entire response
- Callback execution: Synchronous, non-blocking
- Event throttling: download-progress events limited to once per 500ms

### Memory

- Uses `ReadableStream.getReader()` for chunk processing
- No full response buffering
- Releases chunks after processing
- Minimal event object allocation

### Backward Compatibility

**Default Behavior**:

- `progressLog: true` by default
- Existing code without progress config: Works with automatic logging
- Can be disabled: `progressLog: false`

**API Surface**:

- No breaking changes to existing methods
- All progress parameters optional
- Extends `ProtopediaApiCustomClientConfig` interface
- Error event is additive (existing switch statements continue to work)
