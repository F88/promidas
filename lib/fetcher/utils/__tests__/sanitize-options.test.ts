import { describe, expect, it } from 'vitest';

import { sanitizeProtopediaApiClientOptions } from '../sanitize-options.js';

describe('sanitizeProtopediaApiClientOptions', () => {
  it('should return undefined if options is undefined', () => {
    expect(sanitizeProtopediaApiClientOptions(undefined)).toBeUndefined();
  });

  it('should redact token if present', () => {
    const options = {
      token: 'my-secret-token',
      baseUrl: 'https://api.test',
    };
    const sanitized = sanitizeProtopediaApiClientOptions(options);
    expect(sanitized).toEqual({
      token: '***',
      baseUrl: 'https://api.test',
    });
  });

  it('should return options as is if token is missing', () => {
    const options = {
      baseUrl: 'https://api.test',
    };
    const sanitized = sanitizeProtopediaApiClientOptions(options);
    expect(sanitized).toEqual(options);
  });
});
