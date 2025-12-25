---
lang: en
title: Development Guide
title-en: Development Guide
title-ja: 開発ガイド
related:
    - ./README.md "Project Overview"
    - ./CONTRIBUTING.md "Contributing Guide"
    - ./DOCUMENTATION.md "Documentation Standards"
instructions-for-ais:
    - This document should be written in English for AI readability.
    - Content within code fences may be written in languages other than English.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document.
---

# Development Guide

This document provides information for developers working on this project.

## Project Structure

Understanding the project layout helps you navigate the codebase and locate relevant files quickly.

```text
lib/                      # Source code
  ├── types/             # Shared type definitions and prototypes
  ├── utils/             # Utility functions (converters, time, deep-merge)
  ├── logger/            # Logger interface and console implementation
  ├── fetcher/           # API client and data fetching logic
  ├── store/             # In-memory data store
  ├── repository/        # Repository pattern implementation
  ├── builder.ts         # Builder pattern API for constructing stores
  └── factory.ts         # Factory functions for common use cases
docs/                     # VitePress documentation site
  ├── index.md           # Documentation home
  ├── features/          # Feature documentation
  └── use-case/          # Usage examples by scenario
scripts/                  # Utility scripts
  ├── generate-version.mjs  # Version generation for builds
  └── try-*.ts           # Demo/trial scripts
__tests__/               # Integration and cross-module tests
.github/workflows/       # CI/CD GitHub Actions workflows
```

### Key Directories

- **`lib/*/README.md`** - Japanese module overview (beginner-friendly introduction)
- **`lib/*/docs/DESIGN.md`** - English design specifications (architecture and decisions)
- **`lib/*/docs/USAGE.md`** - English usage examples (code samples and patterns)
- **`lib/*/__tests__/`** - Module-specific unit and integration tests
- **`coverage/`** - Test coverage reports (generated, git-ignored)

### Module Dependencies

Modules are designed to be standalone and independently usable:

- **Low-level**: `types`, `utils`, `logger` (no internal dependencies)
- **Mid-level**: `fetcher` (depends on logger), `store` (standalone)
- **High-level**: `repository` (depends on store, fetcher, logger)
- **APIs**: `factory`, `builder` (convenience wrappers around other modules)

### Subpath Exports

Each module is importable via subpath exports:

```typescript
import { createStore } from '@f88/promidas/store';
import { createProtopediaFetcher } from '@f88/promidas/fetcher';
import { createProtopediaRepository } from '@f88/promidas/repository';
```

See `package.json` exports field and `__tests__/subpath-exports.test.ts` for the complete API contract.

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

## Documentation Standards

This project follows strict documentation standards to ensure consistency and clarity across all modules. Each module should have three documentation files: README.md (Japanese, beginner-friendly), DESIGN.md (English, design specifications), and USAGE.md (English, usage examples).

For detailed documentation standards and guidelines, see [DOCUMENTATION.md](DOCUMENTATION.md).

## First Steps

After cloning and installing dependencies, verify your setup is working correctly.

### 1. Verify Installation

Run the test suite to ensure everything is configured properly:

```bash
npm test
```

All tests should pass without requiring an API token (API calls are mocked in tests).

### 2. Try the Demo

Experiment with the repository API using the demo script:

```bash
npx tsx scripts/try-protopedia-repository.ts
```

### 3. Explore Modules

Read the module documentation to understand the architecture:

- Start with [lib/types/README.md](lib/types/README.md) for core type definitions
- Review [lib/store/README.md](lib/store/README.md) for the data store
- Check [lib/repository/README.md](lib/repository/README.md) for the repository pattern

### 4. Run in Watch Mode

For active development, use watch mode to automatically re-run tests:

```bash
npm run test:watch
```

### Common Development Tasks

- **Add a new feature**: Update the relevant module in `lib/`
- **Add tests**: Create or update `.test.ts` files in the module's `__tests__/` directory
- **Update documentation**: Follow [DOCUMENTATION.md](DOCUMENTATION.md) standards
- **Check API exports**: Run `npm run test:exports` after modifying `lib/*/index.ts`
- **Profile performance**: Run `npm run test:perf` to check for regressions

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

### Continuous Integration

This project uses GitHub Actions for Continuous Integration. The following checks run automatically on every Pull Request and push to the `main` branch:

1. **Formatting:** Ensures code formatting consistency (`npm run format:check`).
2. **Linting:** Enforces code quality rules (`npm run lint`).
3. **Type Checking:** Verifies TypeScript types (`npm run typecheck`).
4. **Exports Validation:** Verifies public API contracts (`npm run test:exports`).
5. **Performance Tests:** Checks for performance regressions (`npm run test:perf`).
6. **Unit Tests:** Runs all tests and uploads coverage reports to Codecov.

Ensure all these checks pass locally before submitting a Pull Request.

**Note:** The CI pipeline runs successfully even without Codecov configuration. However, if the `CODECOV_TOKEN` secret is set in the repository, code coverage reports will be automatically uploaded and analyzed by Codecov.

All checks must pass for a PR to be merged.

For more details on the CI configuration, refer to the [workflow file](.github/workflows/ci.yml).

## Debugging

### VSCode Debugging Configuration

