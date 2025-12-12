/**
 * @module protopedia/utils/time
 *
 * Time normalization utilities for ProtoPedia timestamps.
 *
 * The ProtoPedia API returns timestamps in JST (Japan Standard Time)
 * without explicit timezone offsets. This module converts such timestamps
 * into UTC ISO 8601 strings for consistent, timezone-agnostic handling
 * throughout the library.
 *
 * Key responsibilities:
 * - Detecting whether an upstream timestamp includes an explicit offset
 *   or is in JST without offset notation.
 * - Converting JST-based timestamps to UTC by subtracting the JST offset.
 * - Producing standard ISO 8601 UTC strings (ending in 'Z').
 *
 * Update this module if ProtoPedia changes its timestamp format.
 */

/**
 * JST (Japan Standard Time) offset in milliseconds.
 *
 * JST is UTC+9, which corresponds to 9 hours * 60 minutes * 60 seconds * 1000 ms.
 * This constant is used to convert JST timestamps (without explicit offset)
 * to UTC.
 */
export const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * Parse ProtoPedia timestamp (JST without explicit timezone offset).
 *
 * ProtoPedia timestamps are JST-based timestamps without explicit timezone offset.
 * Current format: `YYYY-MM-DD HH:MM:SS.0` (space separator, `.0` for zero milliseconds)
 * Example: `2025-11-14 12:03:07.0`
 *
 * ## Fractional Seconds Support
 *
 * Currently, ProtoPedia API outputs `.0` (single digit, no sub-second precision).
 * However, this parser accepts any number of fractional digits to accommodate
 * future API changes:
 *
 * - Current: `2025-10-08 18:03:48.0` (1 digit)
 * - Future possibilities:
 *   - Milliseconds: `2025-10-08 18:03:48.123` (3 digits)
 *   - Microseconds: `2025-10-08 18:03:48.123456` (6 digits)
 *   - Nanoseconds: `2025-10-08 18:03:48.123456789` (9 digits)
 *
 * The regex pattern `\.(\d+)` accepts 1 or more digits to support all these cases,
 * as the underlying Java implementation may begin storing sub-second precision
 * in the database.
 *
 * @param value - String to parse
 * @returns UTC ISO string if valid ProtoPedia timestamp, undefined otherwise
 */
export function parseAsProtoPediaTimestamp(value: string): string | undefined {
  if (typeof value !== 'string' || value.length === 0) {
    return undefined;
  }

  // Pattern matches current format and future sub-second precision:
  // - Current: .0 (1 digit)
  // - Future: .123 (milliseconds), .123456 (microseconds), .123456789 (nanoseconds)
  // The `\.(\d+)` pattern accepts 1 or more digits to accommodate potential
  // database schema changes in the underlying Java implementation.
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})\.(\d+)$/,
  );

  if (!match) {
    return undefined;
  }

  const [, y, m, d, hh, mm, ss, fractional] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  const hour = Number(hh);
  const minute = Number(mm);
  const second = Number(ss);
  // Fractional seconds are required in the format
  const padded = fractional!.padEnd(3, '0').slice(0, 3);
  const milli = Number(padded);

  if (
    [year, month, day, hour, minute, second, milli].some((part) =>
      Number.isNaN(part),
    )
  ) {
    return undefined;
  }
  // ProtoPedia の既存レスポンスは JST 起点でなので、UTC へ換算するために固定オフセットを引く
  const utcMs =
    Date.UTC(year, month - 1, day, hour, minute, second, milli) - JST_OFFSET_MS;
  if (!Number.isFinite(utcMs)) {
    return undefined;
  }

  const iso = new Date(utcMs).toISOString();
  return iso;
}

/**
 * Parse date string using JavaScript's Date parser.
 *
 * Accepts any format that `new Date()` can parse, including:
 * - ISO 8601 with timezone: `YYYY-MM-DDTHH:MM:SSZ` or `YYYY-MM-DDTHH:MM:SS±HH:MM`
 * - ISO 8601 without timezone: `YYYY-MM-DDTHH:MM:SS` (interpreted as local time)
 * - Date-only formats: `YYYY-MM-DD`
 * - Other formats supported by JavaScript Date parser
 *
 * @param value - String to parse
 * @returns UTC ISO string if valid, undefined otherwise
 */
export function parseDateTimeString(value: string): string | undefined {
  if (typeof value !== 'string' || value.trim() === '') {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed.toISOString();
}

/**
 * Normalize ProtoPedia timestamps to UTC ISO strings.
 *
 * This function attempts to parse timestamps using multiple strategies:
 *
 * 1. **ProtoPedia format** (`parseAsProtoPediaTimestamp`):
 *    - Current format: `YYYY-MM-DD HH:MM:SS.0` (space separator, `.0` for zero milliseconds)
 *    - Accepts variable-length fractional seconds for future compatibility
 *    - Timezone: Always treated as JST (UTC+9)
 *    - Returns UTC ISO string with JST offset subtracted
 *
 * 2. **Flexible date strings** (`parseDateTimeString`):
 *    - Accepts any format parseable by JavaScript's `Date` constructor
 *    - Includes ISO 8601 with timezone (Z or ±HH:MM), local time, etc.
 *    - Returns UTC ISO string based on the parsed result
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
 * for `parseAsProtoPediaTimestamp` and `parseDateTimeString`.
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
  const protoPediaResult = parseAsProtoPediaTimestamp(value);
  if (protoPediaResult !== undefined) {
    return protoPediaResult;
  }

  // Fall back to flexible date parsing (handles ISO 8601, local time, etc.)
  const dateStringResult = parseDateTimeString(value);
  if (dateStringResult !== undefined) {
    return dateStringResult;
  }

  // Return as-is if unparseable (allows downstream handling)
  return value;
}
