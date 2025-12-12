---
lang: en
title: Contributing Guide
title-en: Contributing Guide
title-ja: コントリビューティングガイド
related:
    - ./README.md "Project Overview"
    - ./DEVELOPMENT.md "Development Guide"
instructions-for-ais:
    - This document should be written in English for AI readability.
    - Content within code fences may be written in languages other than English.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document.
---

# Contributing Guide

This document provides release procedures and contribution guidelines.

For development environment setup and daily development workflow, see [DEVELOPMENT.md](./DEVELOPMENT.md).

## Release Procedures

For daily development workflow, see [DEVELOPMENT.md](./DEVELOPMENT.md).

### 1. Pre-Release Checklist

Execute all of the following checks before releasing:

#### a. Run All Tests

```bash
# Standard tests
npm test

# Tests with coverage
npm run test:coverage
```

Ensure all tests pass.

#### b. Validate Subpath Exports

```bash
npm run test:exports
```

**IMPORTANT:** This test is not just a pass/fail check, but a specification of the public API contract.

- If you modify exports in `lib/*/index.ts`, you MUST update this test accordingly
- Review the test output and ensure it matches the expected exports
- Document any breaking changes in CHANGELOG.md

#### c. Run Performance Tests

```bash
npm run test:perf
```

This runs the following performance tests:

- `lib/store/__tests__/store.perf.test.ts` - Store read/write performance
- `lib/repository/__tests__/protopedia-in-memory-repository/data-access.perf.test.ts` - Repository data access performance

Ensure there are no performance regressions.

#### d. Code Quality Checks

```bash
# Linter
npm run lint

# Formatting
npm run format:check

# Type checking
npm run typecheck
```

Ensure all checks pass.

#### e. Verify Build

```bash
npm run build
```

Ensure there are no build errors.

### 2. Version Update

#### Update package.json Version

Update the version following Semantic Versioning:

- **MAJOR** (x.0.0): Breaking changes
- **MINOR** (0.x.0): New features (backward compatible)
- **PATCH** (0.0.x): Bug fixes

```json
{
    "version": "0.5.0" // Example: 0.5.0 → 0.6.0
}
```

### 3. Update CHANGELOG.md

Document the changes in `CHANGELOG.md`:

```markdown
## [0.6.0] - 2025-12-12

### Added

- Description of new features

### Changed

- Description of changes

### Fixed

- Description of bug fixes

### Breaking Changes

- Description of breaking changes (if any)
```

### 4. Commit and Create Tag

```bash
# Commit changes
git add package.json CHANGELOG.md
git commit -m "chore(release): x.y.z"

# Create tag
git tag -a vx.y.z -m "Release vx.y.z"

# Push commits and tags
git push origin main
git push origin vx.y.z
```

### 5. npm publish

```bash
# Verify package (optional)
npm pack

# Publish
npm publish
```

**Note:** Before `npm publish` runs, the following scripts are automatically executed:

- `prepublishOnly`: `npm run build`

### 6. Create GitHub Release

1. Navigate to the GitHub repository page
2. Go to "Releases" → "Draft a new release"
3. Select tag: `vx.y.z`
4. Enter release title: `vx.y.z`
5. Copy the relevant version content from CHANGELOG.md
6. Click "Publish release"

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
