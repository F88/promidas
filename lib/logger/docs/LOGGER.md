---
lang: en
title: Logger Usage
title-en: Logger Usage
title-ja: Loggerの使用法
related:
    - ../../../README.md "Project Overview"
instructions-for-ais:
    - This document should be written in English for AI readability.
    - Content within code fences may be written in languages other than English.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document.
---

# Logger Usage

## Overview

The library provides a minimal, dependency-free logger interface that is
fully compatible with `protopedia-api-v2-client`'s Logger interface.

## Logger Interface

The `Logger` interface is defined in `lib/logger/logger.types.ts`:

```typescript
export type Logger = {
    debug: (message: string, meta?: unknown) => void;
    info: (message: string, meta?: unknown) => void;
    warn: (message: string, meta?: unknown) => void;
    error: (message: string, meta?: unknown) => void;
};
```

**Note:** The `Logger` interface does not include a `level` property.
Log level filtering is managed internally by factory functions like
`createConsoleLogger(level)`.

## Implementations

### Console Logger

`createConsoleLogger(level?: LogLevel)` creates a logger that outputs to
the console with configurable log level filtering:

```typescript
import { createConsoleLogger } from '@f88/promidas/logger';

const logger = createConsoleLogger('debug'); // 'debug' | 'info' | 'warn' | 'error' | 'silent'
logger.debug('Debug message', { key: 'value' });
```

### No-op Logger

`createNoopLogger()` returns a logger that discards all messages:

```typescript
import { createNoopLogger } from '@f88/promidas/logger';

const logger = createNoopLogger();
logger.info('This is ignored');
```

## Compatibility

The `Logger` interface is structurally identical to the Logger interface
from `protopedia-api-v2-client`, enabling seamless logger sharing between
this library and the SDK:

```typescript
import { createConsoleLogger } from '@f88/promidas/logger';
import { createProtopediaApiCustomClient } from '@f88/promidas/fetcher';

const logger = createConsoleLogger('info');

const client = createProtopediaApiCustomClient({
    token: 'my-token',
    logger, // Used by both SDK and this library's error handler
});
```

## Custom Logger Implementation

You can provide custom logger implementations (e.g., Winston, Pino):

```typescript
import type { Logger } from '@f88/promidas/logger';
import winston from 'winston';

const winstonLogger = winston.createLogger({
    /* config */
});

const logger: Logger = {
    debug: (msg, meta) => winstonLogger.debug(msg, meta),
    info: (msg, meta) => winstonLogger.info(msg, meta),
    warn: (msg, meta) => winstonLogger.warn(msg, meta),
    error: (msg, meta) => winstonLogger.error(msg, meta),
};
```
