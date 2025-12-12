/**
 * String parsing utilities for ProtoPedia API responses.
 *
 * @module fetcher/utils/string-parsers
 */

/**
 * Split a pipe-separated string into an array of trimmed segments.
 *
 * The ProtoPedia API returns certain fields (tags, users, awards, events,
 * materials) as pipe-delimited strings. This helper parses such a string
 * into a clean array.
 *
 * **Behavior:**
 * - Splits by pipe character (`|`)
 * - Trims whitespace from each segment
 * - **Filters out empty segments** (empty strings after trimming)
 * - Returns empty array for null, undefined, or empty string input
 *
 * @param value - The pipe-separated string to split. Returns empty array
 *   for null, undefined, or empty string.
 * @returns An array of non-empty trimmed string segments.
 *
 * @example
 * ```ts
 * splitPipeSeparatedString('tag1|tag2|tag3');
 * // => ['tag1', 'tag2', 'tag3']
 *
 * splitPipeSeparatedString('tag1 | tag2');
 * // => ['tag1', 'tag2'] (whitespace trimmed)
 *
 * splitPipeSeparatedString('a||b');
 * // => ['a', 'b'] (empty segment filtered out)
 *
 * splitPipeSeparatedString('tag1|  |tag2');
 * // => ['tag1', 'tag2'] (whitespace-only segment filtered out)
 *
 * splitPipeSeparatedString('');
 * // => []
 *
 * splitPipeSeparatedString(null);
 * // => []
 * ```
 */
export const splitPipeSeparatedString = (
  value: string | null | undefined,
): string[] => {
  if (typeof value !== 'string' || value.length === 0) {
    return [];
  }
  return value
    .split('|')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
};
