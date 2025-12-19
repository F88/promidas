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

## Documentation Structure

Every module under `lib/` should have the following core documentation files:

```
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

- Focus on WHY, not just WHAT
- Document design decisions and alternatives considered
- Include performance characteristics where relevant
- Explain trade-offs and constraints
- Reference relevant research or standards
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

- Focus on HOW to use the module
- Include runnable code examples
- Cover common use cases
- Document error handling patterns
- **IMPORTANT:** Do NOT duplicate content from DESIGN.md
- When referring to design decisions, link to DESIGN.md instead of repeating the explanation
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

- DESIGN.md: Focus on WHY and architectural decisions
- USAGE.md: Focus on HOW and practical examples
- Use links instead of repeating explanations

**Example - BAD (duplicated content):**

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

**Example - GOOD (linked content):**

_DESIGN.md:_

```markdown
## Error Handling Design

We throw exceptions instead of returning null because...
[detailed explanation]
```

_USAGE.md:_

```markdown
## Error Handling

For error handling design rationale, see [DESIGN.md](DESIGN.md#error-handling-design).

try {
// practical example only
}
```

## Front Matter

All markdown files should include front matter for metadata and AI instructions:

```yaml
---
lang: en # or 'ja' for Japanese
title: Document Title
title-en: English Title
title-ja: 日本語タイトル
related:
    - ../../../README.md "Project Overview"
    - DESIGN.md "Design Specifications"
instructions-for-ais:
    - This document should be written in English for AI readability.
    - Content within code fences may be written in languages other than English.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document.
---
```

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
- [ ] Explains architecture and patterns
- [ ] Describes trade-offs
- [ ] References relevant resources

**USAGE.md:**

- [ ] Written in English
- [ ] Documents HOW (practical usage)
- [ ] Includes runnable examples
- [ ] Covers common patterns
- [ ] Links to DESIGN.md (does NOT duplicate content)
- [ ] Documents error handling

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
