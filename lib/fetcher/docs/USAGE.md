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

## Full Supported API Client

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

- Network-level failures are represented by the `NetworkFailure` type
  (see `lib/fetcher/types/prototype-api.types.ts`).
- Fetch helpers like `getPrototypes` return discriminated unions so
  callers must explicitly handle both success and failure cases.
- Application-level logic can choose to log, retry, or surface these
  failures depending on the runtime environment.
