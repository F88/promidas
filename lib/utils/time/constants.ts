/**
 * Time-related constants for ProtoPedia timestamp handling.
 *
 * @module utils/time/constants
 */

/**
 * JST (Japan Standard Time) offset in milliseconds.
 *
 * JST is UTC+9, which corresponds to 9 hours * 60 minutes * 60 seconds * 1000 ms.
 * This constant is used to convert JST timestamps (without explicit offset)
 * to UTC.
 */
export const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
