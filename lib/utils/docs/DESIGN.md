---
lang: en
title: Utils Design
title-en: Utils Design
title-ja: ユーティリティ設計
related:
    - ../../../README.md "Project Overview"
    - USAGE.md "Utils Usage"
instructions-for-ais:
    - This document should be written in English for AI readability.
    - Content within code fences may be written in languages other than English.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document.
---

# Utils Design

This document describes the architecture and design decisions of the utility functions for ProtoPedia data processing.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Module Structure](#module-structure)
- [Design Patterns](#design-patterns)
- [Type Safety](#type-safety)
- [Extensibility](#extensibility)

## Architecture Overview

The utils module provides reusable, standalone utilities for data transformation and processing. It is designed to be:

- **Independent**: No dependencies on other modules (fetcher, repository, store)
- **Type-safe**: Leverages TypeScript's type system for safety
- **Testable**: Each utility is independently testable
- **Discoverable**: Organized by purpose (converters, time, types)

### Component Structure

```plaintext
┌─────────────────────────────────────────────────────────┐
│  Consumer Code (Fetcher, Repository, Application)      │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  Utils Layer                                            │
│  ├── converters/   (Status, License, Flags)             │
│  ├── time/         (Timestamp parsing & normalization)  │
│  └── types/        (Type definitions)                   │
└─────────────────────────────────────────────────────────┘
```

## Module Structure

### Converters

Purpose: Transform ProtoPedia API string values to typed enums.

```plaintext
converters/
├── index.ts              # Re-exports all converters
├── status.ts             # Status string → StatusType
├── license-type.ts       # License string → LicenseType
├── release-flag.ts       # Release flag → ReleaseFlag
├── thanks-flag.ts        # Thanks flag → ThanksFlag
└── __tests__/            # Unit tests for each converter
```

**Design Pattern**: Each converter follows a consistent pattern:

- Input: `string | undefined`
- Output: `EnumType | undefined`
- Unknown values: `undefined` (not an error)
- Case-insensitive matching where appropriate

### Time Utilities

Purpose: Parse and normalize ProtoPedia timestamps.

```plaintext
time/
├── index.ts              # Re-exports all time utilities
├── constants.ts          # JST_OFFSET_MS and other constants
├── parser.ts             # parseProtoPediaTimestamp, parseW3cDtfTimestamp
└── __tests__/            # Comprehensive parser tests
    ├── constants.test.ts
    ├── parser.test.ts
    └── edge-cases.test.ts
```

**Design Pattern**:

- **parseProtoPediaTimestamp**: JST local time → UTC ISO string
- **parseW3cDtfTimestamp**: W3C-DTF (Level 4-6) → UTC ISO string
- Return `undefined` for unparseable inputs (not an error)
- Strict format validation via regex

### Types

Purpose: Shared type definitions for ProtoPedia domain.

```plaintext
types/
├── index.ts              # Re-exports all types
├── status.types.ts       # StatusType enum
├── license.types.ts      # LicenseType enum
├── release.types.ts      # ReleaseFlag enum
└── thanks.types.ts       # ThanksFlag enum
```

## Design Patterns

### 1. Defensive Parsing

All parsers and converters are defensive:

- Accept `undefined` as valid input
- Return `undefined` for unparseable values
- Never throw exceptions
- Validate format before processing

**Example**:

```typescript
export function parseProtoPediaTimestamp(value: string): string | undefined {
    if (typeof value !== 'string' || value.length === 0) {
        return undefined;
    }

    const match = value.match(
        /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})\.(\d+)$/,
    );
    if (!match) {
        return undefined;
    }

    // ... process and return UTC ISO string
}
```

### 2. Immutable Transformations

All utilities are pure functions:

- No side effects
- No mutation of input
- Deterministic output
- Easy to test and reason about

### 3. Explicit Over Implicit

Converters and parsers favor explicitness:

- Explicit timezone handling (no implicit local timezone)
- Explicit enum mapping (no magic strings)
- Explicit validation (no silent coercion)

**Example**:

```typescript
// Explicit: ProtoPedia format is always JST
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const utcMs =
    Date.UTC(year, month - 1, day, hour, minute, second, milli) - JST_OFFSET_MS;

// NOT implicit: new Date(value) would use local timezone
```

### 4. Fail-Safe Defaults

When a value cannot be parsed:

- Return `undefined` (not `null`)
- Let the caller decide how to handle
- Document the behavior in JSDoc

This allows flexible handling:

```typescript
// Caller can provide fallback
const status = convertToStatusType(value) ?? 'unknown';

// Or propagate undefined
const status = convertToStatusType(value); // StatusType | undefined
```

## Type Safety

### Strict Null Checks

All utilities are designed for `strictNullChecks`:

- Explicit `| undefined` in return types
- No implicit `any`
- Guards against `null`/`undefined` inputs

### Type Guards

Converters serve as runtime type guards:

```typescript
const rawStatus: string = apiResponse.status;
const status: StatusType | undefined = convertToStatusType(rawStatus);

if (status !== undefined) {
    // TypeScript knows status is StatusType here
    useStatus(status);
}
```

### Enum Safety

All enums are string enums for:

- Runtime inspection
- Debugging clarity
- Serialization safety

```typescript
export const StatusType = {
    Active: 'active',
    Inactive: 'inactive',
    // ...
} as const;

export type StatusType = (typeof StatusType)[keyof typeof StatusType];
```

## Extensibility

### Adding New Converters

To add a new converter:

1. Create `lib/utils/converters/new-converter.ts`
2. Define the enum type in `lib/utils/types/new.types.ts`
3. Export from `lib/utils/converters/index.ts`
4. Export type from `lib/utils/types/index.ts`
5. Add tests in `lib/utils/converters/__tests__/new-converter.test.ts`

**Template**:

```typescript
// lib/utils/types/new.types.ts
export const NewType = {
    Value1: 'value1',
    Value2: 'value2',
} as const;

export type NewType = (typeof NewType)[keyof typeof NewType];

// lib/utils/converters/new-converter.ts
import type { NewType } from '../types/new.types.js';

export function convertToNewType(
    value: string | undefined,
): NewType | undefined {
    if (value === undefined) {
        return undefined;
    }

    const normalized = value.toLowerCase().trim();

    switch (normalized) {
        case 'value1':
            return NewType.Value1;
        case 'value2':
            return NewType.Value2;
        default:
            return undefined;
    }
}
```

### Adding New Time Parsers

To add support for new timestamp formats:

1. Add parser function to `lib/utils/time/parser.ts`
2. Export from `lib/utils/time/index.ts`
3. Add comprehensive tests in `lib/utils/time/__tests__/`
4. Document format support in JSDoc

**Guidelines**:

- Return `string | undefined` (UTC ISO string or undefined)
- Never throw exceptions
- Validate format with regex before parsing
- Document timezone handling clearly

## Integration Points

### Fetcher Integration

The fetcher module uses utils for normalization:

```typescript
import { parseProtoPediaTimestamp } from '../../utils/time/index.js';
import {
    convertToStatusType,
    convertToLicenseType,
} from '../../utils/converters/index.js';

function normalizePrototype(upstream: UpstreamPrototype): NormalizedPrototype {
    return {
        status: convertToStatusType(upstream.status),
        licenseType: convertToLicenseType(upstream.licenseType),
        createDate:
            parseProtoPediaTimestamp(upstream.createDate) ??
            upstream.createDate,
        // ...
    };
}
```

### Repository Integration

Repositories can use converters for filtering and querying:

```typescript
import { StatusType } from '@f88/promidas/utils/types';

const activePrototypes = repository.filter(
    (p) => p.status === StatusType.Active,
);
```

### Direct Usage

Applications can use utilities directly:

```typescript
import { parseW3cDtfTimestamp, JST_OFFSET_MS } from '@f88/promidas/utils/time';
import { convertToStatusType } from '@f88/promidas/utils/converters';

const timestamp = parseW3cDtfTimestamp('2025-12-12T10:00:00+09:00');
const status = convertToStatusType('active');
```

## Future Considerations

### Planned Additions

1. **Validation Utilities**: Add validators for ProtoPedia field constraints
2. **Formatting Utilities**: Format timestamps for display
3. **ID Utilities**: Validate and normalize ProtoPedia IDs
4. **URL Utilities**: Parse and construct ProtoPedia URLs

### Backwards Compatibility

When adding new features:

- Never change existing converter behavior
- Deprecate old parsers before removing
- Version breaking changes appropriately
- Document migration paths

### Performance

Current utilities are optimized for clarity over performance. Future optimizations should:

- Maintain readability
- Add benchmarks before optimizing
- Profile real-world usage patterns
- Consider caching only if profiling shows benefit
