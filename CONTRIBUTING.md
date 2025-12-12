---
lang: en
title: Contributing Guide
title-en: Contributing Guide
title-ja: コントリビューティングガイド
related:
    - ./README.md "Project Overview"
    - ./DEVELOPMENT.md "Development Guide"
    - ./RELEASE.md "Release Guide"
instructions-for-ais:
    - This document should be written in English for AI readability.
    - Content within code fences may be written in languages other than English.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document.
---

# Contributing Guide

This document provides contribution guidelines for this project.

**Package Distribution:** This package is published to [GitHub Packages](https://github.com/F88/promidas/packages) (`@f88/promidas`).

For development environment setup and daily development workflow, see [DEVELOPMENT.md](./DEVELOPMENT.md).

For release procedures (maintainers only), see [RELEASE.md](./RELEASE.md).

## Pull Request Guidelines

### Commit Messages

Follow the Conventional Commits format:

```text
<type>(<scope>): <subject>

<body>

<footer>
```

**Type:**

- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (formatting, etc.)
- `refactor`: Code changes that neither fix a bug nor add a feature
- `perf`: Performance improvements
- `test`: Adding or correcting tests
- `build`: Changes to the build system or external dependencies
- `ci`: Changes to CI configuration files and scripts
- `chore`: Other changes (releases, etc.)

**Breaking Change:**

For breaking changes, add `!` after the type or include `BREAKING CHANGE:` in the footer:

```text
feat(api)!: remove deprecated endpoints

BREAKING CHANGE: All v1 API endpoints have been removed.
```

### Pre-PR Checklist

```text
- [ ] All tests pass (`npm test`)
- [ ] Exports tests pass (`npm run test:exports`)
- [ ] Performance tests pass (`npm run test:perf`)
- [ ] Linter passes (`npm run lint`)
- [ ] Formatting passes (`npm run format:check`)
- [ ] Type checking passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Commit messages follow Conventional Commits format
```

## References

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
