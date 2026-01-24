import type { NormalizedPrototype } from '../../types/index.js';

export type Snapshot = {
  readonly data: readonly NormalizedPrototype[];
  readonly cachedAt: Date | null;
  readonly isExpired: boolean;
};
