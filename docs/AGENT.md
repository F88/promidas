---
title: Agent Instructions
instructions-for-ais:
    - This document should be written in English for AI readability.
    - Content within code fences may be written in languages other than English.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document.
---

# Agent Instructions for `/docs`

This directory serves as the documentation site for the PROMIDAS library.
It is built using VitePress. When editing, AI agents must adhere to the following guidelines.

## Editing and Writing Rules

- **Language**: Write in **Japanese**.
- **Style**: Use a user-friendly polite tone ("Desu/Masu" style).
- **Characters**: Use half-width characters for numbers, alphanumerics, and symbols.
- **Links**: Always use **relative paths** for inter-file links (e.g., `../concepts/data-model.md`).

## Frontmatter

All Markdown files (`.md`) must start with the following frontmatter.
Update the `title` to match the page content.

Reference: [Frontmatter | VitePress](https://vitepress.dev/guide/frontmatter)

```yaml
---
title: [Page Title]
instructions-for-ais:
    - This document should be written in Japanese.
    - Use half-width characters for numbers, letters, and symbols.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document.
---
```

## Special Files

### `/docs/index.md`

This file is the landing page of the site. Since it uses the VitePress Home layout, the following special rule applies:

- **`title`**: Must be set to an **empty string** (`title:`). Setting a title usually causes duplicate title display in the layout.

**Frontmatter Example for `index.md`**:

```yaml
---
title:
instructions-for-ais:
    - This document should be written in Japanese.
    - Use half-width characters for numbers, letters, and symbols.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document.
---
```

## Maintenance

- **Link Verification**: When moving or deleting content, always verify link integrity (`npm run docs:verify`).
- **Configuration**: When adding, deleting, or moving pages, update the sidebar configuration in `docs/.vitepress/config.ts` accordingly.
