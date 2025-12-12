---
lang: en
title: Utils Usage
title-en: Utils Usage
title-ja: ユーティリティ使用法
related:
    - ../../../README.md "Project Overview"
    - DESIGN.md "Utils Design"
instructions-for-ais:
    - This document should be written in English for AI readability.
    - Content within code fences may be written in languages other than English.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document.
---

# Utils Usage

This document provides practical examples for using the utility functions in the PROMIDAS library.

## Table of Contents

- [Quick Start](#quick-start)
- [Converters](#converters)
- [Time Utilities](#time-utilities)
- [Type Definitions](#type-definitions)
- [Integration Examples](#integration-examples)
- [Error Handling](#error-handling)

## Quick Start

### Installation

```typescript
import {
    // Converters
    convertToStatusType,
    convertToLicenseType,
    convertToReleaseFlag,
    convertToThanksFlag,

    // Time utilities
    parseProtoPediaTimestamp,
    parseW3cDtfTimestamp,
    JST_OFFSET_MS,

    // Types
    StatusType,
    LicenseType,
    ReleaseFlag,
    ThanksFlag,
} from '@f88/promidas/utils';
```

### Basic Example

```typescript
import {
    convertToStatusType,
    parseProtoPediaTimestamp,
} from '@f88/promidas/utils';

// Convert status string to typed enum
const status = convertToStatusType('active');
console.log(status); // 'active' (StatusType)

// Parse ProtoPedia timestamp (JST) to UTC
const timestamp = parseProtoPediaTimestamp('2025-12-12 10:00:00.0');
console.log(timestamp); // '2025-12-12T01:00:00.000Z'
```

## Converters

Converters transform ProtoPedia API string values into typed enums.

### Status Converter

Convert prototype status strings to `StatusType`.

```typescript
import { convertToStatusType, StatusType } from '@f88/promidas/utils';

// Valid status values
const active = convertToStatusType('active');
console.log(active); // 'active'

const inactive = convertToStatusType('inactive');
console.log(inactive); // 'inactive'

// Case-insensitive
const status1 = convertToStatusType('ACTIVE');
console.log(status1); // 'active'

// Handles whitespace
const status2 = convertToStatusType('  active  ');
console.log(status2); // 'active'

// Unknown values return undefined
const unknown = convertToStatusType('unknown-status');
console.log(unknown); // undefined

// Handle undefined input
const nullish = convertToStatusType(undefined);
console.log(nullish); // undefined
```

**Available Status Types**:

- `StatusType.Active` - `'active'`
- `StatusType.Inactive` - `'inactive'`

### License Type Converter

Convert license strings to `LicenseType`.

```typescript
import { convertToLicenseType, LicenseType } from '@f88/promidas/utils';

// Convert various license formats
const mit = convertToLicenseType('MIT');
console.log(mit); // 'MIT'

const apache = convertToLicenseType('Apache-2.0');
console.log(apache); // 'Apache-2.0'

const gpl = convertToLicenseType('GPL-3.0');
console.log(gpl); // 'GPL-3.0'

// Unknown licenses
const custom = convertToLicenseType('CustomLicense');
console.log(custom); // undefined
```

**Available License Types**:

- `LicenseType.MIT`
- `LicenseType.Apache20`
- `LicenseType.GPL30`
- `LicenseType.BSD3Clause`
- `LicenseType.Proprietary`
- And more (see type definition)

### Release Flag Converter

Convert release flag strings to `ReleaseFlag`.

```typescript
import { convertToReleaseFlag, ReleaseFlag } from '@f88/promidas/utils';

// Boolean-like strings
const yes = convertToReleaseFlag('1');
console.log(yes); // 'released'

const no = convertToReleaseFlag('0');
console.log(no); // 'unreleased'

// Explicit values
const released = convertToReleaseFlag('released');
console.log(released); // 'released'

const unreleased = convertToReleaseFlag('unreleased');
console.log(unreleased); // 'unreleased'
```

**Available Release Flags**:

- `ReleaseFlag.Released` - `'released'`
- `ReleaseFlag.Unreleased` - `'unreleased'`

### Thanks Flag Converter

Convert thanks flag strings to `ThanksFlag`.

```typescript
import { convertToThanksFlag, ThanksFlag } from '@f88/promidas/utils';

const enabled = convertToThanksFlag('1');
console.log(enabled); // 'enabled'

const disabled = convertToThanksFlag('0');
console.log(disabled); // 'disabled'
```

**Available Thanks Flags**:

- `ThanksFlag.Enabled` - `'enabled'`
- `ThanksFlag.Disabled` - `'disabled'`

## Time Utilities

Time utilities parse and normalize timestamps from ProtoPedia API.

### Parse ProtoPedia Timestamp

Parse JST timestamps (space-separated format) to UTC ISO strings.

```typescript
import { parseProtoPediaTimestamp } from '@f88/promidas/utils';

// Current format: YYYY-MM-DD HH:MM:SS.0
const timestamp1 = parseProtoPediaTimestamp('2025-12-12 10:00:00.0');
console.log(timestamp1); // '2025-12-12T01:00:00.000Z'

// Handles fractional seconds (future-proof)
const timestamp2 = parseProtoPediaTimestamp('2025-12-12 10:00:00.123');
console.log(timestamp2); // '2025-12-12T01:00:00.123Z'

// JST midnight becomes previous day in UTC
const midnight = parseProtoPediaTimestamp('2025-12-12 00:00:00.0');
console.log(midnight); // '2025-12-11T15:00:00.000Z'

// Invalid format returns undefined
const invalid = parseProtoPediaTimestamp('invalid-date');
console.log(invalid); // undefined

// ISO 8601 format is not accepted
const iso = parseProtoPediaTimestamp('2025-12-12T10:00:00Z');
console.log(iso); // undefined (use parseW3cDtfTimestamp instead)
```

**Format Requirements**:

- Date separator: `-` (hyphen)
- Time separator: `:` (colon)
- Date-time separator: ` ` (space, not `T`)
- Fractional seconds: `.` followed by 1+ digits (required)
- Timezone: Always treated as JST (UTC+9), no explicit timezone allowed

**Timezone Conversion**:

```typescript
import { JST_OFFSET_MS } from '@f88/promidas/utils';

console.log(JST_OFFSET_MS); // 32400000 (9 hours in milliseconds)

// Manual conversion example (library does this internally)
const jstTime = '2025-12-12 12:00:00.0';
const [date, time] = jstTime.split(' ');
const [year, month, day] = date.split('-').map(Number);
const [hh, mm, ss] = time.split(':').map(Number);
const [whole, frac] = ss.toString().split('.');

const utcMs =
    Date.UTC(
        year,
        month - 1,
        day,
        hh,
        mm,
        parseInt(whole),
        parseInt(frac || '0'),
    ) - JST_OFFSET_MS;
const utcISO = new Date(utcMs).toISOString();
console.log(utcISO); // '2025-12-12T03:00:00.000Z'
```

### Parse W3C-DTF Timestamp

Parse W3C Date and Time Formats (ISO 8601 subset with mandatory timezone).

```typescript
import { parseW3cDtfTimestamp } from '@f88/promidas/utils';

// Level 4: Complete date plus hours and minutes
const level4 = parseW3cDtfTimestamp('2025-12-12T10:00Z');
console.log(level4); // '2025-12-12T10:00:00.000Z'

// Level 5: Complete date plus hours, minutes, and seconds
const level5 = parseW3cDtfTimestamp('2025-12-12T10:00:00Z');
console.log(level5); // '2025-12-12T10:00:00.000Z'

// Level 6: Complete date plus fractional seconds
const level6 = parseW3cDtfTimestamp('2025-12-12T10:00:00.123Z');
console.log(level6); // '2025-12-12T10:00:00.123Z'

// With timezone offset
const jst = parseW3cDtfTimestamp('2025-12-12T10:00:00+09:00');
console.log(jst); // '2025-12-12T01:00:00.000Z'

const est = parseW3cDtfTimestamp('2025-12-12T10:00:00-05:00');
console.log(est); // '2025-12-12T15:00:00.000Z'

// Lowercase 'z' is also accepted
const lowercase = parseW3cDtfTimestamp('2025-12-12T10:00:00z');
console.log(lowercase); // '2025-12-12T10:00:00.000Z'
```

**NOT Supported** (returns `undefined`):

```typescript
// Date-only (Level 1-3)
parseW3cDtfTimestamp('2025-12-12'); // undefined

// Without timezone
parseW3cDtfTimestamp('2025-12-12T10:00:00'); // undefined

// Offset without colon (not W3C-DTF compliant)
parseW3cDtfTimestamp('2025-12-12T10:00:00+0900'); // undefined

// Space separator (use parseProtoPediaTimestamp instead)
parseW3cDtfTimestamp('2025-12-12 10:00:00.0'); // undefined
```

**W3C-DTF Specification**: <https://www.w3.org/TR/NOTE-datetime>

### JST Offset Constant

```typescript
import { JST_OFFSET_MS } from '@f88/promidas/utils';

// JST is UTC+9
console.log(JST_OFFSET_MS); // 32400000 (9 * 60 * 60 * 1000)

// Use for manual timezone calculations
const jstTimestamp = Date.now();
const utcTimestamp = jstTimestamp - JST_OFFSET_MS;
```

## Type Definitions

All utility types are exported for use in your application.

### Using Enums

```typescript
import {
    StatusType,
    LicenseType,
    ReleaseFlag,
    ThanksFlag,
} from '@f88/promidas/utils';

// Use in function signatures
function filterByStatus(
    prototypes: Prototype[],
    status: StatusType,
): Prototype[] {
    return prototypes.filter((p) => p.status === status);
}

// Use in type definitions
interface PrototypeFilter {
    status?: StatusType;
    license?: LicenseType;
    released?: ReleaseFlag;
}

// Use in switch statements
function getStatusLabel(status: StatusType): string {
    switch (status) {
        case StatusType.Active:
            return 'Active';
        case StatusType.Inactive:
            return 'Inactive';
        default:
            return 'Unknown';
    }
}
```

### Type Guards

Converters serve as runtime type guards:

```typescript
import { convertToStatusType, StatusType } from '@f88/promidas/utils';

const rawStatus: string = apiResponse.status;
const status = convertToStatusType(rawStatus);

if (status !== undefined) {
    // TypeScript knows status is StatusType here
    useTypedStatus(status);
} else {
    console.warn(`Unknown status: ${rawStatus}`);
}
```

## Integration Examples

### Normalize API Response

```typescript
import {
    convertToStatusType,
    convertToLicenseType,
    convertToReleaseFlag,
    parseProtoPediaTimestamp,
} from '@f88/promidas/utils';

interface ApiPrototype {
    id: number;
    name: string;
    status: string;
    licenseType: string;
    releaseFlag: string;
    createDate: string;
}

interface NormalizedPrototype {
    id: number;
    name: string;
    status: StatusType | undefined;
    licenseType: LicenseType | undefined;
    releaseFlag: ReleaseFlag | undefined;
    createDate: string; // ISO string or original
}

function normalizePrototype(raw: ApiPrototype): NormalizedPrototype {
    return {
        id: raw.id,
        name: raw.name,
        status: convertToStatusType(raw.status),
        licenseType: convertToLicenseType(raw.licenseType),
        releaseFlag: convertToReleaseFlag(raw.releaseFlag),
        createDate: parseProtoPediaTimestamp(raw.createDate) ?? raw.createDate,
    };
}

// Usage
const apiData: ApiPrototype = {
    id: 123,
    name: 'My Prototype',
    status: 'active',
    licenseType: 'MIT',
    releaseFlag: '1',
    createDate: '2025-12-12 10:00:00.0',
};

const normalized = normalizePrototype(apiData);
console.log(normalized.status); // 'active' (StatusType)
console.log(normalized.createDate); // '2025-12-12T01:00:00.000Z'
```

### Filter with Type Safety

```typescript
import { StatusType, ReleaseFlag } from '@f88/promidas/utils';

interface Prototype {
    name: string;
    status: StatusType | undefined;
    released: ReleaseFlag | undefined;
}

const prototypes: Prototype[] = [
    { name: 'P1', status: StatusType.Active, released: ReleaseFlag.Released },
    {
        name: 'P2',
        status: StatusType.Inactive,
        released: ReleaseFlag.Unreleased,
    },
    { name: 'P3', status: StatusType.Active, released: ReleaseFlag.Released },
];

// Filter active and released
const activeReleased = prototypes.filter(
    (p) =>
        p.status === StatusType.Active && p.released === ReleaseFlag.Released,
);

console.log(activeReleased); // [P1, P3]
```

### Timestamp Formatting

```typescript
import {
    parseProtoPediaTimestamp,
    parseW3cDtfTimestamp,
} from '@f88/promidas/utils';

// Parse from different sources
const protoTimestamp = parseProtoPediaTimestamp('2025-12-12 10:00:00.0');
const isoTimestamp = parseW3cDtfTimestamp('2025-12-12T10:00:00+09:00');

// Both return UTC ISO strings
console.log(protoTimestamp); // '2025-12-12T01:00:00.000Z'
console.log(isoTimestamp); // '2025-12-12T01:00:00.000Z'

// Format for display
if (protoTimestamp) {
    const date = new Date(protoTimestamp);
    console.log(date.toLocaleDateString('ja-JP')); // '2025/12/12'
    console.log(date.toISOString()); // '2025-12-12T01:00:00.000Z'
}
```

## Error Handling

All utilities use defensive programming and return `undefined` for invalid inputs.

### Handling Undefined Results

```typescript
import {
    convertToStatusType,
    parseProtoPediaTimestamp,
} from '@f88/promidas/utils';

// Option 1: Provide fallback
const status = convertToStatusType(rawStatus) ?? 'unknown';

// Option 2: Check before use
const parsedStatus = convertToStatusType(rawStatus);
if (parsedStatus !== undefined) {
    useStatus(parsedStatus);
} else {
    console.warn(`Invalid status: ${rawStatus}`);
}

// Option 3: Preserve undefined
interface Data {
    status: StatusType | undefined;
}

const data: Data = {
    status: convertToStatusType(rawStatus),
};

// Option 4: Use with optional chaining
const data = {
    timestamp: parseProtoPediaTimestamp(raw.date),
};

const year = data.timestamp ? new Date(data.timestamp).getFullYear() : null;
```

### Validation Pattern

```typescript
import { convertToStatusType, StatusType } from '@f88/promidas/utils';

function validateStatus(raw: string): StatusType {
    const status = convertToStatusType(raw);

    if (status === undefined) {
        throw new Error(`Invalid status: ${raw}. Expected: active, inactive`);
    }

    return status;
}

// Usage
try {
    const status = validateStatus('active'); // OK
    const invalid = validateStatus('bad-status'); // throws
} catch (error) {
    console.error(error.message);
}
```

### Batch Conversion with Errors

```typescript
import { convertToStatusType, StatusType } from '@f88/promidas/utils';

interface ConversionResult {
    successful: Array<{ original: string; converted: StatusType }>;
    failed: Array<{ original: string; reason: string }>;
}

function batchConvert(values: string[]): ConversionResult {
    const result: ConversionResult = {
        successful: [],
        failed: [],
    };

    for (const value of values) {
        const converted = convertToStatusType(value);

        if (converted !== undefined) {
            result.successful.push({ original: value, converted });
        } else {
            result.failed.push({
                original: value,
                reason: 'Unknown status value',
            });
        }
    }

    return result;
}

// Usage
const result = batchConvert(['active', 'inactive', 'bad-value']);
console.log(result.successful); // [{ original: 'active', converted: 'active' }, ...]
console.log(result.failed); // [{ original: 'bad-value', reason: '...' }]
```

## Best Practices

### 1. Always Handle Undefined

```typescript
// ✅ Good: Handle undefined
const status = convertToStatusType(raw) ?? StatusType.Active;

// ✅ Good: Type-safe check
const parsed = convertToStatusType(raw);
if (parsed !== undefined) {
    use(parsed);
}

// ❌ Bad: Assumes success
const status = convertToStatusType(raw)!; // Dangerous!
```

### 2. Use Type Imports

```typescript
// ✅ Good: Import types separately
import type { StatusType, LicenseType } from '@f88/promidas/utils';
import { convertToStatusType } from '@f88/promidas/utils';

// ✅ Also good: Combined import
import { convertToStatusType, type StatusType } from '@f88/promidas/utils';
```

### 3. Document Timezone Assumptions

```typescript
/**
 * Fetches prototype data and normalizes timestamps.
 *
 * ProtoPedia API returns JST timestamps which are converted to UTC.
 *
 * @returns Prototypes with UTC ISO timestamp strings
 */
function fetchPrototypes() {
    // ...
}
```

### 4. Leverage Type System

```typescript
// ✅ Good: Use enum types in interfaces
interface PrototypeData {
    status: StatusType | undefined;
    license: LicenseType | undefined;
}

// ❌ Bad: Use raw strings
interface PrototypeData {
    status: string;
    license: string;
}
```
