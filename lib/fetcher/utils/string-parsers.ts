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

/**
 * Split the pipe-separated `users` field into an array of usernames.
 *
 * The ProtoPedia API encodes `users` as `displayName@profileId` values joined
 * with `|`, and the `|` is **not escaped** when it appears inside a
 * `displayName`. A plain {@link splitPipeSeparatedString} therefore fragments
 * any username whose display name contains `|` (see issue #112, real data
 * prototype id 3571: `nisshi.dev | にっし@nishida24|...`).
 *
 * Instead of splitting on every `|`, this helper scans the string left to right
 * and decides, per `|`, whether it is a username delimiter. The recognizable
 * pattern (guaranteed by the encoding: a username is always `displayName@profileId`,
 * so it always contains `@`):
 *
 * > A `|` is a **username delimiter** iff an `@` has already appeared in the
 * > current (not-yet-closed) username. A `|` seen *before* the `@` is part of the
 * > `displayName` (literal), not a delimiter.
 *
 * Each username is emitted as the **exact substring** between delimiters, so
 * whitespace and display-name `|` are preserved verbatim — **nothing is trimmed**.
 * ProtoPedia itself keeps leading spaces (it renders `<h1> とりさん</h1>` for
 * `' とりさん@torisan'`), so trimming would corrupt the display name.
 *
 * The scan localizes the delimiter decision to a single point; if the upstream
 * encoding ever changes (e.g. escaping `|` inside a display name), only that
 * decision needs to change.
 *
 * **Notes / limits:**
 * - A `users` string with no `@` at all is not valid input; by the rule above no
 *   `|` is a delimiter, so the whole string is returned as one element (e.g.
 *   `'alice|bob'` -> `['alice|bob']`). Never occurs in real data.
 * - A display name containing both `@` and `|` (issue #112 "Case B", 0 in real
 *   data) is over-split — the `|` after the display's `@` is treated as a
 *   delimiter. Inherent ambiguity; unrecoverable here.
 *
 * @param value - The pipe-separated `users` string. Returns empty array for
 *   null, undefined, or empty string.
 * @returns An array of usernames, with `|`-fragmented display names kept whole
 *   and all whitespace preserved.
 *
 * @example
 * ```ts
 * splitPipeSeparatedUsers('ばんの@tomoki_banno|ひで@blue_islands');
 * // => ['ばんの@tomoki_banno', 'ひで@blue_islands']
 *
 * splitPipeSeparatedUsers('nisshi.dev | にっし@nishida24|もちゃ@mochagram');
 * // => ['nisshi.dev | にっし@nishida24', 'もちゃ@mochagram']  (issue #112, id 3571)
 *
 * splitPipeSeparatedUsers(' とりさん@torisan');
 * // => [' とりさん@torisan']  (leading space preserved, not trimmed)
 * ```
 */
export const splitPipeSeparatedUsers = (
  value: string | null | undefined,
): string[] => {
  if (typeof value !== 'string' || value.length === 0) {
    return [];
  }

  const users: string[] = [];
  let start = 0; // start index of the current username
  let sawAt = false; // has the current username contained `@` yet?
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === '@') {
      sawAt = true;
    } else if (ch === '|' && sawAt) {
      // Delimiter: the current username is complete. Emit the exact substring.
      users.push(value.slice(start, i));
      start = i + 1;
      sawAt = false;
    }
    // A `|` before the first `@` is a display-name character, not a delimiter.
  }
  users.push(value.slice(start)); // the final (or only) username
  return users;
};
