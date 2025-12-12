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
import type { NormalizedPrototype } from '../../types/index.js';
import type { UpstreamPrototype } from '../types/prototype-api.types.js';

import { normalizeProtoPediaTimestamp } from './normalize-protopedia-timestamp.js';
import { splitPipeSeparatedString } from './string-parsers.js';

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
 * - Optional fields (introduced in protopedia-api-v2-client v3.0.0)
 *   are assigned appropriate default values when missing or null.
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
 *   createDate: '2024-01-01 00:00:00',
 *   // ...other fields
 * };
 *
 * const normalized = normalizePrototype(upstream);
 * // normalized.tags => ['IoT', 'AI', 'Robotics']
 * // normalized.users => ['user1', 'user2']
 * // normalized.createDate => '2023-12-31T15:00:00.000Z' (JST → UTC)
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
