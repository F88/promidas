---
lang: en
title: Schemas Design
title-en: Schemas Design
title-ja: スキーマ設計思想
related:
    - ../README.md "Schemas Overview"
    - USAGE.md "Schemas Usage"
instructions-for-ais:
    - This document should be written in English for AI readability.
    - Prohibit updating title line (1st line) in this document.
---

# Schemas Design

This document explains the design decisions behind the `lib/schemas` module and its relationship with `lib/types`.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Why Separate Types and Schemas?](#why-separate-types-and-schemas)
- [Design Decisions](#design-decisions)
- [Code Value Restrictions](#code-value-restrictions)
- [Schema Evolution](#schema-evolution)
- [Performance Considerations](#performance-considerations)

## Architecture Overview

### Two-Layer Type Safety

```plaintext
┌─────────────────────────────────────────────────────────────┐
│  Compile-Time Layer (lib/types)                             │
│  - TypeScript type definitions                              │
│  - Zero runtime cost                                        │
│  - IDE autocomplete & type checking                         │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Runtime Layer (lib/schemas)                                │
│  - Zod schema validation                                    │
│  - External data validation                                 │
│  - Runtime type safety                                      │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```typescript
// External data (API, file, network)
const externalData: unknown = await fetchData();

// Runtime validation (lib/schemas)
const result = normalizedPrototypeSchema.safeParse(externalData);

if (result.success) {
    // Compile-time type (lib/types)
    const validated: NormalizedPrototype = result.data;
    // Now both TypeScript and runtime guarantee type safety
}
```

## Why Separate Types and Schemas?

### 1. Bundle Size Optimization

**Problem**: Zod adds ~15KB (minified + gzipped) to bundle size.

**Solution**:

- `lib/types`: Zero-cost TypeScript types (removed at runtime)
- `lib/schemas`: Only imported when validation is needed

**Use Cases**:

- Internal code: Use types only → No Zod in bundle
- External data: Import schemas → Validate before use

### 2. Clear Separation of Concerns

| Concern   | lib/types           | lib/schemas           |
| --------- | ------------------- | --------------------- |
| **When**  | Compile-time        | Runtime               |
| **Where** | TypeScript compiler | Browser/Node.js       |
| **What**  | Type annotations    | Data validation       |
| **Who**   | Developers          | External data sources |

### 3. Flexibility

Developers can choose:

- Type-only imports for internal code (lightweight)
- Schema imports for external data validation (comprehensive)
- Both for maximum safety

## Design Decisions

### 1. Literal Unions for Code Values

**Decision**: Use `z.union([z.literal(1), z.literal(2), ...])` instead of `z.number()`

**Rationale**:

```typescript
// ❌ Generic number - accepts any integer
status: z.number().int();

// ✅ Literal union - only accepts valid codes
status: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);
```

**Benefits**:

- Early detection of invalid data
- Alignment with TypeScript types (`StatusCode = 1 | 2 | 3 | 4`)
- Self-documenting schema
- Prevents accidental data corruption

**Trade-offs**:

- More verbose schema definition
- Cannot accept "unknown" future values
- Breaking change if API adds new codes

**Mitigation**: For forward compatibility, use a separate "lenient" schema for imports if needed.

### 2. Optional Field Handling

**Decision**: Use `.optional()` matching `exactOptionalPropertyTypes: true`

**Example**:

```typescript
// TypeScript type (lib/types/normalized-prototype.ts)
type NormalizedPrototype = {
    licenseType?: undefined | LicenseTypeCode;
    thanksFlg?: undefined | ThanksFlagCode;
};

// Zod schema (lib/schemas/normalized-prototype.ts)
const normalizedPrototypeSchema = z.object({
    licenseType: z.union([z.literal(0), z.literal(1)]).optional(),
    thanksFlg: z.union([z.literal(0), z.literal(1)]).optional(),
});
```

**Rationale**:

- Matches TypeScript's strict optional property handling
- Prevents `null` values (only `undefined` allowed)
- Consistent with `exactOptionalPropertyTypes: true`

### 3. Shared Schema Module

**Decision**: Create `lib/schemas` as a shared module instead of per-module schemas

**Benefits**:

- Single source of truth for validation
- Reusable across fetcher, repository, store
- Consistent validation logic
- Easier maintenance

**Structure**:

```typescript
// Shared schema
lib / schemas / normalized - prototype.ts;

// Used by:
lib / repository / schemas / serializable - snapshot.ts; // Imports from lib/schemas
lib / utils / validation / validators.ts; // Imports from lib/schemas
```

## Code Value Restrictions

### Status Code (1|2|3|4)

**Source**: `lib/types/codes.ts` → `StatusCode`

**Validation**:

```typescript
status: z.union([
    z.literal(1), // アイデア (Idea)
    z.literal(2), // 開発中 (In Development)
    z.literal(3), // 完成 (Completed)
    z.literal(4), // 供養 (Retired/Memorial)
]);
```

**Rationale**: All four values appear in public API responses (verified from data analysis).

### Release Flag (1|2|3)

**Source**: `lib/types/codes.ts` → `ReleaseFlagCode`

**Validation**:

```typescript
releaseFlg: z.union([
    z.literal(1), // 下書き保存 (Draft)
    z.literal(2), // 一般公開 (Public)
    z.literal(3), // 限定共有 (Limited Sharing)
]);
```

**Rationale**: Public API only returns `releaseFlg=2`, but schema allows all three for completeness.

### License Type (0|1)

**Source**: `lib/types/codes.ts` → `LicenseTypeCode`

**Validation**:

```typescript
licenseType: z.union([
    z.literal(0), // なし (None)
    z.literal(1), // 表示(CC:BY)
]).optional();
```

**Rationale**: API responses show only `licenseType=1`, but `0` is theoretically possible.

### Thanks Flag (0|1|undefined)

**Source**: `lib/types/codes.ts` → `ThanksFlagCode`

**Validation**:

```typescript
thanksFlg: z.union([
    z.literal(0), // Message not yet shown
    z.literal(1), // Message shown
]).optional();
```

**Rationale**: Historical data (~3.26%) may not have this field; `undefined` is valid.

## Schema Evolution

### Version Compatibility

**Current**: v1.0.0 - Initial strict validation

**Future Considerations**:

1. **Backward compatibility**: If new status codes are added, create `v2` schema
2. **Lenient mode**: Provide alternate schema for unknown code values
3. **Migration**: Offer migration utilities for old snapshots

### Adding New Schemas

**Pattern**:

```typescript
// lib/schemas/new-schema.ts
export const newSchema = z.object({
    // ...
});

// lib/schemas/index.ts
export { newSchema } from './new-schema.js';
```

**Guidelines**:

- One schema per file
- Export through `index.ts`
- Add corresponding type in `lib/types`
- Document in README

## Performance Considerations

### Validation Cost

**Benchmark** (rough estimates):

- Simple field validation: ~0.001ms per field
- Array validation: ~0.01ms per item
- Full NormalizedPrototype: ~0.1ms per object

**Impact**:

- 1000 prototypes: ~100ms validation time
- Acceptable for snapshot import (one-time cost)
- May impact real-time API parsing

**Optimization**:

- Use `.parse()` only when needed
- Cache validation results
- Consider lazy validation for large datasets

### Bundle Size

**Zod dependency**: ~15KB minified + gzipped

**Mitigation**:

- Tree-shakeable: Only import needed schemas
- Separate entry point: `promidas/schemas`
- Optional: Apps not validating external data can skip this module

## Testing Strategy

### Schema Tests

**Coverage**:

1. Valid data passes
2. Invalid field types rejected
3. Out-of-range code values rejected
4. Optional fields handled correctly
5. Missing required fields rejected

**Example**:

```typescript
it('rejects invalid status code', () => {
    const invalid = { ...validPrototype, status: 99 };
    const result = normalizedPrototypeSchema.safeParse(invalid);

    expect(result.success).toBe(false);
    if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['status']);
    }
});
```

### Integration Tests

Verify schema works with:

- Repository snapshot import
- Validation utilities
- Error handling flows

## Future Enhancements

### Planned Improvements

1. **Custom error messages**: Provide user-friendly validation errors
2. **Partial schemas**: Allow validating subsets of fields
3. **Transform schemas**: Auto-convert data types on validation
4. **Strict mode toggle**: Runtime flag for strict vs lenient validation

### API Stability

**Commitment**:

- Major version bump for breaking schema changes
- Deprecation warnings for 1 minor version
- Migration guides for schema updates
