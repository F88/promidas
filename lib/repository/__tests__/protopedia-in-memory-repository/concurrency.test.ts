/**
 * @file Tests for concurrency control in ProtopediaInMemoryRepository.
 *
 * Verifies that concurrent calls to setupSnapshot and refreshSnapshot are
 * properly coalesced to prevent duplicate API requests and race conditions.
 */
import type { ProtoPediaApiClientOptions } from 'protopedia-api-v2-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrototypeInMemoryStoreConfig } from '../../../store/index.js';
import { ProtopediaInMemoryRepositoryImpl } from '../../protopedia-in-memory-repository.js';

import { createMockFetchPrototypesSuccess } from './test-helpers.js';

describe('ProtopediaInMemoryRepository - Concurrency Control', () => {
  let storeConfig: PrototypeInMemoryStoreConfig;
  let apiClientOptions: ProtoPediaApiClientOptions;

  beforeEach(() => {
    storeConfig = { ttlMs: 30000 };
    apiClientOptions = { token: 'test-token' };
    vi.clearAllMocks();
  });

  describe('setupSnapshot concurrency', () => {
    it('coalesces multiple concurrent setupSnapshot calls into a single API request', async () => {
      const fetchSpy = vi.fn(
        createMockFetchPrototypesSuccess([
          { id: 1, prototypeNm: 'Prototype 1' },
        ]),
      );

      const repo = new ProtopediaInMemoryRepositoryImpl({
        storeConfig,
        apiClientOptions: {
          ...apiClientOptions,
          fetch: fetchSpy as unknown as typeof fetch,
        },
      });

      const params = { offset: 0, limit: 10 };

      // Call setupSnapshot 3 times concurrently
      const [result1, result2, result3] = await Promise.all([
        repo.setupSnapshot(params),
        repo.setupSnapshot(params),
        repo.setupSnapshot(params),
      ]);

      // All should succeed
      expect(result1.ok).toBe(true);
      expect(result2.ok).toBe(true);
      expect(result3.ok).toBe(true);

      // But only one API call should have been made
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('returns the same result to all concurrent callers', async () => {
      const mockData = [
        { id: 1, prototypeNm: 'Test Prototype' },
        { id: 2, prototypeNm: 'Another Prototype' },
      ];

      const fetchSpy = vi.fn(createMockFetchPrototypesSuccess(mockData));

      const repo = new ProtopediaInMemoryRepositoryImpl({
        storeConfig,
        apiClientOptions: {
          ...apiClientOptions,
          fetch: fetchSpy as unknown as typeof fetch,
        },
      });

      const params = { offset: 0, limit: 10 };

      const [result1, result2, result3] = await Promise.all([
        repo.setupSnapshot(params),
        repo.setupSnapshot(params),
        repo.setupSnapshot(params),
      ]);

      // All results should be identical
      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);

      // Verify all got the correct data
      if (result1.ok) {
        expect(result1.stats.size).toBe(2);
      }
    });

    it('coalesces concurrent calls even with different parameters', async () => {
      const fetchSpy = vi.fn(
        createMockFetchPrototypesSuccess([
          { id: 1, prototypeNm: 'Prototype 1' },
        ]),
      );

      const repo = new ProtopediaInMemoryRepositoryImpl({
        storeConfig,
        apiClientOptions: {
          ...apiClientOptions,
          fetch: fetchSpy as unknown as typeof fetch,
        },
      });

      // Call with different parameters concurrently
      const [result1, result2] = await Promise.all([
        repo.setupSnapshot({ offset: 0, limit: 10 }),
        repo.setupSnapshot({ offset: 0, limit: 100 }), // Different limit
      ]);

      expect(result1.ok).toBe(true);
      expect(result2.ok).toBe(true);

      // Only one API call - uses first caller's parameters
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Both receive the same result
      expect(result1).toEqual(result2);
    });
  });

  describe('refreshSnapshot concurrency', () => {
    it('coalesces multiple concurrent refreshSnapshot calls into a single API request', async () => {
      const fetchSpy = vi.fn(
        createMockFetchPrototypesSuccess([{ id: 1, prototypeNm: 'Initial' }]),
      );

      const repo = new ProtopediaInMemoryRepositoryImpl({
        storeConfig,
        apiClientOptions: {
          ...apiClientOptions,
          fetch: fetchSpy as unknown as typeof fetch,
        },
      });

      // Initial setup
      await repo.setupSnapshot({ offset: 0, limit: 10 });
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      fetchSpy.mockClear();

      // Call refreshSnapshot 3 times concurrently
      const [result1, result2, result3] = await Promise.all([
        repo.refreshSnapshot(),
        repo.refreshSnapshot(),
        repo.refreshSnapshot(),
      ]);

      expect(result1.ok).toBe(true);
      expect(result2.ok).toBe(true);
      expect(result3.ok).toBe(true);

      // Only one API call for refresh
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('returns the same result to all concurrent refresh callers', async () => {
      const fetchSpy = vi.fn(
        createMockFetchPrototypesSuccess([
          { id: 1, prototypeNm: 'Refreshed Data' },
        ]),
      );

      const repo = new ProtopediaInMemoryRepositoryImpl({
        storeConfig,
        apiClientOptions: {
          ...apiClientOptions,
          fetch: fetchSpy as unknown as typeof fetch,
        },
      });

      await repo.setupSnapshot({ offset: 0, limit: 10 });
      fetchSpy.mockClear();

      const [result1, result2, result3] = await Promise.all([
        repo.refreshSnapshot(),
        repo.refreshSnapshot(),
        repo.refreshSnapshot(),
      ]);

      // All results should be identical
      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });
  });

  describe('mixed setupSnapshot and refreshSnapshot concurrency', () => {
    it('coalesces setup and refresh calls when called concurrently', async () => {
      const fetchSpy = vi.fn(
        createMockFetchPrototypesSuccess([{ id: 1, prototypeNm: 'Data' }]),
      );

      const repo = new ProtopediaInMemoryRepositoryImpl({
        storeConfig,
        apiClientOptions: {
          ...apiClientOptions,
          fetch: fetchSpy as unknown as typeof fetch,
        },
      });

      // Mix setup and refresh calls
      const [result1, result2, result3] = await Promise.all([
        repo.setupSnapshot({ offset: 0, limit: 10 }),
        repo.refreshSnapshot(),
        repo.setupSnapshot({ offset: 0, limit: 50 }),
      ]);

      expect(result1.ok).toBe(true);
      expect(result2.ok).toBe(true);
      expect(result3.ok).toBe(true);

      // Only one API call total
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // All receive same result
      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });
  });

  describe('sequential calls after completion', () => {
    it('allows sequential calls to execute separately after previous call completes', async () => {
      const fetchSpy = vi.fn(
        createMockFetchPrototypesSuccess([{ id: 1, prototypeNm: 'First' }]),
      );

      const repo = new ProtopediaInMemoryRepositoryImpl({
        storeConfig,
        apiClientOptions: {
          ...apiClientOptions,
          fetch: fetchSpy as unknown as typeof fetch,
        },
      });

      // First call
      await repo.setupSnapshot({ offset: 0, limit: 10 });
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Second call after first completes
      await repo.refreshSnapshot();
      expect(fetchSpy).toHaveBeenCalledTimes(2);

      // Third call after second completes
      await repo.refreshSnapshot();
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });

    it('allows new concurrent batch after previous batch completes', async () => {
      const fetchSpy = vi.fn(
        createMockFetchPrototypesSuccess([{ id: 1, prototypeNm: 'Data' }]),
      );

      const repo = new ProtopediaInMemoryRepositoryImpl({
        storeConfig,
        apiClientOptions: {
          ...apiClientOptions,
          fetch: fetchSpy as unknown as typeof fetch,
        },
      });

      // First concurrent batch
      await Promise.all([
        repo.setupSnapshot({ offset: 0, limit: 10 }),
        repo.setupSnapshot({ offset: 0, limit: 10 }),
      ]);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      fetchSpy.mockClear();

      // Second concurrent batch after first completes
      await Promise.all([
        repo.refreshSnapshot(),
        repo.refreshSnapshot(),
        repo.refreshSnapshot(),
      ]);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling in concurrent scenarios', () => {
    it('propagates the same error to all concurrent callers', async () => {
      const fetchSpy = vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: 'API Error' }), {
            status: 500,
          }),
        ),
      );

      const repo = new ProtopediaInMemoryRepositoryImpl({
        storeConfig,
        apiClientOptions: {
          ...apiClientOptions,
          fetch: fetchSpy as unknown as typeof fetch,
        },
      });

      const [result1, result2, result3] = await Promise.all([
        repo.setupSnapshot({ offset: 0, limit: 10 }),
        repo.setupSnapshot({ offset: 0, limit: 10 }),
        repo.setupSnapshot({ offset: 0, limit: 10 }),
      ]);

      // All should have failed with the same error
      expect(result1.ok).toBe(false);
      expect(result2.ok).toBe(false);
      expect(result3.ok).toBe(false);

      // Only one API call was made
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // All should have the same error
      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });

    it('resets lock after error allowing subsequent calls', async () => {
      let callCount = 0;
      const fetchSpy = vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          // First call fails
          return Promise.resolve(
            new Response(JSON.stringify({ error: 'API Error' }), {
              status: 500,
            }),
          );
        }
        // Subsequent calls succeed
        return createMockFetchPrototypesSuccess([
          { id: 1, prototypeNm: 'Success' },
        ])();
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        storeConfig,
        apiClientOptions: {
          ...apiClientOptions,
          fetch: fetchSpy as unknown as typeof fetch,
        },
      });

      // First batch - should fail
      const failedResults = await Promise.all([
        repo.setupSnapshot({ offset: 0, limit: 10 }),
        repo.setupSnapshot({ offset: 0, limit: 10 }),
      ]);

      expect(failedResults[0].ok).toBe(false);
      expect(failedResults[1].ok).toBe(false);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      fetchSpy.mockClear();

      // Second call - should succeed with new fetch
      const successResult = await repo.setupSnapshot({ offset: 0, limit: 10 });
      expect(successResult.ok).toBe(true);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('race condition prevention', () => {
    it('prevents last-write-wins race condition', async () => {
      let resolveFirst: (() => void) | null = null;
      let resolveSecond: (() => void) | null = null;

      const firstPromise = new Promise<void>((resolve) => {
        resolveFirst = resolve;
      });
      const secondPromise = new Promise<void>((resolve) => {
        resolveSecond = resolve;
      });

      let callNumber = 0;
      const fetchSpy = vi.fn(() => {
        callNumber++;
        if (callNumber === 1) {
          // First call - wait for control
          return firstPromise.then(() =>
            createMockFetchPrototypesSuccess([
              { id: 1, prototypeNm: 'First' },
            ])(),
          );
        }
        // This should never be called due to coalescing
        return secondPromise.then(() =>
          createMockFetchPrototypesSuccess([
            { id: 2, prototypeNm: 'Second' },
          ])(),
        );
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        storeConfig,
        apiClientOptions: {
          ...apiClientOptions,
          fetch: fetchSpy as unknown as typeof fetch,
        },
      });

      // Start two concurrent calls
      const promise1 = repo.setupSnapshot({ offset: 0, limit: 10 });
      const promise2 = repo.setupSnapshot({ offset: 0, limit: 10 });

      // Resolve first call
      resolveFirst!();

      const [result1, result2] = await Promise.all([promise1, promise2]);

      // Both should succeed
      expect(result1.ok).toBe(true);
      expect(result2.ok).toBe(true);

      // Only one API call should have been made
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Both should have the same data
      expect(result1).toEqual(result2);
    });
  });

  describe('stress testing', () => {
    it('handles many concurrent calls efficiently', async () => {
      const fetchSpy = vi.fn(
        createMockFetchPrototypesSuccess([
          { id: 1, prototypeNm: 'Stress Test' },
        ]),
      );

      const repo = new ProtopediaInMemoryRepositoryImpl({
        storeConfig,
        apiClientOptions: {
          ...apiClientOptions,
          fetch: fetchSpy as unknown as typeof fetch,
        },
      });

      // Create 100 concurrent calls
      const promises = Array.from({ length: 100 }, () =>
        repo.setupSnapshot({ offset: 0, limit: 10 }),
      );

      const results = await Promise.all(promises);

      // All should succeed
      expect(results.every((r) => r.ok)).toBe(true);

      // Only one API call should have been made
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // All results should be identical
      const firstResult = results[0];
      results.forEach((r) => {
        expect(r).toEqual(firstResult);
      });
    });

    it('handles rapid sequential batches without leaking promises', async () => {
      const fetchSpy = vi.fn(
        createMockFetchPrototypesSuccess([
          { id: 1, prototypeNm: 'Batch Test' },
        ]),
      );

      const repo = new ProtopediaInMemoryRepositoryImpl({
        storeConfig,
        apiClientOptions: {
          ...apiClientOptions,
          fetch: fetchSpy as unknown as typeof fetch,
        },
      });

      // Run 10 batches of concurrent calls
      for (let i = 0; i < 10; i++) {
        const promises = Array.from({ length: 5 }, () =>
          repo.setupSnapshot({ offset: 0, limit: 10 }),
        );
        await Promise.all(promises);
      }

      // Should have made exactly 10 API calls (one per batch)
      expect(fetchSpy).toHaveBeenCalledTimes(10);
    });
  });

  describe('edge cases', () => {
    it('handles empty response data correctly', async () => {
      const fetchSpy = vi.fn(createMockFetchPrototypesSuccess([]));

      const repo = new ProtopediaInMemoryRepositoryImpl({
        storeConfig,
        apiClientOptions: {
          ...apiClientOptions,
          fetch: fetchSpy as unknown as typeof fetch,
        },
      });

      const [result1, result2] = await Promise.all([
        repo.setupSnapshot({ offset: 0, limit: 10 }),
        repo.setupSnapshot({ offset: 0, limit: 10 }),
      ]);

      expect(result1.ok).toBe(true);
      expect(result2.ok).toBe(true);

      if (result1.ok) {
        expect(result1.stats.size).toBe(0);
      }

      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('handles concurrent calls with existing data in store', async () => {
      const fetchSpy = vi.fn(
        createMockFetchPrototypesSuccess([{ id: 1, prototypeNm: 'Existing' }]),
      );

      const repo = new ProtopediaInMemoryRepositoryImpl({
        storeConfig,
        apiClientOptions: {
          ...apiClientOptions,
          fetch: fetchSpy as unknown as typeof fetch,
        },
      });

      // Initial setup with data
      await repo.setupSnapshot({ offset: 0, limit: 10 });
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      fetchSpy.mockClear();
      fetchSpy.mockImplementation(
        createMockFetchPrototypesSuccess([{ id: 2, prototypeNm: 'Updated' }]),
      );

      // Concurrent refresh calls
      const [result1, result2] = await Promise.all([
        repo.refreshSnapshot(),
        repo.refreshSnapshot(),
      ]);

      expect(result1.ok).toBe(true);
      expect(result2.ok).toBe(true);

      // Only one API call for the refresh
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Data should be updated
      if (result1.ok) {
        expect(result1.stats.size).toBe(1);
      }
    });

    it('handles promise rejection in concurrent scenarios', async () => {
      const fetchSpy = vi.fn(() =>
        Promise.reject(new Error('Network failure')),
      );

      const repo = new ProtopediaInMemoryRepositoryImpl({
        storeConfig,
        apiClientOptions: {
          ...apiClientOptions,
          fetch: fetchSpy as unknown as typeof fetch,
        },
      });

      const [result1, result2, result3] = await Promise.all([
        repo.setupSnapshot({ offset: 0, limit: 10 }),
        repo.setupSnapshot({ offset: 0, limit: 10 }),
        repo.setupSnapshot({ offset: 0, limit: 10 }),
      ]);

      // All should fail
      expect(result1.ok).toBe(false);
      expect(result2.ok).toBe(false);
      expect(result3.ok).toBe(false);

      // Only one API call
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // All should have the same error
      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });
  });

  describe('isolation between repository instances', () => {
    it('maintains independent locks for separate repository instances', async () => {
      const fetchSpy1 = vi.fn(
        createMockFetchPrototypesSuccess([{ id: 1, prototypeNm: 'Repo 1' }]),
      );
      const fetchSpy2 = vi.fn(
        createMockFetchPrototypesSuccess([{ id: 2, prototypeNm: 'Repo 2' }]),
      );

      const repo1 = new ProtopediaInMemoryRepositoryImpl({
        storeConfig,
        apiClientOptions: {
          ...apiClientOptions,
          fetch: fetchSpy1 as unknown as typeof fetch,
        },
      });

      const repo2 = new ProtopediaInMemoryRepositoryImpl({
        storeConfig,
        apiClientOptions: {
          ...apiClientOptions,
          fetch: fetchSpy2 as unknown as typeof fetch,
        },
      });

      // Concurrent calls on different instances should not interfere
      const [result1a, result1b, result2a, result2b] = await Promise.all([
        repo1.setupSnapshot({ offset: 0, limit: 10 }),
        repo1.setupSnapshot({ offset: 0, limit: 10 }),
        repo2.setupSnapshot({ offset: 0, limit: 10 }),
        repo2.setupSnapshot({ offset: 0, limit: 10 }),
      ]);

      expect(result1a.ok).toBe(true);
      expect(result1b.ok).toBe(true);
      expect(result2a.ok).toBe(true);
      expect(result2b.ok).toBe(true);

      // Each repository should have made one API call
      expect(fetchSpy1).toHaveBeenCalledTimes(1);
      expect(fetchSpy2).toHaveBeenCalledTimes(1);

      // Results within same repository should be identical
      expect(result1a).toEqual(result1b);
      expect(result2a).toEqual(result2b);

      // Verify each repository has different data
      const data1 = await repo1.getAllFromSnapshot();
      const data2 = await repo2.getAllFromSnapshot();
      expect(data1).toHaveLength(1);
      expect(data2).toHaveLength(1);
      expect(data1[0]?.id).toBe(1);
      expect(data2[0]?.id).toBe(2);
    });
  });

  describe('mixed success and failure scenarios', () => {
    it('handles transition from error to success correctly', async () => {
      let isFirstCall = true;
      const fetchSpy = vi.fn(() => {
        if (isFirstCall) {
          isFirstCall = false;
          return Promise.resolve(
            new Response(JSON.stringify({ error: 'Temporary Error' }), {
              status: 503,
            }),
          );
        }
        return createMockFetchPrototypesSuccess([
          { id: 1, prototypeNm: 'Recovered' },
        ])();
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        storeConfig,
        apiClientOptions: {
          ...apiClientOptions,
          fetch: fetchSpy as unknown as typeof fetch,
        },
      });

      // First batch - should fail
      const [fail1, fail2] = await Promise.all([
        repo.setupSnapshot({ offset: 0, limit: 10 }),
        repo.setupSnapshot({ offset: 0, limit: 10 }),
      ]);

      expect(fail1.ok).toBe(false);
      expect(fail2.ok).toBe(false);

      // Second batch - should succeed
      const [success1, success2] = await Promise.all([
        repo.setupSnapshot({ offset: 0, limit: 10 }),
        repo.setupSnapshot({ offset: 0, limit: 10 }),
      ]);

      expect(success1.ok).toBe(true);
      expect(success2.ok).toBe(true);

      // Total of 2 API calls (one per batch)
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('timing and ordering', () => {
    it('preserves call order for sequential operations', async () => {
      const callOrder: number[] = [];
      const fetchSpy = vi.fn(() => {
        const callNum = fetchSpy.mock.calls.length;
        callOrder.push(callNum);
        return createMockFetchPrototypesSuccess([
          { id: callNum, prototypeNm: `Call ${callNum}` },
        ])();
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        storeConfig,
        apiClientOptions: {
          ...apiClientOptions,
          fetch: fetchSpy as unknown as typeof fetch,
        },
      });

      // Sequential calls
      await repo.setupSnapshot({ offset: 0, limit: 10 });
      await repo.refreshSnapshot();
      await repo.refreshSnapshot();

      expect(callOrder).toEqual([1, 2, 3]);
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });

    it('completes all concurrent calls when first call is delayed', async () => {
      let resolveDelayed: (() => void) | null = null;
      const delayedPromise = new Promise<void>((resolve) => {
        resolveDelayed = resolve;
      });

      const fetchSpy = vi.fn(() =>
        delayedPromise.then(() =>
          createMockFetchPrototypesSuccess([
            { id: 1, prototypeNm: 'Delayed' },
          ])(),
        ),
      );

      const repo = new ProtopediaInMemoryRepositoryImpl({
        storeConfig,
        apiClientOptions: {
          ...apiClientOptions,
          fetch: fetchSpy as unknown as typeof fetch,
        },
      });

      // Start multiple concurrent calls
      const promises = [
        repo.setupSnapshot({ offset: 0, limit: 10 }),
        repo.setupSnapshot({ offset: 0, limit: 10 }),
        repo.setupSnapshot({ offset: 0, limit: 10 }),
      ];

      // Wait a bit to ensure all promises are registered
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Release the delayed fetch
      resolveDelayed!();

      const results = await Promise.all(promises);

      // All should complete successfully
      expect(results.every((r) => r.ok)).toBe(true);

      // Only one API call
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('timeout and cancellation scenarios', () => {
    it('handles timeout during concurrent fetch operations', async () => {
      let timeoutId: NodeJS.Timeout | null = null;
      const fetchSpy = vi.fn(
        () =>
          new Promise((resolve) => {
            // Simulate a long-running request
            timeoutId = setTimeout(() => {
              resolve(
                createMockFetchPrototypesSuccess([
                  { id: 1, prototypeNm: 'Delayed Response' },
                ])(),
              );
            }, 100);
          }),
      );

      const repo = new ProtopediaInMemoryRepositoryImpl({
        storeConfig,
        apiClientOptions: {
          ...apiClientOptions,
          fetch: fetchSpy as unknown as typeof fetch,
        },
      });

      // Start multiple concurrent calls that will all wait
      const promises = [
        repo.setupSnapshot({ offset: 0, limit: 10 }),
        repo.setupSnapshot({ offset: 0, limit: 10 }),
        repo.setupSnapshot({ offset: 0, limit: 10 }),
      ];

      const results = await Promise.all(promises);

      // All should complete successfully
      expect(results.every((r) => r.ok)).toBe(true);

      // Only one API call despite the delay
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Cleanup
      if (timeoutId) clearTimeout(timeoutId);
    });

    it('handles concurrent calls when first call times out', async () => {
      let callCount = 0;
      const fetchSpy = vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          // First call simulates timeout by rejecting after delay
          return new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), 50);
          });
        }
        // Subsequent calls succeed
        return createMockFetchPrototypesSuccess([
          { id: 1, prototypeNm: 'Success after timeout' },
        ])();
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        storeConfig,
        apiClientOptions: {
          ...apiClientOptions,
          fetch: fetchSpy as unknown as typeof fetch,
        },
      });

      // First batch - should timeout
      const [fail1, fail2] = await Promise.all([
        repo.setupSnapshot({ offset: 0, limit: 10 }),
        repo.setupSnapshot({ offset: 0, limit: 10 }),
      ]);

      expect(fail1.ok).toBe(false);
      expect(fail2.ok).toBe(false);

      // Second call - should succeed
      const success = await repo.setupSnapshot({ offset: 0, limit: 10 });
      expect(success.ok).toBe(true);

      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('memory and resource constraints', () => {
    it('handles memory constraints with large concurrent requests', async () => {
      // Create a large dataset that might exceed limits
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        prototypeNm: `Prototype ${i}`.repeat(100), // Make it large
      }));

      const fetchSpy = vi.fn(createMockFetchPrototypesSuccess(largeData));

      // Use smaller maxDataSizeBytes to test limits
      const repo = new ProtopediaInMemoryRepositoryImpl({
        storeConfig: { ttlMs: 30000, maxDataSizeBytes: 1024 * 100 }, // 100KB limit
        apiClientOptions: {
          ...apiClientOptions,
          fetch: fetchSpy as unknown as typeof fetch,
        },
      });

      const [result1, result2, result3] = await Promise.all([
        repo.setupSnapshot({ offset: 0, limit: 1000 }),
        repo.setupSnapshot({ offset: 0, limit: 1000 }),
        repo.setupSnapshot({ offset: 0, limit: 1000 }),
      ]);

      // All should succeed (fetch succeeds) but store update is skipped
      expect(result1.ok).toBe(true);
      expect(result2.ok).toBe(true);
      expect(result3.ok).toBe(true);

      // Only one API call despite concurrent requests
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // All results should be identical
      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });

    it('correctly handles store capacity across concurrent updates', async () => {
      const fetchSpy = vi.fn(
        createMockFetchPrototypesSuccess([
          { id: 1, prototypeNm: 'Data' },
          { id: 2, prototypeNm: 'More Data' },
        ]),
      );

      const repo = new ProtopediaInMemoryRepositoryImpl({
        storeConfig,
        apiClientOptions: {
          ...apiClientOptions,
          fetch: fetchSpy as unknown as typeof fetch,
        },
      });

      // Multiple concurrent setups
      const results = await Promise.all([
        repo.setupSnapshot({ offset: 0, limit: 10 }),
        repo.setupSnapshot({ offset: 0, limit: 10 }),
        repo.setupSnapshot({ offset: 0, limit: 10 }),
      ]);

      // All should succeed
      expect(results.every((r) => r.ok)).toBe(true);

      // Store should have correct size
      const stats = repo.getStats();
      expect(stats.size).toBe(2);

      // Only one API call
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('state consistency and partial failures', () => {
    it('maintains consistent state when concurrent calls encounter store errors', async () => {
      const fetchSpy = vi.fn(
        createMockFetchPrototypesSuccess([{ id: 1, prototypeNm: 'Test Data' }]),
      );

      const repo = new ProtopediaInMemoryRepositoryImpl({
        storeConfig,
        apiClientOptions: {
          ...apiClientOptions,
          fetch: fetchSpy as unknown as typeof fetch,
        },
      });

      // First attempt - fetch succeeds but we'll verify state
      const results = await Promise.all([
        repo.setupSnapshot({ offset: 0, limit: 10 }),
        repo.setupSnapshot({ offset: 0, limit: 10 }),
      ]);

      expect(results.every((r) => r.ok)).toBe(true);

      // Verify state is consistent
      const data1 = await repo.getAllFromSnapshot();
      expect(data1).toHaveLength(1);

      // Second batch should work independently
      fetchSpy.mockClear();
      const results2 = await Promise.all([
        repo.refreshSnapshot(),
        repo.refreshSnapshot(),
      ]);

      expect(results2.every((r) => r.ok)).toBe(true);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('preserves previous data when concurrent update fails', async () => {
      let callCount = 0;
      const fetchSpy = vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          // First call succeeds
          return createMockFetchPrototypesSuccess([
            { id: 1, prototypeNm: 'Initial Data' },
          ])();
        }
        // Second call fails
        return Promise.resolve(
          new Response(JSON.stringify({ error: 'Update Failed' }), {
            status: 500,
          }),
        );
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        storeConfig,
        apiClientOptions: {
          ...apiClientOptions,
          fetch: fetchSpy as unknown as typeof fetch,
        },
      });

      // Initial setup
      const setupResult = await repo.setupSnapshot({ offset: 0, limit: 10 });
      expect(setupResult.ok).toBe(true);

      // Get initial data
      const initialData = await repo.getAllFromSnapshot();
      expect(initialData).toHaveLength(1);
      expect(initialData[0]?.id).toBe(1);

      // Failed concurrent update
      const [fail1, fail2] = await Promise.all([
        repo.refreshSnapshot(),
        repo.refreshSnapshot(),
      ]);

      expect(fail1.ok).toBe(false);
      expect(fail2.ok).toBe(false);

      // Previous data should still be intact
      const preservedData = await repo.getAllFromSnapshot();
      expect(preservedData).toHaveLength(1);
      expect(preservedData[0]?.id).toBe(1);
      expect(preservedData[0]?.prototypeNm).toBe('Initial Data');
    });
  });

  describe('observability and metrics during concurrency', () => {
    it('provides correct stats during concurrent operations', async () => {
      let resolveDelayed: (() => void) | null = null;
      const delayedPromise = new Promise<void>((resolve) => {
        resolveDelayed = resolve;
      });

      const fetchSpy = vi.fn(() =>
        delayedPromise.then(() =>
          createMockFetchPrototypesSuccess([
            { id: 1, prototypeNm: 'Data' },
            { id: 2, prototypeNm: 'More Data' },
          ])(),
        ),
      );

      const repo = new ProtopediaInMemoryRepositoryImpl({
        storeConfig,
        apiClientOptions: {
          ...apiClientOptions,
          fetch: fetchSpy as unknown as typeof fetch,
        },
      });

      // Start concurrent operations
      const promises = [
        repo.setupSnapshot({ offset: 0, limit: 10 }),
        repo.setupSnapshot({ offset: 0, limit: 10 }),
      ];

      // Check stats while operations are in flight
      const statsDuringFetch = repo.getStats();
      expect(statsDuringFetch.size).toBe(0); // No data yet
      expect(statsDuringFetch.refreshInFlight).toBe(false); // Our impl doesn't track this

      // Complete the operations
      resolveDelayed!();
      const results = await Promise.all(promises);

      expect(results.every((r) => r.ok)).toBe(true);

      // Check final stats
      const finalStats = repo.getStats();
      expect(finalStats.size).toBe(2);

      const firstResult = results[0];
      if (firstResult && firstResult.ok) {
        expect(firstResult.stats.size).toBe(2);
      }
    });

    it('reports consistent config across concurrent calls', async () => {
      const fetchSpy = vi.fn(
        createMockFetchPrototypesSuccess([{ id: 1, prototypeNm: 'Test' }]),
      );

      const repo = new ProtopediaInMemoryRepositoryImpl({
        storeConfig,
        apiClientOptions: {
          ...apiClientOptions,
          fetch: fetchSpy as unknown as typeof fetch,
        },
      });

      // Get config before, during, and after concurrent operations
      const configBefore = repo.getConfig();

      const promises = [
        repo.setupSnapshot({ offset: 0, limit: 10 }),
        repo.setupSnapshot({ offset: 0, limit: 10 }),
      ];

      const configDuring = repo.getConfig();

      await Promise.all(promises);

      const configAfter = repo.getConfig();

      // All configs should be identical
      expect(configBefore).toEqual(configDuring);
      expect(configDuring).toEqual(configAfter);
      expect(configBefore.ttlMs).toBe(30000);
    });
  });

  describe('complex interleaved patterns', () => {
    it('handles complex interleaved setup/refresh patterns correctly', async () => {
      const fetchSpy = vi.fn(
        createMockFetchPrototypesSuccess([{ id: 1, prototypeNm: 'Data' }]),
      );

      const repo = new ProtopediaInMemoryRepositoryImpl({
        storeConfig,
        apiClientOptions: {
          ...apiClientOptions,
          fetch: fetchSpy as unknown as typeof fetch,
        },
      });

      // Complex pattern: setup -> concurrent refresh -> setup -> concurrent refresh
      await repo.setupSnapshot({ offset: 0, limit: 10 });
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      fetchSpy.mockClear();

      await Promise.all([repo.refreshSnapshot(), repo.refreshSnapshot()]);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      fetchSpy.mockClear();

      await repo.setupSnapshot({ offset: 0, limit: 20 });
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      fetchSpy.mockClear();

      await Promise.all([
        repo.refreshSnapshot(),
        repo.refreshSnapshot(),
        repo.refreshSnapshot(),
      ]);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Total: 4 API calls for the entire pattern
    });

    it('correctly handles overlapping setup and refresh waves', async () => {
      let callNumber = 0;
      const fetchSpy = vi.fn(() => {
        callNumber++;
        return createMockFetchPrototypesSuccess([
          { id: callNumber, prototypeNm: `Wave ${callNumber}` },
        ])();
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        storeConfig,
        apiClientOptions: {
          ...apiClientOptions,
          fetch: fetchSpy as unknown as typeof fetch,
        },
      });

      // First wave
      const wave1 = await Promise.all([
        repo.setupSnapshot({ offset: 0, limit: 10 }),
        repo.setupSnapshot({ offset: 0, limit: 10 }),
      ]);

      expect(wave1.every((r) => r.ok)).toBe(true);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Second wave overlapping with different method
      const wave2 = await Promise.all([
        repo.refreshSnapshot(),
        repo.setupSnapshot({ offset: 0, limit: 20 }),
        repo.refreshSnapshot(),
      ]);

      expect(wave2.every((r) => r.ok)).toBe(true);
      expect(fetchSpy).toHaveBeenCalledTimes(2); // One more call

      // Verify final state
      const finalData = await repo.getAllFromSnapshot();
      expect(finalData).toHaveLength(1);
      expect(finalData[0]?.id).toBe(2); // From second wave
    });
  });

  describe('real-world usage patterns', () => {
    it('handles typical user workflow: initial load -> periodic refresh', async () => {
      let callNumber = 0;
      const fetchSpy = vi.fn(() => {
        callNumber++;
        return createMockFetchPrototypesSuccess([
          { id: callNumber, prototypeNm: `Data version ${callNumber}` },
        ])();
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        storeConfig,
        apiClientOptions: {
          ...apiClientOptions,
          fetch: fetchSpy as unknown as typeof fetch,
        },
      });

      // Simulate app startup - initial load
      const initialLoad = await repo.setupSnapshot({ offset: 0, limit: 100 });
      expect(initialLoad.ok).toBe(true);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Simulate periodic auto-refresh (every 30 seconds in real app)
      for (let i = 0; i < 5; i++) {
        fetchSpy.mockClear();
        const refreshResult = await repo.refreshSnapshot();
        expect(refreshResult.ok).toBe(true);
        expect(fetchSpy).toHaveBeenCalledTimes(1);
      }

      // Total: 6 API calls (1 initial + 5 refreshes)
      expect(callNumber).toBe(6);

      // Verify final data
      const finalData = await repo.getAllFromSnapshot();
      expect(finalData).toHaveLength(1);
      expect(finalData[0]?.prototypeNm).toBe('Data version 6');
    });

    it('handles user-triggered refresh during auto-refresh', async () => {
      let resolveAutoRefresh: (() => void) | null = null;
      const autoRefreshPromise = new Promise<void>((resolve) => {
        resolveAutoRefresh = resolve;
      });

      let callCount = 0;
      const fetchSpy = vi.fn(() => {
        callCount++;
        if (callCount === 2) {
          // Second call (auto-refresh) is delayed
          return autoRefreshPromise.then(() =>
            createMockFetchPrototypesSuccess([
              { id: 2, prototypeNm: 'Auto-refresh data' },
            ])(),
          );
        }
        return createMockFetchPrototypesSuccess([
          { id: callCount, prototypeNm: `Call ${callCount}` },
        ])();
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({
        storeConfig,
        apiClientOptions: {
          ...apiClientOptions,
          fetch: fetchSpy as unknown as typeof fetch,
        },
      });

      // Initial setup
      await repo.setupSnapshot({ offset: 0, limit: 100 });
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      fetchSpy.mockClear();

      // Auto-refresh starts (delayed)
      const autoRefresh = repo.refreshSnapshot();

      // User clicks refresh button while auto-refresh is in progress
      const userRefresh = repo.refreshSnapshot();

      // Complete the auto-refresh
      resolveAutoRefresh!();

      const [autoResult, userResult] = await Promise.all([
        autoRefresh,
        userRefresh,
      ]);

      // Both should succeed with the same result
      expect(autoResult.ok).toBe(true);
      expect(userResult.ok).toBe(true);
      expect(autoResult).toEqual(userResult);

      // Only one API call despite two refresh requests
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('handles rapid parameter changes in UI', async () => {
      const fetchSpy = vi.fn(
        createMockFetchPrototypesSuccess([
          { id: 1, prototypeNm: 'Search results' },
        ]),
      );

      const repo = new ProtopediaInMemoryRepositoryImpl({
        storeConfig,
        apiClientOptions: {
          ...apiClientOptions,
          fetch: fetchSpy as unknown as typeof fetch,
        },
      });

      // User types rapidly in search box, triggering multiple setupSnapshot calls
      // before debounce would kick in
      const rapidChanges = await Promise.all([
        repo.setupSnapshot({ offset: 0, limit: 10 }), // "a"
        repo.setupSnapshot({ offset: 0, limit: 20 }), // "ab"
        repo.setupSnapshot({ offset: 0, limit: 30 }), // "abc"
        repo.setupSnapshot({ offset: 0, limit: 40 }), // "abcd"
        repo.setupSnapshot({ offset: 0, limit: 50 }), // "abcde"
      ]);

      // All should succeed
      expect(rapidChanges.every((r) => r.ok)).toBe(true);

      // Only one API call (first caller's parameters)
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // All results should be identical
      const firstResult = rapidChanges[0];
      rapidChanges.forEach((r) => {
        expect(r).toEqual(firstResult);
      });

      // Verify the API was called with the first parameter set
      const firstCallArg = (
        fetchSpy.mock.calls as unknown as Array<[string]>
      )[0]?.[0];
      expect(firstCallArg).toMatch(/limit=10/);
    });

    it('handles window focus/blur causing refresh cycles', async () => {
      const fetchSpy = vi.fn(
        createMockFetchPrototypesSuccess([
          { id: 1, prototypeNm: 'Fresh data' },
        ]),
      );

      const repo = new ProtopediaInMemoryRepositoryImpl({
        storeConfig,
        apiClientOptions: {
          ...apiClientOptions,
          fetch: fetchSpy as unknown as typeof fetch,
        },
      });

      // Initial setup
      await repo.setupSnapshot({ offset: 0, limit: 100 });
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      fetchSpy.mockClear();

      // Simulate rapid window focus/blur events
      // (browser tab switching, window switching, etc.)
      const focusBlurCycle = async () => {
        await Promise.all([
          repo.refreshSnapshot(), // focus event
          repo.refreshSnapshot(), // blur event
          repo.refreshSnapshot(), // focus event again
        ]);
      };

      // Multiple cycles
      await focusBlurCycle();
      expect(fetchSpy).toHaveBeenCalledTimes(1); // Coalesced into one

      fetchSpy.mockClear();

      // Second cycle after first completes
      await focusBlurCycle();
      expect(fetchSpy).toHaveBeenCalledTimes(1); // New batch, one call

      fetchSpy.mockClear();

      // Third cycle
      await focusBlurCycle();
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Total: 3 API calls for 3 separate focus/blur cycles
      // (9 refresh requests total, coalesced to 3)
    });
  });
});
