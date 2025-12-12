---
lang: en
title: Release Guide
title-en: Release Guide
title-ja: リリースガイド
related:
    - ./README.md "Project Overview"
    - ./CONTRIBUTING.md "Contributing Guide"
    - ./DEVELOPMENT.md "Development Guide"
instructions-for-ais:
    - This document should be written in English for AI readability.
    - Content within code fences may be written in languages other than English.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document.
---

# Release Guide

This document describes the release procedures for package maintainers.

**Package Distribution:** This package is published to [GitHub Packages](https://github.com/F88/promidas/packages) (`@f88/promidas`). Releases are automatically published when a GitHub Release is created.

**Audience:** This document is for package maintainers only. Contributors should refer to [CONTRIBUTING.md](./CONTRIBUTING.md) for PR guidelines.

## Release Procedures

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

Ensure there are no export validation errors. See [DEVELOPMENT.md](./DEVELOPMENT.md#subpath-exports-validation) for details.

#### c. Run Performance Tests

```bash
npm run test:perf
```

Ensure there are no performance regressions. See [DEVELOPMENT.md](./DEVELOPMENT.md#performance-tests) for requirements.

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

Update the version following Semantic Versioning:

- **MAJOR** (x.0.0): Breaking changes
- **MINOR** (0.x.0): New features (backward compatible)
- **PATCH** (0.0.x): Bug fixes

**Choose one of the following methods:**

#### Method A: Using npm version (Recommended)

```bash
# Update version automatically
npm version patch --no-git-tag-version  # or minor, major
# This updates package.json and package-lock.json
```

Proceed to Step 3.

#### Method B: Manual update

Manually edit `package.json`:

```json
{
    "version": "0.6.0" // Example: 0.5.0 → 0.6.0
}
```

Then update `package-lock.json`:

```bash
npm install --package-lock-only
```

Proceed to Step 3.

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
# Commit changes (package.json, package-lock.json, CHANGELOG.md)
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore(release): x.y.z"

# Create tag (signed, using .npmrc configuration)
git tag -a vx.y.z -m "Release vx.y.z"

# Push commits and tags
git push origin main
git push origin vx.y.z
```

### 5. Create GitHub Release

1. Navigate to the GitHub repository page
2. Go to "Releases" → "Draft a new release"
3. Select tag: `vx.y.z`
4. Enter release title: `vx.y.z`
5. Copy the relevant version content from CHANGELOG.md
6. Click "Publish release"

**Automated Publishing:** When the release is published, the [GitHub Actions workflow](.github/workflows/publish-package-to-github-packages.yml) automatically:

1. Builds the package (`npm run build`)
2. Publishes to GitHub Packages (`npm publish`)

No manual `npm publish` is required.

## Troubleshooting

### Release Workflow Failed

If the GitHub Actions workflow fails:

1. Check the workflow run logs in the "Actions" tab
2. Verify `package.json` version matches the release tag
3. Ensure all CI checks passed before creating the release
4. Check GitHub Packages permissions

### Tag Already Exists

If you need to recreate a tag:

```bash
# Delete local tag
git tag -d vx.y.z

# Delete remote tag
git push origin :refs/tags/vx.y.z

# Create new tag
git tag -a vx.y.z -m "Release vx.y.z"
git push origin vx.y.z
```

## References

- [Semantic Versioning](https://semver.org/)
- [GitHub Releases Documentation](https://docs.github.com/en/repositories/releasing-projects-on-github)
- [GitHub Packages Documentation](https://docs.github.com/en/packages)
