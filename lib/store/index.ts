/**
 * Core in-memory snapshot store module.
 *
 * This module provides the generic `PrototypeMapStore` which handles:
 * - In-memory storage of normalized prototypes
 * - TTL-based expiration logic
 * - O(1) lookups and random sampling
 * - Payload size limits
 *
 * @module
 */

export { PrototypeMapStore, type PrototypeMapStoreConfig } from './store.js';
