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
 * For normal usage, import from `@f88/promidas` instead of direct instantiation:
 * - `createPromidasForLocal()` for local development
 * - `createPromidasForServer()` for server environments
 * - `PromidasRepositoryBuilder` for advanced customization
 *
 * Direct instantiation is only recommended for:
 * - Testing scenarios
 * - Advanced customization needs
 * - Framework integration
 *
 * @module
 * @see {@link ProtopediaInMemoryRepository} for the public interface
 */
import { EventEmitter } from 'events';

import type {
  ListPrototypesParams,
  ProtoPediaApiClientOptions,
} from 'protopedia-api-v2-client';
import type { DeepReadonly } from 'ts-essentials';

import { ProtopediaApiCustomClient } from '../fetcher/index.js';
import type { FetchPrototypesResult } from '../fetcher/types/result.types.js';
import { ConsoleLogger, type Logger, type LogLevel } from '../logger/index.js';
import {
  DataSizeExceededError,
  PrototypeInMemoryStore,
  SizeEstimationError,
  type PrototypeInMemoryStats,
  type PrototypeInMemoryStoreConfig,
} from '../store/index.js';
import type { NormalizedPrototype } from '../types/index.js';
import { sanitizeDataForLogging } from '../utils/index.js';

import { ValidationError } from './errors/validation-error.js';
import { prototypeIdSchema, sampleSizeSchema } from './schemas/validation.js';
import type {
  ProtopediaInMemoryRepositoryConfig,
  PrototypeAnalysisResult,
  RepositoryEvents,
  SnapshotOperationFailure,
  SnapshotOperationResult,
} from './types/index.js';
import { emitRepositoryEventSafely } from './utils/emit-repository-event-safely.js';
import { convertFetchFailure } from './utils/index.js';

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
 *    - Receives {@link PrototypeInMemoryStore} and {@link ProtopediaApiCustomClient} via DI
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
 * **Recommended**: Import from `@f88/promidas` instead of direct instantiation
 *
 * **Direct instantiation** (advanced):
 * ```typescript
 * // Dependencies must be created manually
 * const store = new PrototypeInMemoryStore({ ... });
 * const client = new ProtopediaApiCustomClient({ ... });
 *
 * const repo = new ProtopediaInMemoryRepositoryImpl({
 *   store,
 *   apiClient: client
 * });
 * ```
 *
 * @see {@link ProtopediaInMemoryRepository} for the public interface contract
 */
export class ProtopediaInMemoryRepositoryImpl implements ProtopediaInMemoryRepository {
  /**
   * Event emitter for snapshot operation notifications.
   *
   * Only defined when enableEvents: true is set in repository configuration.
   */
  readonly events?: EventEmitter;

  /**
   * Internal logger instance.
   */
  #logger: Logger;

  /**
   * Log level for the repository.
   */
  #logLevel: LogLevel;

  /**
   * Underlying in-memory store instance.
   */
  #store: PrototypeInMemoryStore;

  /**
   * Underlying API client instance.
   */
  #apiClient: ProtopediaApiCustomClient;

  /**
   * Cache of the last successful fetch parameters.
   */
  #lastFetchParams: ListPrototypesParams = { ...DEFAULT_FETCH_PARAMS };

  /**
   * Ongoing fetch promise for concurrency control.
   */
  #ongoingFetch: Promise<SnapshotOperationResult> | null = null;

