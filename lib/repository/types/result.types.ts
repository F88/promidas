/**
 * Failure kinds specific to repository operations.
 *
 * - `validation`: Snapshot validation failed (Zod schema mismatch)
 * - `invalid_state`: Operation cannot proceed due to invalid repository state
 * - `size_estimation`: Size estimation for snapshot failed
 * - `unknown`: Classification failed or unexpected error
 */
export type RepositoryFailureKind =
  | 'validation'
  | 'invalid_state'
  | 'size_estimation'
  | 'unknown';

/**
 * Error codes for repository-originated failures.
 *
 * - `REPOSITORY_VALIDATION_ERROR`: Zod validation failed
 * - `REPOSITORY_INVALID_STATE`: Operation cannot proceed (e.g., refresh without setup)
 * - `REPOSITORY_SIZE_ESTIMATION_ERROR`: Size calculation failed
 * - `REPOSITORY_UNKNOWN`: Unclassified error
 */
export type RepositoryErrorCode =
  | 'REPOSITORY_VALIDATION_ERROR'
  | 'REPOSITORY_INVALID_STATE'
  | 'REPOSITORY_SIZE_ESTIMATION_ERROR'
  | 'REPOSITORY_UNKNOWN';

/**
 * Successful result from repository operations.
 */
export type RepositorySuccess = {
  /** Indicates successful operation. */
  readonly ok: true;
};

/**
 * Failed result from repository operations.
 *
 * Contains repository-specific error information.
 *
 * @remarks
 * This type represents failures that occur at the repository layer,
 * distinct from failures originating in the fetcher or store layers.
 */
export type RepositoryFailure = {
  /** Indicates failed operation. */
  readonly ok: false;
  /** Always repository-originated. */
  readonly origin: 'repository';
  /** Coarse-grained classification of the failure cause. */
  readonly kind: RepositoryFailureKind;
  /** Canonical error code from the repository. */
  readonly code: RepositoryErrorCode;
  /** Human-readable error message. */
  readonly message: string;
  /** Underlying cause of the error (optional). */
  readonly cause?: unknown;
};

/**
 * Result from repository operations.
 *
 * Returns either success or failure with repository-specific error details.
 */
export type RepositoryResult = RepositorySuccess | RepositoryFailure;
