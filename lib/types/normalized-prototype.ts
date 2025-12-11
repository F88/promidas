/**
 * Normalized prototype data structure.
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
