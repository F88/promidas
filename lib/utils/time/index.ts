/**
 * Time utilities for ProtoPedia timestamp handling.
 *
 * Provides parsers and normalizers for ProtoPedia-specific JST timestamps
 * and W3C-DTF (W3C Date and Time Formats) compliant timestamps.
 *
 * @module utils/time
 *
 * @example
 * ```typescript
 * import {
 *   parseProtoPediaTimestamp,
 *   parseW3cDtfTimestamp,
 *   normalizeProtoPediaTimestamp,
 *   JST_OFFSET_MS,
 * } from '@f88/promidas/utils/time';
 *
 * // Parse ProtoPedia format (JST)
 * parseProtoPediaTimestamp('2025-11-14 12:03:07.0');
 * // => '2025-11-14T03:03:07.000Z'
 *
 * // Parse W3C-DTF format
 * parseW3cDtfTimestamp('2025-11-14T12:03:07+09:00');
 * // => '2025-11-14T03:03:07.000Z'
 *
 * // Normalize any supported format
 * normalizeProtoPediaTimestamp('2025-11-14 12:03:07.0');
 * // => '2025-11-14T03:03:07.000Z'
 * ```
 */

export { JST_OFFSET_MS } from './constants.js';
export { parseProtoPediaTimestamp, parseW3cDtfTimestamp } from './parser.js';
