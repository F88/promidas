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
 * Normalize a ProtoPedia timestamp to a UTC ISO 8601 string.
 *
 * The ProtoPedia API currently returns date fields (createDate, updateDate,
 * releaseDate) as JST timestamps without explicit timezone markers.
 * This function:
 *
 * 1. Returns `null` if the input is `null`, `undefined`, or an empty string.
 * 2. If the timestamp already includes an explicit offset (e.g., 'Z' or
 *    '+09:00'), parses it directly and converts to UTC ISO format.
 * 3. Otherwise, assumes the timestamp is in JST, parses its components,
 *    subtracts {@link JST_OFFSET_MS}, and produces a UTC ISO string.
 *
 * This function is designed to be forward-compatible: if ProtoPedia begins
 * sending explicit offsets in the future, this logic will handle them
 * automatically.
 *
 * @param value - The timestamp string from the ProtoPedia API.
 * @returns A UTC ISO 8601 string (ending in 'Z'), or `null` if the input
 *   is invalid or cannot be parsed.
 *
 * @example
 * ```ts
 * // JST timestamp without offset (current ProtoPedia format)
 * normalizeProtoPediaTimestamp('2024-01-15 12:34:56');
 * // => '2024-01-15T03:34:56.000Z' (JST 12:34:56 => UTC 03:34:56)
 *
 * // Timestamp with explicit offset (future-proof)
 * normalizeProtoPediaTimestamp('2024-01-15T12:34:56+09:00');
 * // => '2024-01-15T03:34:56.000Z'
 *
 * // Already UTC
 * normalizeProtoPediaTimestamp('2024-01-15T03:34:56Z');
 * // => '2024-01-15T03:34:56.000Z'
 *
 * // Invalid input
 * normalizeProtoPediaTimestamp('');
 * // => null
 * ```
 */
export function normalizeProtoPediaTimestamp(
  value: string | null | undefined,
): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed === '') {
    return null;
  }

  const isoCandidate = trimmed.includes('T')
    ? trimmed
    : trimmed.replace(' ', 'T');

  const hasExplicitOffset =
    isoCandidate.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(isoCandidate);

  if (hasExplicitOffset) {
    const parsedWithOffset = new Date(isoCandidate);
    if (!Number.isNaN(parsedWithOffset.getTime())) {
      return parsedWithOffset.toISOString();
    }
  }

  const match = isoCandidate.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?$/,
  );

  if (!match) {
    return null;
  }

  const [, y, m, d, hh, mm, ss, fractional] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  const hour = Number(hh);
  const minute = Number(mm);
  const second = Number(ss);
  const milli = (() => {
    if (!fractional) {
      return 0;
    }
    const padded = `${fractional}`.padEnd(3, '0').slice(0, 3);
    const parsed = Number(padded);
    return Number.isNaN(parsed) ? 0 : parsed;
  })();

  if (
    [year, month, day, hour, minute, second].some((part) => Number.isNaN(part))
  ) {
    return null;
  }

  // ProtoPedia の既存レスポンスは JST 起点で、UTC へ換算するために固定オフセットを引く
  const utcMs =
    Date.UTC(year, month - 1, day, hour, minute, second, milli) - JST_OFFSET_MS;
  if (!Number.isFinite(utcMs)) {
    return null;
  }

  const iso = new Date(utcMs).toISOString();
  return iso;
}
