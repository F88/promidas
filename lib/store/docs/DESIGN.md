---
lang: en
title: Store Design
title-en: Store Design
title-ja: ストア設計
related:
    - ../../../README.md "Project Overview"
    - USAGE.md "Store Usage"
instructions-for-ais:
    - This document should be written in English for AI readability.
    - Content within code fences may be written in languages other than English.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document.
---

# Memorystore Design Notes

These notes capture how upstream ProtoPedia payload sizes influence the
in-memory `PrototypeMapStore` design in this repository. In particular,
they document:

- How large the canonical `listPrototypes` responses get for different
  limits.
- How much memory a full in-memory snapshot of `NormalizedPrototype`
  objects consumes at 1,000–10,000 items.
- Why a 30 MiB payload guard is used as a safety rail for SPA and
  Node.js consumers.

## Upstream Payload Size Snapshot (2025-10-24)

| API                   | limit  | size or rows | duration (ms) | res body size (bytes) |
| --------------------- | ------ | ------------ | ------------- | --------------------- |
| listPrototypes        | 1      | 1            | 3,388         | 1,078                 |
| listPrototypes        | 100    | 100          | 3,172         | 209,569               |
| listPrototypes        | 1,000  | 1,000        | 3,405         | 2,576,303             |
| listPrototypes        | 10,000 | 5,644        | 4,777         | 15,444,297            |
| downloadPrototypesTsv | 1      | 2            | 3,332         | 749                   |
| downloadPrototypesTsv | 100    | 101          | 3,210         | 41,279                |
| downloadPrototypesTsv | 1,000  | 1,001        | 3,246         | 439,941               |
| downloadPrototypesTsv | 10,000 | 5,645        | 3,538         | 3,254,374             |

These figures originate from ProtoPedia API Ver 2.0 Client documentation and are reproduced here for ease of reference.

## Design Notes

For this project, the key takeaway from the upstream snapshot is that
the canonical `listPrototypes` payload grows roughly linearly with the
number of items and reaches about 16.5 MB (≈20 MB including metadata)
for 10,000 items.

The in-memory `PrototypeMapStore` used in this repository:

- Keeps a single canonical snapshot of `NormalizedPrototype` objects.
- Enforces a hard payload guard of 30 MiB using an approximate
  size estimator.
- Targets use cases around a few thousand to ~10,000 prototypes for
  SPA and Node.js applications.

Performance and memory measurements from `lib/store/store.perf.test.ts`
show that, for the current `NormalizedPrototype` shape:

- ≈1,000 items → snapshot ≈0.3 MB
- ≈3,000 items → snapshot ≈0.9 MB
- ≈5,000 items → snapshot ≈1.6 MB
- ≈10,000 items → snapshot ≈3.2 MB

Taken together with the 30 MiB guard, this suggests that the
memorystore comfortably supports SPA use cases that keep a
full in-memory snapshot of several thousand prototypes while staying
within a single-digit MB footprint. The guard mainly protects against
future upstream growth (more fields or much larger text bodies) rather
than current data volumes.

## Test Coverage

The memorystore implementation is thoroughly tested:

- **Performance tests**: `lib/store/store.perf.test.ts` validates performance characteristics with 1,000–10,000 items
- **Unit tests**: `lib/store/store.test.ts` with 50 test cases covering all core functionality
- **Integration tests**: `lib/repository/__tests__/` with 44 test cases
- **Overall coverage**: 98.01% statements, 92.15% branches, 100% functions

These measurements are based on the test suite as of 2025-12-05 and should be revisited if the upstream schema or `NormalizedPrototype` shape changes significantly.
