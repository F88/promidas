/**
 * Validation schema for NormalizedPrototype.
 *
 * This module provides a Zod schema for validating the structure
 * of normalized prototype objects.
 */
import { z } from 'zod';

/**
 * Validation schema for NormalizedPrototype.
 *
 * This schema validates the structure of a single prototype object.
 * Used internally for validating deserialized snapshot data.
 *
 * @remarks
 * This is a comprehensive schema covering all fields of NormalizedPrototype.
 * Optional fields are marked with .optional() and must be undefined (not null)
 * due to exactOptionalPropertyTypes: true.
 */
export const normalizedPrototypeSchema = z.object({
  /* ID */
  id: z.number().int().positive(),

  /* Editorial information  */
  createDate: z.string(),
  updateDate: z.string().optional(),
  releaseDate: z.string().optional(),
  createId: z.number().int().optional(),
  updateId: z.number().int().optional(),

  /**
   * Valid release flag code values.
   *
   * - 1: '下書き保存' (Draft) - Not accessible via public API
   * - 2: '一般公開' (Public) - Only this value appears in API responses
   * - 3: '限定共有' (Limited Sharing) - Not accessible via public API
   */
  releaseFlg: z.union([
    //
    z.literal(1),
    z.literal(2),
    z.literal(3),
  ]),

  /* Basic information */

  /**
   * Valid status code values.
   *
   * - 1: 'アイデア' (Idea)
   * - 2: '開発中' (In Development)
   * - 3: '完成' (Completed)
   * - 4: '供養' (Retired/Memorial)
   *
   * All four status values appear in public API responses.
   */
  status: z.union([
    //
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
  ]),

  prototypeNm: z.string(),
  summary: z.string(),
  freeComment: z.string(),
  systemDescription: z.string(),

  /** Users and Team */
  users: z.array(z.string()),
  teamNm: z.string(),

  /** Tags, Materials, Events, and Awards */
  tags: z.array(z.string()),
  materials: z.array(z.string()),
  events: z.array(z.string()),
  awards: z.array(z.string()),

  /* URLs */
  // URL of official site (if any)
  officialLink: z.string().optional(),
  // URL of YouTube or Vimeo video (if any)
  videoUrl: z.string().optional(),
  // URL of eyecatch image
  mainUrl: z.string(),
  // URLs of related link
  relatedLink: z.string().optional(),
  relatedLink2: z.string().optional(),
  relatedLink3: z.string().optional(),
  relatedLink4: z.string().optional(),
  relatedLink5: z.string().optional(),

  /* counts */
  viewCount: z.number().int(),
  goodCount: z.number().int(),
  commentCount: z.number().int(),

  /* Others */
  uuid: z.string().optional(),
  nid: z.string().optional(),
  revision: z.number().int().optional(),

  /**
   * Valid license type code values.
   *
   * - 0: 'なし' (None) - Not observed in API responses
   * - 1: '表示(CC:BY)' (Display with CC BY license) - All API responses have this value
   */
  licenseType: z
    .union([
      //
      z.literal(0),
      z.literal(1),
    ])
    .optional(),

  /**
   * Valid thanks flag code values.
   *
   * - 0: (Implicit) Message not yet shown - Rarely or never seen in API responses
   * - 1: '初回表示済' ("Thank you for posting" message shown) - Most common value
   * - undefined: Field not present in older prototypes (pre-thanksFlg era, ~3.26% of data)
   *
   * Note: Historical data may not include this field. Always handle undefined case.
   */
  thanksFlg: z
    .union([
      //
      z.literal(0),
      z.literal(1),
    ])
    .optional(),

  slideMode: z.number().int().optional(),
});
