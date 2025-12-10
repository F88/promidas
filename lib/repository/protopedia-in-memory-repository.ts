/**
 * In-memory repository implementation for ProtoPedia prototypes.
 *
 * This module wires together three main pieces:
 *
 * - The official ProtoPedia API v2 client
 *   (`protopedia-api-v2-client`).
 * - The memorystore's {@link PrototypeInMemoryStore}, which keeps a
 *   snapshot of normalized prototypes in memory.
 * - A thin, higher-level repository interface
 *   ({@link ProtopediaInMemoryRepository}) that exposes
 *   snapshot-oriented operations (setup, refresh, lookups, stats).
 *
 * Callers typically construct a repository via
 * {@link createProtopediaInMemoryRepositoryImpl} (indirectly through
 * {@link createProtopediaInMemoryRepository} from `./index`) and then use
 * its methods to keep a local snapshot of ProtoPedia data in sync with the
 * API.
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

import type { ProtopediaInMemoryRepository } from './index.js';

const DEFAULT_FETCH_PARAMS: ListPrototypesParams = {
  offset: 0,
  limit: 10,
};

/**
 * Internal implementation of {@link ProtopediaInMemoryRepository}.
 *
 * This function:
 * - Instantiates a {@link PrototypeInMemoryStore} using the provided
 *   {@link PrototypeInMemoryStoreConfig}.
 * - Creates a ProtoPedia API client via
 *   {@link createProtopediaApiCustomClient}, using the provided
 *   {@link ProtoPediaApiClientOptions}.
 * - Returns an object that exposes snapshot-oriented methods like
 *   {@link ProtopediaInMemoryRepository.setupSnapshot | setupSnapshot},
 *   {@link ProtopediaInMemoryRepository.refreshSnapshot | refreshSnapshot},
 *   and in-memory lookup helpers.
 *
 * In most cases you should use
 * {@link createProtopediaInMemoryRepository} from `./index` instead of
 * calling this function directly.
 *
 * @param storeConfig - Configuration for the underlying
 *   {@link PrototypeInMemoryStore}. Defaults to an empty configuration.
 * @param apiClientOptions - Optional configuration forwarded to the
 *   official SDK's client factory (for example, `token`, `baseUrl`,
 *   custom `fetch`, `timeoutMs`, `logLevel`).
 * @returns A {@link ProtopediaInMemoryRepository} instance that
 *   manages an in-memory snapshot of ProtoPedia prototypes.
 */
export const createProtopediaInMemoryRepositoryImpl = (
  storeConfig: PrototypeInMemoryStoreConfig = {},
  apiClientOptions?: ProtoPediaApiClientOptions,
): ProtopediaInMemoryRepository => {
  const store = new PrototypeInMemoryStore(storeConfig);
  const apiClient = createProtopediaApiCustomClient(apiClientOptions);

  let lastFetchParams: ListPrototypesParams = { ...DEFAULT_FETCH_PARAMS };

  /**
   * Fetch prototypes from ProtoPedia using the given params, normalize
   * them, and replace the entire in-memory snapshot.
   *
   * On failure, throws an Error and leaves the previous snapshot intact.
   */
  const fetchAndNormalize = async (
    params: ListPrototypesParams,
  ): Promise<void> => {
    const mergedParams: ListPrototypesParams = {
      ...DEFAULT_FETCH_PARAMS,
      ...params,
    };

    const result = await apiClient.fetchPrototypes(mergedParams);

    if (!result.ok) {
      const message = constructDisplayMessage(result);
      throw new Error(message);
    }

    store.setAll(result.data);
    lastFetchParams = { ...mergedParams };
  };

  /**
   * Return the configuration used to initialize the underlying store.
   */
  const getConfig = (): Omit<
    Required<PrototypeInMemoryStoreConfig>,
    'logger'
  > => {
    return store.getConfig();
  };

  /**
   * Return stats for the current snapshot from the underlying store.
   */
  const getStats = (): PrototypeInMemoryStats => {
    return store.getStats();
  };

  /**
   * Initialize the in-memory snapshot using the provided fetch params.
   * Typically called once at startup or before the first read.
   */
  const setupSnapshot = async (params: ListPrototypesParams): Promise<void> => {
    await fetchAndNormalize(params);
  };

  /**
   * Refresh the in-memory snapshot using the last successful fetch params.
   * If no previous fetch exists, falls back to {@link DEFAULT_FETCH_PARAMS}.
   */
  const refreshSnapshot = async (): Promise<void> => {
    await fetchAndNormalize(lastFetchParams);
  };

  /**
   * Look up a prototype by id in the current snapshot.
   * Never performs HTTP requests.
   */
  const getPrototypeFromSnapshotByPrototypeId = async (
    prototypeId: number,
  ): Promise<DeepReadonly<NormalizedPrototype> | null> => {
    return store.getByPrototypeId(prototypeId);
  };

  /**
   * Return a random prototype from the current snapshot, or null
   * when the snapshot is empty. Never performs HTTP requests.
   *
   * @remarks
   * **Implementation Note**: This method uses `store.getAll()` instead of
   * `store.getPrototypeIds()` + `store.getByPrototypeId()` for performance.
   * While it might seem wasteful to copy all objects just to select one,
   * the alternative would require:
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
  const getRandomPrototypeFromSnapshot =
    async (): Promise<DeepReadonly<NormalizedPrototype> | null> => {
      const all = store.getAll();
      if (all.length === 0) {
        return null;
      }
      const index = Math.floor(Math.random() * all.length);
      return all[index] ?? null;
    };

  /**
   * Return random samples from the current snapshot.
   *
   * Returns up to `size` random prototypes without duplicates.
   * If `size` exceeds the available data, returns all prototypes in random order.
   * Never performs HTTP requests.
   *
   * @param size - Maximum number of samples to return
   * @returns Array of random prototypes (empty array if size <= 0 or snapshot is empty)
   *
   * @remarks
   * **Implementation Note**: This method uses `store.getAll()` instead of
   * `store.getPrototypeIds()` for performance reasons. While `getPrototypeIds()`
   * might seem lighter (IDs only vs full objects), the random selection loop
   * would need to call `store.getByPrototypeId()` for each selected ID,
   * resulting in worse performance:
   *
   * - Current approach: 1× O(n) getAll() + size× O(1) array access
   * - Alternative: 1× O(n) getPrototypeIds() + size× O(1) getByPrototypeId()
   *
   * Both have the same time complexity, but the current approach has better
   * cache locality and fewer function calls, making it measurably faster in
   * practice (especially for larger sample sizes).
   */
  const getRandomSampleFromSnapshot = async (
    size: number,
  ): Promise<readonly DeepReadonly<NormalizedPrototype>[]> => {
    const all = store.getAll();
    if (size <= 0 || all.length === 0) {
      return [];
    }

    const actualSize = Math.min(size, all.length);
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
  };

  /**
   * Return all prototype IDs from the current snapshot.
   * Never performs HTTP requests.
   */
  const getPrototypeIdsFromSnapshot = async (): Promise<readonly number[]> => {
    return store.getPrototypeIds();
  };

  return {
    setupSnapshot,
    refreshSnapshot,
    getPrototypeFromSnapshotByPrototypeId,
    getRandomPrototypeFromSnapshot,
    getRandomSampleFromSnapshot,
    getPrototypeIdsFromSnapshot,
    getStats,
    getConfig,
  };
};
