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
 * Checks if a given key name contains sensitive information patterns.
 *
 * This function uses a pre-compiled regex for efficient case-insensitive matching
 * against known sensitive key patterns (token, auth, password, secret, credential).
 *
 * @param key - The key name to check for sensitive patterns
 * @returns `true` if the key contains sensitive patterns, `false` otherwise
 *
 * @example
 * ```typescript
 * isSensitiveKey('apiToken'); // true
 * isSensitiveKey('username'); // false
 * isSensitiveKey('MY_SECRET_KEY'); // true
 * ```
 */
function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERN.test(key);
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
 * - Objects: recursively sanitized key by key with sensitive data redacted
 *
 * @param data - The data to sanitize (any type)
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
export function sanitizeDataForLogging(data: unknown): unknown {
  const seen = new WeakSet<object>();

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
        if (!['name', 'message', 'stack'].includes(key)) {
          if (isSensitiveKey(key)) {
            errorObj[key] = '***';
          } else {
            const errorValue = value as unknown as Record<string, unknown>;
            errorObj[key] = sanitize(errorValue[key], depth + 1);
          }
        }
      }
      return errorObj;
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
      if (isSensitiveKey(key)) {
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
