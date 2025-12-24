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

export type {
  SnapshotOperationResult,
  SnapshotOperationSuccess,
  SnapshotOperationFailure,
  FetcherSnapshotFailure,
  StoreSnapshotFailure,
  UnknownSnapshotFailure,
} from './snapshot-operation.types.js';
