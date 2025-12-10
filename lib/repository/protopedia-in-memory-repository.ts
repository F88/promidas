/**
 * In-memory repository implementation for ProtoPedia prototypes.
 *
 * This module provides the core implementation class for managing
 * ProtoPedia prototypes in memory.
 *
 * The {@link ProtopediaInMemoryRepositoryImpl} class wires together:
 *
 * - The official ProtoPedia API v2 client
 *   (`protopedia-api-v2-client`).
 * - The memorystore's {@link PrototypeInMemoryStore}, which keeps a
 *   snapshot of normalized prototypes in memory.
 * - A thin, higher-level repository interface
 *   ({@link ProtopediaInMemoryRepository}) that exposes
 *   snapshot-oriented operations (setup, refresh, lookups, stats).
 *
 * Callers typically construct a repository via the factory function
 * {@link createProtopediaInMemoryRepository} exported from `./index`,
 * which internally instantiates this class.
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
 * Internal implementation of {@link ProtopediaInMemoryRepository}.
 *
 * This class:
 * - Instantiates a {@link PrototypeInMemoryStore} using the provided
 *   {@link PrototypeInMemoryStoreConfig}.
 * - Creates a ProtoPedia API client via
 *   {@link createProtopediaApiCustomClient}, using the provided
 *   {@link ProtoPediaApiClientOptions}.
 * - Exposes snapshot-oriented methods like
 *   {@link ProtopediaInMemoryRepository.setupSnapshot | setupSnapshot},
 *   {@link ProtopediaInMemoryRepository.refreshSnapshot | refreshSnapshot},
 *   and in-memory lookup helpers.
 *
 * In most cases you should use
 * {@link createProtopediaInMemoryRepository} from `./index` instead of
 * instantiating this class directly.
 */
export class ProtopediaInMemoryRepositoryImpl implements ProtopediaInMemoryRepository {
  #store: PrototypeInMemoryStore;
  #apiClient: ReturnType<typeof createProtopediaApiCustomClient>;
  #lastFetchParams: ListPrototypesParams = { ...DEFAULT_FETCH_PARAMS };

  /**
   * Creates a new ProtoPedia in-memory repository instance.
   *
   * The repository coordinates between the in-memory store and the API client.
   * Each component (store and API client) can have its own independent logger.
   *
   * @param storeConfig - Configuration options for the underlying in-memory store.
   *   Use storeConfig.logger to configure logging for store operations.
   * @param protopediaApiClientOptions - Optional configuration for the API client.
   *   Use apiClientOptions.logger to configure logging for API operations.
   *
   * @example
   * ```typescript
   * // Use the same logger for both
   * const logger = createConsoleLogger('debug');
   * const repo = new ProtopediaInMemoryRepositoryImpl(
   *   { logger },
   *   { logger }
   * );
   *
   * // Use different loggers
   * const repo = new ProtopediaInMemoryRepositoryImpl(
   *   { logger: storeLogger },
   *   { logger: apiLogger }
   * );
   * ```
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
          error: String(result.error),
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
   */
  async setupSnapshot(
    params: ListPrototypesParams,
  ): Promise<SnapshotOperationResult> {
    return this.#fetchAndNormalize(params);
  }

  /**
   * Refresh the in-memory snapshot using the last successful fetch params.
   * If no previous fetch exists, falls back to {@link DEFAULT_FETCH_PARAMS}.
   */
  async refreshSnapshot(): Promise<SnapshotOperationResult> {
    return this.#fetchAndNormalize(this.#lastFetchParams);
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
