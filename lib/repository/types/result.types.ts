/**
 * Failure kinds specific to repository operations.
 *
 * - `validation`: Snapshot validation failed (Zod schema mismatch)
 * - `size_estimation`: Size estimation for snapshot failed
 * - `unknown`: Classification failed or unexpected error
 */
export type RepositoryFailureKind =
  | 'validation'
  | 'size_estimation'
  | 'unknown';

/**
 * Error codes for repository-originated failures.
 *
 * - `REPOSITORY_VALIDATION_ERROR`: Zod validation failed
 * - `REPOSITORY_SIZE_ESTIMATION_ERROR`: Size calculation failed
 * - `REPOSITORY_UNKNOWN`: Unclassified error
 */
export type RepositoryErrorCode =
  | 'REPOSITORY_VALIDATION_ERROR'
  | 'REPOSITORY_SIZE_ESTIMATION_ERROR'
  | 'REPOSITORY_UNKNOWN';

/**
 * Successful result from repository operations.
 */
export type RepositorySuccess = {
  /** Indicates successful operation. */
  ok: true;
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
  ok: false;
  /** Always repository-originated. */
  origin: 'repository';
  /** Coarse-grained classification of the failure cause. */
  kind: RepositoryFailureKind;
  /** Canonical error code from the repository. */
  code: RepositoryErrorCode;
  /** Human-readable error message. */
  message: string;
  /** Underlying cause of the error (optional). */
  cause?: unknown;
};

/**
 * Result from repository operations.
 *
 * Returns either success or failure with repository-specific error details.
 */
export type RepositoryResult = RepositorySuccess | RepositoryFailure;
