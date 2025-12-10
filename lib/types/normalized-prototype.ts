/**
 * Normalized prototype data structure.
 *
 * This type represents a ProtoPedia prototype after it has been processed
 * by the normalization layer. It guarantees:
 * - All pipe-separated strings are parsed into arrays
 * - Dates are normalized to ISO 8601 strings
 * - Optional fields are clearly typed
 *
 * ## Field Mapping from Upstream
 *
 * **Total fields**: 32 (from 35 upstream fields)
 *
 * **Excluded fields** (3): Internal SDK fields not exposed in normalized output
 * - `uuid` - Internal SDK identifier
 * - `nid` - Internal SDK identifier
 * - `slideMode` - Internal display mode flag
 *
 * **Type transformations** (5): Pipe-separated strings converted to arrays
 * - `tags`: `string` → `string[]`
 * - `users`: `string` → `string[]`
 * - `awards`: `string` → `string[]`
 * - `events`: `string` → `string[]`
 * - `materials`: `string` → `string[]`
 *
 * **Preserved fields** (27): Copied as-is from upstream with same type
 * - Scalar fields: `id`, `prototypeNm`, `teamNm`, `summary`, etc.
 * - Date fields: `createDate`, `updateDate`, `releaseDate` (normalized to ISO 8601)
 * - Count fields: `viewCount`, `goodCount`, `commentCount`
 * - URL fields: `videoUrl`, `mainUrl`, `relatedLink`, etc.
 */
export type NormalizedPrototype = {
  /* ID */
  id: number;

  /* Basic information */
  prototypeNm: string;

  tags?: string[];

  teamNm: string;

  users: string[];

  summary?: string;
  status: number;
  releaseFlg: number;

  /* Times */
  createId?: number;
  createDate: string;
  updateId?: number;
  updateDate: string;
  releaseDate: string;

  revision: number;

  awards?: string[];

  freeComment: string;
  systemDescription?: string;

  // counts
  viewCount: number;
  goodCount: number;
  commentCount: number;

  // URLs
  videoUrl?: string;

  /* URL of eyecatch image */
  mainUrl: string;

  /* URLs of related link */
  relatedLink?: string;
  relatedLink2?: string;
  relatedLink3?: string;
  relatedLink4?: string;
  relatedLink5?: string;

  // License
  licenseType: number;

  // Others
  thanksFlg: number;

  events?: string[];

  officialLink?: string;

  materials?: string[];
};
