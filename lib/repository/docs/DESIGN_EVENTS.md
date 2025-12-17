---
lang: en
title: Event System Design
title-en: Event System Design
title-ja: イベントシステム設計
related:
    - DESIGN.md "Repository Design"
    - USAGE.md "Repository Usage"
instructions-for-ais:
    - This document should be written in English for AI readability.
    - Content within code fences may be written in languages other than English.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document.
---

# Event System Design

This document describes the design, implementation, and rationale behind the repository's event notification system (Issue #19).

## Table of Contents

- [Overview](#overview)
- [Design Philosophy](#design-philosophy)
- [Event Types](#event-types)
- [Opt-in Architecture](#opt-in-architecture)
- [Event Payload Design](#event-payload-design)
- [Concurrent Call Behavior](#concurrent-call-behavior)
- [Memory Management](#memory-management)
- [Comparison with Progress Callback](#comparison-with-progress-callback)
- [Browser Compatibility](#browser-compatibility)
- [Design Decisions](#design-decisions)

## Overview

The event notification system provides real-time state change notifications during snapshot update operations (`setupSnapshot` and `refreshSnapshot`). This feature is designed primarily for interactive WebApp/SPA scenarios where UI needs to respond to repository state changes.

### Use Cases

- **Loading Spinners**: Show loading state when snapshot update starts
- **Optimistic UI**: Update UI immediately after snapshot completes
- **Error Handling**: Display error messages when refresh fails
- **Progress Feedback**: Provide user feedback during long-running operations

## Design Philosophy

The event system follows these core principles:

1. **Opt-in by Design**: Events are disabled by default to minimize overhead for CLI/script users
2. **Timing Notification**: Events signal _when_ state changes occur, not _what_ changed
3. **Pull-Push Hybrid**: Events notify timing (push), detailed data retrieved via `getStats()` (pull)
4. **Zero Cost When Disabled**: No EventEmitter instance created unless explicitly enabled
5. **User Action Focus**: Events represent user-initiated actions, not internal implementation details

## Event Types

The system provides three events that correspond to the lifecycle of snapshot operations:

### `snapshotStarted`

Emitted when a snapshot operation begins (`setupSnapshot` or `refreshSnapshot`).

**Signature**:

```typescript
snapshotStarted: (operation: 'setup' | 'refresh') => void
```

**Payload**:

- `operation`: Indicates which operation triggered the event

**Use Case**: Show loading spinner, disable UI controls

### `snapshotCompleted`

Emitted when a snapshot operation completes successfully.

**Signature**:

```typescript
snapshotCompleted: (stats: PrototypeInMemoryStats) => void
```

**Payload**:

- `stats`: Complete snapshot statistics including size, cachedAt, isExpired, etc.

**Use Case**: Update UI with new data, hide loading spinner, show success message

**Note**: Stats are included in the event payload for convenience. Users can also call `getStats()` explicitly, but including stats in the event eliminates the need for an additional call.

### `snapshotFailed`

Emitted when a snapshot operation fails.

**Signature**:

```typescript
snapshotFailed: (error: SnapshotOperationFailure) => void
```

**Payload**:

- `error`: Complete error information including message, HTTP status code, API error code

**Use Case**: Display error message, retry logic, fallback behavior

**Note**: Error details are included in the event payload so listeners can immediately display error messages without awaiting the Promise result.

### Interface Definition

```typescript
import type { PrototypeInMemoryStats } from '../../store/index.js';
import type { SnapshotOperationFailure } from './snapshot-operation.types.js';

/**
 * Event types emitted by the repository during snapshot operations.
 */
export interface RepositoryEvents {
    /**
     * Emitted when a snapshot operation starts.
     * @param operation - Type of operation ('setup' or 'refresh')
     */
    snapshotStarted: (operation: 'setup' | 'refresh') => void;

    /**
     * Emitted when a snapshot operation completes successfully.
     * @param stats - Current snapshot statistics
     */
    snapshotCompleted: (stats: PrototypeInMemoryStats) => void;

    /**
     * Emitted when a snapshot operation fails.
     * @param error - Error details including message, status, and code
     */
    snapshotFailed: (error: SnapshotOperationFailure) => void;
}
```

## Opt-in Architecture

Events are disabled by default and must be explicitly enabled via configuration.

### Why Opt-in?

1. **Primary Use Case**: PROMIDAS is used more often for CLI/scripting than WebApps
2. **Zero Overhead**: CLI users don't pay the cost of EventEmitter instantiation
3. **Explicit Intent**: WebApp developers consciously opt-in, understanding the feature
4. **Resource Efficiency**: EventEmitter instance only created when needed

### Configuration

```typescript
const repo = new ProtopediaInMemoryRepositoryImpl({
    store,
    apiClient,
    repositoryConfig: {
        enableEvents: true, // default: false
    },
});
```

### Opt-in Implementation

```typescript
class ProtopediaInMemoryRepositoryImpl {
    readonly events?: TypedEmitter<RepositoryEvents>;

    constructor({ repositoryConfig }) {
        if (repositoryConfig.enableEvents === true) {
            this.events = new EventEmitter();
            this.events.setMaxListeners(0); // Allow unlimited listeners
        }
    }

    async setupSnapshot(params) {
        this.events?.emit('snapshotStarted', 'setup');
        // ... operation logic
    }
}
```

**Key Points**:

- `events` is optional property (`?`), can be `undefined`
- All `emit()` calls use optional chaining (`?.`)
- No overhead when `enableEvents: false` (default)

## Event Payload Design

### Decision: Rich Payloads (Option C)

We chose to include complete information in event payloads rather than empty notifications.

**Alternatives Considered**:

#### Option A: Empty Payloads

```typescript
snapshotStarted: () => void;
snapshotCompleted: () => void;
snapshotFailed: () => void;
```

- ❌ Requires additional `getStats()` calls
- ❌ Error details not available in listener
- ✅ Simplest signature

#### Option B: Failed Only

```typescript
snapshotStarted: () => void;
snapshotCompleted: () => void;
snapshotFailed: (error: SnapshotOperationFailure) => void;
```

- ❌ Still requires `getStats()` after completion
- ✅ Error handling convenient
- ⚠️ Inconsistent payload design

#### Option C: Rich Payloads ✅ Selected

```typescript
snapshotStarted: (operation: 'setup' | 'refresh') => void;
snapshotCompleted: (stats: PrototypeInMemoryStats) => void;
snapshotFailed: (error: SnapshotOperationFailure) => void;
```

- ✅ Event listeners self-contained, no additional calls needed
- ✅ Better developer experience
- ✅ Consistent with "events provide useful information" principle
- ⚠️ Slight duplication with `getStats()` (acceptable trade-off)

### Why Include Stats in Payload?

Including stats in `snapshotCompleted` eliminates the need for:

```typescript
// Without payload
repo.events?.on('snapshotCompleted', () => {
    const stats = repo.getStats(); // Additional call required
    updateUI(stats);
});

// With payload (selected approach)
repo.events?.on('snapshotCompleted', (stats) => {
    updateUI(stats); // Immediate use, cleaner code
});
```

The stats object in the event payload is the exact same object that would be returned by `getStats()` at that moment, ensuring consistency.

## Concurrent Call Behavior

### Promise Coalescing

The repository implements promise coalescing for concurrent `setupSnapshot` / `refreshSnapshot` calls. Multiple concurrent calls share a single API request.

```typescript
// All three calls share one API request
Promise.all([
    repo.setupSnapshot(params), // Call 1
    repo.setupSnapshot(params), // Call 2 (coalesced)
    repo.setupSnapshot(params), // Call 3 (coalesced)
]);
```

### Event Firing Strategy

**Decision**: Events are fired **once per actual API call**, not once per caller.

**Rationale**:

1. **Consistency**: Event frequency matches actual operation frequency (1 API call = 1 event)
2. **Efficiency**: Prevents redundant listener executions
3. **Broadcast Nature**: All subscribers receive the notification regardless of which caller initiated it

**Example**:

```typescript
// Component A
const promise1 = repo.setupSnapshot(params);
repo.events?.on('snapshotCompleted', (stats) => {
    console.log('A received:', stats);
});

// Component B (concurrent)
const promise2 = repo.setupSnapshot(params);
repo.events?.on('snapshotCompleted', (stats) => {
    console.log('B received:', stats);
});

// Result:
// - Only 1 API request
// - Only 1 'snapshotCompleted' event fired
// - Both listeners execute (A and B receive the event)
```

### Event Emission Implementation

```typescript
async setupSnapshot(params: ListPrototypesParams) {
  this.events?.emit('snapshotStarted', 'setup');
  return this.#executeWithCoalescing(() => this.#fetchAndNormalize(params));
}

async refreshSnapshot() {
  this.events?.emit('snapshotStarted', 'refresh');
  return this.#executeWithCoalescing(() => this.#fetchAndNormalize(this.#lastFetchParams));
}

async #executeWithCoalescing(fetchFn) {
  if (this.#ongoingFetch) {
    return this.#ongoingFetch; // Return existing promise, no new event
  }

  this.#ongoingFetch = fetchFn();

  try {
    const result = await this.#ongoingFetch;
    if (result.ok) {
      this.events?.emit('snapshotCompleted', result.stats);
    } else {
      this.events?.emit('snapshotFailed', result);
    }
    return result;
  } finally {
    this.#ongoingFetch = null;
  }
}
```

## Memory Management

### `dispose()` Method

The repository provides a `dispose()` method for cleanup.

```typescript
interface ProtopediaInMemoryRepository {
  dispose(): void;
}

// Implementation
dispose(): void {
  this.events?.removeAllListeners();
}
```

### When to Call

1. **Test Environments**: Always call in `afterEach()` to prevent memory leaks
2. **Dynamic Imports**: Call when unloading modules in WebApps
3. **Repository Replacement**: Call before creating a new repository instance

### Example Usage

```typescript
// Test environment
describe('Repository tests', () => {
    let repo: ProtopediaInMemoryRepository;

    afterEach(() => {
        repo.dispose(); // Clean up listeners
    });

    it('should handle events', () => {
        // ... test logic
    });
});

// React useEffect cleanup
useEffect(() => {
    repo.events?.on('snapshotCompleted', handleComplete);

    return () => {
        repo.dispose(); // Clean up on unmount
    };
}, []);
```

### `maxListeners` Configuration

The implementation sets `maxListeners` to `0` (unlimited):

```typescript
if (config.enableEvents === true) {
    this.events = new EventEmitter();
    this.events.setMaxListeners(0); // Allow unlimited listeners
}
```

**Rationale**:

- WebApps may have many components subscribing to the same repository
- Default limit (10) is too restrictive for complex UIs
- Memory leaks are prevented by `dispose()` method, not listener limits
- Unlimited listeners are safe as long as cleanup is performed properly

## Comparison with Progress Callback

PROMIDAS provides two separate notification mechanisms for different layers:

### Fetcher Layer: Progress Callback (Issue #44)

**Scope**: HTTP download progress

```typescript
const client = new ProtopediaApiCustomClient({
    progressCallback: {
        onStart: (total) => {
            /* ... */
        },
        onProgress: (received, total, percentage) => {
            /* ... */
        },
        onComplete: (total, duration) => {
            /* ... */
        },
    },
});
```

**Information**:

- Bytes downloaded
- Percentage complete
- Download duration

**Use Case**: Detailed download progress bars, network diagnostics

### Repository Layer: Event System (Issue #19)

**Scope**: Business-level snapshot lifecycle

```typescript
repo.events?.on('snapshotStarted', (operation) => {
    /* ... */
});
repo.events?.on('snapshotCompleted', (stats) => {
    /* ... */
});
repo.events?.on('snapshotFailed', (error) => {
    /* ... */
});
```

**Information**:

- Operation type (setup/refresh)
- Snapshot statistics (size, cachedAt, TTL)
- Error details (status, code, message)

**Use Case**: Loading states, optimistic UI updates, error messages

### Combined Usage

Both mechanisms can be used together for comprehensive UX:

```typescript
// Detailed progress during download
const client = new ProtopediaApiCustomClient({
    progressCallback: {
        onProgress: (received, total, percentage) => {
            setDownloadProgress(percentage);
        },
    },
});

// High-level state changes
repo.events?.on('snapshotStarted', () => {
    setLoading(true);
});

repo.events?.on('snapshotCompleted', (stats) => {
    setLoading(false);
    setData(stats);
    setDownloadProgress(0);
});

// User sees: "Downloading 60% ..." → "Processing..." → "Complete!"
```

### Abstraction Levels

| Layer      | Abstraction    | Information       | Granularity            |
| ---------- | -------------- | ----------------- | ---------------------- |
| Fetcher    | HTTP transport | Bytes, percentage | Fine (per chunk)       |
| Repository | Business logic | Stats, errors     | Coarse (per operation) |

Both are valuable but serve different purposes. The repository layer events hide HTTP details and provide snapshot-level notifications that align with business logic.

## Browser Compatibility

### `events` Package

The implementation uses the `events` package (Node.js EventEmitter polyfill for browsers):

```json
{
    "dependencies": {
        "events": "^3.3.0"
    }
}
```

**Benefits**:

- ✅ Consistent API across Node.js and browsers
- ✅ Small size (~2KB gzipped)
- ✅ Well-maintained, widely used
- ✅ TypeScript support

### Alternative: Native `EventTarget`

We considered using the browser's native `EventTarget` API but chose `events` package instead.

**Reasons**:

1. **Inconsistent API**: `EventTarget` uses `addEventListener()` / `dispatchEvent()`, different from Node.js
2. **Type Safety**: Harder to type-check with TypeScript
3. **Developer Experience**: EventEmitter API is more familiar to Node.js developers
4. **Consistency**: Same API in all environments simplifies documentation and testing

### Type Safety: `typed-emitter`

We use `typed-emitter` for compile-time type checking:

```json
{
    "devDependencies": {
        "typed-emitter": "^2.1.0"
    }
}
```

```typescript
import type { TypedEmitter } from 'typed-emitter';

interface RepositoryEvents {
    snapshotStarted: (operation: 'setup' | 'refresh') => void;
    // ...
}

const events: TypedEmitter<RepositoryEvents> = new EventEmitter();

// Type-safe: ✅
events.on('snapshotStarted', (operation) => {
    console.log(operation); // 'setup' | 'refresh'
});

// Compile error: ❌
events.on('invalidEvent', () => {}); // Error: Event 'invalidEvent' does not exist
```

## Design Decisions

### 1. Why Not `setTimeout` for `snapshotExpired`?

**Initial Proposal**: Use `setTimeout` to emit `snapshotExpired` event when TTL expires.

**Decision**: Rejected

**Reasons**:

1. **Browser Throttling**: Background tabs throttle timers, causing inaccurate expiration detection
2. **Existing Solution**: `getStats().isExpired` already provides accurate TTL checking
3. **Polling Pattern**: Documentation already recommends polling `getStats()` for TTL-based refresh
4. **Reliability**: User-controlled polling is more reliable than timer-based events in browsers

**Alternative Approach**:
Users who need expiration notifications can implement their own timers based on `stats.remainingTtlMs`:

```typescript
repo.events?.on('snapshotCompleted', (stats) => {
    // Set timer for next expiration check
    setTimeout(() => {
        if (repo.getStats().isExpired) {
            handleExpiration();
        }
    }, stats.remainingTtlMs);
});
```

This approach gives users full control over timing accuracy vs. resource usage trade-offs.

### 2. Why Opt-in Instead of Always-on?

**Decision**: Events are disabled by default, enabled via `enableEvents: true`

**Reasons**:

1. **Primary Use Case**: PROMIDAS is used more for CLI/scripts than WebApps
2. **Zero Cost**: Non-WebApp users don't pay EventEmitter instantiation cost
3. **Explicit Configuration**: WebApp developers consciously opt-in, avoiding surprise behavior
4. **Resource Efficiency**: Memory used only when actually needed

**Benefit Analysis**:

- CLI/Script users: 0 bytes overhead (EventEmitter not created)
- WebApp users: ~1KB overhead (EventEmitter instance + small metadata)

### 3. Why Include Stats in `snapshotCompleted` Payload?

**Decision**: Include complete `PrototypeInMemoryStats` object in event

**Reasons**:

1. **Developer Experience**: Eliminates need for additional `getStats()` call
2. **Convenience**: Event listeners self-contained, cleaner code
3. **Consistency**: Stats in payload are identical to `getStats()` at that moment
4. **Trade-off**: Slight duplication acceptable for better DX

**Alternative Rejected**:
Empty payload would force this pattern:

```typescript
// Rejected: Extra call required
repo.events?.on('snapshotCompleted', () => {
    const stats = repo.getStats(); // Additional call
    updateUI(stats);
});
```

### 4. Why One Event Per API Call?

**Decision**: Fire events once per actual API call, not once per concurrent caller

**Reasons**:

1. **Consistency**: Event frequency matches operation frequency (1:1 relationship)
2. **Efficiency**: Prevents redundant listener executions
3. **Broadcast Semantics**: All subscribers receive notification regardless of which caller initiated
4. **Simplicity**: Easier to reason about event timing

**Alternative Rejected**:
Firing events per caller would cause:

- 3 concurrent calls = 3 events (but only 1 API request)
- Inconsistency between internal behavior and external notifications
- Unnecessary listener executions

### 5. Why `maxListeners: 0` (Unlimited)?

**Decision**: Set no limit on event listeners

**Reasons**:

1. **WebApp Complexity**: Complex UIs may have many components subscribing
2. **Default Too Low**: Node.js default (10) is too restrictive
3. **Memory Safety**: `dispose()` method provides cleanup mechanism
4. **Flexibility**: Users can have as many listeners as needed without warnings

**Risk Mitigation**:

- Memory leaks prevented by mandatory `dispose()` in cleanup paths
- Documentation emphasizes proper cleanup in tests and component unmounting
- Unit tests verify `dispose()` removes all listeners

## Future Enhancements

Potential improvements for future versions:

### 1. Progress Events During Normalization

Currently, progress callback only covers HTTP download. Normalization and storage phases are opaque to the user.

**Possible Addition**:

```typescript
snapshotProcessing: (phase: 'normalizing' | 'storing', progress: number) => void
```

**Consideration**: Adds complexity, may not be needed for typical use cases

### 2. Snapshot Diff Events

Notify what changed between old and new snapshots.

**Possible Addition**:

```typescript
snapshotUpdated: (diff: { added: number[], removed: number[], modified: number[] }) => void
```

**Consideration**: Requires diff computation overhead, not always needed

### 3. Detailed Error Events

Separate events for different error types.

**Possible Addition**:

```typescript
networkError: (error: NetworkError) => void
authError: (error: AuthError) => void
quotaExceeded: (error: QuotaError) => void
```

**Consideration**: `snapshotFailed` with error codes may be sufficient

These enhancements are tracked but not currently planned. User feedback will guide prioritization.

## References

- [Issue #19: Event Notification System](https://github.com/F88/promidas/issues/19)
- [Issue #44: Progress Callback (Fetcher Layer)](https://github.com/F88/promidas/issues/44)
- [Node.js EventEmitter Documentation](https://nodejs.org/api/events.html)
- [events Package (npm)](https://www.npmjs.com/package/events)
- [typed-emitter Package (npm)](https://www.npmjs.com/package/typed-emitter)
