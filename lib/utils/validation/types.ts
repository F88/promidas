/**
 * Validation result types.
 *
 * This module provides common type definitions for validation operations
 * that return Result types instead of throwing exceptions.
 */

/**
 * Validation success result.
 *
 * @template T - The type of the validated data
 */
export type ValidationSuccess<T> = {
  ok: true;
  data: T;
};

/**
 * Validation failure result.
 *
 * @template TErrorCode - The type of the error code (defaults to string)
 */
export type ValidationFailure<TErrorCode extends string = string> = {
  ok: false;
  code: TErrorCode;
  message: string;
};

/**
 * Validation error code for common data validation.
 */
export type ValidationErrorCode = 'VALIDATION_ERROR';

/**
 * Validation result type.
 *
 * A discriminated union type representing the result of a validation operation.
 * Returns either success with typed data or failure with error details.
 *
 * @template T - The type of the validated data on success
 * @template TErrorCode - The type of the error code (defaults to string)
 *
 * @example
 * ```ts
 * // With specific error code
 * type MyErrorCode = 'VALIDATION_ERROR' | 'PARSE_ERROR';
 * function validate(data: unknown): ValidationResult<MyType, MyErrorCode> {
 *   if (isValid(data)) {
 *     return { ok: true, data };
 *   } else {
 *     return { ok: false, code: 'VALIDATION_ERROR', message: 'Invalid data' };
 *   }
 * }
 *
 * // With default error code (string)
 * function simpleValidate(data: unknown): ValidationResult<MyType> {
 *   if (isValid(data)) {
 *     return { ok: true, data };
 *   } else {
 *     return { ok: false, code: 'ERROR', message: 'Invalid' };
 *   }
 * }
 * ```
 */
export type ValidationResult<T, TErrorCode extends string = string> =
  | ValidationSuccess<T>
  | ValidationFailure<TErrorCode>;
