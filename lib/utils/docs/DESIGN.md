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
│  ├── converters/   (Code to Label converters)           │
│  ├── time/         (Timestamp parsing & normalization)  │
│  └── types/        (Type definitions re-export)         │
└─────────────────────────────────────────────────────────┘
```

## Module Structure

### Converters

Purpose: Transform ProtoPedia API numeric codes to human-readable Japanese labels.

```plaintext
converters/
├── index.ts              # Re-exports all converters
├── status.ts             # Status code → Japanese label
├── license-type.ts       # License code → Japanese label
├── release-flag.ts       # Release flag → Japanese label
├── thanks-flag.ts        # Thanks flag → Japanese label
└── __tests__/            # Unit tests for each converter
```

**Design Pattern**: Each converter follows a consistent pattern:

- Input: `number` or `number | undefined`
- Output: `string` (label or stringified number)
- Unknown values: Return the numeric value as string (not an error)
- Use `Record<CodeType, string>` for label mappings

**Example**:

```typescript
const STATUS_LABELS: Record<StatusCode, string> = {
    1: 'アイデア',
    2: '開発中',
    3: '完成',
    4: '供養',
};

export const getPrototypeStatusLabel = (status: number): string => {
    return STATUS_LABELS[status as StatusCode] ?? `${status}`;
};
```

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
- Return `string | undefined` for all parsers
- Strict format validation via regex
- Never throw exceptions

**Key Implementation Details**:

1. **ProtoPedia Timestamp** (`YYYY-MM-DD HH:MM:SS.f`)
    - Space separator (not `T`)
    - JST-based without explicit timezone
    - Fractional seconds required (`.0` or more digits)
    - Subtract `JST_OFFSET_MS` to convert to UTC

2. **W3C-DTF Timestamp** (ISO 8601 subset with mandatory TZD)
    - Levels 4-6 supported (datetime with timezone)
    - Timezone required: `Z`, `z`, or `±HH:MM`
    - Delegate to `Date` constructor for parsing

### Types

Purpose: Re-export type definitions from `lib/types` for convenience.

```plaintext
types/
└── index.ts              # Re-exports from ../../types/codes.js
```

**Design Rationale**:

- Users can import code types from either `@f88/promidas/types` or `@f88/promidas/utils`
- Maintains single source of truth in `lib/types`
- Improves discoverability for utils users

## Design Patterns

### Defensive Programming

All utilities return safe values instead of throwing errors:

```typescript
// ✅ Safe: Returns undefined for invalid input
parseProtoPediaTimestamp('invalid'); // => undefined

// ✅ Safe: Returns stringified number for unknown code
getPrototypeStatusLabel(999); // => '999'

// ✅ Safe: Handles undefined input
getPrototypeThanksFlagLabel(undefined); // => '不明'
```

### Immutability

All functions are pure and side-effect free:

```typescript
const timestamp = '2025-12-12 10:00:00.0';
const parsed = parseProtoPediaTimestamp(timestamp);

// Original value unchanged
console.log(timestamp); // '2025-12-12 10:00:00.0'
console.log(parsed); // '2025-12-12T01:00:00.000Z'
```

### Type Narrowing

Code types enable TypeScript's type narrowing:

```typescript
import type { StatusCode } from '@f88/promidas/utils';

function describeStatus(code: StatusCode): string {
    // TypeScript knows code is 1 | 2 | 3 | 4
    switch (code) {
        case 1:
            return 'Idea';
        case 2:
            return 'In Development';
        case 3:
            return 'Completed';
        case 4:
            return 'Retired';
    }
}
```

## Type Safety

### Strict Typing

All types use TypeScript's strict mode features:

```typescript
// exactOptionalPropertyTypes: true
export type ThanksFlagCode = 0 | 1 | undefined;

// noUncheckedIndexedAccess: true
const label = STATUS_LABELS[code]; // string | undefined
```

### Runtime Safety

Type guards are implicit in return values:

```typescript
const parsed = parseProtoPediaTimestamp(raw);

if (parsed !== undefined) {
    // TypeScript knows parsed is string here
    const date = new Date(parsed);
}
```

## Extensibility

### Adding New Label Converters

To add a new label converter:

1. Create `lib/utils/converters/new-converter.ts`
2. Define label mapping using `Record<CodeType, string>`
3. Export converter function
4. Export from `lib/utils/converters/index.ts`
5. Add tests in `lib/utils/converters/__tests__/`

**Template**:

```typescript
// lib/utils/converters/new-converter.ts
import type { NewCode } from '../types/index.js';

const NEW_LABELS: Record<NewCode, string> = {
    1: 'ラベル1',
    2: 'ラベル2',
};

export const getNewLabel = (code: number): string => {
    return NEW_LABELS[code as NewCode] ?? `${code}`;
};
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

The fetcher module uses time utilities for normalization:

```typescript
import { parseProtoPediaTimestamp } from '../../utils/time/index.js';

// Normalize ProtoPedia timestamps to UTC
const normalized = {
    ...prototype,
    createDate:
        parseProtoPediaTimestamp(prototype.createDate) ?? prototype.createDate,
    updateDate: prototype.updateDate
        ? parseProtoPediaTimestamp(prototype.updateDate)
        : undefined,
};
```

### Repository/Store Integration

Label converters are typically used in application code for display:

```typescript
import { getPrototypeStatusLabel } from '@f88/promidas/utils';
import type { NormalizedPrototype } from '@f88/promidas/types';

function displayPrototype(prototype: NormalizedPrototype): void {
    console.log(`Status: ${getPrototypeStatusLabel(prototype.status)}`);
}
```

### Type Reusability

Code types from `lib/types` are re-exported for convenience:

```typescript
// Both imports work
import type { StatusCode } from '@f88/promidas/types';
import type { StatusCode } from '@f88/promidas/utils';
```

## Performance Considerations

### Constant-Time Lookups

Label lookups use `Record` for O(1) access:

```typescript
const label = STATUS_LABELS[code as StatusCode]; // O(1)
```

### Minimal Allocations

Parsers create minimal intermediate objects:

```typescript
// Single regex match, direct UTC calculation
const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})\.(\d+)$/,
);
const utcMs =
    Date.UTC(year, month - 1, day, hour, minute, second, milli) - JST_OFFSET_MS;
return new Date(utcMs).toISOString();
```

### No Dependencies

Utils has zero runtime dependencies:

- Smaller bundle size
- Faster installation
- Fewer security vulnerabilities
- Easier maintenance

## Future Extensibility

The utils module is designed to grow with ProtoPedia API changes:

1. **New field codes**: Add new converter with same pattern
2. **New timestamp formats**: Add new parser with same pattern
3. **Additional types**: Re-export from `lib/types`
4. **Utility functions**: Add to appropriate subdirectory

All additions should follow the established patterns for consistency.

---

For practical usage examples, see [USAGE.md](./USAGE.md).

```plaintext
types/
├── index.ts              # Re-exports all types
├── status.types.ts       # StatusType enum
```
