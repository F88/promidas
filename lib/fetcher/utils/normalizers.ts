/**
 * @module protopedia/utils/normalizers
 *
 * Normalization utilities for ProtoPedia API responses.
 *
 * This module provides helpers to transform the raw upstream prototype
 * data returned by the ProtoPedia SDK into the normalized
 * {@link NormalizedPrototype} shape used throughout this library.
 *
 * Key responsibilities:
 * - Parsing pipe-separated string fields (tags, users, awards, events,
 *   materials) into arrays.
 * - Normalizing date/timestamp fields using {@link normalizeProtoPediaTimestamp}.
 * - Mapping all upstream fields to the canonical {@link NormalizedPrototype}
 *   structure.
 */
import type { ResultOfListPrototypesApiResponse } from 'protopedia-api-v2-client';

import type { NormalizedPrototype } from '../../types/index.js';

import { normalizeProtoPediaTimestamp } from './time.js';

/**
 * Alias for the upstream prototype shape returned by the ProtoPedia SDK.
 *
 * This type represents a single prototype object as delivered by the
 * `listPrototypes` API response. It is the input to
 * {@link normalizePrototype}.
 *
 * **Important:** This is a direct re-export of the SDK's response type.
 * If `protopedia-api-v2-client` changes its response shape in a future
 * version, this type will automatically reflect those changes. The
 * following areas may be affected:
 *
 * - {@link normalizePrototype} function implementation (field mappings)
 * - {@link NormalizedPrototype} type definition (may need updates)
 * - Normalization tests (may need new test cases)
 * - Helper functions (assignPipeSeparatedIfExists, assignIfDefined)
 *
 * **When upgrading `protopedia-api-v2-client`:**
 * 1. Review the SDK's changelog for new or changed fields
 * 2. Run tests - the field coverage test will fail if new fields are not normalized
 * 3. Update {@link normalizePrototype} to handle new fields
 * 4. Update {@link NormalizedPrototype} type if needed
 * 5. Add test cases for new field transformations
 */
export type UpstreamPrototype = ResultOfListPrototypesApiResponse;

/**
 * Split a pipe-separated string into an array of trimmed segments.
 *
 * The ProtoPedia API returns certain fields (tags, users, awards, events,
 * materials) as pipe-delimited strings. This helper parses such a string
 * into a clean array.
 *
 * @param value - The pipe-separated string to split. If empty or falsy,
 *   an empty array is returned.
 * @returns An array of trimmed string segments.
 *
 * @example
 * ```ts
 * splitPipeSeparatedString('tag1 | tag2|tag3 ');
 * // => ['tag1', 'tag2', 'tag3']
 *
 * splitPipeSeparatedString('');
 * // => []
 * ```
 */
export const splitPipeSeparatedString = (value: string): string[] => {
  if (!value) {
    return [];
  }
  return value.split('|').map((s) => s.trim());
};

/**
 * Assign a pipe-separated field to the target if it exists in the source.
 *
 * Helper function to reduce repetition when normalizing optional
 * pipe-separated fields. Checks if the field exists in the source object,
 * and if so, transforms it using the provided transform function.
 *
 * @param target - The target object to assign to.
 * @param source - The source object to read from.
 * @param key - The property key to process.
 * @param transform - Function to transform the string value into an array.
 */
function assignPipeSeparatedIfExists<
  K extends keyof NormalizedPrototype & keyof UpstreamPrototype,
>(
  target: NormalizedPrototype,
  source: UpstreamPrototype,
  key: K,
  transform: (value: string) => string[],
): void {
  if (key in source) {
    const value = source[key];
    target[key] = (
      value && typeof value === 'string' ? transform(value) : []
    ) as NormalizedPrototype[K];
  }
}

/**
 * Assign a field to the target if it is defined in the source.
 *
 * Helper function to reduce repetition when normalizing optional fields.
 * Only assigns the field if its value is not `undefined`.
 *
 * @param target - The target object to assign to.
 * @param source - The source object to read from.
 * @param key - The property key to process.
 */
function assignIfDefined<
  K extends keyof NormalizedPrototype & keyof UpstreamPrototype,
