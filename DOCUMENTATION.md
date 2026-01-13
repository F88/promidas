---
lang: en
title: Documentation Standards
title-en: Documentation Standards
title-ja: ドキュメント標準
related:
    - ./README.md "Project Overview"
    - ./DEVELOPMENT.md "Development Guide"
    - ./CONTRIBUTING.md "Contributing Guide"
instructions-for-ais:
    - This document should be written in English for AI readability.
    - Content within code fences may be written in languages other than English.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document.
---

# Documentation Standards

This document defines the documentation structure and standards for this project.

## Overview

Each module in this project follows a consistent three-document structure to serve different audiences and purposes. This standardization ensures that documentation is accessible, maintainable, and useful for all stakeholders.

## Module Design Principles

All modules under `lib/` are designed as **standalone, independently usable components**. Each module should:

- **Function independently**: Be usable without requiring the full repository layer or other high-level modules
- **Provide clear public API**: Export well-defined interfaces through `index.ts`
- **Include comprehensive documentation**: Enable developers to use the module in isolation
- **Support subpath exports**: Be importable via package subpath (e.g., `@f88/promidas/store`, `@f88/promidas/fetcher`)
- **Minimize dependencies**: Depend only on foundational modules (types, logger, utils) when necessary

This design principle allows developers to:

- Use only the specific functionality they need
- Build custom solutions without adopting the entire framework
- Integrate modules into different architectures and runtime environments

**Example:**

```typescript
// Use only the store module
import { PrototypeInMemoryStore } from '@f88/promidas/store';

// Use only the fetcher module
import { ProtopediaApiCustomClient } from '@f88/promidas/fetcher';

// Or use the full repository layer
import { PromidasRepositoryBuilder } from '@f88/promidas';
```

## Documentation Structure

Every module under `lib/` should have the following core documentation files:

```plaintext
lib/xxx/
├── README.md           # Japanese overview (beginner-friendly)
└── docs/
    ├── DESIGN.md       # English design specifications
    └── USAGE.md        # English usage examples
```

**Note:** These three documents form the standard documentation structure. In some cases, modules may include additional supplementary documents (e.g., migration guides, advanced topics, or specific use-case documentation) as needed. However, the above three files should always exist as the foundation.

## Document Standards

### 1. `lib/xxx/README.md` - Module Overview

**Language:** Japanese (日本語)

**Target Audience:** Beginners to advanced users (初心者から上級者まで)

**Purpose:**

- Provide an accessible overview of the module
- Explain what the module does and why it exists
- Include simple usage examples
- Link to detailed documentation (DESIGN.md, USAGE.md)

**Rationale:**
Japanese documentation improves accessibility for Japanese developers, especially beginners who may find technical English challenging.

**Guidelines:**

- Use clear, beginner-friendly language
- Avoid excessive technical jargon
- Include concrete examples
- Keep it concise (aim for 200-300 lines maximum)
- Link to English documentation for detailed specifications

**Example Structure:**

```markdown
# モジュール名

## 📦 これは何?

[モジュールの目的と機能の簡単な説明]

## 📥 インストールと使い方

[インポート方法]

## 🚀 簡単な使い方 / クイックスタート

[簡単なコード例]

## 📚 詳しく知りたい方へ

- [使い方ガイド (USAGE.md)](./docs/USAGE.md): 詳しい使い方
- [設計ドキュメント (DESIGN.md)](./docs/DESIGN.md): 技術的な詳細

## 💡 主な機能

[主要な機能の説明とコード例]
```

### 2. `lib/xxx/docs/DESIGN.md` - Design Specifications

**Language:** English

**Target Audience:** Intermediate to advanced users and maintainers

**Purpose:**

- Document architectural decisions and rationale
- Explain design patterns and trade-offs
- Describe internal implementation details
- Provide context for future maintainers

**Guidelines:**

- Focus on WHY (design rationale and decisions), not just WHAT
- **Include internal implementation examples and code snippets** that demonstrate design patterns
- Document design decisions and alternatives considered
- Explain trade-offs and constraints
- Include performance characteristics where relevant
- Reference relevant research or standards
- **Distinguish from USAGE.md**: DESIGN.md shows HOW it's implemented internally (architecture, algorithms, type definitions), not HOW users should use it
- Link to USAGE.md for end-user practical examples
- Use clear headings for easy navigation

