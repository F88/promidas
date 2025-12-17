/**
 * Validation error thrown when invalid arguments are provided to repository methods.
 *
 * This error wraps Zod validation errors to hide the Zod dependency from users.
 *
 * @public
 */
export class ValidationError extends Error {
  /**
   * The name of the field that failed validation.
   */
  public readonly field: string;

  /**
   * Creates a new ValidationError.
   *
   * @param message - Human-readable error message
   * @param field - The name of the field that failed validation
   */
  constructor(message: string, field: string) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}