>(target: NormalizedPrototype, source: UpstreamPrototype, key: K): void {
  const value = source[key];
  if (value !== undefined) {
    // Use type assertion as the type system cannot guarantee compatibility
    // between UpstreamPrototype[K] and NormalizedPrototype[K]
    target[key] = value as never;
  }
}

/**
 * Transform an upstream prototype object into the normalized shape.
 *
 * This function maps all fields from {@link UpstreamPrototype} to
 * {@link NormalizedPrototype}, applying the following transformations:
 *
 * - Pipe-separated string fields (tags, users, awards, events, materials)
 *   are split into arrays via {@link splitPipeSeparatedString}.
 * - Date fields (createDate, updateDate, releaseDate) are normalized
 *   using {@link normalizeProtoPediaTimestamp}, falling back to the
 *   original string if normalization fails.
 * - All other fields are copied as-is.
 *
 * @param prototype - The raw prototype object from the ProtoPedia API.
 * @returns A {@link NormalizedPrototype} instance with all fields
 *   transformed to the canonical shape.
 *
 * @example
 * ```ts
 * const upstream: UpstreamPrototype = {
 *   id: 123,
 *   prototypeNm: 'My Project',
 *   tags: 'IoT|AI|Robotics',
 *   users: 'user1|user2',
 *   createDate: '2024-01-01T00:00:00Z',
 *   // ...other fields
 * };
 *
 * const normalized = normalizePrototype(upstream);
 * // normalized.tags => ['IoT', 'AI', 'Robotics']
 * // normalized.users => ['user1', 'user2']
 * // normalized.createDate => Date or original string
 * ```
 */
export function normalizePrototype(
  prototype: UpstreamPrototype,
): NormalizedPrototype {
  const normalized: NormalizedPrototype = {
    id: prototype.id,
    prototypeNm: prototype.prototypeNm,
    teamNm: prototype.teamNm,
    users: prototype.users ? splitPipeSeparatedString(prototype.users) : [],
    status: prototype.status,
    releaseFlg: prototype.releaseFlg,
    createDate:
      normalizeProtoPediaTimestamp(prototype.createDate) ??
      prototype.createDate,
    updateDate:
      normalizeProtoPediaTimestamp(prototype.updateDate) ??
      prototype.updateDate,
    releaseDate:
      normalizeProtoPediaTimestamp(prototype.releaseDate) ??
      prototype.releaseDate,
    revision: prototype.revision,
    freeComment: prototype.freeComment,
    viewCount: prototype.viewCount,
    goodCount: prototype.goodCount,
    commentCount: prototype.commentCount,
    mainUrl: prototype.mainUrl,
    licenseType: prototype.licenseType,
    thanksFlg: prototype.thanksFlg,
  };

  // Optional fields - only set if defined or explicitly set to empty/null
  assignPipeSeparatedIfExists(
    normalized,
    prototype,
    'tags',
    splitPipeSeparatedString,
  );
  assignIfDefined(normalized, prototype, 'summary');
  assignIfDefined(normalized, prototype, 'createId');
  assignIfDefined(normalized, prototype, 'updateId');
  assignPipeSeparatedIfExists(
    normalized,
    prototype,
    'awards',
    splitPipeSeparatedString,
  );
  assignIfDefined(normalized, prototype, 'systemDescription');
  assignIfDefined(normalized, prototype, 'videoUrl');
  assignIfDefined(normalized, prototype, 'relatedLink');
  assignIfDefined(normalized, prototype, 'relatedLink2');
  assignIfDefined(normalized, prototype, 'relatedLink3');
  assignIfDefined(normalized, prototype, 'relatedLink4');
  assignIfDefined(normalized, prototype, 'relatedLink5');
  assignPipeSeparatedIfExists(
    normalized,
    prototype,
    'events',
    splitPipeSeparatedString,
  );
  assignIfDefined(normalized, prototype, 'officialLink');
  assignPipeSeparatedIfExists(
    normalized,
    prototype,
    'materials',
    splitPipeSeparatedString,
  );

  return normalized;
}