**Example Structure:**

```markdown
# Module Design

## Overview

[Brief summary of the design]

## Architecture

[High-level architecture description]

## Design Decisions

### Decision 1: [Title]

**Context:** [Background and problem]
**Decision:** [What was decided]
**Rationale:** [Why this approach was chosen]
**Alternatives:** [Other options considered]
**Consequences:** [Impact and trade-offs]

## Implementation Details

[Technical details for maintainers]

## Performance Characteristics

[Performance considerations and measurements]

## References

[Links to relevant resources]
```

### 3. `lib/xxx/docs/USAGE.md` - Usage Guide

**Language:** English

**Target Audience:** Intermediate to advanced users

**Purpose:**

- Provide practical usage examples
- Document public API with signatures and descriptions
- Show common patterns and best practices
- Explain error handling and edge cases

**Guidelines:**

- Focus on HOW to use the module (end-user perspective)
- **Include practical usage examples only** (not internal implementation details)
- Include runnable code examples for common use cases
- Document error handling patterns
- Show integration patterns and best practices
- **IMPORTANT:** Do NOT duplicate content from DESIGN.md
- When referring to design decisions or internal implementation, link to DESIGN.md instead of repeating the explanation
- Keep examples practical and concise

**Example Structure:**

```markdown
# Module Usage

## Overview

[Brief introduction to usage]

## Public API Summary

[List of main APIs with brief descriptions]

### API 1

[Detailed API documentation with examples]

### API 2

[Detailed API documentation with examples]

## Common Patterns

### Pattern 1: [Title]

[Code example and explanation]

### Pattern 2: [Title]

[Code example and explanation]

## Error Handling

[How to handle errors with examples]
[Link to DESIGN.md for error design rationale]

## Notes

[Important notes and gotchas]
```

## Documentation Maintenance

### When to Update Documentation

Update documentation when:

- Adding new features or APIs
- Changing existing behavior
- Making breaking changes
- Fixing bugs that affect documented behavior
- Improving performance characteristics
- Adding new patterns or best practices

### Cross-References

Use cross-references effectively:

**From README.md:**

```markdown
詳細な設計仕様については [DESIGN.md](docs/DESIGN.md) を参照してください。
```

**From USAGE.md to DESIGN.md:**

```markdown
For design rationale, see [DESIGN.md](DESIGN.md#error-handling-design).
```

**From DESIGN.md to USAGE.md:**

```markdown
For practical examples, see [USAGE.md](USAGE.md#common-patterns).
```

### Avoiding Duplication

**Problem:** Content duplicated between USAGE.md and DESIGN.md makes maintenance harder and can lead to inconsistencies.

**Solution:**

- **DESIGN.md**: Focus on WHY (design rationale) and HOW it's implemented internally (architecture, algorithms, internal patterns)
- **USAGE.md**: Focus on HOW to use it (end-user perspective, practical examples)
- Use links instead of repeating explanations

**Key Distinction:**

| Aspect            | DESIGN.md                                                      | USAGE.md                               |
| ----------------- | -------------------------------------------------------------- | -------------------------------------- |
| **Purpose**       | Design decisions & internal implementation                     | Practical usage for end-users          |
| **Code Examples** | Internal implementation patterns, type definitions, algorithms | Public API usage, integration patterns |
| **Audience**      | Maintainers, contributors                                      | Library users, developers              |

**Example 1 - Design Rationale (BAD - duplicated):**

_DESIGN.md:_

```markdown
## Error Handling

We throw exceptions instead of returning null because...
[detailed explanation]
```

_USAGE.md:_

```markdown
## Error Handling

This module throws exceptions instead of returning null because...
[same explanation repeated]

try {
// example code
}
```

**Example 1 - Design Rationale (GOOD - linked):**

_DESIGN.md:_

```markdown
## Error Handling Design

**Decision**: Throw exceptions instead of returning null

**Rationale**: ...
[detailed explanation]
```

_USAGE.md:_

```markdown
## Error Handling

For error handling design rationale, see [DESIGN.md](DESIGN.md#error-handling-design).

try {
// practical usage example only
const result = api.fetch();
} catch (error) {
// handle error
}
```

