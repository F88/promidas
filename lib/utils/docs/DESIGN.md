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
- [Validation](#validation)
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
│  ├── validation/   (Result-based validators)            │
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

**Rationale**:

- Returning stringified numbers for unknown codes prevents errors
- Allows graceful degradation with new API code values
- Simple O(1) lookup using Record type

For implementation examples, see [USAGE.md](USAGE.md#label-converters).

### Validation

Purpose: Shared validation utilities using Result pattern for type-safe error handling.

```plaintext
validation/
├── index.ts                        # Re-exports all validators
├── normalized-prototype.ts         # NormalizedPrototype validators
└── __tests__/
    └── normalized-prototype.test.ts  # 49 validation tests
```

**Design Pattern**: Result-based validation (never throw exceptions)

- Input: `unknown` (untrusted external data)
- Output: `Ok<T>` or `Err<ValidationError>` (discriminated union)
- Shared across modules: Used by fetcher, repository, and application code
- Schema integration: Uses `lib/schemas/normalized-prototype.ts` for runtime validation

**Design Decision**:

- Never throw exceptions for validation failures
- Use discriminated union (Result type) for type-safe error handling
- Provide detailed error messages with field paths

**Rationale**:

- Validation failures are expected when processing external data
- Type system enforces proper error handling
- Easier error propagation with Result pattern
- Consistent with other library modules (fetcher, repository)

**Integration with Three-Layer Architecture**:

1. **Compile-time**: TypeScript types (`lib/types/normalized-prototype.ts`)
2. **Runtime**: Zod schemas (`lib/schemas/normalized-prototype.ts`) ← Used here
3. **Validation utilities**: Result-based APIs (this module)

For implementation examples, see [USAGE.md](USAGE.md#validation-utilities).

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

**Design Decisions**:

1. **ProtoPedia Timestamp Format**
    - Decision: Parse space-separated format, not ISO 8601
    - Rationale: Matches actual API response format
    - Timezone: Treat as JST (UTC+9) without explicit indicator

2. **W3C-DTF Timestamp Format**
    - Decision: Support only datetime with timezone (Level 4-6)
    - Rationale: Date-only formats don't provide time information
    - Requirement: Timezone is mandatory for unambiguous time representation

For format details and usage examples, see [USAGE.md](USAGE.md#time-utilities).

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

All utilities return safe values instead of throwing errors.

**Decision**: Use safe defaults rather than exceptions

**Rationale**:

- Invalid input is often expected in data processing
- Throwing exceptions disrupts control flow
- Consumers can decide how to handle invalid data

**Behavior**:

- Timestamp parsers: Return `undefined` for invalid formats
- Label converters: Return stringified number for unknown codes
- Validation utilities: Return Result type with detailed errors

For usage examples, see [USAGE.md](USAGE.md).

### Immutability

All functions are pure and side-effect free.

**Decision**: Pure functions only

**Rationale**:

- Predictable behavior
- Easy to test
- Safe for concurrent use
- No hidden state changes

### Type Narrowing

Code types enable TypeScript's type narrowing for exhaustive checking.

**Decision**: Use literal union types for codes

**Rationale**:

- Compiler enforces handling all cases
- Better IDE autocomplete
- Type-safe switch statements
- Prevents runtime errors from missing cases

## Type Safety

### Strict Typing

All types use TypeScript's strict mode features.

**Configuration**:

- `exactOptionalPropertyTypes: true` - Distinguishes `undefined` from missing properties
- `noUncheckedIndexedAccess: true` - Record access returns `T | undefined`

**Design Decision**: Enable strictest TypeScript checks

**Rationale**: Catch more errors at compile time, prevent runtime type issues

### Runtime Safety

Type guards are implicit in return values.

**Design Pattern**: Optional return types signal validation need

- Parsers return `string | undefined`
- Converters always return `string` (fallback to stringified number)
- Validators return `Result<T, E>` (discriminated union)

**Rationale**: TypeScript's narrowing enforces null checks before use

## Validation

### Result Pattern

Validation utilities use the Result pattern instead of throwing exceptions.

**Why Result Pattern?**

- Validation failures are expected, not exceptional
- Type system enforces error handling
- Better developer experience than try/catch

**Design**:

- Input: `unknown` (untrusted external data)
- Output: `Ok<T>` or `Err<ValidationError>` (discriminated union)
- Never throws exceptions for validation failures
- Type-safe error handling enforced by TypeScript

For practical usage examples, see [USAGE.md](USAGE.md#validation-utilities).

### Three-Layer Architecture

Validation utilities are part of a comprehensive three-layer validation strategy:

**Layer 1: Compile-Time (Type System)**

- Location: `lib/types/normalized-prototype.ts`
- Purpose: Static type checking, IDE support
- Cost: Zero runtime overhead

**Layer 2: Runtime (Zod Schemas)**

- Location: `lib/schemas/normalized-prototype.ts`
- Purpose: Validate external data structure at runtime
- Features: Strict literal unions, comprehensive field validation

**Layer 3: Validation Utilities (Result Pattern)**

- Location: `lib/utils/validation/normalized-prototype.ts` (shared)
- Location: `lib/repository/validation/` (repository-specific)
- Purpose: Never-throw APIs with type-safe error handling
- Benefits: Explicit error handling, no try/catch required

### Why Result Pattern?

**Problem**: Exception-based validation hides control flow

**Solution**: Result type makes success/failure explicit

**Benefits**:

- Type system enforces error handling (no forgotten try/catch)
- Easy error propagation (return early pattern)
- Better developer experience (explicit contracts)
- Works well with TypeScript's discriminated unions

**Trade-off**: More verbose code vs. type safety and explicit error handling

### Shared Validation Logic

**Design Decision**: Single validation implementation shared across modules

**Rationale**:

- DRY principle (Don't Repeat Yourself)
- Consistent error messages across fetcher, repository, application
- Single source of truth for validation rules
- Easier maintenance and testing

**Modules using shared validation**:

- `lib/fetcher`: Validates API responses
- `lib/repository`: Validates snapshot data
- Application code: Validates external data sources

For integration examples, see [USAGE.md](USAGE.md#validation-utilities).

### Testing

- **49 comprehensive tests** covering all validation scenarios
- **100% coverage** for validation module
- Tests include: invalid types, missing fields, extra fields, invalid code values

## Extensibility

### Adding New Label Converters

**Pattern**:

1. Create converter module in `lib/utils/converters/`
2. Define label mapping using `Record<CodeType, string>`
3. Export converter function
4. Re-export from `index.ts`
5. Add comprehensive tests

**Guidelines**:

- Follow existing converter pattern (same signature)
- Return stringified number for unknown codes
- Use descriptive Japanese labels
- Include JSDoc comments

### Adding New Time Parsers

**Pattern**:

1. Add parser function to `lib/utils/time/parser.ts`
2. Export from `lib/utils/time/index.ts`
3. Add comprehensive tests
4. Document format in JSDoc

**Guidelines**:

- Return `string | undefined` (UTC ISO string or undefined)
- Never throw exceptions
- Validate format with regex before parsing
- Document timezone handling clearly
- Handle edge cases (leap seconds, DST transitions)

## Integration Points

### Module Dependencies

**Utils module dependencies**:

- Zero external dependencies
- Depends only on project's own modules:
    - `lib/types` (type definitions)
    - `lib/schemas` (Zod schemas for validation)

**Consumers of utils**:

- `lib/fetcher`: Uses time parsers and validation utilities
- `lib/repository`: Uses validation utilities
- Application code: Uses converters, parsers, validators

### Design Principles for Integration

**Independence**: Utils can be used without other modules (fetcher, repository, store)

**Shared Validation**: Validation utilities provide consistent validation across all modules

**Type Reusability**: Code types re-exported for convenience (`@f88/promidas/utils` or `@f88/promidas/types`)

For integration code examples, see [USAGE.md](USAGE.md#integration-examples).

## Performance Considerations

### Constant-Time Lookups

Label converters use `Record` for O(1) access.

**Design**: Hash table lookup instead of switch/if-else

**Benefit**: Consistent performance regardless of code value

### Minimal Allocations

Parsers minimize object creation during parsing.

**Design**:

- Single regex match per parse operation
- Direct UTC calculation without intermediate Date objects
- Reuse of constant values (JST_OFFSET_MS)

**Benefit**: Lower memory pressure, faster parsing

### Zero Runtime Dependencies

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
