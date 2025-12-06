/**
 * @module protopedia/utils/utils
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

import type { NormalizedPrototype } from '../../core/types';

import { normalizeProtoPediaTimestamp } from './time';

/**
 * Alias for the upstream prototype shape returned by the ProtoPedia SDK.
 *
 * This type represents a single prototype object as delivered by the
 * `listPrototypes` API response. It is the input to
 * {@link normalizePrototype}.
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
  if ('tags' in prototype)
    normalized.tags = prototype.tags
      ? splitPipeSeparatedString(prototype.tags)
      : [];
  if (prototype.summary !== undefined) normalized.summary = prototype.summary;
  if (prototype.createId !== undefined)
    normalized.createId = prototype.createId;
  if (prototype.updateId !== undefined)
    normalized.updateId = prototype.updateId;
  if ('awards' in prototype)
    normalized.awards = prototype.awards
      ? splitPipeSeparatedString(prototype.awards)
      : [];
  if (prototype.systemDescription !== undefined)
    normalized.systemDescription = prototype.systemDescription;
  if (prototype.videoUrl !== undefined)
    normalized.videoUrl = prototype.videoUrl;
  if (prototype.relatedLink !== undefined)
    normalized.relatedLink = prototype.relatedLink;
  if (prototype.relatedLink2 !== undefined)
    normalized.relatedLink2 = prototype.relatedLink2;
  if (prototype.relatedLink3 !== undefined)
    normalized.relatedLink3 = prototype.relatedLink3;
  if (prototype.relatedLink4 !== undefined)
    normalized.relatedLink4 = prototype.relatedLink4;
  if (prototype.relatedLink5 !== undefined)
    normalized.relatedLink5 = prototype.relatedLink5;
  if ('events' in prototype)
    normalized.events = prototype.events
      ? splitPipeSeparatedString(prototype.events)
      : [];
  if (prototype.officialLink !== undefined)
    normalized.officialLink = prototype.officialLink;
  if ('materials' in prototype)
    normalized.materials = prototype.materials
      ? splitPipeSeparatedString(prototype.materials)
      : [];

  return normalized;
}