**Example 2 - Implementation Code (GOOD - properly separated):**

_DESIGN.md:_

````markdown
## Result Type Pattern

**Internal Type Definition**:

```typescript
// Internal discriminated union type
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
```
````

**Rationale**: Type-safe error handling without exceptions...

_USAGE.md:_

````markdown
## Error Handling with Result Type

For Result type design rationale, see [DESIGN.md](DESIGN.md#result-type-pattern).

```typescript
// Practical usage example
const result = await repository.setupSnapshot();

if (result.ok) {
    console.log('Success:', result.value);
} else {
    console.error('Error:', result.error);
}
```
````

## Documentation Review Process

### When to Review

Documentation should be reviewed during:

- **Pull Request Review**: All documentation changes must be reviewed before merge
- **Feature Development**: Documentation created/updated alongside code changes
- **Breaking Changes**: Ensure DESIGN.md explains rationale and USAGE.md shows migration path
- **Release Preparation**: Verify all new features are documented
- **Quarterly Audit**: Periodic review for outdated or missing documentation

### Review Criteria

When reviewing documentation changes, verify:

**1. Correct Document Placement**:

- Design rationale and architectural decisions → DESIGN.md
- Internal implementation examples (types, algorithms, patterns) → DESIGN.md
- End-user practical examples → USAGE.md
- Beginner-friendly overview → README.md

**2. No Content Duplication**:

- Check for repeated explanations between DESIGN.md and USAGE.md
- Ensure proper cross-references instead of duplication
- Verify implementation examples are in DESIGN.md, not USAGE.md
- Verify usage examples are in USAGE.md, not duplicated in DESIGN.md

**3. Clear WHY vs HOW Separation**:

- DESIGN.md: WHY (rationale) + HOW it's implemented (internal architecture)
- USAGE.md: HOW to use it (end-user perspective)
- No design rationale explanations in USAGE.md (link to DESIGN.md instead)

**4. Language Consistency**:

- README.md in Japanese (beginner-friendly)
- DESIGN.md in English (technical specifications)
- USAGE.md in English (practical examples)

**5. Code Example Quality**:

- DESIGN.md: Internal implementation patterns, type definitions, algorithms
- USAGE.md: Runnable, practical examples for end-users
- Both: Include error handling where appropriate

### Review Process

1. **Self-Review**: Author reviews their own changes using the checklist
2. **Peer Review**: At least one reviewer checks documentation in PR
3. **Integration Check**: Verify cross-references work correctly
4. **Build Verification**: Ensure documentation builds without errors

## Tools and Validation

### Documentation Review Checklist

Use this checklist when reviewing or creating module documentation:

**README.md:**

- [ ] Written in Japanese
- [ ] Beginner-friendly language
- [ ] Clear overview and purpose
- [ ] Simple usage example
- [ ] Links to DESIGN.md and USAGE.md

**DESIGN.md:**

- [ ] Written in English
- [ ] Documents WHY (rationale and decisions)
- [ ] Includes internal implementation examples (types, algorithms, patterns)
- [ ] Explains architecture and design patterns
- [ ] Describes trade-offs and alternatives considered
- [ ] Links to USAGE.md for end-user examples (does NOT duplicate them)
- [ ] References relevant resources

**USAGE.md:**

- [ ] Written in English
- [ ] Documents HOW to use (end-user perspective)
- [ ] Includes runnable, practical examples only
- [ ] Covers common usage patterns and integration examples
- [ ] Does NOT include internal implementation details
- [ ] Links to DESIGN.md for design rationale (does NOT duplicate content)
- [ ] Documents error handling with practical examples

## Examples

See existing modules for reference:

- [Store Module Documentation](lib/store/)
    - [README.md](lib/store/README.md) - Japanese overview
    - [DESIGN.md](lib/store/docs/DESIGN.md) - Design specifications
    - [USAGE.md](lib/store/docs/USAGE.md) - Usage examples

- [Repository Module Documentation](lib/repository/)
- [Logger Module Documentation](lib/logger/)
- [Fetcher Module Documentation](lib/fetcher/)
- [Utils Module Documentation](lib/utils/)

## Related Documentation

- [DEVELOPMENT.md](DEVELOPMENT.md) - Development environment and workflow
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines
- [README.md](README.md) - Project overview
