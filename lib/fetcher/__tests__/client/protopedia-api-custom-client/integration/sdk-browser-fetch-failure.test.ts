/**
 * Regression tests for Issue #157.
 *
 * Uses the real protopedia-api-v2-client (not mocked) to verify how a browser
 * fetch failure, which hides its cause, is reported.
 */
import { describe, expect, it } from 'vitest';

import type { Logger } from '../../../../../logger/index.js';
import { ProtopediaApiCustomClient } from '../../../../client/protopedia-api-custom-client.js';

const silentLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

describe('ProtopediaApiCustomClient - SDK browser fetch failure', () => {
  it.each([
    'Failed to fetch',
    'Load failed',
    'NetworkError when attempting to fetch resource.',
  ])(
    'reports "%s" as BROWSER_FETCH_FAILED without details',
    async (message) => {
      const client = new ProtopediaApiCustomClient({
        protoPediaApiClientOptions: {
          token: 'test-token',
          logger: silentLogger,
          fetch: async () => {
            throw new TypeError(message);
          },
        },
        logger: silentLogger,
        progressLog: false,
      });

      const result = await client.fetchPrototypes({ limit: 1 });

      expect(result).toEqual({
        ok: false,
        origin: 'fetcher',
        kind: 'browser_fetch',
        code: 'BROWSER_FETCH_FAILED',
        error: message,
        details: {},
      });
    },
  );
});
