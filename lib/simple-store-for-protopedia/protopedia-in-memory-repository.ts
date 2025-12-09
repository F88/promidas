/**
 * In-memory repository implementation for ProtoPedia prototypes.
 *
 * This module wires together three main pieces:
 *
 * - The official ProtoPedia API v2 client
 *   (`protopedia-api-v2-client`).
 * - The memorystore's {@link PrototypeMapStore}, which keeps a
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

import {
  PrototypeMapStore,
  type PrototypeMapStoreConfig,
} from '../core/store.js';
import type { NormalizedPrototype } from '../core/types.js';
import { createProtopediaApiCustomClient } from '../protopedia/protopedia-api-custom-client.js';
import { constructDisplayMessage } from '../protopedia/utils/error-messages.js';

import type {
  ProtopediaInMemoryRepository,
  ProtopediaInMemoryRepositoryStats,
} from './index.js';

const DEFAULT_FETCH_PARAMS: ListPrototypesParams = {
  offset: 0,
  limit: 10,
};

/**
 * Internal implementation of {@link ProtopediaInMemoryRepository}.
 *
 * This function:
 * - Instantiates a {@link PrototypeMapStore} using the provided
 *   {@link PrototypeMapStoreConfig}.
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
 *   {@link PrototypeMapStore}. Defaults to an empty configuration.
 * @param apiClientOptions - Optional configuration forwarded to the
 *   official SDK's client factory (for example, `token`, `baseUrl`,
 *   custom `fetch`, `timeoutMs`, `logLevel`).
 * @returns A {@link ProtopediaInMemoryRepository} instance that
 *   manages an in-memory snapshot of ProtoPedia prototypes.
 */
export const createProtopediaInMemoryRepositoryImpl = (
  storeConfig: PrototypeMapStoreConfig = {},
  apiClientOptions?: ProtoPediaApiClientOptions,
): ProtopediaInMemoryRepository => {
  const store = new PrototypeMapStore(storeConfig);
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
  const getPrototypeFromSnapshotById = async (
    id: number,
  ): Promise<NormalizedPrototype | undefined> => {
    return store.getById(id);
  };

  /**
   * Return a random prototype from the current snapshot, or `undefined`
   * when the snapshot is empty. Never performs HTTP requests.
   */
  const getRandomPrototypeFromSnapshot = async (): Promise<
    NormalizedPrototype | undefined
  > => {
    const value = store.getRandom();
    return value === null ? undefined : value;
  };

  /**
   * Derive stats for the current snapshot from the underlying store.
   * Converts Date-based `cachedAt` into a millisecond timestamp.
   */
  const getStats = (): ProtopediaInMemoryRepositoryStats => {
    const snapshotStats = store.getStats();
    return {
      size: snapshotStats.size,
      cachedAt:
        snapshotStats.cachedAt instanceof Date
          ? snapshotStats.cachedAt.getTime()
          : null,
      isExpired: snapshotStats.isExpired ?? false,
    };
  };

  return {
    setupSnapshot,
    refreshSnapshot,
    getPrototypeFromSnapshotById,
    getRandomPrototypeFromSnapshot,
    getStats,
  };
};
