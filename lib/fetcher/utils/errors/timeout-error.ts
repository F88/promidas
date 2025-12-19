export class PromidasTimeoutError extends Error {
  readonly timeoutMs: number;

  constructor(timeoutMs: number, message?: string) {
    super(message ?? `Upstream request timed out after ${timeoutMs}ms`);
    this.name = 'PromidasTimeoutError';
    this.timeoutMs = timeoutMs;
  }
}
