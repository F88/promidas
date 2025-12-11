/**
 * Normalized prototype data structure.
 */
export type NormalizedPrototype = {
  /* ID */
  id: number;

  /* Editorial information  */
  createDate: string;
  updateDate?: string;
  releaseDate?: string;
  createId?: number;
  updateId?: number;
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
  officialLink?: string;
  // URL of YouTube or Vimeo video (if any)
  videoUrl?: string;
  // URL of eyecatch image
  mainUrl: string;
  // URLs of related link
  relatedLink?: string;
  relatedLink2?: string;
  relatedLink3?: string;
  relatedLink4?: string;
  relatedLink5?: string;

  /* counts */
  viewCount: number;
  goodCount: number;
  commentCount: number;

  /* Others */
  uuid?: string;
  nid?: string;
  revision?: number;
  licenseType?: number;
  thanksFlg?: number;
  slideMode?: number;
};
