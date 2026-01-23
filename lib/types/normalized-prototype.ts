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
 * - **Immutability** - All fields and arrays are strictly readonly
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
import type {
  StatusCode,
  ReleaseFlagCode,
  LicenseTypeCode,
  ThanksFlagCode,
} from './codes.js';

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
 * ## Type Safety & Immutability
 *
 * - **Readonly**: All properties and array fields are `readonly` to enforce immutability.
 * - **Exact Optional**: Uses `exactOptionalPropertyTypes: true` (`Type?: undefined | Type`)
 *   to distinguish between missing keys and undefined values.
 *
 * @see {@link normalizePrototype} for the transformation logic
 */
export type NormalizedPrototype = {
  /* ID */
  readonly id: number;

  /* Editorial information  */
  readonly createDate: string;
  readonly updateDate?: undefined | string;
  readonly releaseDate?: undefined | string;
  readonly createId?: undefined | number;
  readonly updateId?: undefined | number;
  readonly releaseFlg: ReleaseFlagCode;

  /* Basic information */
  readonly status: StatusCode;
  readonly prototypeNm: string;
  readonly summary: string;
  readonly freeComment: string;
  readonly systemDescription: string;

  /** Users and Team */
  readonly users: readonly string[];
  readonly teamNm: string;

  /** Tags, Materials, Events, and Awards */
  readonly tags: readonly string[];
  readonly materials: readonly string[];
  readonly events: readonly string[];
  readonly awards: readonly string[];

  /* URLs */
  // URL of official site (if any)
  readonly officialLink?: undefined | string;
  // URL of YouTube or Vimeo video (if any)
  readonly videoUrl?: undefined | string;
  // URL of eyecatch image
  readonly mainUrl: string;
  // URLs of related link
  readonly relatedLink?: undefined | string;
  readonly relatedLink2?: undefined | string;
  readonly relatedLink3?: undefined | string;
  readonly relatedLink4?: undefined | string;
  readonly relatedLink5?: undefined | string;
  /* counts */
  readonly viewCount: number;
  readonly goodCount: number;
  readonly commentCount: number;

  /* Others */
  readonly uuid?: undefined | string;
  readonly nid?: undefined | string;
  readonly revision?: undefined | number;
  readonly licenseType?: undefined | LicenseTypeCode;
  readonly thanksFlg?: undefined | ThanksFlagCode;
  readonly slideMode?: undefined | number;
};
