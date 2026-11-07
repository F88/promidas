/**
 * Regression tests for Issue #152.
 *
 * Uses the real protopedia-api-v2-client (not mocked) to verify how a failed
 * read of the response body is classified, with and without the progress
 * wrapper.
 */
import { describe, expect, it, vi } from 'vitest';

import type { Logger } from '../../../../../logger/index.js';
import { ProtopediaApiCustomClient } from '../../../../client/protopedia-api-custom-client.js';

const silentLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

function createClient(
  status: number,
  readError: unknown,
  onProgress?: () => void,
): ProtopediaApiCustomClient {
  const fetchStub: typeof fetch = async () =>
    new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('{"results":['));
          controller.error(readError);
        },
      }),
      { status },
    );

  return new ProtopediaApiCustomClient({
    protoPediaApiClientOptions: {
      token: 'test-token',
      logger: silentLogger,
      fetch: fetchStub,
    },
    logger: silentLogger,
    progressLog: false,
    ...(onProgress !== undefined && { progressCallback: onProgress }),
  });
}

describe('ProtopediaApiCustomClient - SDK body read failure', () => {
  describe.each([
    ['without the progress wrapper', undefined],
    ['with the progress wrapper', () => {}],
  ])('%s', (_name, onProgress) => {
    it.each([
      ['a TypeError', new TypeError('Failed to fetch')],
      // Firefox rejects text() with this for a wrapped body.
      ['an AbortError', new DOMException('Aborted', 'AbortError')],
    ])(
      'reports %s on a 200 body as NETWORK_ERROR',
      async (_error, readError) => {
        const client = createClient(200, readError, onProgress);

        await expect(
          client.fetchPrototypes({ limit: 1 }),
        ).resolves.toMatchObject({
          ok: false,
          kind: 'network',
          code: 'NETWORK_ERROR',
        });
      },
    );

    it('keeps the status of an error response', async () => {
      const client = createClient(
        503,
        new TypeError('Failed to fetch'),
        onProgress,
      );

      await expect(client.fetchPrototypes({ limit: 1 })).resolves.toMatchObject(
        { ok: false, kind: 'http', status: 503 },
      );
    });
  });

  it('fires the error progress event before returning', async () => {
    const onProgress = vi.fn();
    const client = createClient(
      200,
      new TypeError('Failed to fetch'),
      onProgress,
    );

    await client.fetchPrototypes({ limit: 1 });

    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error' }),
    );
  });
});
