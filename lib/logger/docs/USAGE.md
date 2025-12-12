---
lang: en
title: Logger Usage Guide
title-en: Logger Usage Guide
title-ja: Logger使用ガイド
related:
    - ../../../README.md "Project Overview"
    - DESIGN.md "Logger Design"
instructions-for-ais:
    - This document should be written in English for AI readability.
    - Content within code fences may be written in languages other than English.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document.
---

# Logger Usage Guide

This document provides comprehensive usage examples and best practices for the logger module.

## Table of Contents

- [Quick Start](#quick-start)
- [Log Levels](#log-levels)
- [Console Logger](#console-logger)
- [No-op Logger](#no-op-logger)
- [Custom Loggers](#custom-loggers)
- [Integration Examples](#integration-examples)
- [Best Practices](#best-practices)

## Quick Start

### Basic Usage

```typescript
import { createConsoleLogger } from '@f88/promidas/logger';

const logger = createConsoleLogger('info');

logger.debug('This will not appear (level is info)');
logger.info('Application started');
logger.warn('Deprecated API used', { api: '/v1/users' });
logger.error('Failed to connect', { error: 'ECONNREFUSED' });
```

### Import Options

```typescript
// Named imports (recommended)
import { createConsoleLogger, createNoopLogger } from '@f88/promidas/logger';

// Type imports
import type { Logger, LogLevel } from '@f88/promidas/logger';

// Combined
import {
    createConsoleLogger,
    type Logger,
    type LogLevel,
} from '@f88/promidas/logger';
```

## Log Levels

### Level Hierarchy

Levels from most to least verbose:

1. `debug` - Detailed diagnostic information
2. `info` - General informational messages
3. `warn` - Warning messages for potentially harmful situations
4. `error` - Error messages for failures
5. `silent` - No logging output

### Behavior by Level

| Set Level | `debug()` | `info()`  | `warn()`  | `error()` |
| --------- | --------- | --------- | --------- | --------- |
| `debug`   | ✅ Shows  | ✅ Shows  | ✅ Shows  | ✅ Shows  |
| `info`    | ❌ Hidden | ✅ Shows  | ✅ Shows  | ✅ Shows  |
| `warn`    | ❌ Hidden | ❌ Hidden | ✅ Shows  | ✅ Shows  |
| `error`   | ❌ Hidden | ❌ Hidden | ❌ Hidden | ✅ Shows  |
| `silent`  | ❌ Hidden | ❌ Hidden | ❌ Hidden | ❌ Hidden |

### Choosing the Right Level

**Development**:

```typescript
const logger = createConsoleLogger('debug');
// Shows all messages including debug info
```

**Production**:

```typescript
const logger = createConsoleLogger('error');
// Only shows errors, reducing noise
```

**Testing**:

```typescript
const logger = createConsoleLogger('silent');
// Or use createNoopLogger() for zero overhead
```

## Console Logger

### Creating a Console Logger

```typescript
import { createConsoleLogger } from '@f88/promidas/logger';

// Default level is 'info'
const logger1 = createConsoleLogger();

// Explicit level
const logger2 = createConsoleLogger('debug');
const logger3 = createConsoleLogger('error');
```

### Using Metadata

**Object Metadata** (recommended):

```typescript
logger.info('User action', {
    userId: 123,
    action: 'login',
    timestamp: new Date().toISOString(),
});
// Console: "User action" { level: 'info', userId: 123, action: 'login', timestamp: '...' }
```

**Primitive Metadata**:

```typescript
logger.error('Request failed', 500);
// Console: "Request failed" { level: 'error', meta: 500 }
```

**No Metadata**:

```typescript
logger.warn('Cache miss');
// Console: "Cache miss" { level: 'warn' }
```

### Environment-Based Configuration

```typescript
const getLogLevel = (): LogLevel => {
    if (process.env.NODE_ENV === 'test') return 'silent';
    if (process.env.NODE_ENV === 'production') return 'error';
    if (process.env.DEBUG) return 'debug';
    return 'info';
};

const logger = createConsoleLogger(getLogLevel());
```

### Multiple Loggers for Different Modules

```typescript
import { createConsoleLogger } from '@f88/promidas/logger';

// Different log levels per concern
const storeLogger = createConsoleLogger('warn'); // Less verbose
const apiLogger = createConsoleLogger('debug'); // More verbose

const store = createStore({ logger: storeLogger });
const apiClient = createApiClient({ logger: apiLogger });
```

## No-op Logger

### When to Use

1. **Tests**: Suppress log output
2. **Production**: Completely disable logging
3. **Benchmarks**: Remove logging overhead

### Creating a No-op Logger

```typescript
import { createNoopLogger } from '@f88/promidas/logger';

const logger = createNoopLogger();

logger.info('This is silently ignored');
logger.error('This too', { data: 'ignored' });
// No console output, minimal overhead
```

### Conditional Logger Selection

```typescript
import { createConsoleLogger, createNoopLogger } from '@f88/promidas/logger';

const logger =
    process.env.ENABLE_LOGGING === 'true'
        ? createConsoleLogger('info')
        : createNoopLogger();
```

## Custom Loggers

### Implementing the Logger Interface

```typescript
import type { Logger } from '@f88/promidas/logger';

// Custom logger that prefixes messages
const createPrefixedLogger = (prefix: string): Logger => {
    return {
        debug: (msg, meta) => console.debug(`[${prefix}] ${msg}`, meta),
        info: (msg, meta) => console.info(`[${prefix}] ${msg}`, meta),
        warn: (msg, meta) => console.warn(`[${prefix}] ${msg}`, meta),
        error: (msg, meta) => console.error(`[${prefix}] ${msg}`, meta),
    };
};

const logger = createPrefixedLogger('MyApp');
logger.info('Started'); // Console: "[MyApp] Started"
```

### Winston Integration

```typescript
import type { Logger } from '@f88/promidas/logger';
import winston from 'winston';

const winstonLogger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [new winston.transports.File({ filename: 'app.log' })],
});

const logger: Logger = {
    debug: (msg, meta) => winstonLogger.debug(msg, meta),
    info: (msg, meta) => winstonLogger.info(msg, meta),
    warn: (msg, meta) => winstonLogger.warn(msg, meta),
    error: (msg, meta) => winstonLogger.error(msg, meta),
};
```

### Pino Integration

```typescript
import type { Logger } from '@f88/promidas/logger';
import pino from 'pino';

const pinoLogger = pino({ level: 'info' });

const logger: Logger = {
    debug: (msg, meta) => pinoLogger.debug(meta, msg),
    info: (msg, meta) => pinoLogger.info(meta, msg),
    warn: (msg, meta) => pinoLogger.warn(meta, msg),
    error: (msg, meta) => pinoLogger.error(meta, msg),
};
```

### Testing with Mock Logger

```typescript
import type { Logger } from '@f88/promidas/logger';
import { describe, it, expect } from 'vitest';

const createMockLogger = (): Logger & { logs: string[] } => {
    const logs: string[] = [];
    return {
        logs,
        debug: (msg) => logs.push(`DEBUG: ${msg}`),
        info: (msg) => logs.push(`INFO: ${msg}`),
        warn: (msg) => logs.push(`WARN: ${msg}`),
        error: (msg) => logs.push(`ERROR: ${msg}`),
    };
};

describe('MyService', () => {
    it('logs startup message', () => {
        const mockLogger = createMockLogger();
        const service = new MyService(mockLogger);

        service.start();

        expect(mockLogger.logs).toContain('INFO: Service started');
    });
});
```

## Integration Examples

### With Repository

```typescript
import { createProtopediaInMemoryRepository } from '@f88/promidas/repository';
import { createConsoleLogger } from '@f88/promidas/logger';

const storeLogger = createConsoleLogger('warn');
const apiLogger = createConsoleLogger('debug');

const repository = createProtopediaInMemoryRepository({
    storeConfig: { logger: storeLogger },
    apiClientOptions: {
        token: process.env.PROTOPEDIA_API_TOKEN,
        logger: apiLogger,
    },
});
```

### With Fetcher

```typescript
import { createProtopediaApiCustomClient } from '@f88/promidas/fetcher';
import { createConsoleLogger } from '@f88/promidas/logger';

const logger = createConsoleLogger('info');

const client = createProtopediaApiCustomClient({
    token: process.env.PROTOPEDIA_API_TOKEN,
    logger,
});
```

### With protopedia-api-v2-client

```typescript
import { createProtoPediaClient } from 'protopedia-api-v2-client';
import { createConsoleLogger } from '@f88/promidas/logger';

const logger = createConsoleLogger('debug');

const client = createProtoPediaClient({
    token: process.env.PROTOPEDIA_API_TOKEN,
    logger, // Compatible interface
});
```

### Shared Logger Across Components

```typescript
import { createConsoleLogger } from '@f88/promidas/logger';
import { createProtopediaInMemoryRepository } from '@f88/promidas/repository';
import { createProtopediaApiCustomClient } from '@f88/promidas/fetcher';

// Single logger instance
const logger = createConsoleLogger('info');

// Shared across all components
const apiClient = createProtopediaApiCustomClient({
    token: process.env.PROTOPEDIA_API_TOKEN,
    logger,
});

const repository = createProtopediaInMemoryRepository({
    storeConfig: { logger },
    apiClientOptions: {
        token: process.env.PROTOPEDIA_API_TOKEN,
        logger,
    },
});
```

## Best Practices

### 1. Use Appropriate Log Levels

**❌ Bad**:

```typescript
logger.error('Cache hit'); // error is for failures
logger.debug('Database connection failed'); // critical errors should be error level
```

**✅ Good**:

```typescript
logger.debug('Cache hit'); // diagnostic info
logger.error('Database connection failed', { error: err }); // actual error
```

### 2. Include Contextual Metadata

**❌ Bad**:

```typescript
logger.error('Request failed');
```

**✅ Good**:

```typescript
logger.error('Request failed', {
    url: request.url,
    method: request.method,
    statusCode: response.status,
    duration: Date.now() - startTime,
});
```

### 3. Use Object Metadata

**❌ Bad**:

```typescript
logger.info(`User ${userId} performed ${action}`); // String interpolation
```

**✅ Good**:

```typescript
logger.info('User action', { userId, action }); // Structured metadata
```

### 4. Configure Based on Environment

**❌ Bad**:

```typescript
const logger = createConsoleLogger('debug'); // Hardcoded
```

**✅ Good**:

```typescript
const level =
    process.env.NODE_ENV === 'production'
        ? 'error'
        : process.env.DEBUG
          ? 'debug'
          : 'info';
const logger = createConsoleLogger(level);
```

### 5. Use No-op Logger in Tests

**❌ Bad**:

```typescript
const logger = createConsoleLogger('silent'); // Still has overhead
```

**✅ Good**:

```typescript
const logger = createNoopLogger(); // Zero overhead
```

### 6. Don't Change Logger After Creation

**❌ Bad**:

```typescript
// Logger level cannot be changed after creation
logger.level = 'debug'; // ❌ Type error (no level property)
```

**✅ Good**:

```typescript
// Create new logger instance if level needs to change
let logger = createConsoleLogger('info');

if (enableDebugMode) {
    logger = createConsoleLogger('debug');
}
```

### 7. Avoid Expensive Computations in Log Calls

**❌ Bad**:

```typescript
logger.debug('State:', JSON.stringify(largeObject)); // Serializes even when filtered
```

**✅ Good**:

```typescript
// Computation only happens if log level allows
if (someCondition) {
    logger.debug('State:', { state: largeObject }); // Let logger handle serialization
}

// Or use metadata (only processed if logged)
logger.debug('State:', largeObject);
```

### 8. Prefer Structured Logging

**❌ Bad**:

```typescript
logger.info('User 123 logged in at 2024-01-01T00:00:00Z from IP 192.168.1.1');
```

**✅ Good**:

```typescript
logger.info('User login', {
    userId: 123,
    timestamp: '2024-01-01T00:00:00Z',
    ipAddress: '192.168.1.1',
});
```

## Type Definitions

### Logger Interface

```typescript
export type Logger = {
    debug: (message: string, meta?: unknown) => void;
    info: (message: string, meta?: unknown) => void;
    warn: (message: string, meta?: unknown) => void;
    error: (message: string, meta?: unknown) => void;
};
```

### LogLevel Type

```typescript
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';
```

### Factory Signatures

```typescript
export const createConsoleLogger: (level?: LogLevel) => Logger;
export const createNoopLogger: () => Logger;
```

---

**Document Version**: 1.0.0
**Last Updated**: 2025-12-10
**Related Documents**: DESIGN.md
