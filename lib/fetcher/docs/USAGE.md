---
lang: en
title: Usage of Fetcher and API Client
title-en: Usage of Fetcher and API Client
title-ja: FetcherとAPIクライアントの使用法
related:
    - ../../../README.md "Project Overview"
instructions-for-ais:
    - This document should be written in English for AI readability.
    - Content within code fences may be written in languages other than English.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document.
---

# Fetcher and API Client Usage

This document describes the fetcher layer, data normalization, and integration with the ProtoPedia API client.

## Table of Contents

- [Quick Start](#quick-start)
- [API Client](#api-client)
- [Download Progress Tracking](#download-progress-tracking)
- [Fetch and Normalize](#fetch-and-normalize)
- [Normalized Data Model](#normalized-data-model)
- [Error Handling](#error-handling)
- [Logger Configuration](#logger-configuration)

## Quick Start

### Basic Fetch Example

```typescript
import { ProtopediaApiCustomClient } from '@f88/promidas/fetcher';

const client = new ProtopediaApiCustomClient({
    protoPediaApiClientOptions: {
        token: process.env.PROTOPEDIA_API_V2_TOKEN,
    },
});

const result = await client.fetchPrototypes({ limit: 10 });

if (result.ok) {
    console.log(`Fetched ${result.data.length} prototypes`);
    result.data.forEach((prototype) => {
        console.log(prototype.name, prototype.tags);
    });
} else {
    console.error('Fetch failed:', result.error, result.status);
}
```

### Import Options

```typescript
// Named imports
import { ProtopediaApiCustomClient } from '@f88/promidas/fetcher';
import { constructDisplayMessage } from '@f88/promidas/fetcher/utils/errors/messages';

// Type imports
import type {
    FetchPrototypesResult,
    ProtopediaApiCustomClientConfig,
} from '@f88/promidas/fetcher';

// Combined
import {
    ProtopediaApiCustomClient,
    type FetchPrototypesResult,
    type ProtopediaApiCustomClientConfig,
} from '@f88/promidas/fetcher';
```

## API Client

### Using protopedia-api-v2-client

This library is designed to work very closely with the official
[protopedia-api-v2-client](https://www.npmjs.com/package/protopedia-api-v2-client).

If you are happy to use `protopedia-api-v2-client` as your ProtoPedia
API client, this library already **fully supports it** out of the box.
You can plug an existing client instance into the memorystore layer, or
let this library create and manage the client for you.

In practice, you can treat this library as a reference implementation
of how to integrate `ProtoPedia API Ver 2.0 Client for Javascript`
into real-world applications.

### Example: custom fetcher for Next.js

You can pass any `fetch` implementation to the official client factory
via its options. This makes it easy to adapt to different runtimes such
as Node.js, browsers, or Next.js server components.

#### Using ProtopediaApiCustomClient (with progress tracking)

```ts
import { ProtopediaApiCustomClient } from '@f88/promidas';

const CONNECTION_AND_HEADER_TIMEOUT_MS = 5_000;

export const customClientForNextJs = new ProtopediaApiCustomClient({
    logger: myLogger,
    progressLog: true, // Progress tracking enabled
    protoPediaApiClientOptions: {
        token: process.env.PROTOPEDIA_API_V2_TOKEN ?? '',
        baseUrl: 'https://api.protopedia.net',
        fetch: async (url, init) => {
            const controller = new AbortController();
            const timeoutId = setTimeout(
                () => controller.abort(),
                CONNECTION_AND_HEADER_TIMEOUT_MS,
            );

            try {
                return await globalThis.fetch(url, {
                    ...init,
                    signal: controller.signal,
                    cache: 'force-cache',
                    next: {
                        revalidate: 60,
                    },
                });
            } finally {
                clearTimeout(timeoutId);
            }
        },
    },
});
```

**Key Point**: Your custom fetch (with timeout and Next.js caching) is
automatically wrapped with progress tracking. Both features work together!

#### Direct SDK usage (without progress tracking)

```ts
import { createProtoPediaClient } from 'protopedia-api-v2-client';

const CONNECTION_AND_HEADER_TIMEOUT_MS = 5_000;

export const customClientForNextJs = createProtoPediaClient({
    token: process.env.PROTOPEDIA_API_V2_TOKEN ?? '',
    baseUrl: 'https://api.protopedia.net',
    fetch: async (url, init) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(
            () => controller.abort(),
            CONNECTION_AND_HEADER_TIMEOUT_MS,
        );

        try {
            return await globalThis.fetch(url, {
                ...init,
                signal: controller.signal,
                cache: 'force-cache',
                next: {
                    revalidate: 60,
                },
            });
        } finally {
            clearTimeout(timeoutId);
        }
    },
    // Reduce noisy logs in development; can be overridden via env
    logLevel: process.env.NODE_ENV === 'production' ? 'error' : 'debug',
});
```

The resulting client can then be passed into this library's
memorystore layer, or you can let this library create a compatible
client internally by providing the same options shape.

## Download Progress Tracking

### Overview

The `ProtopediaApiCustomClient` supports event-driven download progress tracking for large data fetches.
Progress information is logged to stderr by default when the logger level permits,
and custom event handlers can be provided for advanced use cases.

### Basic Usage (Automatic Logging)

```typescript
import { ProtopediaApiCustomClient } from '@f88/promidas/fetcher';

const client = new ProtopediaApiCustomClient({
    protoPediaApiClientOptions: {
        token: process.env.PROTOPEDIA_API_V2_TOKEN,
    },
    logLevel: 'info', // Progress logs appear at 'info' level
    progressLog: true, // Default: enabled
});

const result = await client.fetchPrototypes({ limit: 10000 });
// stderr output:
// [INFO] Request starting...
// [INFO] Response received (50ms) - 2670000 bytes (estimated), limit=10000
// Download complete: 2670000 bytes received (estimated 2670000 bytes) in 1230ms (total: 1280ms)
```

### Custom Progress Event Handler

For custom progress handling (e.g., progress bars, UI updates):

```typescript
const client = new ProtopediaApiCustomClient({
    protoPediaApiClientOptions: {
        token: process.env.PROTOPEDIA_API_V2_TOKEN,
    },
    progressLog: false, // Disable automatic logging
    progressCallback: (event) => {
        switch (event.type) {
            case 'request-start':
                console.log('Starting request...');
                break;
            case 'response-received':
                console.log(
                    `Headers received (${event.prepareTimeMs}ms) - ${event.estimatedTotal} bytes (estimated), limit=${event.limit}`,
                );
                break;
            case 'download-progress':
                process.stdout.write(
                    `\rProgress: ${event.percentage.toFixed(1)}% (${event.received}/${event.total} bytes)`,
                );
                break;
            case 'complete':
                console.log(
                    `\nComplete: ${event.received} bytes in ${event.downloadTimeMs}ms (total: ${event.totalTimeMs}ms)`,
                );
                break;
            case 'error':
                console.error(
                    `\nError: ${event.error} (received ${event.received} bytes before failure)`,
                );
                break;
        }
    },
});

const result = await client.fetchPrototypes({ limit: 10000 });
```

### Progress Event Types

The progress tracking system emits five event types during the fetch lifecycle:

```typescript
import type { FetchProgressEvent } from '@f88/promidas/fetcher';

// Event types:
type FetchProgressEvent =
    | FetchProgressRequestStartEvent // Fired when fetch() is called
    | FetchProgressResponseReceivedEvent // Fired when headers are received
    | FetchProgressDownloadProgressEvent // Fired during body download (throttled to 500ms)
    | FetchProgressCompleteEvent // Fired when download completes successfully
    | FetchProgressErrorEvent; // Fired when stream reading fails
```

**Event Properties**:

| Event Type          | Properties                                                           |
| ------------------- | -------------------------------------------------------------------- |
| `request-start`     | `type: 'request-start'`                                              |
| `response-received` | `type, prepareTimeMs, estimatedTotal, limit`                         |
| `download-progress` | `type, received, total, percentage`                                  |
| `complete`          | `type, received, estimatedTotal, downloadTimeMs, totalTimeMs`        |
| `error`             | `type, error, received, estimatedTotal, downloadTimeMs, totalTimeMs` |

**Event Lifecycle**:

- **Success flow**: `request-start` → `response-received` → `download-progress` (multiple) → `complete`
- **Error flow**: `request-start` → `response-received` → `error` (stream reading fails)

### Controlling stderr Output

Use the `shouldProgressLog` utility to determine if progress should be logged to stderr:

```typescript
import {
    ProtopediaApiCustomClient,
    shouldProgressLog,
} from '@f88/promidas/fetcher';
import { ConsoleLogger } from '@f88/promidas/logger';

const logger = new ConsoleLogger('info');

if (shouldProgressLog(logger)) {
    console.log('Progress will be logged to stderr');
}

// shouldProgressLog returns true when:
// - Logger level is 'debug' or 'info'
// - Returns false for 'warn', 'error', or 'silent'
```

### Progress Tracking Architecture

The progress tracking system consists of three modules:

1. **fetch-with-progress**: Core progress tracking with event emission
2. **select-custom-fetch**: Smart fetch selection with progress integration
3. **protopedia-api-custom-client**: Uses progress tracking by default

**Key Features**:

- Event-driven architecture with type-safe discriminated unions
- Complete lifecycle tracking (request start → headers → download → complete)
- Automatic estimation of download size based on limit parameter
- Real-time progress updates during streaming
- Separate timing for preparation vs. download phases (in milliseconds)
- Logger-level filtering for stderr output
- Custom event handlers for advanced use cases

### Disabling Progress Tracking

```typescript
const client = new ProtopediaApiCustomClient({
    protoPediaApiClientOptions: {
        token: process.env.PROTOPEDIA_API_V2_TOKEN,
    },
    progressLog: false, // No progress tracking
});
```

## Fetch and Normalize

### Using Client's fetchPrototypes Method (Recommended)

The `ProtopediaApiCustomClient` provides a high-level `fetchPrototypes()` method
that handles API calls, normalization, and error handling automatically:

```typescript
import { ProtopediaApiCustomClient } from '@f88/promidas/fetcher';

const client = new ProtopediaApiCustomClient({
    protoPediaApiClientOptions: {
        token: process.env.PROTOPEDIA_API_V2_TOKEN,
    },
    logLevel: 'debug',
});

// Fetch with automatic normalization
const result = await client.fetchPrototypes({
    limit: 50,
    offset: 0,
});

if (result.ok) {
    console.log(`Fetched ${result.data.length} prototypes`);
    result.data.forEach((prototype) => {
        console.log(prototype.name, prototype.tags);
    });
} else {
    console.error(`Error ${result.status}: ${result.error}`);
}
```

### Direct API Access with listPrototypes

For cases where you need the raw API response without normalization:

```typescript
const client = new ProtopediaApiCustomClient({
    protoPediaApiClientOptions: {
        token: process.env.PROTOPEDIA_API_V2_TOKEN,
    },
});

// Direct access to protopedia-api-v2-client's listPrototypes
const rawResult = await client.listPrototypes({
    limit: 10,
    offset: 0,
});

console.log(rawResult.results); // Raw API response
```

## Normalized Data Model

- The core normalized type is `NormalizedPrototype` (see
  `lib/types/normalized-prototype.ts`).
- It is derived from `ResultOfListPrototypesApiResponse` provided by
  `protopedia-api-v2-client`.
- Key normalization rules:
    - Pipe-separated strings (for example, tags or users) are converted
      into string arrays.
    - Date/time fields from ProtoPedia are normalized to ISO 8601
      strings in UTC.
    - Count fields are converted to numbers where needed.
    - Optional or missing fields are represented with `null` or
      reasonable defaults instead of ad-hoc falsy values.

## Fetch Layer

- Use `ProtopediaApiCustomClient.fetchPrototypes()` for fetching and normalizing prototypes.
- Request parameters are typed as `ListPrototypesParams` from `protopedia-api-v2-client`.
- The result type is a discriminated union:
    - `FetchPrototypesResult` with shape `{ ok: true, data: NormalizedPrototype[] }`
    - or an error branch with `{ ok: false, error: string, details: ... }`.
- All fetch results are immediately normalized to `NormalizedPrototype` objects.

## Error Handling

### Error Types and Result Structure

```typescript
import { ProtopediaApiCustomClient } from '@f88/promidas/fetcher';

const client = new ProtopediaApiCustomClient({
    protoPediaApiClientOptions: {
        token: process.env.PROTOPEDIA_API_V2_TOKEN,
    },
});

const result = await client.fetchPrototypes(params);

if (!result.ok) {
    // Access error details
    console.error('Error:', result.error); // Error message
    console.error('Status:', result.status); // HTTP status code if available
    console.error('Code:', result.details?.res?.code); // API error code if available
}
```

### Error Categories

| Error Type    | `result.ok` | `result.status` | `result.details` |
| ------------- | ----------- | --------------- | ---------------- |
| Network Error | `false`     | `undefined`     | Present          |
| HTTP Error    | `false`     | `400-599`       | Present          |
| API Error     | `false`     | `200-599`       | Present          |
| Success       | `true`      | N/A             | N/A              |

### Handling Specific Errors

```typescript
const result = await client.fetchPrototypes(params);

if (!result.ok) {
    if (result.status === 401) {
        console.error('Authentication failed - check API token');
    } else if (result.status === 429) {
        console.error('Rate limit exceeded - retry later');
    } else if (result.status === undefined) {
        console.error('Network error - check connectivity');
    } else {
        console.error(`HTTP ${result.status}: ${result.error}`);
    }
    return;
}

// Success path
processPrototypes(result.data);
```

### Error Message Format

The `result.error` field contains a formatted error message:

```typescript
const result = await client.fetchPrototypes(params);

if (!result.ok) {
    // Network error (no status)
    console.error(result.error);
    // "Connection refused"
    console.error(result.status); // undefined

    // HTTP error (with status)
    console.error(result.error);
    // "Not Found: Resource not found"
    console.error(result.status); // 404

    // Status code is available separately
    if (result.status) {
        console.error(`HTTP ${result.status}`);
    }
}
```

## Logger Configuration

### Fastify-Style Logger Configuration

The client supports Fastify-style logger configuration with three patterns:

```typescript
import { createConsoleLogger } from '@f88/promidas/logger';
import { ProtopediaApiCustomClient } from '@f88/promidas/fetcher';

// Pattern 1: logLevel only (creates ConsoleLogger internally)
const client1 = new ProtopediaApiCustomClient({
    protoPediaApiClientOptions: {
        token: process.env.PROTOPEDIA_API_V2_TOKEN,
    },
    logLevel: 'debug',
});

// Pattern 2: Custom logger with logLevel
const logger = createConsoleLogger();
const client2 = new ProtopediaApiCustomClient({
    protoPediaApiClientOptions: {
        token: process.env.PROTOPEDIA_API_V2_TOKEN,
    },
    logger,
    logLevel: 'debug', // Updates logger's level if mutable
});

// Pattern 3: Custom logger only
const client3 = new ProtopediaApiCustomClient({
    protoPediaApiClientOptions: {
        token: process.env.PROTOPEDIA_API_V2_TOKEN,
    },
    logger, // Uses logger's existing level
});
```

### Logger Levels

```typescript
import { createConsoleLogger, createNoopLogger } from '@f88/promidas/logger';

// Development - verbose logging
const client = new ProtopediaApiCustomClient({
    protoPediaApiClientOptions: {
        token: process.env.PROTOPEDIA_API_V2_TOKEN,
    },
    logLevel: 'debug',
});

// Production - minimal logging
const prodClient = new ProtopediaApiCustomClient({
    protoPediaApiClientOptions: {
        token: process.env.PROTOPEDIA_API_V2_TOKEN,
    },
    logLevel: 'error',
});

// Testing - silent logger
const testClient = new ProtopediaApiCustomClient({
    protoPediaApiClientOptions: {
        token: process.env.PROTOPEDIA_API_V2_TOKEN,
    },
    logger: createNoopLogger(),
});
```

### Custom Logger Implementation

```typescript
import type { Logger } from '@f88/promidas/fetcher';

const customLogger: Logger = {
    debug: (msg, meta) => {
        /* custom debug logic */
    },
    info: (msg, meta) => {
        /* custom info logic */
    },
    warn: (msg, meta) => {
        /* custom warn logic */
    },
    error: (msg, meta) => {
        /* custom error logic */
    },
};

const client = new ProtopediaApiCustomClient({
    protoPediaApiClientOptions: {
        token: process.env.PROTOPEDIA_API_V2_TOKEN,
    },
    logger: customLogger,
});
```

## Type Definitions

### FetchPrototypesResult

```typescript
type FetchPrototypesResult =
    | { ok: true; data: NormalizedPrototype[] }
    | FetchPrototypesFailure;

type FetchPrototypesFailure = {
    ok: false;
    error: string;
} & Omit<NetworkFailure, 'error'>;

// NetworkFailure structure:
// {
//   status?: number;  // HTTP status code (undefined for network errors)
//   details: {        // Always present
//     req?: { method?: string; url?: string };
//     res?: { statusText?: string; code?: string };
//   };
// }
```

### ProtoPediaApiClientOptions

```typescript
interface ProtoPediaApiClientOptions {
    token: string;
    baseUrl?: string;
    logger?: Logger;
    fetch?: typeof globalThis.fetch;
}
```
