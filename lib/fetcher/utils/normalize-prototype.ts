/**
 * Prototype normalization utilities for ProtoPedia API responses.
 *
 * @module fetcher/utils/normalize-prototype
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
 * **Pipe-separated fields** (split into trimmed arrays):
 * - tags, users, awards, events, materials
 * - Uses {@link splitPipeSeparatedString}
 * - Empty segments filtered out
 * - null/undefined → empty array
 *
 * **Timestamp fields** (normalized to UTC ISO strings):
 * - createDate, updateDate: ProtoPedia JST format → UTC
 * - releaseDate: ProtoPedia JST format → UTC, null/undefined → undefined
 * - Uses {@link normalizeProtoPediaTimestamp}
 * - Fallback to original string if parsing fails
 *
 * **Optional fields** (default values when null/undefined):
 * - releaseFlg: 2 (Released)
 * - revision: 0
 * - licenseType: 1
 * - thanksFlg: 0
 * - String fields (summary, freeComment, etc.): ''
 *
 * **Other fields**: Copied as-is
 *
 * @param prototype - The raw prototype object from the ProtoPedia API.
 * @returns A {@link NormalizedPrototype} instance with all fields normalized.
 *
 * @example
 * ```ts
 * const upstream: UpstreamPrototype = {
 *   id: 123,
 *   prototypeNm: 'My Project',
 *   tags: 'IoT | AI | Robotics',
 *   users: 'user1|user2',
 *   createDate: '2024-01-01 12:00:00.0',
 *   // ...other fields
 * };
 *
 * const normalized = normalizePrototype(upstream);
 * // normalized.tags => ['IoT', 'AI', 'Robotics']
 * // normalized.users => ['user1', 'user2']
 * // normalized.createDate => '2024-01-01T03:00:00.000Z' (JST → UTC)
 * ```
 */
export function normalizePrototype(p: UpstreamPrototype): NormalizedPrototype {
  // Precompute adjusted date fields

  // createDate: Required field - preserve original value if parsing fails
  // Always ProtoPedia format → UTC ISO string
  const adjustedCreateDate =
    normalizeProtoPediaTimestamp(p.createDate) ?? p.createDate;

  // updateDate: Optional field - preserve original value if parsing fails
  // Always ProtoPedia format → UTC ISO string
  const adjustedUpdateDate =
    normalizeProtoPediaTimestamp(p.updateDate) ?? p.updateDate;

  // releaseDate: Optional field - drop to undefined if parsing fails
  // This differs from createDate/updateDate: unparseable release dates
  // are treated as invalid/missing data rather than preserved as-is
  // ProtoPedia format → UTC ISO string, null or undefined → undefined
  const adjustedReleaseDate =
    normalizeProtoPediaTimestamp(p.releaseDate) ?? undefined;

  const normalized = {
    /* ID */
    id: p.id,

    /* Editorial information  */
    createDate: adjustedCreateDate,
    updateDate: adjustedUpdateDate,
    releaseDate: adjustedReleaseDate,
    createId: p.createId,
    updateId: p.updateId,
    releaseFlg: p.releaseFlg ?? 2 /* Default to 'Released' */,

    /* Basic information */
    status: p.status,
    prototypeNm: p.prototypeNm,
    summary: p.summary ?? '' /* Default to empty string */,
    freeComment: p.freeComment ?? '' /* Default to empty string */,
    systemDescription: p.systemDescription ?? '' /* Default to empty string */,

    /** Users and Team */
    users: splitPipeSeparatedString(p.users),
    teamNm: p.teamNm ?? '' /* Default to empty string */,

    /** Tags, Materials, Events, and Awards */
    tags: splitPipeSeparatedString(p.tags),
    materials: splitPipeSeparatedString(p.materials),
    events: splitPipeSeparatedString(p.events),
    awards: splitPipeSeparatedString(p.awards),

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
    revision: p.revision ?? 0 /* Default to 0 */,
    licenseType: p.licenseType ?? 1 /* Default to 1(表示(CC:BY)) */,
    thanksFlg: p.thanksFlg ?? 0 /* Default to 0(Message not yet shown) */,
    slideMode: p.slideMode,
  } satisfies NormalizedPrototype;
  return normalized;
}
