/**
 * Normalized prototype type definition.
 *
 * This module defines the canonical {@link NormalizedPrototype} type used
 * throughout the library to represent ProtoPedia prototype data in a
 * standardized, type-safe format.
 *
 * ## Purpose
 *
 * The {@link NormalizedPrototype} type serves as the universal data model
 * for prototype information across all layers of this library:
 *
 * - **Fetcher layer** - Normalizes raw API responses into this type
 * - **Store layer** - Manages snapshots of this type in memory
 * - **Repository layer** - Provides access methods returning this type
 *
 * ## Key Features
 *
 * - **Type safety** - All fields are strongly typed with appropriate nullability
 * - **Consistency** - Ensures uniform data structure across the application
 * - **API compatibility** - Handles optional fields from protopedia-api-v2-client v3.0.0+
 * - **Strict typing** - Uses `exactOptionalPropertyTypes: true` for maximum safety
 *
 * ## Related Components
 *
 * - {@link normalizePrototype} - Function that transforms raw API data into this type
 * - {@link PrototypeInMemoryStore} - Store implementation using this type
 * - {@link ProtopediaApiCustomClient.fetchPrototypes} - Method that fetches and returns this type
 *
 * @module
 */

/**
 * Normalized prototype data structure.
 *
 * This type represents a ProtoPedia prototype in a standardized format,
 * with all upstream API fields normalized and transformed for consistent
 * use throughout the library.
 *
 * ## Field Transformations
 *
 * - **Pipe-separated strings** (tags, users, awards, events, materials)
 *   are converted to arrays
 * - **Date strings** (createDate, updateDate, releaseDate) are converted
 *   from JST to UTC ISO 8601 format
 * - **Optional fields** have appropriate default values applied when missing
 *
 * ## Type Safety
 *
 * This type uses TypeScript's `exactOptionalPropertyTypes: true` setting.
 * Optional properties are explicitly typed as `Type?: undefined | Type`
 * to ensure proper handling of undefined values.
 *
 * @see {@link normalizePrototype} for the transformation logic
 */
export type NormalizedPrototype = {
  /* ID */
  id: number;

  /* Editorial information  */
  createDate: string;
  updateDate?: undefined | string;
  releaseDate?: undefined | string;
  createId?: undefined | number;
  updateId?: undefined | number;
  releaseFlg: number;

  /* Basic information */
  status: number;
  prototypeNm: string;
  summary: string;
  freeComment: string;
  systemDescription: string;

  /** Users and Team */
  users: string[];
  teamNm: string;

  /** Tags, Materials, Events, and Awards */
  tags: string[];
  materials: string[];
  events: string[];
  awards: string[];

  /* URLs */
  // URL of official site (if any)
  officialLink?: undefined | string;
  // URL of YouTube or Vimeo video (if any)
  videoUrl?: undefined | string;
  // URL of eyecatch image
  mainUrl: string;
  // URLs of related link
  relatedLink?: undefined | string;
  relatedLink2?: undefined | string;
  relatedLink3?: undefined | string;
  relatedLink4?: undefined | string;
  relatedLink5?: undefined | string;
  /* counts */
  viewCount: number;
  goodCount: number;
  commentCount: number;

  /* Others */
  uuid?: undefined | string;
  nid?: undefined | string;
  revision?: undefined | number;
  licenseType?: undefined | number;
  thanksFlg?: undefined | number;
  slideMode?: undefined | number;
};
