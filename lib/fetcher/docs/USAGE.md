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
- [Fetch and Normalize](#fetch-and-normalize)
- [Normalized Data Model](#normalized-data-model)
- [Error Handling](#error-handling)
- [Logger Configuration](#logger-configuration)
- [Integration Examples](#integration-examples)

## Quick Start

### Basic Fetch Example

```typescript
import { createProtopediaApiCustomClient } from '@f88/promidas/fetcher';

const client = createProtopediaApiCustomClient({
    protoPediaApiClientOptions: {
        token: process.env.PROTOPEDIA_API_TOKEN,
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
import {
    createProtopediaApiCustomClient,
    constructDisplayMessage,
} from '@f88/promidas/fetcher';

// Type imports
import type {
    FetchPrototypesResult,
    ProtopediaApiCustomClientConfig,
} from '@f88/promidas/fetcher';

// Combined
import {
    createProtopediaApiCustomClient,
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

```ts
import { createProtoPediaClient } from 'protopedia-api-v2-client';

const CONNECTION_AND_HEADER_TIMEOUT_MS = 5_000;

export const customClientForNextJs = createProtoPediaClient({
    token: process.env.PROTOPEDIA_API_TOKEN ?? '',
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

## Fetch and Normalize

### Using Client's fetchPrototypes Method (Recommended)

The `ProtopediaApiCustomClient` provides a high-level `fetchPrototypes()` method
that handles API calls, normalization, and error handling automatically:

```typescript
import { createProtopediaApiCustomClient } from '@f88/promidas/fetcher';

const client = createProtopediaApiCustomClient({
    protoPediaApiClientOptions: {
        token: process.env.PROTOPEDIA_API_TOKEN,
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
const client = createProtopediaApiCustomClient({
    protoPediaApiClientOptions: {
        token: process.env.PROTOPEDIA_API_TOKEN,
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
import {
    createProtopediaApiCustomClient,
    constructDisplayMessage,
} from '@f88/promidas/fetcher';

const client = createProtopediaApiCustomClient({
    protoPediaApiClientOptions: {
        token: process.env.PROTOPEDIA_API_TOKEN,
    },
});

const result = await client.fetchPrototypes(params);

if (!result.ok) {
    // Construct user-friendly message
    const displayMessage = constructDisplayMessage(result.error, result.status);
    console.error(displayMessage);

    // Access error details
    console.error('Status:', result.status); // HTTP status code if available
    console.error('Code:', result.details?.res?.code); // API error code if available
}
```

### Error Categories

| Error Type    | `result.ok` | `result.status` | `result.details` |
| ------------- | ----------- | --------------- | ---------------- |
| Network Error | `false`     | `undefined`     | `undefined`      |
| HTTP Error    | `false`     | `400-599`       | May be present   |
| API Error     | `false`     | `200-299`       | Present          |
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

Error messages are pre-formatted and ready for display:

````typescript
const result = await client.fetchPrototypes(params);

if (!result.ok) {
    // Network error example
    console.error(result.error);
    // "Upstream request timed out"

    // HTTP error example (when status is 404)
    console.error(result.error);
    // "Not Found: Resource not found"

    // Status code is available separately
    if (result.status) {
        console.error(`HTTP ${result.status}`);
    }
}

## Logger Configuration

### Fastify-Style Logger Configuration

The client supports Fastify-style logger configuration with three patterns:

```typescript
import { createConsoleLogger } from '@f88/promidas/logger';
import { createProtopediaApiCustomClient } from '@f88/promidas/fetcher';

// Pattern 1: logLevel only (creates ConsoleLogger internally)
const client1 = createProtopediaApiCustomClient({
    protoPediaApiClientOptions: {
        token: process.env.PROTOPEDIA_API_TOKEN,
    },
    logLevel: 'debug',
});

// Pattern 2: Custom logger with logLevel
const logger = createConsoleLogger();
const client2 = createProtopediaApiCustomClient({
    protoPediaApiClientOptions: {
        token: process.env.PROTOPEDIA_API_TOKEN,
    },
    logger,
    logLevel: 'debug', // Updates logger's level if mutable
});

// Pattern 3: Custom logger only
const client3 = createProtopediaApiCustomClient({
    protoPediaApiClientOptions: {
        token: process.env.PROTOPEDIA_API_TOKEN,
    },
    logger, // Uses logger's existing level
});
````

### Logger Levels

```typescript
import { createConsoleLogger, createNoopLogger } from '@f88/promidas/logger';

// Development - verbose logging
const client = createProtopediaApiCustomClient({
    protoPediaApiClientOptions: {
        token: process.env.PROTOPEDIA_API_TOKEN,
    },
    logLevel: 'debug',
});

// Production - minimal logging
const prodClient = createProtopediaApiCustomClient({
    protoPediaApiClientOptions: {
        token: process.env.PROTOPEDIA_API_TOKEN,
    },
    logLevel: 'error',
});

// Testing - silent logger
const testClient = createProtopediaApiCustomClient({
    protoPediaApiClientOptions: {
        token: process.env.PROTOPEDIA_API_TOKEN,
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

const client = createProtopediaApiCustomClient({
    token: process.env.PROTOPEDIA_API_TOKEN,
    logger: customLogger,
});
```

### Shared Logger Across Components

```typescript
import { createConsoleLogger } from '@f88/promidas/logger';
import { createProtopediaApiCustomClient } from '@f88/promidas/fetcher';
import { createProtopediaInMemoryRepository } from '@f88/promidas/repository';

// Single logger for all components
const logger = createConsoleLogger();

const apiClient = createProtopediaApiCustomClient({
    token: process.env.PROTOPEDIA_API_TOKEN,
    logger,
    logLevel: 'info',
});

const repository = createProtopediaInMemoryRepository({
    storeConfig: { logger },
    apiClientOptions: {
        token: process.env.PROTOPEDIA_API_TOKEN,
        logger,
    },
});
```

## Integration Examples

### With Repository Layer

```typescript
import { createProtopediaInMemoryRepository } from '@f88/promidas/repository';
import { createProtopediaApiCustomClient } from '@f88/promidas/fetcher';

// Option 1: Let repository create client
const repository1 = createProtopediaInMemoryRepository({
    apiClientOptions: {
        token: process.env.PROTOPEDIA_API_TOKEN,
    },
});

// Option 2: Provide custom client
const customClient = createProtopediaApiCustomClient({
    protoPediaApiClientOptions: {
        token: process.env.PROTOPEDIA_API_TOKEN,
        baseUrl: 'https://custom-api.example.com',
    },
});

const repository2 = createProtopediaInMemoryRepository({
    apiClient: customClient,
});
```

## Type Definitions

### FetchPrototypesResult

```typescript
type FetchPrototypesResult =
    | { ok: true; data: NormalizedPrototype[] }
    | { ok: false; error: string; status?: number; details?: ApiErrorDetails };
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

---

**Document Version**: 2.0.0
**Last Updated**: 2025-12-10
**Related Documents**: DESIGN.md
