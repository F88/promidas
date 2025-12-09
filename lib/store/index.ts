/**
 * In-memory snapshot store module.
 *
 * This module provides the generic storage engine used by the repository:
 *
 * - {@link PrototypeMapStore} — The main store class handling in-memory snapshots,
 *   TTL expiration, and efficient lookups.
 * - {@link PrototypeMapStoreConfig} — Configuration options for the store
 *   (TTL, max payload size, log level).
 *
 * @module
 */

export { PrototypeMapStore, type PrototypeMapStoreConfig } from './store.js';
