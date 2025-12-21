import type { Logger } from '../../logger/index.js';
import type { NormalizedPrototype } from '../../types/index.js';
import type { UpstreamPrototype } from '../types/prototype-api.types.js';

export function logTimestampNormalizationWarnings(params: {
  logger: Logger;
  original: UpstreamPrototype;
  normalized: NormalizedPrototype;
  index: number;
}): void {
  const { logger, original, normalized, index } = params;

  // Check for date normalization failures.
  // If the normalized value is the same as the original (and not null/undefined)
  // but doesn't look like a normalized UTC ISO string (ending in 'Z'), it likely failed parsing.
  const context = { prototypeId: original.id, index };

  if (
    original.createDate &&
    normalized.createDate === original.createDate &&
    !normalized.createDate.endsWith('Z')
  ) {
    logger.warn('Failed to parse and normalize createDate', {
      ...context,
      originalValue: original.createDate,
    });
  }

  if (
    original.updateDate &&
    normalized.updateDate === original.updateDate &&
    !normalized.updateDate.endsWith('Z')
  ) {
    logger.warn('Failed to parse and normalize updateDate', {
      ...context,
      originalValue: original.updateDate,
    });
  }

  if (
    original.releaseDate &&
    normalized.releaseDate === original.releaseDate &&
    !normalized.releaseDate.endsWith('Z')
  ) {
    logger.warn('Failed to parse and normalize releaseDate', {
      ...context,
      originalValue: original.releaseDate,
    });
  }
}
