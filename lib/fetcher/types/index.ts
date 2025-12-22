/**
 * Type definitions for the fetcher module.
 *
 * @module
 */

export type {
  FetchProgressEvent,
  FetchProgressRequestStartEvent,
  FetchProgressResponseReceivedEvent,
  FetchProgressDownloadProgressEvent,
  FetchProgressCompleteEvent,
} from './progress-event.types.js';

export type {
  UpstreamPrototype,
  NetworkFailure,
} from './prototype-api.types.js';

export type {
  FetchPrototypesResult,
  FetchPrototypesSuccess,
  FetchPrototypesFailure,
} from './result.types.js';
