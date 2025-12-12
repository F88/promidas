/**
 * In-memory repository implementation for ProtoPedia prototypes.
 *
 * This module contains the concrete implementation of the repository pattern
 * for managing ProtoPedia prototype data in memory with snapshot-based access.
 *
 * ## Architecture
 *
 * The {@link ProtopediaInMemoryRepositoryImpl} class orchestrates:
 *
 * - **API Client**: ProtoPedia API v2 client for fetching prototype data
 * - **Memory Store**: {@link PrototypeInMemoryStore} for snapshot management
 * - **Repository Interface**: {@link ProtopediaInMemoryRepository} for high-level operations
 *
 * ## Design Patterns
 *
 * ### Repository Pattern
 * Abstracts data access behind a clean interface, isolating business logic
 * from data fetching and storage mechanisms.
 *
 * ### Snapshot Isolation
 * All read operations work against an immutable in-memory snapshot.
 * Network I/O only occurs during explicit setup/refresh operations.
 *
 * ### Private Fields
 * Uses ECMAScript private fields (#) for proper encapsulation:
 * - `#store` - Internal memory store instance
 * - `#apiClient` - HTTP client for ProtoPedia API
 * - `#lastFetchParams` - Cache of last fetch parameters
 *
 * ## Performance Optimizations
 *
 * 1. **O(1) Lookups**: Direct Map access by prototype ID
 * 2. **Hybrid Sampling**: Adaptive algorithm based on sample size ratio
 *    - Small samples (< 50%): Set-based random selection
 *    - Large samples (≥ 50%): Fisher-Yates shuffle
 * 3. **Efficient Checks**: Use `store.size` instead of array operations
 * 4. **Parameter Validation**: Zod schemas for runtime type safety
 *
 * ## Usage Recommendation
 *
 * **Use the factory function** {@link createProtopediaInMemoryRepository}
 * instead of direct instantiation. The factory provides better dependency
 * injection and configuration management.
 *
 * Direct instantiation is only recommended for:
 * - Testing scenarios
 * - Advanced customization needs
 * - Framework integration
 *
 * @module
 * @see {@link createProtopediaInMemoryRepository} for the factory function
 * @see {@link ProtopediaInMemoryRepository} for the public interface
 */
import type {
  ListPrototypesParams,
  ProtoPediaApiClientOptions,
} from 'protopedia-api-v2-client';
import type { DeepReadonly } from 'ts-essentials';

import {
  constructDisplayMessage,
  createProtopediaApiCustomClient,
} from '../fetcher/index.js';
import {
  PrototypeInMemoryStore,
  type PrototypeInMemoryStats,
  type PrototypeInMemoryStoreConfig,
} from '../store/index.js';
import type { NormalizedPrototype } from '../types/index.js';

import { prototypeIdSchema, sampleSizeSchema } from './schemas/validation.js';
import type {
  PrototypeAnalysisResult,
  SnapshotOperationResult,
} from './types/index.js';

import type { ProtopediaInMemoryRepository } from './index.js';

const DEFAULT_FETCH_PARAMS: ListPrototypesParams = {
  offset: 0,
  limit: 10,
};

/**
 * Threshold ratio for choosing sampling strategy in getRandomSampleFromSnapshot.
 *
 * When requested sample size exceeds this ratio of total items,
 * use "Fisher-Yates shuffle" instead of "Set-based random selection" for better performance.
 *
 * @example
 * // With 100 items total:
 * // - size=40 (40%) → Set-based random selection (O(size))
 * // - size=60 (60%) → Fisher-Yates shuffle (O(n))
 */
const SAMPLE_SIZE_THRESHOLD_RATIO = 0.5;

