/**
 * Timestamp parsing utilities for ProtoPedia and W3C-DTF formats.
 *
 * @module utils/time/parse
 */

import { JST_OFFSET_MS } from './constants.js';

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
export function parseProtoPediaTimestamp(value: string): string | undefined {
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
 * Parse W3C Date and Time Formats (W3C-DTF) timestamps.
 *
 * Implements W3C-DTF Level 4-6, which are datetime formats with mandatory
 * timezone designator (TZD). This is a strict profile of ISO 8601 designed
 * for web standards.
 *
 * **Specification:** https://www.w3.org/TR/NOTE-datetime
 *
 * ## Supported Formats
 *
 * **Level 4: Complete date plus hours and minutes**
 * - Format: `YYYY-MM-DDThh:mmTZD`
 * - Examples: `2025-11-14T12:03Z`, `2025-11-14T12:03+09:00`
 *
 * **Level 5: Complete date plus hours, minutes and seconds**
 * - Format: `YYYY-MM-DDThh:mm:ssTZD`
 * - Examples: `2025-11-14T12:03:07Z`, `2025-11-14T12:03:07-05:00`
 *
 * **Level 6: Complete date plus hours, minutes, seconds and fractional seconds**
 * - Format: `YYYY-MM-DDThh:mm:ss.sTZD`
 * - Examples: `2025-11-14T12:03:07.123Z`, `2025-11-14T12:03:07.45+09:00`
 * - Fractional seconds: 1 or more digits (no maximum)
 *
 * ## Timezone Designator (TZD)
 *
 * - `Z` or `z`: UTC (Coordinated Universal Time)
 * - `+HH:MM` or `-HH:MM`: Offset from UTC (colon required per W3C-DTF)
 *
 * ## NOT Supported (returns undefined)
 *
 * - W3C-DTF Level 1-3 (year-only, year-month, date-only): `2025`, `2025-11`, `2025-11-14`
 * - Timestamps without TZD: `2025-11-14T12:03:07` (timezone-dependent)
 * - Offset without colon: `2025-11-14T12:03:07+0900` (not W3C-DTF compliant)
 * - Other ISO 8601 variants (week dates, ordinal dates, basic format)
 *
 * @param value - String to parse
 * @returns UTC ISO string if valid W3C-DTF Level 4-6, undefined otherwise
 *
 * @example
 * ```typescript
 * parseW3cDtfTimestamp('2025-11-14T12:03Z')
 * // => '2025-11-14T12:03:00.000Z'
 *
 * parseW3cDtfTimestamp('2025-11-14T12:03:07+09:00')
 * // => '2025-11-14T03:03:07.000Z'
 *
 * parseW3cDtfTimestamp('2025-11-14T12:03:07.123Z')
 * // => '2025-11-14T12:03:07.123Z'
 *
 * parseW3cDtfTimestamp('2025-11-14T12:03:07')
 * // => undefined (no TZD)
 *
 * parseW3cDtfTimestamp('2025-11-14')
 * // => undefined (date-only, Level 3)
 * ```
 */
export function parseW3cDtfTimestamp(value: string): string | undefined {
  if (typeof value !== 'string' || value.length === 0) {
    return undefined;
  }

  // W3C-DTF Level 4-6: datetime with mandatory TZD
  // Level 4: hh:mm + TZD (seconds optional)
  // Level 5: hh:mm:ss + TZD
  // Level 6: hh:mm:ss.s + TZD (fractional seconds: 1+ digits)
  // TZD: Z/z or ±HH:MM (colon required per W3C-DTF)
  const w3cDtfPattern =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?([Zz]|[+-]\d{2}:\d{2})$/;

  if (!w3cDtfPattern.test(value)) {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed.toISOString();
}
