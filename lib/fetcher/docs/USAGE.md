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
import {
    createProtopediaApiCustomClient,
    fetchAndNormalizePrototypes,
} from '@f88/promidas/fetcher';

const client = createProtopediaApiCustomClient({
    token: process.env.PROTOPEDIA_API_TOKEN,
});

const result = await fetchAndNormalizePrototypes(client, { limit: 10 });

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
    fetchAndNormalizePrototypes,
    constructDisplayMessage,
} from '@f88/promidas/fetcher';

// Type imports
import type {
    FetchPrototypesResult,
    ListPrototypesClient,
    ProtoPediaApiClientOptions,
} from '@f88/promidas/fetcher';

// Combined
import {
    fetchAndNormalizePrototypes,
    type FetchPrototypesResult,
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

### Using fetchAndNormalizePrototypes

```typescript
import { fetchAndNormalizePrototypes } from '@f88/promidas/fetcher';

// Assuming you have a client instance
const result = await fetchAndNormalizePrototypes(client, {
    limit: 50,
    sort: 'created_at',
    order: 'desc',
});

if (result.ok) {
    // result.data is NormalizedPrototype[]
    console.log(`Fetched ${result.data.length} prototypes`);
} else {
    // result.error, result.status, result.details
    console.error(`Error: ${result.error}`);
}
```

### Result Type Handling

```typescript
import type { FetchPrototypesResult } from '@f88/promidas/fetcher';

async function fetchPrototypes(): Promise<FetchPrototypesResult> {
    const result = await fetchAndNormalizePrototypes(client, params);

    // TypeScript knows the shape based on `ok`
    if (result.ok) {
        // result.data: NormalizedPrototype[]
        return result;
    } else {
        // result.error: string
        // result.status?: number
        // result.details?: ApiErrorDetails
        return result;
    }
}
```

### Custom ListPrototypesClient

You can use any client that implements the `ListPrototypesClient` interface:

```typescript
import type { ListPrototypesClient } from '@f88/promidas/fetcher';
import type {
    ListPrototypesParams,
    ApiResult,
    ResultOfListPrototypesApiResponse,
} from 'protopedia-api-v2-client';

class MyCustomClient implements ListPrototypesClient {
    async listPrototypes(
        params: ListPrototypesParams,
    ): Promise<ApiResult<ResultOfListPrototypesApiResponse>> {
        // Your implementation
    }
}

const customClient = new MyCustomClient();
const result = await fetchAndNormalizePrototypes(customClient, { limit: 10 });
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

- The primary fetch helper is `fetchAndNormalizePrototypes` located in
  `lib/fetcher/fetch-prototypes.ts`.
- It expects an object implementing `ListPrototypesClient` (like `ProtoPediaApiClient`)
  and uses `listPrototypes` under the hood.
- Request parameters are typed as `ListPrototypesParams` from
  `protopedia-api-v2-client`.
- The result type is a discriminated union:
    - `FetchPrototypesResult` with shape `{ ok: true, data: NormalizedPrototype[] }`
    - or an error branch with `{ ok: false, error: string, details: ... }`.
- All fetch results are immediately passed through `normalizePrototype`
  to ensure consumers only handle `NormalizedPrototype` objects.

## Error Handling

### Error Types and Result Structure

```typescript
import { constructDisplayMessage } from '@f88/promidas/fetcher';

const result = await fetchAndNormalizePrototypes(client, params);

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
const result = await fetchAndNormalizePrototypes(client, params);

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

### Error Message Construction

```typescript
import { constructDisplayMessage } from '@f88/promidas/fetcher';

// Network error
const msg1 = constructDisplayMessage('ECONNREFUSED');
// "Network error: ECONNREFUSED"

// HTTP error
const msg2 = constructDisplayMessage('Not Found', 404);
// "API request failed with status 404: Not Found"
```

## Logger Configuration

### Using Built-in Logger

```typescript
import { createConsoleLogger } from '@f88/promidas/logger';
import { createProtopediaApiCustomClient } from '@f88/promidas/fetcher';

const logger = createConsoleLogger('debug');

const client = createProtopediaApiCustomClient({
    token: process.env.PROTOPEDIA_API_TOKEN,
    logger, // Used by both SDK and error handler
});
```

### Logger Levels

```typescript
// Development
const devLogger = createConsoleLogger('debug');

// Production
const prodLogger = createConsoleLogger('error');

// Testing
const testLogger = createNoopLogger();

const client = createProtopediaApiCustomClient({
    token: process.env.PROTOPEDIA_API_TOKEN,
    logger: process.env.NODE_ENV === 'production' ? prodLogger : devLogger,
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
const logger = createConsoleLogger('info');

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
    token: process.env.PROTOPEDIA_API_TOKEN,
    baseUrl: 'https://custom-api.example.com',
});

const repository2 = createProtopediaInMemoryRepository({
    apiClientOptions: {
        token: process.env.PROTOPEDIA_API_TOKEN,
    },
});
```

### With Next.js

```typescript
import { createProtoPediaClient } from 'protopedia-api-v2-client';
import { fetchAndNormalizePrototypes } from '@f88/promidas/fetcher';

const CONNECTION_AND_HEADER_TIMEOUT_MS = 5_000;

const nextJsClient = createProtoPediaClient({
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
    logLevel: process.env.NODE_ENV === 'production' ? 'error' : 'debug',
});

// Use with fetchAndNormalizePrototypes
const result = await fetchAndNormalizePrototypes(nextJsClient, { limit: 100 });
```

### Standalone Usage

```typescript
import {
    createProtopediaApiCustomClient,
    fetchAndNormalizePrototypes,
} from '@f88/promidas/fetcher';

async function getRecentPrototypes() {
    const client = createProtopediaApiCustomClient({
        token: process.env.PROTOPEDIA_API_TOKEN,
    });

    const result = await fetchAndNormalizePrototypes(client, {
        limit: 20,
        sort: 'created_at',
        order: 'desc',
    });

    if (!result.ok) {
        throw new Error(`Failed to fetch prototypes: ${result.error}`);
    }

    return result.data;
}
```

### Error Recovery Pattern

```typescript
import {
    createProtopediaApiCustomClient,
    fetchAndNormalizePrototypes,
    constructDisplayMessage,
} from '@f88/promidas/fetcher';
import { createConsoleLogger } from '@f88/promidas/logger';

const logger = createConsoleLogger('info');
const client = createProtopediaApiCustomClient({
    token: process.env.PROTOPEDIA_API_TOKEN,
    logger,
});

async function fetchWithRetry(params: ListPrototypesParams, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const result = await fetchAndNormalizePrototypes(client, params);

        if (result.ok) {
            return result.data;
        }

        // Don't retry auth errors
        if (result.status === 401 || result.status === 403) {
            const message = constructDisplayMessage(
                result.error,
                result.status,
            );
            logger.error(message);
            throw new Error(message);
        }

        // Retry on network or server errors
        if (attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
            logger.warn(`Retry ${attempt}/${maxRetries} after ${delay}ms`);
            await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
            const message = constructDisplayMessage(
                result.error,
                result.status,
            );
            logger.error(`All retries exhausted: ${message}`);
            throw new Error(message);
        }
    }

    throw new Error('Unexpected: retry loop completed without return');
}
```

## Type Definitions

### FetchPrototypesResult

```typescript
type FetchPrototypesResult =
    | { ok: true; data: NormalizedPrototype[] }
    | { ok: false; error: string; status?: number; details?: ApiErrorDetails };
```

### ListPrototypesClient

```typescript
interface ListPrototypesClient {
    listPrototypes(
        params: ListPrototypesParams,
    ): Promise<ApiResult<ResultOfListPrototypesApiResponse>>;
}
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
