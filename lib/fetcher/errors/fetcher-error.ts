/**
 * Error classes for fetcher operations.
 *
 * @module
 */

export class PromidasTimeoutError extends Error {
  readonly timeoutMs: number;

  constructor(timeoutMs: number, message?: string) {
    super(message ?? `Upstream request timed out after ${timeoutMs}ms`);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'PromidasTimeoutError';
    this.timeoutMs = timeoutMs;
  }
}
