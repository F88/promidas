import type { NormalizedPrototype } from '../../types/index.js';

import type { NetworkFailure } from './prototype-api.types.js';

/**
 * Successful response from fetchPrototypes containing an array of prototypes.
 */
export type FetchPrototypesSuccess = {
  ok: true;
  data: NormalizedPrototype[];
};

/**
 * Failed response from fetchPrototypes with error details.
 */
export type FetchPrototypesFailure = {
  ok: false;
  error: string;
} & Omit<NetworkFailure, 'error'>;

/**
 * Result type for fetchPrototypes function - either success with data or failure with error.
 */
export type FetchPrototypesResult =
  | FetchPrototypesSuccess
  | FetchPrototypesFailure;

/**
 * Successful response from fetchRandomPrototype containing a single prototype.
 */
export type FetchRandomPrototypeSuccess = {
  ok: true;
  data: NormalizedPrototype;
};

/**
 * Failed response from fetchRandomPrototype (same as FetchPrototypesFailure).
 */
export type FetchRandomPrototypeFailure = FetchPrototypesFailure;

/**
 * Result type for fetchRandomPrototype function - either success with single prototype or failure.
 */
export type FetchRandomPrototypeResult =
  | FetchRandomPrototypeSuccess
  | FetchRandomPrototypeFailure;

/**
 * Result type for fetchPrototypeById function - either success with single prototype or failure.
 */
export type FetchPrototypeByIdResult =
  | { ok: true; data: NormalizedPrototype }
  | FetchPrototypesFailure;
