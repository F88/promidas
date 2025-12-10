/**
 * Result of analyzing prototypes to extract ID range.
 *
 * Used by {@link ProtopediaInMemoryRepository.analyzePrototypes} to return
 * the minimum and maximum prototype IDs from the current snapshot.
 *
 * @example
 * ```typescript
 * const { min, max } = await repo.analyzePrototypes();
 * if (min !== null && max !== null) {
 *   console.log(`Prototype ID range: ${min} - ${max}`);
 * }
 * ```
 */
export type PrototypeAnalysisResult = {
  /** Minimum prototype ID, or null if no prototypes exist in snapshot. */
  min: number | null;
  /** Maximum prototype ID, or null if no prototypes exist in snapshot. */
  max: number | null;
};
