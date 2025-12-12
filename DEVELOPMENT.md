---
lang: en
title: Development Guide
title-en: Development Guide
title-ja: 開発ガイド
related:
    - ./README.md "Project Overview"
    - ./CONTRIBUTING.md "Contributing Guide"
instructions-for-ais:
    - This document should be written in English for AI readability.
    - Content within code fences may be written in languages other than English.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document.
---

# Development Guide

This document provides information for developers working on this project.

## Development Environment Setup

### Requirements

- Node.js >= 20
- npm

### Installation

```bash
npm ci
```

**Note:** `npm ci` is recommended for clean and consistent installations, especially in CI/CD environments. Use `npm install` for regular dependency updates or when `package-lock.json` needs to be regenerated.

### Environment Variables

Copy `.env.example` to `.env` and set the required environment variables:

```bash
cp .env.example .env
```

See `.env.example` for available environment variables and their descriptions.

#### Test Environment

For test-specific environment variables, create `.env.test`:

```bash
cp .env.example .env.test
```

Vitest automatically loads environment variables in the following order (later files override earlier ones):

1. `.env` - Base environment variables (ignored by git)
2. `.env.local` - Local overrides (ignored by git)
3. `.env.test` - Test environment variables (ignored by git)
4. `.env.test.local` - Local test overrides (ignored by git)

**Note:** In tests, you typically don't need to set `PROTOPEDIA_API_V2_TOKEN` as API calls are mocked. However, if you need to run integration tests against the real API, set it in `.env.test.local`.

## Development Workflow

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run tests in UI mode
npm run test:ui
```

#### Subpath Exports Validation

```bash
npm run test:exports
```

**IMPORTANT:** This test is not just a pass/fail check, but a specification of the public API contract.

- If you modify exports in `lib/*/index.ts`, you MUST update this test accordingly
- Review the test output and ensure it matches the expected exports
- Document any breaking changes in CHANGELOG.md

#### Performance Tests

```bash
npm run test:perf
```

This runs the following performance tests:

- `lib/store/__tests__/store.perf.test.ts` - Store read/write performance
- `lib/repository/__tests__/protopedia-in-memory-repository/data-access.perf.test.ts` - Repository data access performance

Performance requirements:

- Store read operations: < 1ms per 1000 items
- Store write operations: < 10ms per 1000 items
- Repository data access: < 5ms per query

### Code Quality Checks

```bash
# Run linter
npm run lint

# Auto-fix linter issues
npm run lint:fix

# Check formatting
npm run format:check

# Auto-fix formatting
npm run format

# Run type checking
npm run typecheck
```

### Building

```bash
# Build the project
npm run build

# Clean before building
npm run clean
```

## Troubleshooting

### Tests Failing

```bash
# Check if environment variables are set
cat .env

# Reinstall node_modules
rm -rf node_modules package-lock.json
npm install
```

### Exports Test Failing

Check `__tests__/subpath-exports.test.ts`.

This test must be synchronized with exports in `lib/*/index.ts`:

1. Review the test output
2. Check the list of expected exports
3. Compare with actual exports in `lib/*/index.ts`
4. Update the test

### Performance Tests Failing

If performance has degraded, review the implementation and check for:

- Unnecessary loops or iterations
- Missing caching or memoization
- Inefficient data structures
- Blocking operations

## References

### Language & Runtime

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Node.js Documentation](https://nodejs.org/docs/)

### Development Tools

- [Vitest Documentation](https://vitest.dev/) - Testing framework
- [ESLint Documentation](https://eslint.org/docs/) - Linting
- [Prettier Documentation](https://prettier.io/docs/) - Code formatting

### Internal Documentation

- [Types Module](lib/types/README.md)
- [Utils Module](lib/utils/README.md)
- [Logger Module](lib/logger/README.md)
- [Fetcher Module](lib/fetcher/README.md)
- [Store Module](lib/store/README.md)
- [Repository Module](lib/repository/README.md)