/**
 * Implementation class for the ProtoPedia in-memory repository.
 *
 * This class provides the concrete implementation of {@link ProtopediaInMemoryRepository}
 * with full encapsulation using ECMAScript private fields.
 *
 * ## Responsibilities
 *
 * 1. **Dependency Management**
 *    - Instantiates {@link PrototypeInMemoryStore} with provided config
 *    - Creates ProtoPedia API client via {@link createProtopediaApiCustomClient}
 *    - Maintains internal state for fetch parameters
 *
 * 2. **Snapshot Operations**
 *    - {@link setupSnapshot} - Initial data fetch and population
 *    - {@link refreshSnapshot} - Update snapshot with fresh API data
 *
 * 3. **Data Access**
 *    - {@link getAllFromSnapshot} - Retrieve all prototypes
 *    - {@link getPrototypeFromSnapshotByPrototypeId} - Fast ID lookup
 *    - {@link getRandomPrototypeFromSnapshot} - Single random sample
 *    - {@link getRandomSampleFromSnapshot} - Multiple random samples
 *    - {@link getPrototypeIdsFromSnapshot} - Get all IDs efficiently
 *
 * 4. **Analysis & Metadata**
 *    - {@link analyzePrototypes} - Statistical analysis (min/max)
 *    - {@link getStats} - Snapshot statistics and TTL info
 *    - {@link getConfig} - Store configuration details
 *
 * ## Implementation Details
 *
 * ### Validation
 * All public methods validate their parameters using Zod schemas:
 * - {@link prototypeIdSchema} - Ensures valid prototype IDs
 * - {@link sampleSizeSchema} - Ensures valid sample sizes
 *
 * ### Error Handling
 * Network operations return {@link SnapshotOperationResult}:
 * - `{ ok: true, ... }` - Success with metadata
 * - `{ ok: false, error: string }` - Failure with error message
 *
 * ### Performance
 * - Uses `store.size` for O(1) empty checks
 * - Implements hybrid sampling algorithm (see {@link SAMPLE_SIZE_THRESHOLD_RATIO})
 * - Returns read-only data to prevent accidental mutations
 *
 * ## Usage
 *
 * **Recommended**: Use {@link createProtopediaInMemoryRepository} factory
 *
 * **Direct instantiation** (advanced):
 * ```typescript
 * const repo = new ProtopediaInMemoryRepositoryImpl(
 *   { ttlSeconds: 3600, maxDataSizeBytes: 10485760 },
 *   { baseURL: 'https://protopedia.example.com' }
 * );
 * ```
 *
 * @see {@link ProtopediaInMemoryRepository} for the public interface contract
 * @see {@link createProtopediaInMemoryRepository} for the recommended factory
 */
export class ProtopediaInMemoryRepositoryImpl implements ProtopediaInMemoryRepository {
  #store: PrototypeInMemoryStore;
  #apiClient: ReturnType<typeof createProtopediaApiCustomClient>;
  #lastFetchParams: ListPrototypesParams = { ...DEFAULT_FETCH_PARAMS };
  #ongoingFetch: Promise<SnapshotOperationResult> | null = null;

  /**
   * Creates a new ProtoPedia in-memory repository instance.
   *
   * Initializes the repository with configured store and API client.
   * Each component can have independent logger configuration for granular observability.
   *
   * @param storeConfig - Configuration for the underlying in-memory store
   *   - `ttlSeconds` - Time-to-live for snapshot expiration (optional)
   *   - `maxDataSizeBytes` - Memory guard to prevent excessive data (optional)
   *   - `logger` - Custom logger for store operations (optional)
   *
   * @param protopediaApiClientOptions - Configuration for the ProtoPedia HTTP client
   *   - `baseURL` - API endpoint URL (optional, uses default if omitted)
   *   - `logger` - Custom logger for API operations (optional)
   *   - Additional client-specific options
   *
   * @remarks
   * **Logger Independence**: Store and API client loggers are independent.
   * This allows fine-grained control over logging verbosity for different concerns.
   *
   * @example
   * ```typescript
   * // Minimal setup with defaults
   * const repo = new ProtopediaInMemoryRepositoryImpl({}, {});
   *
   * // Production setup with TTL and memory limits
   * const repo = new ProtopediaInMemoryRepositoryImpl(
   *   {
   *     ttlSeconds: 3600,           // 1 hour
   *     maxDataSizeBytes: 10485760, // 10MB
   *   },
   *   {
   *     baseURL: 'https://protopedia.example.com',
   *   }
   * );
   *
   * // Shared logger for both components
   * const logger = createConsoleLogger('debug');
   * const repo = new ProtopediaInMemoryRepositoryImpl(
   *   { logger },
   *   { logger }
   * );
   *
   * // Independent loggers for granular control
   * const storeLogger = createLogger({ minLevel: 'debug', prefix: '[Store]' });
   * const apiLogger = createLogger({ minLevel: 'info', prefix: '[API]' });
   * const repo = new ProtopediaInMemoryRepositoryImpl(
   *   { logger: storeLogger },
   *   { logger: apiLogger }
   * );
   * ```
   *
   * @see {@link PrototypeInMemoryStoreConfig} for store configuration details
   * @see {@link ProtoPediaApiClientOptions} for API client configuration
   */
  constructor(
    storeConfig: PrototypeInMemoryStoreConfig = {},
    apiClientOptions?: ProtoPediaApiClientOptions,
  ) {
    this.#store = new PrototypeInMemoryStore(storeConfig);
    this.#apiClient = createProtopediaApiCustomClient(apiClientOptions);
  }

