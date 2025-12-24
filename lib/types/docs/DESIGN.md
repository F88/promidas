---
lang: en
title: Types Design
title-en: Types Design
title-ja: 型定義設計
related:
    - ../../../README.md "Project Overview"
    - USAGE.md "Types Usage"
instructions-for-ais:
    - This document should be written in English for AI readability.
    - Content within code fences may be written in languages other than English.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document.
---

# Types Design

This document explains the design goals and constraints of the shared type
package. The types are the canonical schema for PROMIDAS data and are consumed
by fetcher, store, repository, and utils.

## Goals

- **Single source of truth**: All modules import the same normalized shapes.
- **Runtime-agnostic**: Purely compile-time artifacts; no side effects.
- **Strictness friendly**: Works with `strict`, `exactOptionalPropertyTypes`,
  and `noUncheckedIndexedAccess`.
- **Interop**: Mirrors the normalized fields produced by the fetcher.

## Scope and Responsibilities

- `NormalizedPrototype`: normalized ProtoPedia entities (arrays for pipe
  fields, UTC ISO timestamps, numeric counts).
- Code unions such as `StatusCode`, `LicenseTypeCode`, `ReleaseFlagCode`, and
  `ThanksFlagCode` used across converters and repositories.
- Shared helper types (e.g., `DeepReadonly`) that enforce immutability for
  snapshot consumers.

## Exclusions

- No runtime validation or parsing (handled by fetcher/normalizers).
- No business logic, logging, or I/O.
- No duplication of design rationale covered in other modules; use links.

## Design Considerations

### NormalizedPrototype shape

- Pipe-separated upstream strings (`tags`, `users`) are represented as string
  arrays.
- Date/time fields are UTC ISO strings (`createDate`, `updateDate`).
- Count-like fields are numbers, not strings.
- Optional upstream values remain optional to preserve fidelity.

### Code Unions

- Code unions are closed sets that reflect the documented ProtoPedia codes.
- Unknown codes are represented as `number` at call sites that accept raw
  numbers; label converters handle fallback to stringified numbers.

### Immutability and Safety

- Public consumers are expected to treat returned data as immutable; paired
  `DeepReadonly` exports support this contract in other modules.
- Types are written to avoid surprise widening; optional properties stay
  optional, and required properties are explicit.

### Compatibility

- Types are authored in `.ts` with ESM-compatible exports; they are re-exported
  from `lib/types/index.ts` and mirrored through other modules (utils, store,
  repository) for convenience.
- No ambient declarations or global augmentation are used to keep package
  boundaries clear.

## Evolution Guidelines

- When upstream ProtoPedia adds fields, extend `NormalizedPrototype` and update
  doc comments/TSDoc in source.
- Keep code unions synchronized with upstream definitions; add new literals
  rather than widening to `number`.
- Add new helper types only when they are broadly useful across modules.

## References

- Usage examples: see [USAGE.md](USAGE.md).
- Normalization rules: see fetcher normalization docs (`lib/fetcher/docs`).
- Type source of truth: `lib/types/normalized-prototype.ts` and
  `lib/types/index.ts`.
