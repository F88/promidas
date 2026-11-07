/**
 * Regression tests for Issue #150.
 *
 * Uses the real protopedia-api-v2-client (not mocked) to verify the headers
 * passed to fetch. Browsers block a request with a header that the CORS
 * configuration of the API does not allow, so promidas and the SDK must not
 * add one.
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

async function fetchRequestHeaders(userAgent?: string): Promise<Headers> {
  const fetchSpy = vi.fn<typeof fetch>(
    async () =>
      new Response(JSON.stringify({ results: [] }), {
        headers: { 'content-type': 'application/json' },
      }),
  );

  const client = new ProtopediaApiCustomClient({
    protoPediaApiClientOptions: {
      token: 'test-token',
      logger: silentLogger,
      fetch: fetchSpy,
      ...(userAgent !== undefined && { userAgent }),
    },
    logger: silentLogger,
    progressLog: false,
  });

  const result = await client.fetchPrototypes({ limit: 1 });
  expect(result.ok).toBe(true);
  expect(fetchSpy).toHaveBeenCalledTimes(1);

  return new Headers(fetchSpy.mock.calls[0]?.[1]?.headers);
}

describe('ProtopediaApiCustomClient - SDK request headers', () => {
  it('does not add User-Agent headers by default', async () => {
    const headers = await fetchRequestHeaders();

    expect(headers.has('user-agent')).toBe(false);
    expect(headers.has('x-client-user-agent')).toBe(false);
  });

  it('sends userAgent as the User-Agent header when specified', async () => {
    const headers = await fetchRequestHeaders('MyApp/1.0.0');

    expect(headers.get('user-agent')).toBe('MyApp/1.0.0');
    expect(headers.has('x-client-user-agent')).toBe(false);
  });
});