  /**
   * Fetch prototypes from ProtoPedia using the given params, normalize
   * them, and replace the entire in-memory snapshot.
   *
   * On failure, returns a Result with ok: false and leaves the previous snapshot intact.
   */
  async #fetchAndNormalize(
    params: ListPrototypesParams,
  ): Promise<SnapshotOperationResult> {
    const mergedParams: ListPrototypesParams = {
      ...DEFAULT_FETCH_PARAMS,
      ...params,
    };

    try {
      const result = await this.#apiClient.fetchPrototypes(mergedParams);

      if (!result.ok) {
        return {
          ok: false,
          error: result.error,
          status: result.status,
          code: result.details?.res?.code,
        };
      }

      this.#store.setAll(result.data);
      this.#lastFetchParams = { ...mergedParams };

      return {
        ok: true,
        stats: this.#store.getStats(),
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Return the configuration used to initialize the underlying store.
   */
  getConfig(): Omit<Required<PrototypeInMemoryStoreConfig>, 'logger'> {
    return this.#store.getConfig();
  }

  /**
   * Return stats for the current snapshot from the underlying store.
   */
  getStats(): PrototypeInMemoryStats {
    return this.#store.getStats();
  }

  /**
   * Initialize the in-memory snapshot using the provided fetch params.
   * Typically called once at startup or before the first read.
   *
   * @remarks
   * **Concurrency Control**: If multiple calls to `setupSnapshot` or `refreshSnapshot`
   * occur simultaneously, they are coalesced into a single API request. All callers
   * receive the same result. This prevents resource waste and race conditions.
   *
   * The first caller's parameters are used for the fetch operation. Subsequent
   * concurrent callers wait for the same result, even if they provide different
   * parameters.
   */
  async setupSnapshot(
    params: ListPrototypesParams,
  ): Promise<SnapshotOperationResult> {
    return this.#executeWithCoalescing(() => this.#fetchAndNormalize(params));
  }

  /**
   * Refresh the in-memory snapshot using the last successful fetch params.
   * If no previous fetch exists, falls back to {@link DEFAULT_FETCH_PARAMS}.
   *
   * @remarks
   * **Concurrency Control**: If multiple calls to `refreshSnapshot` or `setupSnapshot`
   * occur simultaneously, they are coalesced into a single API request. All callers
   * receive the same result. This prevents resource waste and race conditions.
   */
  async refreshSnapshot(): Promise<SnapshotOperationResult> {
    return this.#executeWithCoalescing(() =>
      this.#fetchAndNormalize(this.#lastFetchParams),
    );
  }

  /**
   * Execute a fetch operation with promise coalescing to prevent concurrent API calls.
   *
   * If a fetch is already in progress, returns the existing promise instead of
   * starting a new fetch. This ensures that multiple concurrent calls result in
   * only one API request.
   *
   * @param fetchFn - Function that performs the actual fetch operation
   * @returns Promise that resolves to the fetch result
   */
  async #executeWithCoalescing(
    fetchFn: () => Promise<SnapshotOperationResult>,
  ): Promise<SnapshotOperationResult> {
    // If a fetch is already in progress, return the existing promise
    if (this.#ongoingFetch) {
      return this.#ongoingFetch;
    }

    // Start new fetch and store the promise
    this.#ongoingFetch = fetchFn();

    try {
      return await this.#ongoingFetch;
    } finally {
      // Clear the ongoing fetch regardless of success or failure
      this.#ongoingFetch = null;
    }
  }

  /**
   * Look up a prototype by id in the current snapshot.
   * Never performs HTTP requests.
   *
   * @param prototypeId - The prototype ID to look up. Must be a positive integer.
   * @returns The prototype if found, null otherwise
   * @throws {z.ZodError} If prototypeId is not a positive integer
   */
  async getPrototypeFromSnapshotByPrototypeId(
    prototypeId: number,
  ): Promise<DeepReadonly<NormalizedPrototype> | null> {
    prototypeIdSchema.parse(prototypeId);
    return this.#store.getByPrototypeId(prototypeId);
  }

  /**
   * Return a random prototype from the current snapshot, or null
   * when the snapshot is empty. Never performs HTTP requests.
   *
   * @remarks
   * **Implementation Note**: This method uses `store.size` for O(1) empty check,
   * then `store.getAll()` to select a random element. While it might seem wasteful
   * to copy all objects just to select one, the alternative would require:
   *
   * 1. Call `getPrototypeIds()` - O(n) to iterate Map keys
   * 2. Select random ID - O(1)
   * 3. Call `getByPrototypeId(id)` - O(1)
   *
   * This approach still costs O(n) for step 1, making it no better than
   * `getAll()` in terms of time complexity, but with additional function
   * call overhead. The current implementation is simpler and equally
   * efficient.
   */
  async getRandomPrototypeFromSnapshot(): Promise<DeepReadonly<NormalizedPrototype> | null> {
    if (this.#store.size === 0) {
      return null;
    }
    const all = this.#store.getAll();
    const index = Math.floor(Math.random() * all.length);
    return all[index] ?? null;
  }

  /**
   * Return random samples from the current snapshot.
   *
   * Returns up to `size` random prototypes without duplicates.
   * If `size` exceeds the available data, returns all prototypes in random order.
   * Never performs HTTP requests.
   *
   * @param size - Maximum number of samples to return. Must be an integer.
   * @returns Array of random prototypes (empty array if size <= 0 or snapshot is empty)
   * @throws {z.ZodError} If size is not an integer
   *
   * @remarks
   * **Implementation Note**: Uses a hybrid approach for optimal performance:
   *
   * - `store.size` provides O(1) empty check
   * - `store.getAll()` is O(1) (returns reference to internal array)
   * - For small samples (< 50% of total): Set-based random selection, O(size)
   * - For large samples (≥ 50% of total): Fisher-Yates shuffle, O(n)
   *
   * This hybrid approach optimizes for the common case where sample size is
   * much smaller than the total population, while avoiding performance
   * degradation when the sample size approaches the total size.
   */
  async getRandomSampleFromSnapshot(
    size: number,
  ): Promise<readonly DeepReadonly<NormalizedPrototype>[]> {
    sampleSizeSchema.parse(size);

    if (size <= 0 || this.#store.size === 0) {
      return [];
    }

    const all = this.#store.getAll();
    const actualSize = Math.min(size, all.length);

    // For large samples (≥50% of total), use Fisher-Yates shuffle
    if (actualSize > all.length * SAMPLE_SIZE_THRESHOLD_RATIO) {
      const shuffled = [...all];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
      }
      return shuffled.slice(0, actualSize);
    }

    // For small samples, use Set-based collision avoidance
    const result: (typeof all)[number][] = [];
    const indices = new Set<number>();

    while (result.length < actualSize) {
      const index = Math.floor(Math.random() * all.length);
      if (!indices.has(index)) {
        indices.add(index);
        result.push(all[index]!);
      }
    }

    return result;
  }

  /**
   * Return all prototype IDs from the current snapshot.
   * Never performs HTTP requests.
   */
  async getPrototypeIdsFromSnapshot(): Promise<readonly number[]> {
    return this.#store.getPrototypeIds();
  }

  /**
   * Return all prototypes from the current snapshot.
   * Never performs HTTP requests.
   */
  async getAllFromSnapshot(): Promise<
    readonly DeepReadonly<NormalizedPrototype>[]
  > {
    return this.#store.getAll();
  }

  /**
   * Analyze prototypes to extract ID range (minimum and maximum).
   *
   * Uses a for-loop implementation for better performance with large datasets (5,000+ items).
   * Single-pass algorithm with minimal memory allocations.
   *
   * @param prototypes - Array of prototypes to analyze
   * @returns Object containing min and max IDs, or null values if array is empty
   */
  analyzePrototypesWithForLoop(
    prototypes: readonly DeepReadonly<NormalizedPrototype>[],
  ): PrototypeAnalysisResult {
    if (prototypes.length === 0) {
      return { min: null, max: null };
    }

    let min = prototypes[0]!.id;
    let max = prototypes[0]!.id;

    for (let i = 1; i < prototypes.length; i++) {
      const id = prototypes[i]!.id;
      if (id < min) min = id;
      if (id > max) max = id;
    }

    return { min, max };
  }

  /**
   * Analyze prototypes to extract ID range (minimum and maximum).
   *
   * Uses a reduce implementation for more declarative code style.
   * May perform better with small datasets (~1,000 items) due to JIT optimization.
   *
   * @param prototypes - Array of prototypes to analyze
   * @returns Object containing min and max IDs, or null values if array is empty
   */
  analyzePrototypesWithReduce(
    prototypes: readonly DeepReadonly<NormalizedPrototype>[],
  ): PrototypeAnalysisResult {
    if (prototypes.length === 0) {
      return { min: null, max: null };
    }

    const firstId = prototypes[0]!.id;
    const { min, max } = prototypes.reduce(
      (acc, prototype) => {
        if (prototype.id < acc.min) {
          acc.min = prototype.id;
        }
        if (prototype.id > acc.max) {
          acc.max = prototype.id;
        }
        return acc;
      },
      { min: firstId, max: firstId },
    );

    return { min, max };
  }

  /**
   * Analyze prototypes from the current snapshot to extract ID range.
   *
   * Currently uses the for-loop implementation for optimal performance with typical dataset sizes.
   * Never performs HTTP requests.
   *
   * @returns Object containing min and max IDs, or null values if snapshot is empty
   */
  async analyzePrototypes(): Promise<PrototypeAnalysisResult> {
    const all = this.#store.getAll();
    return this.analyzePrototypesWithForLoop(all);
  }
}
