---
lang: en
title: Types Usage
title-en: Types Usage
title-ja: 型定義の使用法
related:
    - ../../../README.md "Project Overview"
    - DESIGN.md "Types Design"
instructions-for-ais:
    - This document should be written in English for AI readability.
    - Content within code fences may be written in languages other than English.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document.
---

# Types Usage

This guide shows how to consume the shared PROMIDAS type definitions and code
unions.

## Quick Start

```typescript
import type {
    NormalizedPrototype,
    StatusCode,
    LicenseTypeCode,
    ReleaseFlagCode,
    ThanksFlagCode,
} from '@f88/promidas/types';
```

## Key Types

- `NormalizedPrototype`: normalized ProtoPedia entity (arrays for tags/users,
  UTC ISO timestamps, numeric counts).
- Code unions: `StatusCode`, `LicenseTypeCode`, `ReleaseFlagCode`,
  `ThanksFlagCode`.
- Readonly helpers: `DeepReadonly<T>` (used by store/repository APIs).

## Typical Patterns

### Type-safe data access

```typescript
import type { NormalizedPrototype } from '@f88/promidas/types';

function render(prototype: NormalizedPrototype): string {
    const tags = prototype.tags.join(', ');
    const title = prototype.prototypeNm;
    const created = prototype.createDate; // already UTC ISO string
    return `${title} (${tags}) at ${created}`;
}
```

### Optional fields

```typescript
function getReleaseDate(prototype: NormalizedPrototype): string | undefined {
    return prototype.releaseDate; // may be undefined when not provided upstream
}
```

### Code unions with converters

```typescript
import type { StatusCode } from '@f88/promidas/types';
import { getPrototypeStatusLabel } from '@f88/promidas/utils';

function describeStatus(status: StatusCode): string {
    return getPrototypeStatusLabel(status);
}
```

### Enforcing immutability

```typescript
import type { DeepReadonly, NormalizedPrototype } from '@f88/promidas/types';

function useSnapshot(data: DeepReadonly<NormalizedPrototype>[]): void {
    // data is readonly; mutations are compile-time errors
    console.log(data.length);
}
```

## Notes

- Types are compile-time only; importing them adds no runtime cost.
- Normalization (pipe-split, UTC conversion) happens in the fetcher; these types
  reflect the post-normalization shape.
- For label/lookups, pair code unions with the utils converters
  (`@f88/promidas/utils`).

## Related Docs

- Design rationale: [DESIGN.md](DESIGN.md)
- Normalization rules: `lib/fetcher/docs/DESIGN.md`
