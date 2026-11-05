/**
 * Regression tests for Issue #134.
 *
 * Uses the real protopedia-api-v2-client (not mocked) to verify that the
 * configured `timeoutMs` is honored by the SDK and that a timeout is
 * reported as TIMEOUT.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Logger } from '../../../../../logger/index.js';
import { ProtopediaApiCustomClient } from '../../../../client/protopedia-api-custom-client.js';

const SDK_DEFAULT_TIMEOUT_MS = 15_000;

const silentLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

/**
 * Create a fetch that responds after `delayMs`.
 *
 * Like the real fetch, it rejects with the signal's abort reason when the
 * request is aborted first (the SDK aborts with a `TimeoutError`).
 */
function createDelayedFetch(delayMs: number): typeof fetch {
  return (_url, init) =>
    new Promise<Response>((resolve, reject) => {
      const timerId = setTimeout(() => {
        resolve(
          new Response(JSON.stringify({ results: [] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      }, delayMs);

      init?.signal?.addEventListener(
        'abort',
        () => {
          clearTimeout(timerId);
          reject(init.signal?.reason);
        },
        { once: true },
      );
    });
}

function createClient(
  delayMs: number,
  timeoutMs?: number,
): ProtopediaApiCustomClient {
  return new ProtopediaApiCustomClient({
    protoPediaApiClientOptions: {
      token: 'test-token',
      logger: silentLogger,
      fetch: createDelayedFetch(delayMs),
      ...(timeoutMs !== undefined && { timeoutMs }),
    },
    logger: silentLogger,
    progressLog: false,
  });
}

describe('ProtopediaApiCustomClient - SDK timeout (Issue #134)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('succeeds when the response takes longer than the SDK default but within timeoutMs', async () => {
    const delayMs = SDK_DEFAULT_TIMEOUT_MS + 5_000;
    const client = createClient(delayMs, 30_000);

    const promise = client.fetchPrototypes({ limit: 1 });
    await vi.advanceTimersByTimeAsync(delayMs);

    await expect(promise).resolves.toEqual({ ok: true, data: [] });
  });

  it('fails with TIMEOUT when the response exceeds timeoutMs', async () => {
    const client = createClient(60_000, 30_000);

    const promise = client.fetchPrototypes({ limit: 1 });
    await vi.advanceTimersByTimeAsync(30_000);

    await expect(promise).resolves.toMatchObject({
      ok: false,
      kind: 'timeout',
      code: 'TIMEOUT',
    });
  });

  it('fails with TIMEOUT at the SDK default when timeoutMs is not set', async () => {
    const client = createClient(60_000);

    const promise = client.fetchPrototypes({ limit: 1 });
    await vi.advanceTimersByTimeAsync(SDK_DEFAULT_TIMEOUT_MS);

    await expect(promise).resolves.toMatchObject({
      ok: false,
      kind: 'timeout',
      code: 'TIMEOUT',
    });
  });

  it('throws TimeoutError from listPrototypes when the response exceeds timeoutMs', async () => {
    const client = createClient(60_000, 30_000);

    const promise = client.listPrototypes({ limit: 1 });
    const assertion = expect(promise).rejects.toMatchObject({
      name: 'TimeoutError',
    });
    await vi.advanceTimersByTimeAsync(30_000);

    await assertion;
  });
});