Create `.vscode/launch.json` to debug tests in VSCode:

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "type": "node",
            "request": "launch",
            "name": "Debug Current Test File",
            "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/vitest",
            "args": ["run", "${file}"],
            "console": "integratedTerminal",
            "internalConsoleOptions": "neverOpen"
        },
        {
            "type": "node",
            "request": "launch",
            "name": "Debug All Tests",
            "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/vitest",
            "args": ["run"],
            "console": "integratedTerminal",
            "internalConsoleOptions": "neverOpen"
        }
    ]
}
```

Set breakpoints in your test files or source code, then use "Run and Debug" panel in VSCode.

### Console Debugging

Use the built-in logger for debugging during development:

```typescript
import { createConsoleLogger } from '@f88/promidas/logger';

const logger = createConsoleLogger('debug'); // 'debug' level for verbose output

// In your code
logger.debug('Variable value:', { someData });
logger.info('Checkpoint reached');
```

### Debugging Specific Tests

Run individual test files for faster feedback:

```bash
# Run specific test file
npm test -- lib/store/__tests__/store.test.ts

# Run tests matching a pattern
npm test -- --grep="should handle"

# Run in UI mode for interactive debugging
npm run test:ui
```

### Debugging Test Failures

1. **Read the error message carefully** - Vitest provides detailed stack traces
1. **Check test isolation** - Ensure tests don't depend on execution order
1. **Verify mocks** - Check that mocks are properly set up and reset between tests
1. **Use `test.only`** - Isolate failing tests temporarily:

```typescript
test.only('should handle this specific case', () => {
  // This test runs alone
});
```

1. **Check for async issues** - Ensure async operations complete before assertions

### Debugging Build Errors

If `npm run build` fails:

```bash
# Run type checking to see detailed errors
npm run typecheck

# Check for linting issues
npm run lint
```

## Troubleshooting

### Common Development Errors

#### TypeScript Error: "Cannot find module '@f88/promidas/..."

**Cause:** Import path doesn't match subpath exports defined in `package.json`.

**Solution:** Use the correct subpath export:

```typescript
// ❌ Incorrect
import { createStore } from '@f88/promidas/lib/store';

// ✅ Correct
import { createStore } from '@f88/promidas/store';
```

#### ESLint Error: "Import order violation"

**Cause:** Imports are not sorted alphabetically or grouped correctly.

**Solution:** Run the auto-fix command:

```bash
npm run lint:fix
```

#### Test Error: "PROTOPEDIA_API_V2_TOKEN not found"

**Cause:** Missing `.env.test` file or environment variable.

**Solution:** Tests don't require an actual API token (mocks are used). Create `.env.test`:

```bash
cp .env.example .env.test
# No need to set PROTOPEDIA_API_V2_TOKEN for tests
```

#### Build Error: "tsc: Command failed with exit code 2"

**Cause:** TypeScript compilation errors in the codebase.

**Solution:** Run type checking to see detailed errors:

```bash
npm run typecheck
```

Fix the reported type errors before running `npm run build` again.

#### Node Version Mismatch

**Cause:** Using Node.js version < 20.

**Solution:** Upgrade to Node.js 20 or later:

```bash
# Check current version
node --version

# Using nvm (Node Version Manager)
nvm install 20
nvm use 20
```

#### Performance Test Failures

**Cause:** Performance has degraded below acceptable thresholds.

**Solution:** Review the implementation and check for:

- Unnecessary loops or iterations
- Missing caching or memoization
- Inefficient data structures (e.g., array instead of Set/Map)
- Blocking operations that could be async
- Large object copies that could use references

Run performance tests locally to benchmark:

```bash
npm run test:perf
```

#### Prettier and ESLint Conflicts

**Cause:** Prettier formatting conflicts with ESLint rules.

**Solution:** This project is configured to avoid conflicts. Run both:

```bash
npm run format
npm run lint:fix
```

If conflicts persist, check `prettier.config.mjs` and `eslint.config.mjs` for misalignments.

#### Vitest: "Cannot find module" in Tests

**Cause:** Import paths in tests don't match the source structure.

**Solution:** Ensure test imports use the same paths as production code:

```typescript
// In tests, use subpath exports
import { createStore } from '@f88/promidas/store';

// Or use relative paths for internal testing
import { createStore } from '../store';
```

#### Mock Server Not Working

**Cause:** MSW (Mock Service Worker) setup issues in tests.

**Solution:** Check that mocks are properly initialized in test setup files. See existing test files for patterns:

```typescript
// Example from lib/fetcher/__tests__/
import { server } from './mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Exports Test Failing

Check `__tests__/subpath-exports.test.ts`.

This test must be synchronized with exports in `lib/*/index.ts`:

1. Review the test output
2. Check the list of expected exports
3. Compare with actual exports in `lib/*/index.ts`
4. Update the test to match the current API contract

**Important:** This test serves as the public API specification. Changes here indicate API changes that should be documented in CHANGELOG.md.

### Performance Tests Failing

If performance has degraded, review the implementation and check for:

- Unnecessary loops or iterations
- Missing caching or memoization
- Inefficient data structures
- Blocking operations

### Git Issues

#### Merge Conflicts

**Solution:** Resolve conflicts manually, then:

```bash
git add .
git rebase --continue
```

#### Accidentally Committed to Main

**Solution:** Move changes to a new branch:

```bash
git branch feature/my-feature
git reset --hard origin/main
git checkout feature/my-feature
```

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
