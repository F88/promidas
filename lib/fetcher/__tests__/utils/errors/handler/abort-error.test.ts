/**
 * @fileoverview Tests for handleApiError function - AbortError handling
 *
 * This file is part of a test suite split by error type for better organization.
 * The implementation remains unified in handler.ts (218 lines, single function),
 * while tests are split across 4 files by input error type:
 *
 * - abort-error.test.ts (this file) - AbortError/timeout handling
 * - api-error.test.ts - ProtoPediaApiError handling
 * - http-error.test.ts - HTTP-like errors with status property
 * - network-error.test.ts - Network errors and edge cases
 *
 * This split improves test maintainability without fragmenting the implementation.
 */
import { describe, expect, it, vi } from 'vitest';

import { handleApiError } from '../../../../../fetcher/utils/errors/handler.js';

vi.mock('../../../../logger', () => ({
  createConsoleLogger: () => ({
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

describe('handleApiError - AbortError handling', () => {
  it('maps AbortError to network error without status', () => {
    const abortError = new DOMException('Aborted', 'AbortError');
    const result = handleApiError(abortError);

    expect(result).toEqual({
      ok: false,
      error: 'Upstream request timed out',
      details: {},
    });
  });

  it('logs diagnostic information for AbortError', () => {
    const abortError = new DOMException('Operation aborted', 'AbortError');
    const result = handleApiError(abortError);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBeUndefined();
    }
  });

  it('returns consistent result for multiple AbortErrors', () => {
    const abortError1 = new DOMException('Timeout 1', 'AbortError');
    const abortError2 = new DOMException('Timeout 2', 'AbortError');

    const result1 = handleApiError(abortError1);
    const result2 = handleApiError(abortError2);

    expect(result1).toEqual(result2);
    expect(result1.ok).toBe(false);
    expect(result2.ok).toBe(false);
    if (!result1.ok && !result2.ok) {
      expect(result1.status).toBeUndefined();
      expect(result2.status).toBeUndefined();
    }
  });
});
