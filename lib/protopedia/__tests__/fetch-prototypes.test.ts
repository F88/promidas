import type { ListPrototypesParams } from 'protopedia-api-v2-client';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  fetchAndNormalizePrototypes,
  type ListPrototypesClient,
} from '../fetch-prototypes.js';
import * as errorHandler from '../utils/errors/handler.js';

vi.mock('../utils/errors/handler', async () => {
  const actual = await vi.importActual<typeof errorHandler>(
    '../utils/errors/handler',
  );
  return {
    ...actual,
    handleApiError: vi.fn(),
  };
});

vi.mock('../utils/utils', () => ({
  normalizePrototype: vi.fn((raw: any) => ({
    id: raw.id,
    prototypeNm: raw.prototypeNm || '',
    teamNm: raw.teamNm || '',
    users: raw.users || '',
    mainUrl: raw.mainUrl || '',
  })),
}));

describe('fetchAndNormalizePrototypes', () => {
  const handleApiErrorMock = errorHandler.handleApiError as ReturnType<
    typeof vi.fn
  >;

  beforeEach(() => {
    handleApiErrorMock.mockReset();
  });

  describe('successful fetches', () => {
    it('returns normalized prototypes when listPrototypes succeeds', async () => {
      const mockClient: ListPrototypesClient = {
        listPrototypes: vi.fn().mockResolvedValue({
          results: [
            { id: 1, prototypeNm: 'Test 1', teamNm: 'Team A' },
            { id: 2, prototypeNm: 'Test 2', teamNm: 'Team B' },
          ],
        }),
      };

      const params: ListPrototypesParams = { offset: 0, limit: 10 };
      const result = await fetchAndNormalizePrototypes(mockClient, params);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0]!.id).toBe(1);
        expect(result.data[0]!.prototypeNm).toBe('Test 1');
        expect(result.data[1]!.id).toBe(2);
        expect(result.data[1]!.prototypeNm).toBe('Test 2');
      }

      expect(mockClient.listPrototypes).toHaveBeenCalledWith(params);
      expect(mockClient.listPrototypes).toHaveBeenCalledTimes(1);
    });

    it('returns empty array when results is empty', async () => {
      const mockClient: ListPrototypesClient = {
        listPrototypes: vi.fn().mockResolvedValue({
          results: [],
        }),
      };

      const result = await fetchAndNormalizePrototypes(mockClient, {
        offset: 0,
        limit: 10,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual([]);
      }
    });

    it('returns empty array when results is undefined', async () => {
      const mockClient: ListPrototypesClient = {
        listPrototypes: vi.fn().mockResolvedValue({}),
      };

      const result = await fetchAndNormalizePrototypes(mockClient, {
        offset: 0,
        limit: 10,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual([]);
      }
    });

    it('handles single prototype result', async () => {
      const mockClient: ListPrototypesClient = {
        listPrototypes: vi.fn().mockResolvedValue({
          results: [{ id: 42, prototypeNm: 'Single', teamNm: 'Solo' }],
        }),
      };

      const result = await fetchAndNormalizePrototypes(mockClient, {
        offset: 0,
        limit: 1,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0]!.id).toBe(42);
      }
    });

    it('normalizes all prototypes in the results array', async () => {
      const mockResults = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        prototypeNm: `Prototype ${i + 1}`,
        teamNm: `Team ${i % 5}`,
      }));

      const mockClient: ListPrototypesClient = {
        listPrototypes: vi.fn().mockResolvedValue({
          results: mockResults,
        }),
      };

      const result = await fetchAndNormalizePrototypes(mockClient, {
        offset: 0,
        limit: 50,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toHaveLength(50);
        expect(result.data[0]!.id).toBe(1);
        expect(result.data[49]!.id).toBe(50);
      }
    });
  });

  describe('parameter handling', () => {
    it('forwards offset parameter correctly', async () => {
      const mockClient: ListPrototypesClient = {
        listPrototypes: vi.fn().mockResolvedValue({ results: [] }),
      };

      await fetchAndNormalizePrototypes(mockClient, {
        offset: 100,
        limit: 10,
      });

      expect(mockClient.listPrototypes).toHaveBeenCalledWith({
        offset: 100,
        limit: 10,
      });
    });

    it('forwards limit parameter correctly', async () => {
      const mockClient: ListPrototypesClient = {
        listPrototypes: vi.fn().mockResolvedValue({ results: [] }),
      };

      await fetchAndNormalizePrototypes(mockClient, {
        offset: 0,
        limit: 25,
      });

      expect(mockClient.listPrototypes).toHaveBeenCalledWith({
        offset: 0,
        limit: 25,
      });
    });

    it('forwards prototypeId parameter correctly', async () => {
      const mockClient: ListPrototypesClient = {
        listPrototypes: vi.fn().mockResolvedValue({ results: [] }),
      };

      await fetchAndNormalizePrototypes(mockClient, {
        offset: 0,
        limit: 10,
        prototypeId: 999,
      });

      expect(mockClient.listPrototypes).toHaveBeenCalledWith({
        offset: 0,
        limit: 10,
        prototypeId: 999,
      });
    });

    it('forwards all parameters together', async () => {
      const mockClient: ListPrototypesClient = {
        listPrototypes: vi.fn().mockResolvedValue({ results: [] }),
      };

      const params: ListPrototypesParams = {
        offset: 50,
        limit: 20,
        prototypeId: 123,
      };

      await fetchAndNormalizePrototypes(mockClient, params);

      expect(mockClient.listPrototypes).toHaveBeenCalledWith(params);
    });
  });

  describe('error handling', () => {
    it('catches and delegates errors to handleApiError', async () => {
      const mockError = new Error('Network failure');
      const mockClient: ListPrototypesClient = {
        listPrototypes: vi.fn().mockRejectedValue(mockError),
      };

      const expectedResult = {
        ok: false,
        status: 500,
        message: 'Network failure',
      };
      handleApiErrorMock.mockReturnValue(expectedResult);

      const result = await fetchAndNormalizePrototypes(mockClient, {
        offset: 0,
        limit: 10,
      });

      expect(handleApiErrorMock).toHaveBeenCalledWith(mockError);
      expect(result).toEqual(expectedResult);
    });

    it('handles client rejection with custom error object', async () => {
      const customError = {
        message: 'Custom error',
        code: 'CUSTOM_CODE',
      };
      const mockClient: ListPrototypesClient = {
        listPrototypes: vi.fn().mockRejectedValue(customError),
      };

      const expectedResult = {
        ok: false,
        status: 400,
        message: 'Custom error',
      };
      handleApiErrorMock.mockReturnValue(expectedResult);

      const result = await fetchAndNormalizePrototypes(mockClient, {
        offset: 0,
        limit: 10,
      });

      expect(handleApiErrorMock).toHaveBeenCalledWith(customError);
      expect(result).toEqual(expectedResult);
    });

    it('never throws exceptions - always returns a Result', async () => {
      const mockClient: ListPrototypesClient = {
        listPrototypes: vi.fn().mockRejectedValue(new Error('Catastrophic')),
      };

      handleApiErrorMock.mockReturnValue({
        ok: false,
        status: 500,
        message: 'Catastrophic',
      });

      await expect(
        fetchAndNormalizePrototypes(mockClient, { offset: 0, limit: 10 }),
      ).resolves.toBeDefined();
    });
  });

  describe('normalization edge cases', () => {
    it('handles results with missing optional fields', async () => {
      const mockClient: ListPrototypesClient = {
        listPrototypes: vi.fn().mockResolvedValue({
          results: [{ id: 1 }, { id: 2, prototypeNm: 'Partial' }],
        }),
      };

      const result = await fetchAndNormalizePrototypes(mockClient, {
        offset: 0,
        limit: 10,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0]!.id).toBe(1);
        expect(result.data[1]!.prototypeNm).toBe('Partial');
      }
    });

    it('handles results as non-array gracefully', async () => {
      const mockClient: ListPrototypesClient = {
        listPrototypes: vi.fn().mockResolvedValue({
          results: null as any,
        }),
      };

      const result = await fetchAndNormalizePrototypes(mockClient, {
        offset: 0,
        limit: 10,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual([]);
      }
    });
  });

  describe('client method interactions', () => {
    it('calls listPrototypes exactly once per invocation', async () => {
      const listPrototypesMock = vi.fn().mockResolvedValue({ results: [] });
      const mockClient: ListPrototypesClient = {
        listPrototypes: listPrototypesMock,
      };

      await fetchAndNormalizePrototypes(mockClient, { offset: 0, limit: 10 });

      expect(listPrototypesMock).toHaveBeenCalledTimes(1);
    });

    it('does not cache results between calls', async () => {
      const listPrototypesMock = vi
        .fn()
        .mockResolvedValueOnce({ results: [{ id: 1 }] })
        .mockResolvedValueOnce({ results: [{ id: 2 }] });
      const mockClient: ListPrototypesClient = {
        listPrototypes: listPrototypesMock,
      };

      const result1 = await fetchAndNormalizePrototypes(mockClient, {
        offset: 0,
        limit: 10,
      });
      const result2 = await fetchAndNormalizePrototypes(mockClient, {
        offset: 10,
        limit: 10,
      });

      expect(result1.ok && result1.data[0]!.id).toBe(1);
      expect(result2.ok && result2.data[0]!.id).toBe(2);
      expect(listPrototypesMock).toHaveBeenCalledTimes(2);
    });

    it('handles concurrent calls independently', async () => {
      const listPrototypesMock = vi.fn().mockImplementation(async (params) => ({
        results: [{ id: params.offset }],
      }));
      const mockClient: ListPrototypesClient = {
        listPrototypes: listPrototypesMock,
      };

      const [result1, result2, result3] = await Promise.all([
        fetchAndNormalizePrototypes(mockClient, { offset: 0, limit: 10 }),
        fetchAndNormalizePrototypes(mockClient, { offset: 10, limit: 10 }),
        fetchAndNormalizePrototypes(mockClient, { offset: 20, limit: 10 }),
      ]);

      expect(result1.ok && result1.data[0]!.id).toBe(0);
      expect(result2.ok && result2.data[0]!.id).toBe(10);
      expect(result3.ok && result3.data[0]!.id).toBe(20);
      expect(listPrototypesMock).toHaveBeenCalledTimes(3);
    });
  });

  describe('normalization behavior', () => {
    it('normalizes all prototypes in results array', async () => {
      const normalizePrototypeMock = vi.fn((raw: any) => ({
        id: raw.id,
        normalized: true,
      }));
      vi.doMock('../utils/utils', () => ({
        normalizePrototype: normalizePrototypeMock,
      }));

      const mockClient: ListPrototypesClient = {
        listPrototypes: vi.fn().mockResolvedValue({
          results: [{ id: 1 }, { id: 2 }, { id: 3 }],
        }),
      };

      const result = await fetchAndNormalizePrototypes(mockClient, {
        offset: 0,
        limit: 10,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toHaveLength(3);
      }
    });

    it('preserves order of prototypes from API response', async () => {
      const mockClient: ListPrototypesClient = {
        listPrototypes: vi.fn().mockResolvedValue({
          results: [
            { id: 5, prototypeNm: 'Fifth' },
            { id: 3, prototypeNm: 'Third' },
            { id: 1, prototypeNm: 'First' },
          ],
        }),
      };

      const result = await fetchAndNormalizePrototypes(mockClient, {
        offset: 0,
        limit: 10,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data[0]!.id).toBe(5);
        expect(result.data[1]!.id).toBe(3);
        expect(result.data[2]!.id).toBe(1);
      }
    });
  });

  describe('edge cases', () => {
    it('handles very large offset values', async () => {
      const mockClient: ListPrototypesClient = {
        listPrototypes: vi.fn().mockResolvedValue({ results: [] }),
      };

      const result = await fetchAndNormalizePrototypes(mockClient, {
        offset: 999999,
        limit: 10,
      });

      expect(result.ok).toBe(true);
      expect(mockClient.listPrototypes).toHaveBeenCalledWith({
        offset: 999999,
        limit: 10,
      });
    });

    it('handles very large limit values', async () => {
      const mockClient: ListPrototypesClient = {
        listPrototypes: vi.fn().mockResolvedValue({ results: [] }),
      };

      const result = await fetchAndNormalizePrototypes(mockClient, {
        offset: 0,
        limit: 10000,
      });

      expect(result.ok).toBe(true);
      expect(mockClient.listPrototypes).toHaveBeenCalledWith({
        offset: 0,
        limit: 10000,
      });
    });

    it('handles prototypeId parameter correctly', async () => {
      const mockClient: ListPrototypesClient = {
        listPrototypes: vi.fn().mockResolvedValue({
          results: [{ id: 123, prototypeNm: 'Specific' }],
        }),
      };

      const result = await fetchAndNormalizePrototypes(mockClient, {
        prototypeId: 123,
      });

      expect(result.ok).toBe(true);
      expect(mockClient.listPrototypes).toHaveBeenCalledWith({
        prototypeId: 123,
      });
    });

    it('handles response with extra unexpected fields', async () => {
      const mockClient: ListPrototypesClient = {
        listPrototypes: vi.fn().mockResolvedValue({
          results: [{ id: 1, prototypeNm: 'Test', unexpectedField: 'value' }],
          extraField: 'ignored',
        } as any),
      };

      const result = await fetchAndNormalizePrototypes(mockClient, {
        offset: 0,
        limit: 10,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toHaveLength(1);
      }
    });

    it('handles empty params object', async () => {
      const mockClient: ListPrototypesClient = {
        listPrototypes: vi.fn().mockResolvedValue({ results: [] }),
      };

      const result = await fetchAndNormalizePrototypes(mockClient, {});

      expect(result.ok).toBe(true);
      expect(mockClient.listPrototypes).toHaveBeenCalledWith({});
    });
  });

  describe('type safety and return values', () => {
    it('returns FetchPrototypesResult type', async () => {
      const mockClient: ListPrototypesClient = {
        listPrototypes: vi.fn().mockResolvedValue({ results: [] }),
      };

      const result = await fetchAndNormalizePrototypes(mockClient, {
        offset: 0,
        limit: 10,
      });

      expect(result).toHaveProperty('ok');
      if (result.ok) {
        expect(result).toHaveProperty('data');
        expect(Array.isArray(result.data)).toBe(true);
      } else {
        expect(result).toHaveProperty('status');
        expect(result).toHaveProperty('error');
      }
    });

    it('success result has correct shape', async () => {
      const mockClient: ListPrototypesClient = {
        listPrototypes: vi.fn().mockResolvedValue({
          results: [{ id: 1, prototypeNm: 'Test' }],
        }),
      };

      const result = await fetchAndNormalizePrototypes(mockClient, {
        offset: 0,
        limit: 10,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(typeof result.ok).toBe('boolean');
        expect(Array.isArray(result.data)).toBe(true);
        expect(result).not.toHaveProperty('status');
        expect(result).not.toHaveProperty('error');
      }
    });

    it('error result has correct shape', async () => {
      const mockClient: ListPrototypesClient = {
        listPrototypes: vi.fn().mockRejectedValue(new Error('API error')),
      };

      handleApiErrorMock.mockReturnValue({
        ok: false,
        status: 500,
        error: 'API error',
      });

      const result = await fetchAndNormalizePrototypes(mockClient, {
        offset: 0,
        limit: 10,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(typeof result.ok).toBe('boolean');
        expect(typeof result.status).toBe('number');
        expect(typeof result.error).toBe('string');
        expect(result).not.toHaveProperty('data');
      }
    });
  });

  describe('stress and performance patterns', () => {
    it('handles many prototypes in single response', async () => {
      const largeResults = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        prototypeNm: `Prototype ${i + 1}`,
      }));

      const mockClient: ListPrototypesClient = {
        listPrototypes: vi.fn().mockResolvedValue({ results: largeResults }),
      };

      const result = await fetchAndNormalizePrototypes(mockClient, {
        offset: 0,
        limit: 1000,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toHaveLength(1000);
      }
    });

    it('handles rapid successive calls', async () => {
      const mockClient: ListPrototypesClient = {
        listPrototypes: vi.fn().mockResolvedValue({ results: [] }),
      };

      const calls = Array.from({ length: 10 }, () =>
        fetchAndNormalizePrototypes(mockClient, { offset: 0, limit: 10 }),
      );

      const results = await Promise.all(calls);

      expect(results).toHaveLength(10);
      expect(results.every((r: { ok: boolean }) => r.ok)).toBe(true);
      expect(mockClient.listPrototypes).toHaveBeenCalledTimes(10);
    });

    it('handles varied parameter combinations', async () => {
      const mockClient: ListPrototypesClient = {
        listPrototypes: vi.fn().mockResolvedValue({ results: [] }),
      };

      await fetchAndNormalizePrototypes(mockClient, { offset: 0, limit: 10 });
      await fetchAndNormalizePrototypes(mockClient, { offset: 10 });
      await fetchAndNormalizePrototypes(mockClient, { limit: 20 });
      await fetchAndNormalizePrototypes(mockClient, { prototypeId: 123 });

      expect(mockClient.listPrototypes).toHaveBeenNthCalledWith(1, {
        offset: 0,
        limit: 10,
      });
      expect(mockClient.listPrototypes).toHaveBeenNthCalledWith(2, {
        offset: 10,
      });
      expect(mockClient.listPrototypes).toHaveBeenNthCalledWith(3, {
        limit: 20,
      });
      expect(mockClient.listPrototypes).toHaveBeenNthCalledWith(4, {
        prototypeId: 123,
      });
    });
  });

  describe('error recovery and resilience', () => {
    it('handles error on first call but success on retry', async () => {
      const listPrototypesMock = vi
        .fn()
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({ results: [{ id: 1 }] });

      const mockClient: ListPrototypesClient = {
        listPrototypes: listPrototypesMock,
      };

      handleApiErrorMock.mockReturnValue({
        ok: false,
        status: 500,
        error: 'Temporary failure',
      });

      const result1 = await fetchAndNormalizePrototypes(mockClient, {
        offset: 0,
        limit: 10,
      });
      expect(result1.ok).toBe(false);

      handleApiErrorMock.mockClear();
      const result2 = await fetchAndNormalizePrototypes(mockClient, {
        offset: 0,
        limit: 10,
      });
      expect(result2.ok).toBe(true);
    });

    it('handles different error types across multiple calls', async () => {
      const mockClient: ListPrototypesClient = {
        listPrototypes: vi
          .fn()
          .mockRejectedValueOnce(new Error('Network error'))
          .mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'))
          .mockResolvedValueOnce({ results: [{ id: 1 }] }),
      };

      handleApiErrorMock
        .mockReturnValueOnce({
          ok: false,
          status: 500,
          error: 'Network error',
        })
        .mockReturnValueOnce({
          ok: false,
          status: 504,
          error: 'Request timed out',
        });

      const r1 = await fetchAndNormalizePrototypes(mockClient, {
        offset: 0,
        limit: 10,
      });
      const r2 = await fetchAndNormalizePrototypes(mockClient, {
        offset: 0,
        limit: 10,
      });
      const r3 = await fetchAndNormalizePrototypes(mockClient, {
        offset: 0,
        limit: 10,
      });

      expect(r1.ok).toBe(false);
      expect(r2.ok).toBe(false);
      expect(r3.ok).toBe(true);
    });
  });

  describe('boundary and special values', () => {
    it('handles offset: 0, limit: 0', async () => {
      const mockClient: ListPrototypesClient = {
        listPrototypes: vi.fn().mockResolvedValue({ results: [] }),
      };

      const result = await fetchAndNormalizePrototypes(mockClient, {
        offset: 0,
        limit: 0,
      });

      expect(result.ok).toBe(true);
      expect(mockClient.listPrototypes).toHaveBeenCalledWith({
        offset: 0,
        limit: 0,
      });
    });

    it('handles negative offset (edge case)', async () => {
      const mockClient: ListPrototypesClient = {
        listPrototypes: vi.fn().mockResolvedValue({ results: [] }),
      };

      const result = await fetchAndNormalizePrototypes(mockClient, {
        offset: -1,
        limit: 10,
      });

      expect(result.ok).toBe(true);
      expect(mockClient.listPrototypes).toHaveBeenCalledWith({
        offset: -1,
        limit: 10,
      });
    });

    it('handles prototypeId: 0', async () => {
      const mockClient: ListPrototypesClient = {
        listPrototypes: vi.fn().mockResolvedValue({ results: [] }),
      };

      const result = await fetchAndNormalizePrototypes(mockClient, {
        prototypeId: 0,
      });

      expect(result.ok).toBe(true);
      expect(mockClient.listPrototypes).toHaveBeenCalledWith({
        prototypeId: 0,
      });
    });

    it('handles params with all undefined values', async () => {
      const mockClient: ListPrototypesClient = {
        listPrototypes: vi.fn().mockResolvedValue({ results: [] }),
      };

      const result = await fetchAndNormalizePrototypes(mockClient, {
        offset: undefined,
        limit: undefined,
        prototypeId: undefined,
      } as any);

      expect(result.ok).toBe(true);
    });
  });
});
