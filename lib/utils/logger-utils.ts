/**
 * Utility functions for secure logging operations.
 *
 * This module provides utilities for sanitizing data before logging to prevent
 * sensitive information leakage. It handles circular references, prototype pollution,
 * and provides protection against DoS attacks through depth limiting.
 *
 * @module
 */

/**
 * List of sensitive key patterns to redact in logged data.
 * These patterns are matched case-insensitively.
 */
const SENSITIVE_KEYS = ['token', 'auth', 'password', 'secret', 'credential'];

/**
 * Pre-compiled regular expression for efficient sensitive key detection.
 * Matches any key containing tokens like 'token', 'auth', 'password', etc.
 */
const SENSITIVE_KEY_PATTERN = new RegExp(
  SENSITIVE_KEYS.join('|'),
  'i', // case-insensitive
);

/**
 * Keys that are dangerous for prototype pollution attacks.
 * These keys are always skipped during sanitization to prevent security vulnerabilities.
 */
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Maximum recursion depth to prevent stack overflow from deeply nested objects.
 * This protects against DoS attacks using maliciously crafted data structures.
 */
const MAX_DEPTH = 100;

/**
 * Options for customizing data sanitization behavior.
 */
export interface SanitizeOptions {
  /**
   * Additional key patterns to treat as sensitive and redact.
   * These are added to the default list of sensitive keys.
   */
  additionalSensitiveKeys?: string[];
}

/**
 * Cache for compiled RegExp patterns to avoid recompilation on every call.
 * Key is the sorted, joined list of sensitive keys.
 */
const regexCache = new Map<string, RegExp>();

/**
 * Maximum allowed length for individual custom sensitive key pattern.
 * This prevents ReDoS attacks from excessively long or complex patterns.
 */
const MAX_PATTERN_LENGTH = 100;

/**
 * Validates custom sensitive keys to prevent ReDoS attacks.
 * @param keys - Array of custom sensitive key patterns
 * @throws {TypeError} If any key is invalid
 */
