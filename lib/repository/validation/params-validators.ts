/**
 * Repository validator utilities.
 *
 * This module provides the RepositoryParamsValidator class for validating
 * repository method parameters in a centralized manner.
 *
 * @remarks
 * For snapshot validation, use {@link validateSerializableSnapshot} directly
 * from './validation/index.js' instead of methods in this class.
 */
import { ValidationError } from '../errors/validation-error.js';
import { prototypeIdSchema, sampleSizeSchema } from '../schemas/params.js';

/**
 * Validator class for repository operations.
 *
 * Provides centralized static validation methods for method parameters.
 * All methods throw {@link ValidationError} on invalid input.
 *
 * @remarks
 * This class separates validation concerns from business logic in
 * ProtopediaInMemoryRepositoryImpl, improving testability and maintainability.
 * All methods are static and stateless.
 *
 * For snapshot validation, use {@link validateSerializableSnapshot} directly
 * from './validation/index.js'.
 */
export class RepositoryParamsValidator {
  /**
   * Validate prototype ID parameter.
   *
   * @param id - Prototype ID to validate
   * @throws {ValidationError} If ID is invalid
   *
   * @example
   * ```ts
   * RepositoryParamsValidator.validatePrototypeId(123); // OK
   * RepositoryParamsValidator.validatePrototypeId(0);   // throws ValidationError
   * RepositoryParamsValidator.validatePrototypeId(-1);  // throws ValidationError
   * ```
   */
  static validatePrototypeId(id: number): void {
    const validation = prototypeIdSchema.safeParse(id);
    if (!validation.success) {
      throw new ValidationError(
        'Invalid prototype ID: must be a positive integer',
        'prototypeId',
        { cause: validation.error },
      );
    }
  }

  /**
   * Validate sample size parameter.
   *
   * @param size - Sample size to validate
   * @throws {ValidationError} If size is invalid
   *
   * @example
   * ```ts
   * RepositoryParamsValidator.validateSampleSize(10);  // OK
   * RepositoryParamsValidator.validateSampleSize(0);   // OK
   * RepositoryParamsValidator.validateSampleSize(-5);  // OK (handled by caller)
   * RepositoryParamsValidator.validateSampleSize(1.5); // throws ValidationError
   * ```
   */
  static validateSampleSize(size: number): void {
    const validation = sampleSizeSchema.safeParse(size);
    if (!validation.success) {
      throw new ValidationError(
        'Invalid sample size: must be an integer',
        'size',
        { cause: validation.error },
      );
    }
  }
}
