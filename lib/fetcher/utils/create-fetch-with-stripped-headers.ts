export type CreateFetchWithStrippedHeadersParams = {
  baseFetch: typeof fetch;
  headerNames: string[];
};

function toLowerCaseHeaderNames(headerNames: string[]): string[] {
  return headerNames
    .map((value) => value.trim())
    .filter((value) => value !== '')
    .map((value) => value.toLowerCase());
}

export function createFetchWithStrippedHeaders(
  params: CreateFetchWithStrippedHeadersParams,
): typeof fetch {
  const { baseFetch } = params;
  const headerNames = toLowerCaseHeaderNames(params.headerNames);

  return async (input, init) => {
    if (headerNames.length === 0) {
      return baseFetch(input, init);
    }

    if (typeof Request !== 'undefined' && input instanceof Request) {
      const headers = new Headers(input.headers);

      if (init?.headers !== undefined) {
        const initHeaders = new Headers(init.headers);
        initHeaders.forEach((value, key) => {
          headers.set(key, value);
        });
      }

      for (const headerName of headerNames) {
        headers.delete(headerName);
      }

      const strippedRequest = new Request(input, { headers });
      return init !== undefined
        ? baseFetch(strippedRequest, { ...init, headers })
        : baseFetch(strippedRequest);
    }

    if (init?.headers !== undefined) {
      const headers = new Headers(init.headers);
      for (const headerName of headerNames) {
        headers.delete(headerName);
      }
      return baseFetch(input, { ...init, headers });
    }

    return baseFetch(input, init);
  };
}
