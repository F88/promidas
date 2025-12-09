/**
 * Normalized prototype data structure.
 *
 * This type represents a ProtoPedia prototype after it has been processed
 * by the normalization layer. It guarantees:
 * - All pipe-separated strings are parsed into arrays
 * - Dates are normalized to ISO 8601 strings
 * - Optional fields are clearly typed
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
