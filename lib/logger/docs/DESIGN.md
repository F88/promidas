---
lang: en
title: Logger Design
title-en: Logger Design
title-ja: Logger設計
related:
    - ../../../README.md "Project Overview"
    - LOGGER.md "Logger Usage"
instructions-for-ais:
    - This document should be written in English for AI readability.
    - Content within code fences may be written in languages other than English.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document.
---

# Logger Design

This document describes the architecture, design decisions, and implementation patterns of the minimal logger module.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Design Patterns](#design-patterns)
- [Implementation Details](#implementation-details)
- [Performance Considerations](#performance-considerations)
- [Compatibility](#compatibility)

## Architecture Overview

### Component Structure

```plaintext
┌─────────────────────────────────────────────────────────┐
│  Consumer Code (Repository, Fetcher, etc.)             │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  Logger Interface (Logger type)                         │
│  - debug(message, meta?)                                │
│  - info(message, meta?)                                 │
│  - warn(message, meta?)                                 │
│  - error(message, meta?)                                │
└─────────────────────────────────────────────────────────┘
                │                         │
        ┌───────┘                         └───────┐
        ▼                                         ▼
┌──────────────────────┐              ┌──────────────────────┐
│  Console Logger      │              │  No-op Logger        │
│  - Level filtering   │              │  - Silent operation  │
│  - console.* binding │              │  - Zero overhead     │
│  - Metadata support  │              │                      │
└──────────────────────┘              └──────────────────────┘
```

### Design Goals

1. **Zero Dependencies**: No external logging libraries
2. **Minimal API**: Only essential logging methods
3. **Type Safety**: Strong typing with TypeScript
4. **Compatibility**: Works with protopedia-api-v2-client
5. **Performance**: Negligible overhead when disabled

## Design Patterns

### 1. Interface-Based Design

**Purpose**: Decouple logging interface from implementation

**Definition**:

```typescript
export type Logger = {
    debug: (message: string, meta?: unknown) => void;
    info: (message: string, meta?: unknown) => void;
    warn: (message: string, meta?: unknown) => void;
    error: (message: string, meta?: unknown) => void;
};
```

**Benefits**:

- Consumers depend on interface, not implementation
- Easy to swap implementations (console → file → network)
- Simple mocking in tests
- No class instantiation required

**Trade-off**: No method chaining or advanced features

**Decision**: Simplicity over features for library code

### 2. Factory Pattern

**Purpose**: Encapsulate logger creation logic

**Implementations**:

```typescript
// Console logger with default 'info' level
export const createConsoleLogger = (): ConsoleLogger => {
    return new ConsoleLogger('info');
};

// Silent logger for production or tests
export const createNoopLogger = (): Logger => {
    // Returns Logger instance with no-op methods
};
```

**Benefits**:

- Hides implementation complexity
- Allows preconfiguration (log level)
- Consistent API for different logger types
- Future-proof (can add new factories)

### 3. Level-Based Filtering

**Purpose**: Control log verbosity without changing code

**Level Hierarchy**:

```plaintext
debug → info → warn → error → silent
  ↑      ↑      ↑      ↑        ↑
 Most            |            Least
verbose          |           verbose
```

**Filtering Logic**:

```typescript
const levelOrder: LogLevel[] = ['debug', 'info', 'warn', 'error', 'silent'];

const shouldLog = (current: LogLevel, target: LogLevel): boolean => {
    return levelOrder.indexOf(target) >= levelOrder.indexOf(current);
};
```

**Examples**:

| Current Level | `debug()` | `info()` | `warn()` | `error()` |
| ------------- | --------- | -------- | -------- | --------- |
| `debug`       | ✅        | ✅       | ✅       | ✅        |
| `info`        | ❌        | ✅       | ✅       | ✅        |
| `warn`        | ❌        | ❌       | ✅       | ✅        |
| `error`       | ❌        | ❌       | ❌       | ✅        |
| `silent`      | ❌        | ❌       | ❌       | ❌        |

**Benefits**:

- Single configuration point (factory parameter)
- No runtime checks in consumer code
- Production-friendly (set to 'error' or 'silent')

### 4. Metadata Support

**Purpose**: Attach structured data to log messages

**Design**:

```typescript
logger.info('User logged in', { userId: 123, email: 'user@example.com' });
// Console output: "[INFO] User logged in" { userId: 123, email: 'user@example.com' }
```

**Implementation**:

```typescript
const createPayload = (
    level: LogLevel,
    meta: unknown,
): Record<string, unknown> => {
    return meta && typeof meta === 'object' && !Array.isArray(meta)
        ? { level, ...(meta as Record<string, unknown>) }
        : { level, meta };
};
```

**Behavior**:

- Object metadata: spread into payload with `level` field
- Non-object metadata: wrapped in `{ level, meta }` object
- Undefined metadata: only `{ level }` in payload

**Benefits**:

- Structured logging ready
- Compatible with log aggregation tools
- Type-safe with TypeScript

## Implementation Details

### Console Safety Check

**Problem**: `console` may not exist in all environments (e.g., some test runners)

**Solution**:

```typescript
const hasConsole = typeof console !== 'undefined';

const getConsoleFn = (method: 'debug' | 'info' | 'warn' | 'error') => {
    return hasConsole && typeof console[method] === 'function'
        ? console[method].bind(console)
        : undefined;
};
```

**Benefits**:

- No runtime errors in console-less environments
- Graceful degradation (logs silently ignored)
- Safe for server-side rendering

### Method Creation Pattern

**Design**: Single helper function creates all log methods

**Implementation**:

```typescript
const createLogMethod = (
    currentLevel: LogLevel,
    targetLevel: LogLevel,
    consoleFn:
        | ((message?: unknown, ...optionalParams: unknown[]) => void)
        | undefined,
) => {
    return (message: string, meta?: unknown): void => {
        if (!shouldLog(currentLevel, targetLevel) || !consoleFn) {
            return;
        }
        consoleFn(message, createPayload(targetLevel, meta));
    };
};
```

**Usage**:

```typescript
// createConsoleLogger creates a ConsoleLogger with 'info' level
export const createConsoleLogger = (): ConsoleLogger => {
    return new ConsoleLogger('info');
};

// For specific levels, use the constructor directly
const debugLogger = new ConsoleLogger('debug');
const errorLogger = new ConsoleLogger('error');
```

**Benefits**:

- DRY principle (no code duplication)
- Consistent behavior across methods
- Easy to test
- Closure-based encapsulation

### No-op Logger Pattern

**Purpose**: Zero-overhead logging for production or tests

**Implementation**:

```typescript
export const createNoopLogger = (): Logger => ({
    debug: () => {
        /* noop */
    },
    info: () => {
        /* noop */
    },
    warn: () => {
        /* noop */
    },
    error: () => {
        /* noop */
    },
});
```

**Use Cases**:

1. Production: Disable logging entirely
2. Tests: Suppress log output
3. Benchmarks: Remove logging overhead

**Performance**:

- Function call overhead only (~1-2ns)
- No string concatenation
- No console I/O
- Negligible impact on performance

## Performance Considerations

### Early Exit Pattern

**Strategy**: Check level and console availability first

**Implementation**:

```typescript
if (!shouldLog(currentLevel, targetLevel) || !consoleFn) {
    return; // Exit before any work
}
```

**Benefits**:

- No metadata processing for filtered logs
- No string formatting
- Minimal CPU usage

**Measurement** (hypothetical):

| Operation         | Time (ns) | Relative |
| ----------------- | --------- | -------- |
| Filtered log call | ~5        | 1x       |
| Active log call   | ~50,000   | 10,000x  |
| No-op logger      | ~2        | 0.4x     |

### Console Binding

**Design**: Pre-bind console methods in factory

**Implementation**:

```typescript
const getConsoleFn = (method: 'debug' | 'info' | 'warn' | 'error') => {
    return hasConsole && typeof console[method] === 'function'
        ? console[method].bind(console) // Bind once at creation
        : undefined;
};
```

**Benefits**:

- No `bind()` call per log invocation
- Correct `this` context for console methods
- Slightly faster repeated calls

**Trade-off**: Negligible memory vs. cleaner call site

### Metadata Object Creation

**Design**: Lazy object creation only for active logs

**Flow**:

1. Check if log should be emitted
2. If yes, create payload object
3. Pass to console method

**Alternative Considered**: Pre-create metadata objects

**Decision**: Lazy creation reduces GC pressure for filtered logs

## Compatibility

### protopedia-api-v2-client

**Design Goal**: 100% compatible with official client's Logger interface

**Interface Comparison**:

```typescript
// protopedia-api-v2-client expects:
type Logger = {
    debug: (message: string, meta?: unknown) => void;
    info: (message: string, meta?: unknown) => void;
    warn: (message: string, meta?: unknown) => void;
    error: (message: string, meta?: unknown) => void;
};

// This library provides:
export type Logger = {
    debug: (message: string, meta?: unknown) => void;
    info: (message: string, meta?: unknown) => void;
    warn: (message: string, meta?: unknown) => void;
    error: (message: string, meta?: unknown) => void;
};
```

**Result**: Exact match, no adapter needed

**Usage**:

```typescript
import { createProtoPediaClient } from 'protopedia-api-v2-client';
import { createConsoleLogger } from '@f88/promidas/logger';

const logger = createConsoleLogger();
const apiClient = createProtoPediaClient({
    token: 'your-token',
    logger,
    logLevel: 'debug', // SDK will update logger.level if mutable
});
```

### No Level Property in Interface

**Design Decision**: Logger interface does NOT expose `level` property

**Reasoning**:

1. Level is implementation detail
2. ConsoleLogger has mutable `level` property, but it's not part of the interface
3. Simpler interface (4 methods only)
4. Matches protopedia-api-v2-client contract

**Level Management**:

ConsoleLogger supports runtime level changes through its mutable `level` property:

```typescript
const logger = createConsoleLogger();
logger.level = 'error'; // Production mode

// Debug mode
if (process.env.DEBUG) {
    logger.level = 'debug'; // Update level dynamically
}
```

**Pattern**: Use `logLevel` parameter when integrating with Repository/Store/Fetcher, which will update the logger's level if mutable.

## Design Decisions Log

### 1. Why Interface over Class?

**Decision**: Use type alias instead of class

**Reasoning**:

- Simpler API (no `new` keyword)
- Easier mocking in tests (plain object)
- Better tree-shaking (functions, not methods)
- Matches common TypeScript patterns

**Trade-off**: No inheritance vs. simpler usage

### 2. Why Factory over Singleton?

**Decision**: Export factory functions, not singleton instances

**Reasoning**:

- Multiple loggers with different levels (e.g., store vs. fetcher)
- Testable (can create isolated instances)
- No global state
- More flexible

**Trade-off**: Manual creation vs. better isolation

### 3. Why No Custom Formatters?

**Decision**: Simple `message + meta` format only

**Reasoning**:

- Minimal scope (not a full logging framework)
- Consumer can format before calling logger
- Keeps implementation simple (~60 lines)
- Formatters increase complexity 10x

**Trade-off**: Limited formatting vs. minimal code

### 4. Why Level Filtering at Creation?

**Decision**: Log level set at factory time, not runtime

**Reasoning**:

- Simpler implementation (no state mutation)
- Better performance (compile-time optimization)
- Matches common use case (fixed level per environment)

**Trade-off**: No dynamic changes vs. simpler code

### 5. Why Metadata as `unknown`?

**Decision**: `meta?: unknown` instead of `meta?: Record<string, unknown>`

**Reasoning**:

- More flexible (accepts any type)
- Implementation handles type checking
- Matches protopedia-api-v2-client interface
- Consumer can pass anything

**Trade-off**: Less type safety at call site vs. flexibility

---

**Document Version**: 1.0.0
**Last Updated**: 2025-12-10
**Related Modules**: lib/repository, lib/fetcher