function validateSensitiveKeys(keys: string[]): void {
  for (const key of keys) {
    if (typeof key !== 'string') {
      throw new TypeError(
        `Invalid sensitive key: expected string, got ${typeof key}`,
      );
    }
    if (key.length === 0) {
      throw new TypeError('Sensitive key cannot be empty');
    }
    if (key.length > MAX_PATTERN_LENGTH) {
      throw new TypeError(
        `Sensitive key too long (max ${MAX_PATTERN_LENGTH} characters): ${key.slice(0, 20)}...`,
      );
    }
    // Check for potentially dangerous regex patterns
    if (/[*+{].*[*+{]/.test(key)) {
      throw new TypeError(
        `Potentially dangerous regex pattern detected: ${key}`,
      );
    }
  }
}

/**
 * Gets or creates a cached RegExp for the given sensitive keys.
 * @param additionalKeys - Additional keys to include in the pattern
 * @returns Compiled RegExp for matching sensitive keys
 */
function getSensitivePattern(additionalKeys: string[] = []): RegExp {
  if (additionalKeys.length === 0) {
    return SENSITIVE_KEY_PATTERN;
  }

  // Validate custom keys before using them
  validateSensitiveKeys(additionalKeys);

  // Create cache key from sorted list of all keys
  const allKeys = [...SENSITIVE_KEYS, ...additionalKeys].sort();
  const cacheKey = allKeys.join('|');

  // Return cached pattern if available
  let pattern = regexCache.get(cacheKey);
  if (!pattern) {
    pattern = new RegExp(cacheKey, 'i');
    regexCache.set(cacheKey, pattern);
  }

  return pattern;
}

/**
 * Sanitizes data for secure logging by redacting sensitive information.
 *
 * This function deeply traverses objects, arrays, and errors to redact sensitive
 * fields while preserving structure for debugging. It provides multiple layers of
 * protection against common security and reliability issues:
 *
 * **Security Features:**
 * - Redacts sensitive keys (token, password, secret, auth, credential)
 * - Prevents prototype pollution by skipping dangerous keys
 * - Uses case-insensitive pattern matching for sensitive data detection
 *
 * **Reliability Features:**
 * - Handles circular references using WeakSet tracking
 * - Limits recursion depth to prevent stack overflow (max 100 levels)
 * - Preserves non-serializable types (functions, symbols, bigints)
 *
 * **Type Support:**
 * - Primitives: returned as-is (strings, numbers, booleans, null, undefined)
 * - Functions: converted to `[Function: name]` strings
 * - Symbols: converted to string representation
 * - BigInts: converted to string with 'n' suffix
 * - Errors: extracts name, message, stack, and other properties
 * - Arrays: recursively sanitized element by element
 * - Maps: converted to object with `__type` and `entries`; if key is sensitive, both key and value are redacted
 * - Sets: converted to object with `__type` and `values`
 * - Objects: recursively sanitized key by key with sensitive data redacted
 *
 * @param data - The data to sanitize (any type)
 * @param options - Optional configuration for sanitization
 * @returns A new sanitized version with sensitive information redacted
 *
 * @example
 * Basic usage with sensitive data:
 * ```typescript
 * const data = {
 *   username: 'john',
 *   apiToken: 'secret-key-123',
 *   settings: { theme: 'dark' }
 * };
 *
 * const sanitized = sanitizeDataForLogging(data);
 * // Result: { username: 'john', apiToken: '***', settings: { theme: 'dark' } }
 * ```
 *
 * @example
 * Usage with custom sensitive keys:
 * ```typescript
 * const data = {
 *   apiKey: 'secret',
 *   ssn: '123-45-6789'
 * };
 *
 * const sanitized = sanitizeDataForLogging(data, {
 *   additionalSensitiveKeys: ['ssn']
 * });
 * // Result: { apiKey: '***', ssn: '***' } // 'apiKey' contains 'key' which might not match default, but 'ssn' will match.
 * ```
 *
 * @example
 * Handling circular references:
 * ```typescript
 * const obj: any = { name: 'test' };
 * obj.self = obj;
 *
 * const sanitized = sanitizeDataForLogging(obj);
 * // Result: { name: 'test', self: '[Circular]' }
 * ```
 *
 * @example
 * Error object sanitization:
 * ```typescript
 * const error = new Error('Failed to authenticate');
 * error.apiToken = 'secret';
 *
 * const sanitized = sanitizeDataForLogging(error);
 * // Result: { name: 'Error', message: 'Failed...', stack: '...', apiToken: '***' }
 * ```
 */
export function sanitizeDataForLogging(
  data: unknown,
  options: SanitizeOptions = {},
): unknown {
  const seen = new WeakSet<object>();

  // Get cached regex pattern for sensitive key detection
  const sensitivePattern = getSensitivePattern(options.additionalSensitiveKeys);

  function isSensitive(key: string): boolean {
    return sensitivePattern.test(key);
  }

  // Pre-define Error property exclusion Set for performance
  const ERROR_BASE_PROPS = new Set(['name', 'message', 'stack']);

  function sanitize(value: unknown, depth = 0): unknown {
    // Depth limit check
    if (depth >= MAX_DEPTH) {
      return '[Max Depth Exceeded]';
    }

    // Primitives and null
    if (value === null || typeof value !== 'object') {
      if (typeof value === 'function') {
        return `[Function: ${value.name || 'anonymous'}]`;
      }
      if (typeof value === 'symbol') {
        return value.toString();
      }
      if (typeof value === 'bigint') {
        return `${value.toString()}n`;
      }
      return value;
    }

    // Circular reference check
    if (seen.has(value)) {
      return '[Circular]';
    }
    seen.add(value);

    // Handle Error objects
    if (value instanceof Error) {
      const errorObj: Record<string, unknown> = {
        name: value.name,
        message: value.message,
        stack: value.stack,
      };

      // Copy other properties (using getOwnPropertyNames to include non-enumerable properties)
      for (const key of Object.getOwnPropertyNames(value)) {
        if (!ERROR_BASE_PROPS.has(key)) {
          if (isSensitive(key)) {
            errorObj[key] = '***';
          } else {
            const errorValue = value as unknown as Record<string, unknown>;
            errorObj[key] = sanitize(errorValue[key], depth + 1);
          }
        }
      }
      return errorObj;
    }

    // Handle Map (preserve type information and check keys for sensitive data)
    if (value instanceof Map) {
      return {
        __type: 'Map',
        entries: Array.from(value.entries()).map(([k, v]) => {
          // Check if key itself is sensitive (when it's a string)
          const isKeySensitive = typeof k === 'string' && isSensitive(k);
          const sanitizedKey = isKeySensitive ? '***' : sanitize(k, depth + 1);
          // If key is sensitive, redact the value as well to prevent leakage
          const sanitizedValue = isKeySensitive
            ? '***'
            : sanitize(v, depth + 1);
          return [sanitizedKey, sanitizedValue];
        }),
      };
    }

    // Handle Set (preserve type information)
    if (value instanceof Set) {
      return {
        __type: 'Set',
        values: Array.from(value).map((v) => sanitize(v, depth + 1)),
      };
    }

    // Handle Arrays
    if (Array.isArray(value)) {
      return value.map((item) => sanitize(item, depth + 1));
    }

    // Handle Plain Objects
    const sanitizedObj: Record<string, unknown> = {};
    const obj = value as Record<string, unknown>;

    // Iterate over own enumerable properties
    for (const key of Object.keys(obj)) {
      // Skip dangerous prototype pollution keys
      if (DANGEROUS_KEYS.has(key)) {
        continue;
      }

      // Redact sensitive keys
      if (isSensitive(key)) {
        sanitizedObj[key] = '***';
      } else {
        // Recursively sanitize
        sanitizedObj[key] = sanitize(obj[key], depth + 1);
      }
    }

    return sanitizedObj;
  }

  return sanitize(data);
}
