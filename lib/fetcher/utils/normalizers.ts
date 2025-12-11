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
export function normalizePrototype(p: UpstreamPrototype): NormalizedPrototype {
  const normalized = {
    /* ID */
    id: p.id,

    /* Editorial information  */
    // Always ProtoPedia format → UTC ISO string
    createDate: normalizeProtoPediaTimestamp(p.createDate) ?? p.createDate,
    // Always ProtoPedia format → UTC ISO string
    updateDate: normalizeProtoPediaTimestamp(p.updateDate) ?? p.updateDate,
    // ProtoPedia format → UTC ISO string, null or undefined → undefined
    releaseDate: normalizeProtoPediaTimestamp(p.releaseDate) ?? undefined,
    createId: p.createId,
    updateId: p.updateId,
    releaseFlg: p.releaseFlg ?? 2 /* Default to 'Released' */,

    /* Basic information */
    status: p.status,
    prototypeNm: p.prototypeNm,
    summary: p.summary ?? '',
    freeComment: p.freeComment ?? '',
    systemDescription: p.systemDescription ?? '',

    /** Users and Team */
    users: p.users ? splitPipeSeparatedString(p.users) : [],
    teamNm: p.teamNm ?? '',

    /** Tags, Materials, Events, and Awards */
    tags: p.tags ? splitPipeSeparatedString(p.tags) : [],
    materials: p.materials ? splitPipeSeparatedString(p.materials) : [],
    events: p.events ? splitPipeSeparatedString(p.events) : [],
    awards: p.awards ? splitPipeSeparatedString(p.awards) : [],

    /* URLs */
    officialLink: p.officialLink,
    videoUrl: p.videoUrl,
    mainUrl: p.mainUrl,
    relatedLink: p.relatedLink,
    relatedLink2: p.relatedLink2,
    relatedLink3: p.relatedLink3,
    relatedLink4: p.relatedLink4,
    relatedLink5: p.relatedLink5,

    /* counts */
    viewCount: p.viewCount,
    goodCount: p.goodCount,
    commentCount: p.commentCount,

    /* Others */
    uuid: p.uuid,
    nid: p.nid,
    revision: p.revision ?? 0,
    licenseType: p.licenseType ?? 1,
    thanksFlg: p.thanksFlg ?? 0,
    slideMode: p.slideMode,
  } satisfies NormalizedPrototype;

  return normalized;
}
