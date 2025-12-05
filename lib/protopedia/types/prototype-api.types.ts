/**
 * Structure for network failure responses.
 * Compatible with FetchPrototypesFailure.
 */
export type NetworkFailure = {
  status: number;
  error: unknown;
  details?: {
    statusText?: string;
    code?: string;
  };
};
