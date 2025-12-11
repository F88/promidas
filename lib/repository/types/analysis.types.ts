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

/**
 * Numeric field statistics.
 *
 * @example
 * ```typescript
 * const stats: NumericStats = { total: 15000, avg: 15, min: 0, max: 500 };
 * ```
 */
export type NumericStats = {
  /** Sum of all values */
  total: number;
  /** Average (mean) value */
  avg: number;
  /** Minimum value */
  min: number;
  /** Maximum value */
  max: number;
};

/**
 * Tag or label with its occurrence count.
 *
 * @example
 * ```typescript
 * const tag: TagCount = { name: 'Arduino', count: 150 };
 * ```
 */
export type TagCount = {
  /** Tag name */
  name: string;
  /** Number of occurrences */
  count: number;
};

/**
 * Extended statistics from analyzing prototypes in the snapshot.
 *
 * All statistics are based on the current snapshot data only.
 * Does not represent 全 ProtoPedia data.
 *
 * @example
 * ```typescript
 * const stats = await repo.analyzePrototypesExtended();
 * console.log(`Total prototypes: ${stats.count}`);
 * console.log(`Unique tags: ${stats.uniqueTags}`);
 * console.log(`Top tag: ${stats.topTags[0]?.name} (${stats.topTags[0]?.count})`);
 * console.log(`Avg views: ${stats.viewCount.avg}`);
 * ```
 */
export type ExtendedAnalysisResult = {
  /** Total number of prototypes in snapshot */
  count: number;
  /** ID range (same as PrototypeAnalysisResult) */
  idRange: {
    min: number | null;
    max: number | null;
  };
  /** Number of unique tags across all prototypes */
  uniqueTags: number;
  /** Number of unique users across all prototypes */
  uniqueUsers: number;
  /** Top 10 most frequent tags */
  topTags: TagCount[];
  /** View count statistics */
  viewCount: NumericStats;
  /** Good (like) count statistics */
  goodCount: NumericStats;
  /** Comment count statistics */
  commentCount: NumericStats;
};
