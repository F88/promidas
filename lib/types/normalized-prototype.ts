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
  /**
   * Unique prototype ID.
   *
   * This ID corresponds to the numeric identifier in the ProtoPedia URL.
   * For example, `1898` in `https://protopedia.net/prototype/1898`.
   */
  id: number;

  /**
   * Prototype name/title.
   *
   * **Edit screen**: 作品タイトル (required)
   *
   * @example
   * ```typescript
   * prototypeNm: "無限ProtoPedia"
   * ```
   */
  prototypeNm: string;

  /**
   * Array of tag names associated with this prototype.
   *
   * **Edit screen**: タグ
   * **Description**: プログラミング技術や作品を表すタグ、5個程度つけることでより多くの人に見てもらいやすくなります。
   * **Examples**: Objective-C, Python, 機械学習, 寿司, ねこ
   * **Recommendation**: ~5 tags for better discoverability
   *
   * **Source format**: Pipe-separated string
   * **Normalized format**: Array of strings
   *
   * @example
   * ```typescript
   * tags: ["GitHub Copilot", "MUGEN", "Next.js", "ProtoPedia API Ver 2.0", "Vercel"]
   * ```
   */
  tags?: string[];

  /** Team name that created this prototype */
  teamNm: string;

  /** Array of user names involved in this prototype */
  users: string[];

  /**
   * Brief summary/description of the prototype (catch copy).
   *
   * **Edit screen**: 概要 (required)
   *
   * This field contains a concise description or tagline that summarizes
   * the prototype's purpose or appeal. It is prominently displayed:
   * - At the top of the detail page (below the title)
   * - In card/list views as a preview
   * - In search results
   *
   * Typically 50-150 characters, focusing on engaging the reader.
   *
   * @example
   * ```typescript
   * // Catch copy (ID: 7759 - 無限ProtoPedia)
   * summary: "仕事中のおさぼりから酒宴のつまみにも、寝酒のお供に、気付けば夜更け、朝ぼらけ。予測不能な出会いが、創造性を刺激する。偶然の発見を楽しもう。"
   * ```
   */
  summary?: string;

  /**
   * Status code indicating the development stage of the prototype.
   *
   * **Edit screen**: 作品ステータス (required)
   * **Options**: アイデア / 開発中 / 完成 / 供養
   *
   * **Possible values**:
   * - `1`: 'アイデア' (Idea) - Concept stage
   * - `2`: '開発中' (In Development) - Work in progress
   * - `3`: '完成' (Completed) - Finished prototype
   * - `4`: '供養' (Retired/Memorial) - Discontinued or archived
   *
   * **API availability**: All four values appear in public API responses.
   * - Status 3 (完成) is most common (~57% of prototypes)
   * - Status 2 (開発中) is second (~35%)
   * - Status 1 (アイデア) appears in ~6%
   * - Status 4 (供養) is rare (~2%)
   *
   * @see {@link getPrototypeStatusLabel} for converting to human-readable labels
   */
  status: number;

  /**
   * Release flag indicating the publication status of the prototype.
   *
   * **Possible values**:
   * - `1`: '下書き保存' (Draft) - Saved as draft
   * - `2`: '一般公開' (Public) - Published publicly
   * - `3`: '限定共有' (Limited Sharing) - Shared with limited audience
   *
   * **API availability**: Only `2` (一般公開) appears in public API responses.
   * - The API exclusively returns publicly released prototypes
   * - Draft (1) and limited sharing (3) prototypes are not accessible via API
   * - All prototypes in API responses have `releaseFlg: 2`
   *
   * @see {@link getPrototypeReleaseFlagLabel} for converting to human-readable labels
   */
  releaseFlg: number;

  /** User ID who created this prototype */
  createId?: number;

  /** Creation date in ISO 8601 format (e.g., "2024-01-15T10:30:00Z") */
  createDate: string;

  /** User ID who last updated this prototype */
  updateId?: number;

  /** Last update date in ISO 8601 format (e.g., "2024-01-15T10:30:00Z") */
  updateDate: string;

  /** Release date in ISO 8601 format (e.g., "2024-01-15T10:30:00Z") */
  releaseDate: string;

  /** Revision number of this prototype */
  revision: number;

  /** Array of award names received by this prototype */
  awards?: string[];

  /**
   * Free-form story/description text about the prototype.
   *
   * **Edit screen**: ストーリー
   * **Description**: Markdown記法やHTMLで入力できます。作品の特徴や技術的こだわりなど、作品について伝えたいことを自由にお書きください。
   * **Additional note**: そして、最後にチームメンバーで共有している、このプロトタイプにかける、Wowなメッセージをご入力ください。
   * **Format**: HTML (Markdown is converted to HTML)
   *
   * This is the main content field where creators describe their prototype in detail,
   * including features, technical highlights, development story, and team messages.
   * It is displayed as the primary content on the prototype detail page.
   *
   * @example
   * ```typescript
   * freeComment: "# 無限ProtoPedia<br><br>無限のプロトタイプ。ひらめきは一瞬で。<br><br>[ProtoPedia（プロトペディア）](https://protopedia.net/)に登録されているプロトタイプを無限探索。..."
   * ```
   */
  freeComment: string;

  /**
   * Technical system description.
   *
   * **Edit screen**: システム構成
   * **Description**: どうやって作ったかを画像、Markdown記法やHTMLで解説ください。
   * **Format**: HTML (Markdown is converted to HTML)
   *
   * This field explains the technical architecture, implementation details,
   * or how the prototype was built. It may include diagrams, code snippets,
   * or step-by-step explanations.
   *
   * @example
   * ```typescript
   * systemDescription: "Access Modes:<br><br>- Web Browser: 標準アクセス。インストール不要で最新リソースを都度取得<br>- PWA App: インストール済みアイコンから起動<br><br>..."
   * ```
   */
  systemDescription?: string;

  /** Number of times this prototype has been viewed */
  viewCount: number;

  /** Number of "good" (likes) received */
  goodCount: number;

  /**
   * Number of comments received on this prototype.
   *
   * This field only contains the comment count. The actual comment content
   * is not included in prototype data and must be fetched separately via
   * dedicated comment APIs.
   *
   * @example
   * ```typescript
   * // 1 comment exists (ID: 7759 - 無限ProtoPedia)
   * commentCount: 1
   * ```
   */
  commentCount: number;

  /**
   * URL of the prototype introduction/demo video.
   *
   * **Edit screen**: 動画 (YouTube、もしくはVimeoのURLを入力ください。)
   *
   * This field contains a YouTube or Vimeo URL that showcases the prototype
   * in action. The video is embedded in the detail page's "動画" (Video) section.
   *
   * **Supported platforms**: YouTube, Vimeo
   * **Display location**: Detail page video section (embedded player)
   *
   * @example
   * ```typescript
   * // YouTube video (ID: 7759 - 無限ProtoPedia)
   * videoUrl: "https://youtu.be/hDv-pdD1PUY?si=OBIVx2d16J2sNgV1"
   *
   * // Alternative YouTube format
   * videoUrl: "https://www.youtube.com/watch?v=hDv-pdD1PUY"
   *
   * // Vimeo
   * videoUrl: "https://vimeo.com/123456789"
   * ```
   */
  videoUrl?: string;

  /**
   * URL of the main/eyecatch image (primary thumbnail).
   *
   * **Edit screen**: 画像 / アイキャッチ画像
   * **Note**: Up to 5 images can be registered; the 1st image becomes the main image.
   *
   * This image serves as the visual representation of the prototype across
   * ProtoPedia. It is displayed in:
   * - Prototype list/card views (thumbnail)
   * - Detail page hero/slideshow (first slide)
   * - Social media sharing previews
   *
   * The image is typically hosted on ProtoPedia's CDN (`protopedia.net/pic/...`).
   *
   * @example
   * ```typescript
   * // Eyecatch image (ID: 7759 - 無限ProtoPedia)
   * mainUrl: "https://protopedia.net/pic/a1cfe820-a8cc-40b5-9242-9fd0c4738743.png"
   * ```
   */
  mainUrl: string;

  /**
   * First related link URL.
   *
   * **Edit screen**: 関連リンク
   * **Description**: この作品に関係の深いページ（技術ブログ、イベントブログ、受賞記事、関連作品など）あれば入力ください。
   *
   * Related links provide additional resources, references, or related projects.
   * Up to 5 related links can be specified (relatedLink, relatedLink2-5).
   *
   * Common use cases:
   * - GitHub repository
   * - Technical blog posts
   * - Event blog posts
   * - Award announcements
   * - Related prototypes
   * - Project documentation
   * - Reference materials
   *
   * @example
   * ```typescript
   * // GitHub repository (ID: 7759 - 無限ProtoPedia)
   * relatedLink: "https://github.com/F88/mugen-protopedia"
   * ```
   */
  relatedLink?: string;

  /**
   * Second related link URL.
   *
   * @see {@link relatedLink} for details on related links
   *
   * @example
   * ```typescript
   * relatedLink2: "https://protopedia.net/"
   * ```
   */
  relatedLink2?: string;

  /**
   * Third related link URL.
   *
   * @see {@link relatedLink} for details on related links
   *
   * @example
   * ```typescript
   * relatedLink3: "https://protopediav2.docs.apiary.io/"
   * ```
   */
  relatedLink3?: string;

  /**
   * Fourth related link URL.
   *
   * @see {@link relatedLink} for details on related links
   *
   * @example
   * ```typescript
   * relatedLink4: "https://protopedia.net/prototype/7627"
   * ```
   */
  relatedLink4?: string;

  /**
   * Fifth related link URL.
   *
   * @see {@link relatedLink} for details on related links
   */
  relatedLink5?: string;

  /**
   * License type code indicating Creative Commons license display preference.
   *
   * **Edit screen**: ライセンスの設定 (注意: ※2022/5/23からライセンス表記が義務化されました。)
   * **Options**: 表示する / 表示しない
   *
   * **Possible values**:
   * - `0`: 'なし' (None) - No license display
   * - `1`: '表示(CC:BY)' - Display with Creative Commons Attribution license (CC BY 4.0+)
   *
   * **API availability**: Only `1` appears in public API responses.
   * - All publicly accessible prototypes have CC BY license (`licenseType: 1`)
   * - Value `0` (no license) is not observed in API responses
   * - This may be a requirement for public publication on ProtoPedia
   *
   * @see {@link getPrototypeLicenseTypeLabel} for converting to human-readable labels
   * @see https://protopedia.gitbook.io/helpcenter/info/2022.05.23
   */
  licenseType: number;

  /**
   * Thanks flag controlling the "Thank you for posting" message display.
   *
   * **Possible values**:
   * - `0`: (Implicit) Message not yet shown to the author
   * - `1`: '初回表示済' - "Thank you for posting" message already displayed
   *
   * **API availability**: Almost all prototypes have `thanksFlg: 1`.
   * - Value `0` is rarely or never observed in API responses
   * - This flag is primarily for internal UI control on ProtoPedia platform
   *
   * @see {@link getPrototypeThanksFlagLabel} for converting to human-readable labels
   */
  thanksFlg: number;

  /**
   * Array of event names this prototype participated in or was featured in.
   *
   * Events represent hackathons, showcases, or special collections where this
   * prototype was presented or featured.
   *
   * **Source format**: Pipe-separated string with format `"EventName@eventId"`
   * **Normalized format**: Array of strings preserving the `@eventId` suffix
   *
   * Note: The event ID after `@` may be empty for some events.
   *
   * @example
   * ```typescript
   * // Single event (ID: 7759 - 無限ProtoPedia)
   * events: ["ヒーローズ・リーグ 2025@hl2025"]
   *
   * // Multiple events
   * events: [
   *   "ProtoPediaの時間：紹介作品①（第1回〜50回まで）@protopedia-time50",
   *   "「祝！100回記念」ProtoPediaの時間@"
   * ]
   * ```
   */
  events?: string[];

  /**
   * Official project/application link URL.
   *
   * **Edit screen**: 作品のURL
   *
   * This field typically contains the main URL where the prototype can be accessed or used.
   * For web applications, this is the deployed application URL.
   * For hardware projects, this might link to a product page or demo site.
   *
   * @example
   * ```typescript
   * // Web application (ID: 7759 - 無限ProtoPedia)
   * officialLink: "https://mugen-pp.vercel.app/"
   * ```
   */
  officialLink?: string;

  /**
   * Array of material/tool names used in this prototype.
   *
   * **Edit screen**: 開発素材
   * **Description**: 使用するAPI、ツール、デバイスなどを3文字以上入力し、候補から選択ください。
   * **Examples**: Twilio, Unity, Arduino
   * **Input method**: Type 3+ characters and select from suggested candidates
   *
   * This field contains development materials, tools, libraries, APIs, and platforms
   * used to build the prototype. On the ProtoPedia website, these may be displayed
   * in categorized sections (e.g., "ツール", "API"), but the data itself is a flat list.
   *
   * **Source format**: Pipe-separated string (`"Next.js|Vercel|Arduino"`)
   * **Normalized format**: Array of strings (`["Next.js", "Vercel", "Arduino"]`)
   *
   * @example
   * ```typescript
   * // Web application materials (ID: 7759 - 無限ProtoPedia)
   * materials: [
   *   "Next.js",
   *   "ProtoPedia API Ver 2.0",
   *   "ProtoPedia API Ver 2.0 Client for Javascript",
   *   "Vercel"
   * ]
   * ```
   */
  materials?: string[];
};
