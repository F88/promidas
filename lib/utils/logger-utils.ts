/**
 * Utility functions for logging.
 *
 * @module
 */

/**
 * Sanitizes an error object or any object for logging by redacting sensitive information.
 * Specifically, it redacts the 'token' field within nested objects.
 *
 * @param data The object or error to sanitize.
 * @returns A new object with sensitive data redacted, or the original data if not an object.
 */
export function sanitizeDataForLogging(data: unknown): unknown {
  if (data === null || typeof data !== 'object') {
    return data;
  }

  // Handle Error instances separately to ensure message and stack are preserved
  if (data instanceof Error) {
    const sanitizedError: Record<string, unknown> = {
      name: data.name,
      message: data.message,
      stack: data.stack,
    };

    // Copy other enumerable properties
    for (const key of Object.getOwnPropertyNames(data)) {
      if (!['name', 'message', 'stack'].includes(key)) {
        // @ts-expect-error accessing dynamic key
        sanitizedError[key] = data[key];
      }
    }

    // Deep clone and redact any nested tokens
    return JSON.parse(
      JSON.stringify(sanitizedError, (key, value) => {
        if (key === 'token' && typeof value === 'string') {
          return '***';
        }
        return value;
      }),
    );
  }

  // For plain objects, deep clone and redact sensitive fields
  return JSON.parse(
    JSON.stringify(data, (key, value) => {
      if (key === 'token' && typeof value === 'string') {
        return '***';
      }
      return value;
    }),
  );
}
