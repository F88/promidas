/**
 * Utility Functions and Data Converters.
 *
 * This module provides a comprehensive set of utility functions for working with
 * ProtoPedia data, including type-safe converters, time parsing, configuration
 * merging, and secure logging utilities.
 *
 * ## Data Converters
 *
 * Transform ProtoPedia API numeric codes into human-readable labels:
 *
 * - {@link getPrototypeStatusLabel} — Convert status code to label (e.g., `1` → `'公開'`)
 * - {@link getPrototypeReleaseFlagLabel} — Convert release flag to label (e.g., `1` → `'フリー'`)
 * - {@link getPrototypeThanksFlagLabel} — Convert thanks flag to label (e.g., `1` → `'受付中'`)
 * - {@link getPrototypeLicenseTypeLabel} — Convert license type to label (e.g., `1` → `'CC BY'`)
 *
 * ## Time Utilities
 *
 * Parse and normalize ProtoPedia timestamps:
 *
 * - {@link parseProtoPediaTimestamp} — Parse JST timestamps to UTC ISO-8601
 * - {@link parseW3cDtfTimestamp} — Parse W3C-DTF timestamps to UTC ISO-8601
 * - {@link JST_OFFSET_MS} — JST timezone offset constant (9 hours in milliseconds)
 *
 * ## Configuration Utilities
 *
 * Deep merge configuration objects safely:
 *
 * - {@link deepMerge} — Deep merge with circular reference protection and prototype pollution prevention
 * - {@link isPlainObject} — Type guard for plain JavaScript objects
 *
 * ## Logging Utilities
 *
 * Sanitize data for secure logging:
 *
 * - {@link sanitizeDataForLogging} — Redact sensitive data and handle circular references
 *
 * ## Dependencies
 *
 * This module intentionally depends on `lib/types` for data structures. This is
 * a correct architectural dependency, as utilities often operate on defined data
 * types. This design ensures type-safe utility operations.
 *
 * ## Standalone Usage
 *
 * All utilities can be used independently without the full repository layer:
 *
 * @example
 * ```typescript
 * import {
 *   getPrototypeStatusLabel,
 *   parseProtoPediaTimestamp,
 *   deepMerge,
 *   sanitizeDataForLogging,
 * } from '@f88/promidas/utils';
 *
 * // Convert status code
 * const label = getPrototypeStatusLabel(1); // => '公開'
 *
 * // Parse timestamp
 * const isoDate = parseProtoPediaTimestamp('2025-11-14 12:03:07.0');
 * // => '2025-11-14T03:03:07.000Z'
 *
 * // Merge configurations
 * const config = deepMerge(defaults, overrides);
 *
 * // Sanitize for logging
 * const safe = sanitizeDataForLogging({ token: 'secret', data: 'visible' });
 * // => { token: '[REDACTED]', data: 'visible' }
 * ```
 *
 * @module
 * @see https://protopedia.gitbook.io/helpcenter/info/2022.05.23 for ProtoPedia field specifications
 */

// Data Converters
export {
  getPrototypeStatusLabel,
  getPrototypeReleaseFlagLabel,
  getPrototypeThanksFlagLabel,
  getPrototypeLicenseTypeLabel,
} from './converters/index.js';

// Time Utilities
export {
  JST_OFFSET_MS,
  parseProtoPediaTimestamp,
  parseW3cDtfTimestamp,
} from './time/index.js';

// Configuration Utilities
export { deepMerge, isPlainObject } from './deep-merge.js';

// Logging Utilities
export { sanitizeDataForLogging } from './logger-utils.js';
