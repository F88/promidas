# ProtopediaInMemoryRepositoryImpl Test Suite

This directory contains comprehensive tests for the `ProtopediaInMemoryRepositoryImpl` class.

## Test Files Overview

### Unit Tests (Public API)

| File                                         | Purpose                                              | Mock Strategy | Lines |
| -------------------------------------------- | ---------------------------------------------------- | ------------- | ----- |
| **unit/public/constructor.test.ts**          | Constructor initialization and configuration         | Manual mocks  | 122   |
| **unit/public/config-and-stats.test.ts**     | Configuration & statistics (`getConfig`, `getStats`) | Manual mocks  | 451   |
| **unit/public/snapshot-data-access.test.ts** | Snapshot data access methods (random/sample/lookup)  | Manual mocks  | 999   |
| **unit/public/analyze.test.ts**              | Analysis methods (`analyzePrototypes`)               | Manual mocks  | 206   |
| **unit/public/repository-events.test.ts**    | Event system (opt-in, emission, dispose)             | Manual mocks  | 586   |

### Unit Tests (Internal Logic)

| File                                          | Purpose                                                 | Mock Strategy | Lines |
| --------------------------------------------- | ------------------------------------------------------- | ------------- | ----- |
| **unit/internal/snapshot-update.test.ts**     | setupSnapshot/refreshSnapshot delegation (internal spy) | Manual mocks  | 161   |
| **unit/internal/fetch-and-store.test.ts**     | Direct tests of internal `fetchAndStore` logic          | Manual mocks  | 468   |
| **unit/internal/fetch-and-normalize.test.ts** | Direct tests of internal `fetchAndNormalize` logic      | Manual mocks  | 323   |
| **unit/internal/store-snapshot.test.ts**      | Direct tests of internal `storeSnapshot` logic          | Manual mocks  | 315   |

### Integration & Special Tests

| File                                         | Purpose                               | Mock Strategy   | Lines |
| -------------------------------------------- | ------------------------------------- | --------------- | ----- |
| **integration/scenarios.test.ts**            | End-to-end scenarios, API integration | createMockStore | 338   |
| **integration/fetch-error-handling.test.ts** | Error handling & recovery             | createMockStore | 243   |
| **integration/concurrency.test.ts**          | Concurrent operations coalescing      | createMockStore | 802   |
| **perf/data-access.perf.test.ts**            | Performance with large datasets       | createMockStore | 221   |

### Shared Utilities

| File                | Purpose                                 | Exports                                                                                       |
| ------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------- |
| **test-helpers.ts** | Shared test utilities and documentation | `makePrototype`, `setupMocks`, `createMockStore`, `createBasicMockStore`, `createTestContext` |

## Mock Strategy Guidelines

This test suite uses **two different mocking approaches** depending on the test type:

### 1. Manual Mocks (Unit Tests)

**Files:** unit/public/constructor.test.ts, unit/public/config-and-stats.test.ts, unit/public/snapshot-data-access.test.ts, unit/public/analyze.test.ts, unit/public/repository-events.test.ts, unit/internal/snapshot-update.test.ts, unit/internal/fetch-and-store.test.ts, unit/internal/fetch-and-normalize.test.ts, unit/internal/store-snapshot.test.ts

**Use when:**

- Testing specific behaviors with fine-grained control
- Need different return values for sequential calls (`mockReturnValueOnce`)
- Testing edge cases and error conditions
- Validating specific method call sequences

**Pattern:**

```typescript
const mockStoreInstance = {
  getConfig: vi.fn().mockReturnValue({...}),
  getStats: vi.fn()
    .mockReturnValueOnce({ size: 0, ... })  // First call
    .mockReturnValueOnce({ size: 5, ... }), // Second call
  // ... other methods
};
```

**Benefits:**

- Complete control over each method call's return value
- Explicit about what's being tested
- Suitable for testing edge cases

### 2. Functional Mock Store (Integration/Performance Tests)

**Files:** integration/scenarios.test.ts, integration/fetch-error-handling.test.ts, integration/concurrency.test.ts, perf/data-access.perf.test.ts

**Use when:**

- Testing end-to-end flows
- Performance testing with large datasets
- Need real store behavior (data storage, TTL, expiration)
- Testing multiple operations on the same state

**Pattern:**

```typescript
const store = createMockStore({ ttlMs: 30_000 });
```

**Benefits:**

- Simulates actual store behavior
- Less boilerplate for integration tests
- Consistent state across multiple operations
- Better for testing data flow

**Limitations:**

- Fixed `dataSizeBytes` return value (1000)
- Cannot easily test specific error conditions

