import { describe, expect, it, vi } from 'vitest';

import { createFetchWithStrippedHeaders } from '../create-fetch-with-stripped-headers.js';

describe('createFetchWithStrippedHeaders', () => {
  it('passes through when headerNames normalize to empty', async () => {
    type BaseFetch = (
      input: string | URL | Request,
      init?: RequestInit,
    ) => Promise<Response>;

    const baseFetch = vi.fn<BaseFetch>(async () => new Response('ok'));
    const fetchWithStrippedHeaders = createFetchWithStrippedHeaders({
      baseFetch: baseFetch as unknown as typeof fetch,
      headerNames: [' ', ''],
    });

    const init: RequestInit = { headers: { 'x-any': '1' } };
    await fetchWithStrippedHeaders('https://example.test', init);

    expect(baseFetch).toHaveBeenCalledTimes(1);
    expect(baseFetch).toHaveBeenCalledWith('https://example.test', init);
  });

  it('passes through when init.headers is not provided and input is not Request', async () => {
    type BaseFetch = (
      input: string | URL | Request,
      init?: RequestInit,
    ) => Promise<Response>;

    const baseFetch = vi.fn<BaseFetch>(async () => new Response('ok'));
    const fetchWithStrippedHeaders = createFetchWithStrippedHeaders({
      baseFetch: baseFetch as unknown as typeof fetch,
      headerNames: ['x-client-user-agent'],
    });

    await fetchWithStrippedHeaders('https://example.test');

    expect(baseFetch).toHaveBeenCalledTimes(1);
    expect(baseFetch).toHaveBeenCalledWith('https://example.test', undefined);
  });

  it('deletes configured headers from init.headers', async () => {
    type BaseFetch = (
      input: string | URL | Request,
      init?: RequestInit,
    ) => Promise<Response>;

    const baseFetch = vi.fn<BaseFetch>(async () => new Response('ok'));
    const fetchWithStrippedHeaders = createFetchWithStrippedHeaders({
      baseFetch: baseFetch as unknown as typeof fetch,
      headerNames: ['x-client-user-agent'],
    });

    await fetchWithStrippedHeaders('https://example.test', {
      headers: {
        'x-client-user-agent': 'SDK/1.0',
        'x-keep-me': '1',
      },
    });

    expect(baseFetch).toHaveBeenCalledTimes(1);
    const firstCall = baseFetch.mock.calls[0];
    expect(firstCall).toBeDefined();
    const passedInit = firstCall?.[1];
    const headers = new Headers(passedInit?.headers);

    expect(headers.get('x-client-user-agent')).toBeNull();
    expect(headers.get('x-keep-me')).toBe('1');
  });

  it('deletes configured headers from Request input', async () => {
    type BaseFetch = (
      input: string | URL | Request,
      init?: RequestInit,
    ) => Promise<Response>;

    const baseFetch = vi.fn<BaseFetch>(async () => new Response('ok'));
    const fetchWithStrippedHeaders = createFetchWithStrippedHeaders({
      baseFetch: baseFetch as unknown as typeof fetch,
      headerNames: ['x-client-user-agent'],
    });

    const request = new Request('https://example.test', {
      headers: {
        'x-client-user-agent': 'SDK/1.0',
        'x-keep-me': '1',
      },
    });

    await fetchWithStrippedHeaders(request);

    expect(baseFetch).toHaveBeenCalledTimes(1);
    const firstCall = baseFetch.mock.calls[0];
    expect(firstCall).toBeDefined();
    const passedRequest = firstCall?.[0];
    expect(passedRequest).toBeInstanceOf(Request);

    const headers = new Headers((passedRequest as unknown as Request).headers);
    expect(headers.get('x-client-user-agent')).toBeNull();
    expect(headers.get('x-keep-me')).toBe('1');
  });

  it('matches headers case-insensitively in init.headers', async () => {
    type BaseFetch = (
      input: string | URL | Request,
      init?: RequestInit,
    ) => Promise<Response>;

    const baseFetch = vi.fn<BaseFetch>(async () => new Response('ok'));
    const fetchWithStrippedHeaders = createFetchWithStrippedHeaders({
      baseFetch: baseFetch as unknown as typeof fetch,
      headerNames: ['x-client-user-agent'],
    });

    await fetchWithStrippedHeaders('https://example.test', {
      headers: {
        'X-Client-User-Agent': 'SDK/1.0',
        'x-keep-me': '1',
      },
    });

    expect(baseFetch).toHaveBeenCalledTimes(1);
    const firstCall = baseFetch.mock.calls[0];
    expect(firstCall).toBeDefined();
    const passedInit = firstCall?.[1];
    const headers = new Headers(passedInit?.headers);

    expect(headers.get('x-client-user-agent')).toBeNull();
    expect(headers.get('x-keep-me')).toBe('1');
  });

  it('strips configured headers from merged Request + init.headers', async () => {
    type BaseFetch = (
      input: string | URL | Request,
      init?: RequestInit,
    ) => Promise<Response>;

    const baseFetch = vi.fn<BaseFetch>(async () => new Response('ok'));
    const fetchWithStrippedHeaders = createFetchWithStrippedHeaders({
      baseFetch: baseFetch as unknown as typeof fetch,
      headerNames: ['x-client-user-agent'],
    });

    const request = new Request('https://example.test', {
      headers: {
        'x-client-user-agent': 'SDK/1.0',
        'x-keep-request': '1',
      },
    });

    await fetchWithStrippedHeaders(request, {
      headers: {
        'x-client-user-agent': 'FROM_INIT',
        'x-keep-init': '1',
      },
    });

    expect(baseFetch).toHaveBeenCalledTimes(1);
    const firstCall = baseFetch.mock.calls[0];
    expect(firstCall).toBeDefined();

    const passedInput = firstCall?.[0];
    expect(passedInput).toBeInstanceOf(Request);
    expect(passedInput).not.toBe(request);

    const passedRequest = passedInput as unknown as Request;
    const passedHeaders = new Headers(passedRequest.headers);
    expect(passedHeaders.get('x-client-user-agent')).toBeNull();
    expect(passedHeaders.get('x-keep-init')).toBe('1');
    expect(passedHeaders.get('x-keep-request')).toBe('1');

    const originalRequestHeaders = new Headers(request.headers);
    expect(originalRequestHeaders.get('x-client-user-agent')).toBe('SDK/1.0');
    expect(originalRequestHeaders.get('x-keep-request')).toBe('1');
  });
});
