/**
 * Checks if a value is a plain object.
 *
 * @param value - The value to check
 * @returns True if the value is a plain object
 */
export function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}

const MAX_MERGE_DEPTH = 100;

/**
 * Deep merge utility for configuration objects.
 * Recursively merges nested objects while preserving function references.
 *
 * This implementation includes protections against:
 * - Circular references (using path-based WeakSet tracking)
 * - Prototype pollution (skipping dangerous keys)
 * - Non-plain object corruption (only merging plain objects)
 * - Stack overflow from deep nesting (depth limit)
 * - Array reference sharing (shallow copying arrays)
 *
 * Note on Arrays:
 * Arrays are shallow copied. Objects inside arrays are shared by reference.
 * If you need deep cloning of array elements, this utility does not support it.
 *
 * Note on null/undefined:
 * - `undefined` values in source are skipped (target value preserved).
 * - `null` values in source overwrite target values.
 *
 * Note on Special Objects:
 * - `Object.create(null)` objects are treated as plain objects and merged.
 * - Symbol properties are ignored (as Object.keys is used).
 *
 * @param target - Target object
 * @param source - Source object to merge from
 * @param seen - Set of objects in the current recursion path to detect cycles
 * @param depth - Current recursion depth
 * @returns Merged object
 */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>,
  seen = new WeakSet<object>(),
  depth = 0,
): T {
  // Prevent stack overflow from excessively deep objects
  if (depth > MAX_MERGE_DEPTH) {
    console.warn(`deepMerge: Maximum depth (${MAX_MERGE_DEPTH}) exceeded`);
    return target;
  }

  const result: Record<string, unknown> = { ...target };

  for (const key of Object.keys(source)) {
    // Prevent prototype pollution
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }

    const sourceValue = source[key];
    const targetValue = target[key];

    if (isPlainObject(sourceValue)) {
      // Circular reference check (path-based)
      if (seen.has(sourceValue)) {
        continue;
      }
      seen.add(sourceValue);

      // Recursively merge nested objects
      // If targetValue is not a plain object, use an empty object as the base
      const nextTarget = isPlainObject(targetValue) ? targetValue : {};

      result[key] = deepMerge(
        nextTarget as Record<string, unknown>,
        sourceValue,
        seen,
        depth + 1,
      );

      // Remove from seen set after processing (backtracking)
      // This ensures we only detect cycles in the current path, allowing shared references
      seen.delete(sourceValue);
    } else if (sourceValue !== undefined) {
      // Handle Arrays: Create shallow copy to prevent reference sharing
      if (Array.isArray(sourceValue)) {
        result[key] = [...sourceValue];
      } else {
        // Directly assign primitives, functions, etc.
        result[key] = sourceValue;
      }
    }
  }

  return result as T;
}
