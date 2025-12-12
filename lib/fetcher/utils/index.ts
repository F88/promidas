/**
 * @module protopedia/utils
 *
 * Utility functions for ProtoPedia API data processing.
 */

export { splitPipeSeparatedString } from './string-parsers.js';

export { normalizePrototype } from './normalize-prototype.js';
export type { UpstreamPrototype } from '../types/prototype-api.types.js';

export { normalizeProtoPediaTimestamp } from './normalize-protopedia-timestamp.js';

export { handleApiError } from './errors/handler.js';
export {
  resolveErrorMessage,
  constructDisplayMessage,
} from './errors/messages.js';
