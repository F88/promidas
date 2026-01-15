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
- [Label Converters](#label-converters)
- [Time Utilities](#time-utilities)
- [Validation Utilities](#validation-utilities)
- [Type Definitions](#type-definitions)
- [Integration Examples](#integration-examples)
- [Best Practices](#best-practices)

## Quick Start

### Installation

```typescript
import {
    // Label converters
    getPrototypeStatusLabel,
    getPrototypeLicenseTypeLabel,
    getPrototypeReleaseFlagLabel,
    getPrototypeThanksFlagLabel,

    // Time utilities
    parseProtoPediaTimestamp,
    parseW3cDtfTimestamp,
    JST_OFFSET_MS,

    // Validation utilities
    validateNormalizedPrototype,
    validateNormalizedPrototypeArray,

    // Types
    StatusCode,
    LicenseTypeCode,
    ReleaseFlagCode,
    ThanksFlagCode,
} from 'promidas/utils';
```

### Basic Example

```typescript
import {
    getPrototypeStatusLabel,
    parseProtoPediaTimestamp,
} from 'promidas/utils';

// Convert status code to Japanese label
const label = getPrototypeStatusLabel(1);
console.log(label); // 'アイデア' (Idea)

// Parse ProtoPedia timestamp (JST) to UTC
const timestamp = parseProtoPediaTimestamp('2025-12-12 10:00:00.0');
console.log(timestamp); // '2025-12-12T01:00:00.000Z'
```

## Label Converters

Label converters transform ProtoPedia API numeric codes into human-readable Japanese labels.

### Status Label Converter

Convert prototype status codes to Japanese labels.

```typescript
import { getPrototypeStatusLabel } from 'promidas/utils';
import type { StatusCode } from 'promidas/utils';

// All valid status values
console.log(getPrototypeStatusLabel(1)); // 'アイデア' (Idea)
console.log(getPrototypeStatusLabel(2)); // '開発中' (In Development)
console.log(getPrototypeStatusLabel(3)); // '完成' (Completed)
console.log(getPrototypeStatusLabel(4)); // '供養' (Retired/Memorial)

// Unknown values return the numeric value as string
console.log(getPrototypeStatusLabel(99)); // '99'

// Type-safe usage with StatusCode
const status: StatusCode = 3;
const label = getPrototypeStatusLabel(status);
console.log(label); // '完成'
```

**Status Code Distribution** (based on API data):

- `1` (アイデア): ~6% of prototypes
- `2` (開発中): ~35% of prototypes
- `3` (完成): ~57% of prototypes (most common)
- `4` (供養): ~2% of prototypes

### License Type Label Converter

Convert license type codes to Japanese labels.

```typescript
import { getPrototypeLicenseTypeLabel } from 'promidas/utils';
import type { LicenseTypeCode } from 'promidas/utils';

// Valid license values
console.log(getPrototypeLicenseTypeLabel(0)); // 'なし' (None)
console.log(getPrototypeLicenseTypeLabel(1)); // '表示(CC:BY)' (CC BY)

// Unknown values return the numeric value as string
console.log(getPrototypeLicenseTypeLabel(99)); // '99'

// Type-safe usage
const license: LicenseTypeCode = 1;
const label = getPrototypeLicenseTypeLabel(license);
console.log(label); // '表示(CC:BY)'
```

**Note**: In practice, all prototypes accessible via the public API have `licenseType=1`.

### Release Flag Label Converter

Convert release flag codes to Japanese labels.

```typescript
import { getPrototypeReleaseFlagLabel } from 'promidas/utils';
import type { ReleaseFlagCode } from 'promidas/utils';

// Valid release flag values
console.log(getPrototypeReleaseFlagLabel(1)); // '下書き保存' (Draft)
console.log(getPrototypeReleaseFlagLabel(2)); // '一般公開' (Public)
console.log(getPrototypeReleaseFlagLabel(3)); // '限定共有' (Limited Sharing)

// Unknown values return the numeric value as string
console.log(getPrototypeReleaseFlagLabel(0)); // '0'

// Type-safe usage
const releaseFlag: ReleaseFlagCode = 2;
const label = getPrototypeReleaseFlagLabel(releaseFlag);
console.log(label); // '一般公開'
```

**Note**: The public API only returns publicly released prototypes (`releaseFlg=2`).

### Thanks Flag Label Converter

Convert thanks flag codes to Japanese labels.

```typescript
import { getPrototypeThanksFlagLabel } from 'promidas/utils';
import type { ThanksFlagCode } from 'promidas/utils';

// Valid thanks flag values
console.log(getPrototypeThanksFlagLabel(1)); // '初回表示済'
console.log(getPrototypeThanksFlagLabel(0)); // '0'

// Historical data may have undefined thanksFlg
console.log(getPrototypeThanksFlagLabel(undefined)); // '不明' (Unknown)

// Type-safe usage
const thanksFlag: ThanksFlagCode = 1;
const label = getPrototypeThanksFlagLabel(thanksFlag);
console.log(label); // '初回表示済'
```

**Note**: Almost all prototypes have `thanksFlg=1`. Historical data (~3.26%) may have `undefined`.

## Time Utilities

Time utilities parse and normalize timestamps from ProtoPedia API.

### Parse ProtoPedia Timestamp

Parse JST timestamps (space-separated format) to UTC ISO strings.

```typescript
import { parseProtoPediaTimestamp } from 'promidas/utils';

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
import { JST_OFFSET_MS } from 'promidas/utils';

console.log(JST_OFFSET_MS); // 32400000 (9 hours in milliseconds)

// The library handles JST → UTC conversion automatically
const jstTime = '2025-12-12 12:00:00.0';
const utcTime = parseProtoPediaTimestamp(jstTime);
console.log(utcTime); // '2025-12-12T03:00:00.000Z'
```

### Parse W3C-DTF Timestamp

Parse W3C Date and Time Formats (ISO 8601 subset with mandatory timezone).

```typescript
import { parseW3cDtfTimestamp } from 'promidas/utils';

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

## Validation Utilities

Validation utilities provide type-safe validation of external data using the Result pattern. These utilities are shared across fetcher, repository, and application code.

### Validate Single Prototype

Validate a single NormalizedPrototype object.

```typescript
import { validateNormalizedPrototype } from 'promidas/utils';

// Validate untrusted external data
const untrustedData = JSON.parse(externalJson);
const result = validateNormalizedPrototype(untrustedData);

if (result.ok) {
    // TypeScript knows result.value is NormalizedPrototype
    console.log(`Valid prototype: ${result.value.prototypeNm}`);
    console.log(`ID: ${result.value.prototypeId}`);
} else {
    // TypeScript knows result.error is ValidationError
    console.error('Validation failed:', result.error.message);
    console.error('Details:', result.error.details);
}
```

**Validation Features:**

- Validates all required fields are present
- Checks field types match schema
- Validates code values are within allowed ranges (e.g., status: 1|2|3|4)
- Rejects extra fields not in schema
- Provides detailed error messages with field paths

### Validate Prototype Array

Validate an array of NormalizedPrototype objects.

```typescript
import { validateNormalizedPrototypeArray } from 'promidas/utils';

const arrayData = JSON.parse(externalJson);
const result = validateNormalizedPrototypeArray(arrayData);

if (result.ok) {
    console.log(`Validated ${result.value.length} prototypes`);
    result.value.forEach((prototype) => {
        console.log(`- ${prototype.prototypeNm}`);
    });
} else {
    console.error('Array validation failed:', result.error.message);
}
```

**Array Validation Behavior:**

- Validates the input is an array
- Validates each element in the array
- Returns detailed error for the first invalid element found
- Provides element index in error message

### Result Type Pattern

Validation functions return a Result type (discriminated union) instead of throwing exceptions.

```typescript
import { validateNormalizedPrototype } from 'promidas/utils';

const result = validateNormalizedPrototype(untrustedData);

// Use the 'ok' field to discriminate
if (result.ok) {
    // result.value is available (type: NormalizedPrototype)
    processPrototype(result.value);
} else {
    // result.error is available (type: ValidationError)
    logError(result.error);
}
```

For Result pattern design rationale, see [DESIGN.md](DESIGN.md#result-pattern).

### Error Details

Validation errors include detailed information about what failed.

```typescript
import { validateNormalizedPrototype } from 'promidas/utils';

const invalidData = {
    prototypeId: 'not-a-number', // Should be number
    status: 99, // Should be 1|2|3|4
    // ... missing required fields
};

const result = validateNormalizedPrototype(invalidData);

if (!result.ok) {
    console.error('Message:', result.error.message);
    // "Failed to validate NormalizedPrototype"

    console.error('Details:', result.error.details);
    // Array of Zod validation errors with field paths:
    // [
    //   { path: ['prototypeId'], message: 'Expected number, received string' },
    //   { path: ['status'], message: 'Invalid literal value, expected 1|2|3|4' },
    //   ...
    // ]
}
```

### Integration with Shared Schema

Validation utilities use the shared Zod schema from `lib/schemas/normalized-prototype.ts`.

```typescript
// Same schema used by:
// - lib/utils/validation/normalized-prototype.ts (this module)
// - lib/fetcher (API response validation)
// - lib/repository (snapshot data validation)

import { normalizedPrototypeSchema } from 'promidas/schemas';
import { validateNormalizedPrototype } from 'promidas/utils';

// Direct schema usage (advanced)
const directResult = normalizedPrototypeSchema.safeParse(data);

// Or use the Result-based wrapper (recommended)
const wrapperResult = validateNormalizedPrototype(data);
```

**Why Shared Schema?**

- Single source of truth for validation rules
- Consistent validation across all modules
- Easier maintenance and updates

For architecture details, see [DESIGN.md](DESIGN.md#three-layer-architecture).

## Type Definitions

All utility types are exported for use in your application.

### Code Types

```typescript
import type {
    StatusCode,
    LicenseTypeCode,
    ReleaseFlagCode,
    ThanksFlagCode,
} from 'promidas/utils';

// Use in function signatures
function filterByStatus(status: StatusCode): boolean {
    return status === 3; // Completed
}

// Use in type definitions
interface PrototypeFilter {
    status?: StatusCode;
    licenseType?: LicenseTypeCode;
    releaseFlg?: ReleaseFlagCode;
    thanksFlg?: ThanksFlagCode;
}

// Leverage TypeScript's type narrowing
function getStatusDescription(status: StatusCode): string {
    switch (status) {
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

## Integration Examples

### Display Prototype Information

```typescript
import {
    getPrototypeStatusLabel,
    getPrototypeLicenseTypeLabel,
    getPrototypeReleaseFlagLabel,
    getPrototypeThanksFlagLabel,
} from 'promidas/utils';
import type { NormalizedPrototype } from 'promidas/types';

function displayPrototype(prototype: NormalizedPrototype): void {
    console.log(`Name: ${prototype.prototypeNm}`);
    console.log(`Status: ${getPrototypeStatusLabel(prototype.status)}`);

    if (prototype.licenseType !== undefined) {
        console.log(
            `License: ${getPrototypeLicenseTypeLabel(prototype.licenseType)}`,
        );
    }

    console.log(
        `Release: ${getPrototypeReleaseFlagLabel(prototype.releaseFlg)}`,
    );

    if (prototype.thanksFlg !== undefined) {
        console.log(
            `Thanks: ${getPrototypeThanksFlagLabel(prototype.thanksFlg)}`,
        );
    }
}
```

### Timestamp Formatting

```typescript
import { parseProtoPediaTimestamp, parseW3cDtfTimestamp } from 'promidas/utils';

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

### Create Summary Report

```typescript
import {
    getPrototypeStatusLabel,
    parseProtoPediaTimestamp,
} from 'promidas/utils';
import type { NormalizedPrototype } from 'promidas/types';

function createSummary(prototypes: NormalizedPrototype[]): void {
    // Count by status
    const statusCounts = new Map<string, number>();

    for (const prototype of prototypes) {
        const label = getPrototypeStatusLabel(prototype.status);
        statusCounts.set(label, (statusCounts.get(label) || 0) + 1);
    }

    console.log('Status Distribution:');
    for (const [status, count] of statusCounts) {
        console.log(`  ${status}: ${count}`);
    }

    // Find most recent
    const sorted = [...prototypes].sort((a, b) => {
        const dateA = a.updateDate || a.createDate;
        const dateB = b.updateDate || b.createDate;
        return dateB.localeCompare(dateA);
    });

    if (sorted[0]) {
        const latest = sorted[0];
        const date = latest.updateDate || latest.createDate;
        console.log(`\nMost recently updated: ${latest.prototypeNm}`);
        console.log(`Date: ${new Date(date).toLocaleDateString('ja-JP')}`);
    }
}
```

### Validate External Data

Safely validate data from external sources before use.

```typescript
import { validateNormalizedPrototypeArray } from 'promidas/utils';
import type { NormalizedPrototype } from 'promidas/types';

// Load data from file or API
async function loadPrototypes(url: string): Promise<NormalizedPrototype[]> {
    const response = await fetch(url);
    const data = await response.json();

    // Validate before trusting the data
    const result = validateNormalizedPrototypeArray(data);

    if (!result.ok) {
        throw new Error(`Invalid data from ${url}: ${result.error.message}`);
    }

    return result.value;
}

// Use with error handling
loadPrototypes('https://example.com/data.json')
    .then((prototypes) => {
        console.log(`Loaded ${prototypes.length} valid prototypes`);
    })
    .catch((error) => {
        console.error('Failed to load:', error.message);
    });
```

### Combine Validation and Conversion

Use validation utilities with label converters for complete data processing.

```typescript
import {
    validateNormalizedPrototype,
    getPrototypeStatusLabel,
} from 'promidas/utils';

function processExternalData(rawData: unknown): void {
    // Step 1: Validate structure
    const validation = validateNormalizedPrototype(rawData);

    if (!validation.ok) {
        console.error('Invalid data:', validation.error.message);
        return;
    }

    // Step 2: Use validated data
    const prototype = validation.value;

    // Step 3: Convert codes to labels for display
    console.log(`Name: ${prototype.prototypeNm}`);
    console.log(`Status: ${getPrototypeStatusLabel(prototype.status)}`);
    console.log(
        `Created: ${new Date(prototype.createDate).toLocaleDateString('ja-JP')}`,
    );
}
```

## Best Practices

### Always Handle Undefined

```typescript
import { parseProtoPediaTimestamp } from 'promidas/utils';

// ✅ Good: Provide fallback
const timestamp = parseProtoPediaTimestamp(raw) ?? new Date().toISOString();

// ✅ Good: Check before use
const parsed = parseProtoPediaTimestamp(raw);
if (parsed) {
    useTimestamp(parsed);
}

// ❌ Bad: Assumes success
const timestamp = parseProtoPediaTimestamp(raw)!; // Dangerous!
```

### Use Type Imports

```typescript
// ✅ Good: Import types separately
import type { StatusCode } from 'promidas/utils';
import { getPrototypeStatusLabel } from 'promidas/utils';

// ✅ Also good: Combined import
import { getPrototypeStatusLabel, type StatusCode } from 'promidas/utils';
```

### Document Timezone Assumptions

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

### Leverage Type System

```typescript
import type { StatusCode } from 'promidas/utils';

// ✅ Good: Use code types in interfaces
interface PrototypeData {
    status: StatusCode;
    licenseType?: LicenseTypeCode;
}

// ❌ Bad: Use raw numbers without type annotation
interface PrototypeData {
    status: number;
    licenseType?: number;
}
```

---

For more details on the design rationale, see [DESIGN.md](./DESIGN.md).
