/**
 * Timestamp normalization utilities for ProtoPedia.
 *
 * @module utils/time/normalize
 */

import { parseProtoPediaTimestamp } from '../../utils/time/parser.js';
import { parseW3cDtfTimestamp } from '../../utils/time/parser.js';

/**
 * Normalize ProtoPedia timestamps to UTC ISO strings.
 *
 * This function attempts to parse timestamps using multiple strategies:
 *
 * 1. **ProtoPedia format** (`parseProtoPediaTimestamp`):
 *    - Current format: `YYYY-MM-DD HH:MM:SS.0` (space separator, `.0` for zero milliseconds)
 *    - Accepts variable-length fractional seconds for future compatibility
 *    - Timezone: Always treated as JST (UTC+9)
 *    - Returns UTC ISO string with JST offset subtracted
 *
 * 2. **W3C-DTF with timezone** (`parseW3cDtfTimestamp`):
 *    - Accepts W3C-DTF Level 4-6 formats with mandatory timezone designator (TZD)
 *    - Examples: `2025-11-14T12:03Z`, `2025-11-14T12:03:07+09:00`
 *    - Returns UTC ISO string
 *    - **Does NOT accept** timezone-less formats or offset without colon
 *
 * 3. **Passthrough**:
 *    - If both parsers fail, returns the input value as-is
 *    - Allows downstream code to handle or log unexpected formats
 *
 * **Special cases**:
 * - `null` input → `null` output (preserves explicit null in API responses)
 * - `undefined` input → `undefined` output (preserves field absence)
 * - Empty string or invalid format → returned as-is
 *
 * **Testing note**:
 * This function is primarily tested through integration scenarios.
 * Detailed format validation and edge cases are covered by unit tests
 * for `parseProtoPediaTimestamp` and `parseW3cDtfTimestamp`.
 *
 * @param value - Timestamp string, null, or undefined from API response
 * @returns UTC ISO string, null, undefined, or original value
 *
 * @example
 * ```typescript
 * // ProtoPedia format (JST)
 * normalizeProtoPediaTimestamp('2025-11-14 12:03:07.0')
 * // => '2025-11-14T03:03:07.000Z'
 *
 * // ISO 8601 with timezone
 * normalizeProtoPediaTimestamp('2025-11-14T12:03:07+09:00')
 * // => '2025-11-14T03:03:07.000Z'
 *
 * // null/undefined preservation
 * normalizeProtoPediaTimestamp(null) // => null
 * normalizeProtoPediaTimestamp(undefined) // => undefined
 *
 * // Invalid format passthrough
 * normalizeProtoPediaTimestamp('invalid') // => 'invalid'
 * ```
 */
export function normalizeProtoPediaTimestamp(
  value: string | null | undefined,
): string | null | undefined {
  // Preserve null/undefined as-is
  if (value === null) {
    return null;
  }
  if (value === undefined) {
    return undefined;
  }

  // Try ProtoPedia format first (JST-based, strict format)
  const protoPediaResult = parseProtoPediaTimestamp(value);
  if (protoPediaResult !== undefined) {
    return protoPediaResult;
  }

  // Fall back to W3C-DTF parsing (handles ISO 8601 with explicit timezone)
  const w3cDtfResult = parseW3cDtfTimestamp(value);
  if (w3cDtfResult !== undefined) {
    return w3cDtfResult;
  }

  // Return as-is if unparseable (allows downstream handling)
  return value;
}
