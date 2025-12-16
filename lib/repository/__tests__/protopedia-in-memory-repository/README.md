# ProtopediaInMemoryRepositoryImpl Test Suite

This directory contains comprehensive tests for the `ProtopediaInMemoryRepositoryImpl` class.

## Test Files Overview

### Core Functionality Tests

| File                         | Purpose                                              | Mock Strategy | Lines |
| ---------------------------- | ---------------------------------------------------- | ------------- | ----- |
| **setup.test.ts**            | Constructor, setupSnapshot, refreshSnapshot          | Manual mocks  | ~500  |
| **config-and-stats.test.ts** | Configuration & statistics (`getConfig`, `getStats`) | Manual mocks  | ~450  |
| **data-retrieval.test.ts**   | Data access methods (getById, getAll, etc.)          | Manual mocks  | ~990  |
| **analyze.test.ts**          | Analysis methods (`analyzePrototypes`)               | Manual mocks  | ~220  |

### Integration & Special Tests

| File                             | Purpose                           | Mock Strategy   | Lines |
| -------------------------------- | --------------------------------- | --------------- | ----- |
| **integration.test.ts**          | End-to-end flows, API integration | createMockStore | ~200  |
| **fetch-error-handling.test.ts** | Error handling & recovery         | createMockStore | ~400  |
| **concurrency.test.ts**          | Concurrent operations coalescing  | createMockStore | ~1500 |
| **data-access.perf.test.ts**     | Performance with large datasets   | createMockStore | ~200  |

### Shared Utilities

| File                | Purpose                                 | Exports                                                                                       |
| ------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------- |
| **test-helpers.ts** | Shared test utilities and documentation | `makePrototype`, `setupMocks`, `createMockStore`, `createBasicMockStore`, `createTestContext` |

## Mock Strategy Guidelines

This test suite uses **two different mocking approaches** depending on the test type:

### 1. Manual Mocks (Unit Tests)

**Files:** setup.test.ts, config-and-stats.test.ts, analyze.test.ts, data-retrieval.test.ts

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

**Files:** integration.test.ts, fetch-error-handling.test.ts, concurrency.test.ts, data-access.perf.test.ts

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

- **Total Test Files:** 8
- **Unit Test Files:** 4 (using manual mocks)
- **Integration Test Files:** 4 (using createMockStore)
- **Approximate Total Tests:** 120+ (85 active + 34 skipped)
- **Test Execution Time:** ~200ms
- **Code Coverage:** High (repository logic fully covered)

## Running Tests

```bash
# Run all repository tests
npm test -- lib/repository/__tests__/protopedia-in-memory-repository

# Run specific test file
npm test -- lib/repository/__tests__/protopedia-in-memory-repository/setup.test.ts

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
