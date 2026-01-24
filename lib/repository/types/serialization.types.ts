/**
 * Type definitions for snapshot serialization and deserialization.
 *
 * This module defines types related to exporting and importing snapshots
 * in serializable formats.
 *
 * @module
 */
import type { NormalizedPrototype } from '../../types/index.js';

/**
 * Serializable snapshot data structure for export/import.
 *
 * This type represents a snapshot that can be serialized to JSON and later
 * restored. It contains all necessary data to reconstruct an in-memory snapshot
 * without requiring API calls.
 *
 * @remarks
 * **Use Cases:**
 * - Offline usage - Load snapshot without network access
 * - Faster startup - Skip API calls by loading cached snapshots
 * - Test fixtures - Create consistent test data
 * - Development - Work without hitting API rate limits
 *
 * **Format:**
 * The structure is designed to be JSON-serializable. The caller is responsible
 * for actual JSON.stringify() and file I/O operations.
 *
 * @example
 * ```typescript
 * // Export
 * const snapshot = await repo.getSerializableSnapshot();
 * await fs.writeFile('snapshot.json', JSON.stringify(snapshot, null, 2));
 *
 * // Import
 * const data = JSON.parse(await fs.readFile('snapshot.json', 'utf-8'));
 * const result = repo.setupSnapshotFromSerializedData(data);
 * ```
 */
export type SerializableSnapshot = {
  /**
   * Snapshot format version for compatibility checks.
   *
   * Format: Semantic versioning (e.g., "1.0.0")
   * Used to validate compatibility when deserializing.
   */
  readonly version: string;

  /**
   * ISO-8601 UTC timestamp when the snapshot was serialized.
   *
   * Format: "YYYY-MM-DDTHH:mm:ss.sssZ"
   * Useful for tracking snapshot age and debugging.
   */
  readonly serializedAt: string;

  /**
   * Array of normalized prototypes.
   *
   * Contains all prototypes from the snapshot at the time of export.
   */
  readonly prototypes: readonly NormalizedPrototype[];
};
