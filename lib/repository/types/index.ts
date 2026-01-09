/**
 * Type definitions for the ProtoPedia in-memory repository module.
 *
 * @module
 */

export type { PrototypeAnalysisResult } from './analysis.types.js';

export type { RepositoryEvents } from './repository-events.types.js';

export type {
  ProtopediaInMemoryRepository,
  ProtopediaInMemoryRepositoryConfig,
} from './repository.types.js';

export type { SerializableSnapshot } from './serialization.types.js';

export type {
  RepositoryFailureKind,
  RepositoryErrorCode,
  RepositorySuccess,
  RepositoryFailure,
  RepositoryResult,
} from './result.types.js';

export type {
  SnapshotOperationResult,
  SnapshotOperationSuccess,
  SnapshotOperationFailure,
  FetcherSnapshotFailure,
  StoreSnapshotFailure,
  RepositorySnapshotFailure,
  UnknownSnapshotFailure,
} from './snapshot-operation.types.js';
