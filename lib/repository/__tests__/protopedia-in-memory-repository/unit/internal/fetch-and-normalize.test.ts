/**
 * Tests for ProtopediaInMemoryRepositoryImpl fetchAndNormalize method.
 *
 * Covers the fetch and normalize logic including:
 * - Parameter merging with DEFAULT_FETCH_PARAMS
 * - Successful fetch operations
 * - Fetch failure handling
 * - Unexpected exception handling (defensive programming)
 *
 * @module
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProtopediaApiCustomClient } from '../../../../../fetcher/index.js';
import { PrototypeInMemoryStore } from '../../../../../store/index.js';
import { ProtopediaInMemoryRepositoryImpl } from '../../../../protopedia-in-memory-repository.js';
import {
  createTestContext,
  makePrototype,
  setupMocks,
} from '../../test-helpers.js';

vi.mock('../../../../../fetcher/index', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../../../fetcher/index.js')>();
  return {
    ...actual,
    ProtopediaApiCustomClient: vi.fn(),
  };
});

vi.mock('../../../../../store/index', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../../../store/index.js')>();
  return {
    ...actual,
    PrototypeInMemoryStore: vi.fn(),
  };
});

describe('ProtopediaInMemoryRepositoryImpl - fetchAndNormalize', () => {
  const { fetchPrototypesMock, resetMocks } = setupMocks();

  let mockStoreInstance: PrototypeInMemoryStore;
  let mockApiClientInstance: InstanceType<typeof ProtopediaApiCustomClient>;

  beforeEach(() => {
    resetMocks();
    vi.clearAllMocks();

    const testContext = createTestContext();
    mockStoreInstance = testContext.mockStoreInstance;
    mockApiClientInstance = testContext.mockApiClientInstance;
    vi.mocked(mockApiClientInstance.fetchPrototypes).mockImplementation(
      fetchPrototypesMock,
    );
  });

  describe('parameter merging', () => {
    it('should merge params with DEFAULT_FETCH_PARAMS (offset: 0, limit: 10)', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [makePrototype({ id: 1 })],
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
      });

      await (repo as any).fetchAndNormalize({});

      expect(fetchPrototypesMock).toHaveBeenCalledWith({
        offset: 0,
        limit: 10,
      });
      expect(fetchPrototypesMock).toHaveBeenCalledTimes(1);
    });

    it('should override default offset with provided value', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [makePrototype({ id: 1 })],
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
      });

      await (repo as any).fetchAndNormalize({ offset: 50 });

      expect(fetchPrototypesMock).toHaveBeenCalledWith({
        offset: 50,
        limit: 10,
      });
    });

    it('should override default limit with provided value', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [],
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
      });

      await (repo as any).fetchAndNormalize({ limit: 100 });

      expect(fetchPrototypesMock).toHaveBeenCalledWith({
        offset: 0,
        limit: 100,
      });
    });

    it('should override both offset and limit with provided values', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [],
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
      });

      await (repo as any).fetchAndNormalize({ offset: 25, limit: 50 });

      expect(fetchPrototypesMock).toHaveBeenCalledWith({
        offset: 25,
        limit: 50,
      });
    });
  });

  describe('successful fetch operations', () => {
    it('should return FetchPrototypesSuccess with data', async () => {
      const testData = [
        makePrototype({ id: 1, prototypeNm: 'Test 1' }),
        makePrototype({ id: 2, prototypeNm: 'Test 2' }),
      ];

      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: testData,
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
      });

      const result = await (repo as any).fetchAndNormalize({});

      expect(result).toEqual({
        ok: true,
        data: testData,
      });
    });

    it('should return FetchPrototypesSuccess with empty data array', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [],
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
      });

      const result = await (repo as any).fetchAndNormalize({});

      expect(result).toEqual({
        ok: true,
        data: [],
      });
    });
  });

  describe('fetch failure handling', () => {
    it('should return FetchPrototypesFailure with all fields preserved', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: false,
        kind: 'http',
        code: 'FETCH_HTTP_ERROR_500',
        error: 'Internal Server Error',
        status: 500,
        details: {
          url: 'https://protopedia.example.com/api/prototypes',
          method: 'GET',
          requestHeaders: {},
        },
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
      });

      const result = await (repo as any).fetchAndNormalize({});

      expect(result).toEqual({
        ok: false,
        kind: 'http',
        code: 'FETCH_HTTP_ERROR_500',
        error: 'Internal Server Error',
        status: 500,
        details: {
          url: 'https://protopedia.example.com/api/prototypes',
          method: 'GET',
          requestHeaders: {},
        },
      });
    });

    it('should handle network failure', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: false,
        kind: 'network',
        code: 'FETCH_NETWORK_ERROR',
        error: 'Network request failed',
        details: {
          url: 'https://protopedia.example.com/api/prototypes',
          method: 'GET',
          requestHeaders: {},
        },
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
      });

      const result = await (repo as any).fetchAndNormalize({});

      expect(result.ok).toBe(false);
      expect(result.kind).toBe('network');
      expect(result.code).toBe('FETCH_NETWORK_ERROR');
    });

    it('should handle timeout failure', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: false,
        kind: 'timeout',
        code: 'FETCH_TIMEOUT',
        error: 'Request timeout',
        details: {
          url: 'https://protopedia.example.com/api/prototypes',
          method: 'GET',
          requestHeaders: {},
        },
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
      });

      const result = await (repo as any).fetchAndNormalize({});

      expect(result.ok).toBe(false);
      expect(result.kind).toBe('timeout');
      expect(result.code).toBe('FETCH_TIMEOUT');
    });
  });

  describe('unexpected exception handling', () => {
    it('should catch and handle unexpected Error exceptions', async () => {
      const unexpectedError = new Error('Unexpected API client error');

      fetchPrototypesMock.mockRejectedValueOnce(unexpectedError);

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
      });

      const result = await (repo as any).fetchAndNormalize({ offset: 10 });

      expect(result).toEqual({
        ok: false,
        origin: 'fetcher',
        kind: 'unknown',
        code: 'UNKNOWN',
        error: 'Unexpected API client error',
        details: {
          req: {
            method: 'GET',
          },
        },
      });
    });

    it('should catch and handle non-Error thrown values', async () => {
      fetchPrototypesMock.mockRejectedValueOnce('String error');

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
      });

      const result = await (repo as any).fetchAndNormalize({});

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.origin).toBe('fetcher');
        expect(result.kind).toBe('unknown');
        expect(result.code).toBe('UNKNOWN');
        // Error message comes from the actual thrown value
        expect(result.error).toBe('String error');
      }
    });

    it('should catch and handle null thrown values', async () => {
      fetchPrototypesMock.mockRejectedValueOnce(null);

      const repo = new ProtopediaInMemoryRepositoryImpl({
        store: mockStoreInstance,
        apiClient: mockApiClientInstance,
      });

      const result = await (repo as any).fetchAndNormalize({});

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.origin).toBe('fetcher');
        expect(result.kind).toBe('unknown');
        expect(result.code).toBe('UNKNOWN');
        // Defensive catch converts null to the string 'null'
        expect(result.error).toBe('null');
        expect(result.details).toEqual({ req: { method: 'GET' } });
      }
    });
  });
});