  /**
   * Creates a new ProtoPedia in-memory repository instance.
   *
   * @param dependencies - Dependency injection object
   * @param dependencies.store - Pre-configured in-memory store instance
   * @param dependencies.apiClient - Pre-configured API client instance
   * @param dependencies.repositoryConfig - Repository-level configuration (optional)
   */
  constructor({
    store,
    apiClient,
    repositoryConfig = {},
  }: {
    store: PrototypeInMemoryStore;
    apiClient: ProtopediaApiCustomClient;
    repositoryConfig?: ProtopediaInMemoryRepositoryConfig;
  }) {
    // Fastify-style logger configuration for repository
    const { logger, logLevel, enableEvents } = repositoryConfig;
    if (logger) {
      this.#logger = logger;
      this.#logLevel = logLevel ?? 'info';
      // If logLevel is specified, update logger's level property (if mutable)
      if (logLevel !== undefined && 'level' in logger) {
        (logger as { level: LogLevel }).level = logLevel;
      }
    } else {
      const resolvedLogLevel = logLevel ?? 'info';
      this.#logger = new ConsoleLogger(resolvedLogLevel);
      this.#logLevel = resolvedLogLevel;
    }

    // Initialize event emitter if events are enabled
    if (enableEvents === true) {
      this.events = new EventEmitter();
      this.events.setMaxListeners(0); // Allow unlimited listeners
    }

    this.#logger.info('ProtopediaInMemoryRepository constructor called', {
      repositoryConfig: sanitizeDataForLogging(repositoryConfig),
      storeConfig: store.getConfig(),
      eventsEnabled: enableEvents === true,
    });

    this.#store = store;
    this.#apiClient = apiClient;
  }

  /**
   * Fetch and normalize prototypes from the ProtoPedia API.
   *
   * @param params - Fetch parameters to merge with {@link DEFAULT_FETCH_PARAMS}
   * @returns {@link FetchPrototypesResult} from the API client
   *
   * @remarks
   * This method delegates directly to the API client's `fetchPrototypes()` method,
   * which handles all error cases and returns them as {@link FetchPrototypesFailure}
   * instead of throwing exceptions.
   *
   * **Responsibility Separation**:
   * - This method only fetches and normalizes data
   * - The caller is responsible for storing the data via {@link storeSnapshot}
   * - The caller must update lastFetchParams on successful storage
   *
   * **Error Handling**:
   * - The API client never throws exceptions under normal operation
   * - The try-catch block is defensive programming for unexpected cases
   * - All expected errors are returned as part of {@link FetchPrototypesResult}
   *
   * @see {@link ProtopediaApiCustomClient.fetchPrototypes} for API client implementation
   * @internal
   */
  private async fetchAndNormalize(
    params: ListPrototypesParams,
  ): Promise<FetchPrototypesResult> {
    const mergedParams: ListPrototypesParams = {
      ...DEFAULT_FETCH_PARAMS,
      ...params,
    };

    try {
      return await this.#apiClient.fetchPrototypes(mergedParams);
    } catch (error) {
      // This should never happen as the API client catches all errors,
      // but we handle it defensively in case of unexpected exceptions.
      this.#logger.error('Unexpected exception from API client', {
        error: sanitizeDataForLogging(error),
        params: mergedParams,
      });

      // TODO Fix later: align unexpected fetcher failures with centralized handler
      return {
        ok: false,
        origin: 'fetcher', // mark failure as coming from fetcher layer
        kind: 'unknown', // unexpected path; not classified by handler
        code: 'UNKNOWN', // generic code until centralized handling is used
        error: error instanceof Error ? error.message : String(error),
        details: {
          req: {
            method: 'GET',
          },
        },
      };
    }
  }

  /**
   * Store normalized prototypes in the in-memory snapshot.
   *
   * This private method handles:
   * - Storing data via the memory store
   * - Converting store errors to {@link StoreSnapshotFailure}
   * - Logging detailed error information with sanitized data
   *
   * @param data - Array of normalized prototypes to store
   * @returns {@link SnapshotOperationResult} - Success with stats or failure details
   *
   * @remarks
   * **Error Handling**:
   * - {@link DataSizeExceededError} → {@link StoreSnapshotFailure} with kind='storage_limit'
   * - {@link SizeEstimationError} → {@link StoreSnapshotFailure} with kind='serialization'
   * - Unexpected errors → {@link UnknownSnapshotFailure}
   *
   * All store errors include `dataState` to indicate whether existing data was preserved.
   *
   * @internal
   */
  private storeSnapshot(data: NormalizedPrototype[]): SnapshotOperationResult {
    try {
      this.#store.setAll(data);

      return {
        ok: true,
        stats: this.#store.getStats(),
      };
    } catch (error) {
      // Log detailed Store error information
      if (error instanceof DataSizeExceededError) {
        this.#logger.warn('Snapshot storage failed: data size exceeded', {
          dataSizeBytes: error.dataSizeBytes,
          maxDataSizeBytes: error.maxDataSizeBytes,
          dataState: error.dataState,
        });

        return {
          ok: false,
          origin: 'store' as const,
          kind: 'storage_limit' as const,
          code: 'STORE_CAPACITY_EXCEEDED' as const,
          message: `Data size ${error.dataSizeBytes} bytes exceeds maximum ${error.maxDataSizeBytes} bytes`,
          dataState: error.dataState,
        };
      } else if (error instanceof SizeEstimationError) {
        this.#logger.error('Snapshot storage failed: size estimation error', {
          cause: sanitizeDataForLogging(error.cause),
          dataState: error.dataState,
        });

        return {
          ok: false,
          origin: 'store' as const,
          kind: 'serialization' as const,
          code: 'STORE_SERIALIZATION_FAILED' as const,
          message: 'Failed to estimate data size during serialization',
          dataState: error.dataState,
          cause: sanitizeDataForLogging(error.cause),
        };
      } else {
        // Unexpected store error
        this.#logger.error('Snapshot storage failed: unexpected error', {
          error: sanitizeDataForLogging(error),
        });

        return {
          ok: false,
          origin: 'unknown' as const,
          message: error instanceof Error ? error.message : String(error),
        };
      }
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
   * Fetch prototypes from the API and store them in memory.
   *
   * This is the core implementation shared by {@link setupSnapshot} and {@link refreshSnapshot}.
   * It encapsulates the complete fetch-and-store workflow with proper error handling and
   * optional parameter caching.
   *
   * @param params - Fetch parameters to merge with {@link DEFAULT_FETCH_PARAMS}
   * @param updateLastFetchParams - Whether to update {@link #lastFetchParams} on successful storage.
   *   Set to `true` for {@link setupSnapshot} to cache parameters for future {@link refreshSnapshot} calls.
   *   Set to `false` for {@link refreshSnapshot} to avoid overwriting cached parameters.
   * @returns {@link SnapshotOperationResult} indicating success or failure
   *
   * @remarks
   * **Operation Flow**:
   * 1. Fetch and normalize prototypes via {@link fetchAndNormalize}
   * 2. Convert fetch failures to {@link SnapshotOperationFailure} via {@link convertFetchFailure}
   * 3. Store the data in memory via {@link storeSnapshot}
   * 4. Update {@link #lastFetchParams} only if `updateLastFetchParams` is `true` AND storage succeeds
   *
   * **Parameter Handling**:
   * - Input `params` are merged with {@link DEFAULT_FETCH_PARAMS} by {@link fetchAndNormalize}
   * - Merged parameters are cached in {@link #lastFetchParams} only when:
   *   - `updateLastFetchParams` is `true` (typically {@link setupSnapshot})
   *   - Storage operation succeeds
   * - Failed operations never update {@link #lastFetchParams}
   *
   * **Concurrency Control**:
   * - Uses {@link #executeWithCoalescing} to prevent concurrent API calls
   * - Multiple concurrent calls are coalesced into a single API request
   * - All callers receive the same result
   * - The first caller's operation (fetch + store) is executed
   * - Subsequent concurrent callers wait for the same result
   *
   * **Error Handling**:
   * - Returns error result if API fetch fails (network, timeout, API errors)
   * - Returns error result if storage fails (e.g., {@link DataSizeExceededError})
   * - Previous snapshot remains intact on failure
   * - Never throws exceptions - all errors are returned as {@link SnapshotOperationResult}
   *
   * @internal This method is private and used only by {@link setupSnapshot} and {@link refreshSnapshot}.
   * It can be accessed in tests via `(repo as any).fetchAndStore(...)` for unit testing.
   *
   * @see {@link setupSnapshot} for initial snapshot setup with parameter caching
   * @see {@link refreshSnapshot} for refreshing with cached parameters
   */
  private async fetchAndStore(
    params: ListPrototypesParams,
    updateLastFetchParams: boolean,
  ): Promise<SnapshotOperationResult> {
    return this.#executeWithCoalescing(async () => {
      // Fetch and normalize prototypes
      const fetchResult: FetchPrototypesResult =
        await this.fetchAndNormalize(params);

      // Return early on fetch failure, converting to SnapshotOperationFailure
      if (!fetchResult.ok) {
        return convertFetchFailure(fetchResult);
      }

      // Store the fetched data
      const storeResult: SnapshotOperationResult = this.storeSnapshot(
        fetchResult.data,
      );

      // Update lastFetchParams only on successful storage if requested
      if (updateLastFetchParams) {
        if (storeResult.ok) {
          this.#lastFetchParams = { ...DEFAULT_FETCH_PARAMS, ...params };
        }
      }

      return storeResult;
    });
  }

  /**
   * Initialize the in-memory snapshot using the provided fetch parameters.
   *
   * Typically called once at startup. Fetches data from the API, stores it in memory,
   * and caches the parameters for future {@link refreshSnapshot} calls.
   *
   * @param params - Fetch parameters to merge with {@link DEFAULT_FETCH_PARAMS}
   * @returns {@link SnapshotOperationResult} indicating success or failure
   *
   * @remarks
   * Delegates to {@link fetchAndStore} with `updateLastFetchParams: true`.
   * Emits `snapshotStarted('setup')` event before operation (if events enabled).
   *
   * See {@link fetchAndStore} for operation flow, concurrency control, and error handling details.
   *
   * @see {@link fetchAndStore}
   * @see {@link refreshSnapshot}
   */
  async setupSnapshot(
    params: ListPrototypesParams,
  ): Promise<SnapshotOperationResult> {
    emitRepositoryEventSafely(
      this.events,
      this.#logger,
      'snapshotStarted',
      'setup',
    );

    return this.fetchAndStore(params, true);
  }

  /**
   * Refresh the in-memory snapshot using cached fetch parameters.
   *
   * Typically called periodically to refresh expired data. Uses parameters
   * cached by the last successful {@link setupSnapshot} call.
   *
   * @returns {@link SnapshotOperationResult} indicating success or failure
   *
   * @remarks
   * Delegates to {@link fetchAndStore} with `updateLastFetchParams: false`.
   * Emits `snapshotStarted('refresh')` event before operation (if events enabled).
   *
   * Falls back to {@link DEFAULT_FETCH_PARAMS} if {@link setupSnapshot} has never been called.
   * See {@link fetchAndStore} for operation flow, concurrency control, and error handling details.
   *
   * @see {@link fetchAndStore}
   * @see {@link setupSnapshot}
   */
  async refreshSnapshot(): Promise<SnapshotOperationResult> {
    emitRepositoryEventSafely(
      this.events,
      this.#logger,
      'snapshotStarted',
      'refresh',
    );

    return this.fetchAndStore(this.#lastFetchParams, false);
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
      const result = await this.#ongoingFetch;

      // Emit events based on result
      if (result.ok) {
        emitRepositoryEventSafely(
          this.events,
          this.#logger,
          'snapshotCompleted',
          result.stats,
        );
      } else {
        emitRepositoryEventSafely(
          this.events,
          this.#logger,
          'snapshotFailed',
          result,
        );
      }

      return result;
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
   * @throws {ValidationError} If prototypeId is not a positive integer
   */
  async getPrototypeFromSnapshotByPrototypeId(
    prototypeId: number,
  ): Promise<DeepReadonly<NormalizedPrototype> | null> {
    const validation = prototypeIdSchema.safeParse(prototypeId);
    if (!validation.success) {
      throw new ValidationError(
        'Invalid prototype ID: must be a positive integer',
        'prototypeId',
        { cause: validation.error },
      );
    }
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
   * @throws {ValidationError} If size is not an integer
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
    const validation = sampleSizeSchema.safeParse(size);
    if (!validation.success) {
      throw new ValidationError(
        'Invalid sample size: must be an integer',
        'size',
        { cause: validation.error },
      );
    }

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

  /**
   * Clean up event listeners and release resources.
   *
   * Removes all event listeners from the internal EventEmitter to prevent memory leaks.
   * Safe to call even when events are disabled.
   *
   * @remarks
   * Always call this method in cleanup paths:
   * - Test cleanup (afterEach)
   * - Component unmounting (React useEffect cleanup)
   * - Before creating a new repository instance
   */
  dispose(): void {
    this.events?.removeAllListeners();
  }
}
