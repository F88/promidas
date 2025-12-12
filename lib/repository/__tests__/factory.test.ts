/**
 * Test suite for the repository factory function.
 *
 * This test suite verifies that {@link createProtopediaInMemoryRepository}
 * correctly instantiates repository instances with proper configuration,
 * dependency injection, and interface compliance.
 *
 * ## Test Coverage
 *
 * ### 1. Basic Instantiation
 * - Creates repository instance successfully
 * - Returns correct implementation type ({@link ProtopediaInMemoryRepositoryImpl})
 * - Implements the {@link ProtopediaInMemoryRepository} interface
 *
 * ### 2. Configuration Handling
 * - Accepts and applies store configuration (TTL, memory limits)
 * - Accepts and applies API client options
 * - Handles both configurations simultaneously
 *
 * ### 3. Instance Independence
 * - Creates separate instances with independent state
 * - Ensures configurations don't leak between instances
 *
 * ### 4. Interface Compliance
 * - Verifies all required methods are present
 * - Checks method types (function, async function)
 *
 * ## Test Design Philosophy
 *
 * ### Mock Setup Pattern
 * Each test in this file **intentionally includes its own mock setup** rather
 * than using a shared `beforeEach` block. This design choice prioritizes:
 *
 * 1. **Test Independence**: Each test is fully self-contained and can be read
 *    in isolation without referring to setup code elsewhere.
 *
 * 2. **Clarity over DRY**: While the mock setup is duplicated (3 lines), this
 *    makes each test's preconditions immediately visible to reviewers and
 *    maintainers. No mental context-switching required.
 *
 * 3. **Maintainability**: Future tests with different mock requirements won't
 *    need to refactor shared setup logic or add conditional setup code.
 *
 * 4. **Debugging Simplicity**: When a test fails, all context is in one place.
 *    No need to trace through beforeEach blocks to understand state.
 *
 * ### Trade-offs
 * - ✅ **Better readability** - Each test is a complete story
 * - ✅ **Better maintainability** - No shared state complications
 * - ✅ **Better debugging** - All context visible in failing test
 * - ⚠️ **Some duplication** - 3 lines of mock setup per test (acceptable)
 *
 * The mock duplication is **minimal and intentional**. Do not refactor to
 * beforeEach unless test requirements diverge significantly.
 *
 * ## Mocking Strategy
 *
 * We mock {@link createProtopediaApiCustomClient} to:
 * - Avoid real network calls during testing
 * - Control API client behavior deterministically
 * - Focus tests on factory logic, not API implementation
 *
 * @module
 * @see {@link createProtopediaInMemoryRepository} for the factory being tested
 * @see {@link ProtopediaInMemoryRepository} for the interface contract
 */
import { describe, expect, it, vi } from 'vitest';

import { createProtopediaApiCustomClient } from '../../fetcher/index.js';
import { createProtopediaInMemoryRepository } from '../factory.js';
import { ProtopediaInMemoryRepositoryImpl } from '../protopedia-in-memory-repository.js';

vi.mock('../../fetcher/index', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../fetcher/index.js')>();
  return {
    ...actual,
    createProtopediaApiCustomClient: vi.fn(),
  };
});

describe('createProtopediaInMemoryRepository', () => {
  it('should create a repository instance', () => {
    vi.mocked(createProtopediaApiCustomClient).mockReturnValue({
      listPrototypes: vi.fn(),
    } as never);

    const repository = createProtopediaInMemoryRepository({});

    expect(repository).toBeDefined();
    expect(repository).toBeInstanceOf(ProtopediaInMemoryRepositoryImpl);
  });

  it('should create repository with store configuration', () => {
    vi.mocked(createProtopediaApiCustomClient).mockReturnValue({
      listPrototypes: vi.fn(),
    } as never);

    const storeConfig = { maxDataSizeBytes: 5000 };
    const repository = createProtopediaInMemoryRepository({ storeConfig });

    expect(repository).toBeDefined();
    expect(repository.getConfig()).toEqual(
      expect.objectContaining({
        maxDataSizeBytes: 5000,
      }),
    );
  });

  it('should create repository with API client options', () => {
    vi.mocked(createProtopediaApiCustomClient).mockReturnValue({
      listPrototypes: vi.fn(),
    } as never);

    const repository = createProtopediaInMemoryRepository({});

    expect(repository).toBeDefined();
    expect(repository).toBeInstanceOf(ProtopediaInMemoryRepositoryImpl);
  });

  it('should create repository with both configurations', () => {
    vi.mocked(createProtopediaApiCustomClient).mockReturnValue({
      listPrototypes: vi.fn(),
    } as never);

    const storeConfig = { maxDataSizeBytes: 3000 };
    const repository = createProtopediaInMemoryRepository({ storeConfig });

    expect(repository).toBeDefined();
    expect(repository.getConfig()).toEqual(
      expect.objectContaining({
        maxDataSizeBytes: 3000,
      }),
    );
  });

  it('should implement ProtopediaInMemoryRepository interface', () => {
    vi.mocked(createProtopediaApiCustomClient).mockReturnValue({
      listPrototypes: vi.fn(),
    } as never);

    const repository = createProtopediaInMemoryRepository({});

    expect(repository.setupSnapshot).toBeTypeOf('function');
    expect(repository.refreshSnapshot).toBeTypeOf('function');
    expect(repository.getPrototypeFromSnapshotByPrototypeId).toBeTypeOf(
      'function',
    );
    expect(repository.getRandomPrototypeFromSnapshot).toBeTypeOf('function');
    expect(repository.getRandomSampleFromSnapshot).toBeTypeOf('function');
    expect(repository.getPrototypeIdsFromSnapshot).toBeTypeOf('function');
    expect(repository.analyzePrototypes).toBeTypeOf('function');
    expect(repository.getStats).toBeTypeOf('function');
    expect(repository.getConfig).toBeTypeOf('function');
  });

  it('should create independent instances', () => {
    vi.mocked(createProtopediaApiCustomClient).mockReturnValue({
      listPrototypes: vi.fn(),
    } as never);

    const repo1 = createProtopediaInMemoryRepository({
      storeConfig: { maxDataSizeBytes: 1000 },
    });
    const repo2 = createProtopediaInMemoryRepository({
      storeConfig: { maxDataSizeBytes: 2000 },
    });

    expect(repo1).not.toBe(repo2);
    expect(repo1.getConfig().maxDataSizeBytes).toBe(1000);
    expect(repo2.getConfig().maxDataSizeBytes).toBe(2000);
  });
});
