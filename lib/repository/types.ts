/**
 * Result of analyzing prototypes to extract ID range.
 */
export type PrototypeAnalysisResult = {
  /** Minimum prototype ID, or null if no prototypes. */
  min: number | null;
  /** Maximum prototype ID, or null if no prototypes. */
  max: number | null;
};
