/**
 * Type definitions for ProtoPedia field value codes.
 *
 * These types define the valid numeric values for various ProtoPedia fields.
 *
 * @module utils/converters/types
 */

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
export type StatusCode = 1 | 2 | 3 | 4;

/**
 * Valid release flag code values.
 *
 * - 1: '下書き保存' (Draft) - Not accessible via public API
 * - 2: '一般公開' (Public) - Only this value appears in API responses
 * - 3: '限定共有' (Limited Sharing) - Not accessible via public API
 */
export type ReleaseFlagCode = 1 | 2 | 3;

/**
 * Valid license type code values.
 *
 * - 0: 'なし' (None) - Not observed in API responses
 * - 1: '表示(CC:BY)' (Display with CC BY license) - All API responses have this value
 */
export type LicenseTypeCode = 0 | 1;

/**
 * Valid thanks flag code values.
 *
 * - 0: (Implicit) Message not yet shown - Rarely or never seen in API responses
 * - 1: '初回表示済' ("Thank you for posting" message shown) - Most common value
 * - undefined: Field not present in older prototypes (pre-thanksFlg era, ~3.26% of data)
 *
 * Note: Historical data may not include this field. Always handle undefined case.
 */
export type ThanksFlagCode = 0 | 1 | undefined;
