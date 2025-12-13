/**
 * Type definitions for the ProtoPedia in-memory repository module.
 *
 * @module
 */

export type { PrototypeAnalysisResult } from './analysis.types.js';

export type {
  ProtopediaInMemoryRepository,
  ProtopediaInMemoryRepositoryConfig,
  CreateProtopediaInMemoryRepository,
} from './repository.types.js';

export type {
  SnapshotOperationResult,
  SnapshotOperationSuccess,
  SnapshotOperationFailure,
} from './snapshot-operation.types.js';