## Test Helper Usage

### For Unit Tests (Reducing Boilerplate)

Use `createBasicMockStore` or `createTestContext` to reduce repetitive beforeEach setup:

```typescript
import { createTestContext, setupMocks } from './test-helpers.js';

describe('My unit tests', () => {
    const { fetchPrototypesMock, resetMocks } = setupMocks();
    let testContext;

    beforeEach(() => {
        resetMocks();
        testContext = createTestContext();
    });

    it('should work', async () => {
        const { mockStoreInstance, mockApiClientInstance } = testContext;

        // Override specific behavior for this test
        vi.mocked(mockStoreInstance.getStats).mockReturnValueOnce({
            size: 10,
            cachedAt: new Date(),
            isExpired: false,
            // ...
        });

        const repo = new ProtopediaInMemoryRepositoryImpl({
            store: mockStoreInstance,
            apiClient: mockApiClientInstance,
        });

        // ... test assertions
    });
});
```

### For Integration Tests

Use `createMockStore` for functional behavior:

```typescript
import { createMockStore, setupMocks } from './test-helpers.js';

describe('Integration tests', () => {
    const { fetchPrototypesMock, resetMocks } = setupMocks();

    beforeEach(() => {
        resetMocks();
    });

    it('should handle full flow', async () => {
        const store = createMockStore({ ttlMs: 30_000 });
        const apiClient = { fetchPrototypes: fetchPrototypesMock };

        const repo = new ProtopediaInMemoryRepositoryImpl({
            store,
            apiClient,
        });

        fetchPrototypesMock.mockResolvedValueOnce({
            ok: true,
            data: [makePrototype({ id: 1 })],
        });

        await repo.setupSnapshot({});
        const result = repo.getById(1);
        expect(result).toBeDefined();
    });
});
```

## Test Statistics

- **Total Test Files:** 13
- **Unit Test Files:** 9 (using manual mocks)
- **Integration/Perf Test Files:** 4 (using createMockStore)
- **Approximate Total Tests:** 155+ (120+ active + 34 skipped)
- **Test Execution Time:** ~250ms
- **Code Coverage:** High (repository logic fully covered)

## Running Tests

```bash
# Run all repository tests
npm test -- lib/repository/__tests__/protopedia-in-memory-repository

# Run specific test file
npm test -- lib/repository/__tests__/protopedia-in-memory-repository/unit/public/constructor.test.ts
npm test -- lib/repository/__tests__/protopedia-in-memory-repository/unit/internal/snapshot-update.test.ts
npm test -- lib/repository/__tests__/protopedia-in-memory-repository/unit/internal/fetch-and-normalize.test.ts
npm test -- lib/repository/__tests__/protopedia-in-memory-repository/unit/internal/store-snapshot.test.ts
npm test -- lib/repository/__tests__/protopedia-in-memory-repository/integration/scenarios.test.ts

# Run with coverage
npm test -- --coverage lib/repository/__tests__/protopedia-in-memory-repository
```

## Key Testing Principles

1. **Dependency Injection:** All tests construct `ProtopediaInMemoryRepositoryImpl` directly with injected dependencies (never use factory functions in these tests)

2. **Test Isolation:** Each test has clean mocks via `beforeEach` and `resetMocks()`

3. **Clarity over DRY:** Some repetition is acceptable for test clarity

4. **Appropriate Mocking:** Choose mock strategy based on test type (unit vs integration)

5. **Documentation:** Each test file has comprehensive JSDoc explaining its purpose and coverage

## Common Patterns

### Testing Error Conditions

```typescript
fetchPrototypesMock.mockResolvedValueOnce({
    ok: false,
    error: 'Network error',
    status: 500,
});

const result = await repo.setupSnapshot({});
expect(result.ok).toBe(false);
```

### Testing Sequential Operations

```typescript
vi.mocked(mockStoreInstance.getStats)
  .mockReturnValueOnce({ size: 0, ... })  // Before setup
  .mockReturnValueOnce({ size: 5, ... }); // After setup

await repo.setupSnapshot({});
const stats = repo.getStats();
expect(stats.size).toBe(5);
```

### Testing TTL and Expiration

```typescript
const store = createMockStore({ ttlMs: 100 });
// ... setup data
await new Promise((resolve) => setTimeout(resolve, 150));
const stats = store.getStats();
expect(stats.isExpired).toBe(true);
```

## Maintenance Notes

- When adding new repository methods, follow the existing mock strategy pattern
- Update test-helpers.ts if new common patterns emerge
- Keep README in sync with actual test structure
- Maintain JSDoc documentation in test files
