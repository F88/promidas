/**
 * Tests for ProtopediaInMemoryRepositoryImpl integration scenarios.
 *
 * Covers API client integration, fetch parameters, data normalization,
 * boundary values, sequential operations, and edge cases.
 *
 * @module
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createProtopediaApiCustomClient } from '../../../fetcher/index.js';
import { ProtopediaInMemoryRepositoryImpl } from '../../protopedia-in-memory-repository.js';

vi.mock('../../../fetcher/index', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../fetcher/index.js')>();
  return {
    ...actual,
    createProtopediaApiCustomClient: vi.fn(),
  };
});

import { makePrototype, setupMocks } from './test-helpers.js';

describe('ProtopediaInMemoryRepositoryImpl - integration', () => {
  const { fetchPrototypesMock, resetMocks } = setupMocks();

  beforeEach(() => {
    resetMocks();
  });

  describe('API client integration', () => {
    it('passes API client options to createProtopediaApiCustomClient', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [makePrototype({ id: 1 })],
      });

      const apiOptions = {
        token: 'test-token',
        baseUrl: 'https://test.example.com',
        logLevel: 'debug' as const,
      };

      const repo = new ProtopediaInMemoryRepositoryImpl({}, apiOptions);
      await repo.setupSnapshot({});

      expect(
        createProtopediaApiCustomClient as unknown as ReturnType<typeof vi.fn>,
      ).toHaveBeenCalledWith(apiOptions);
    });

    it('works without API client options', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [makePrototype({ id: 1 })],
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({});
      await repo.setupSnapshot({});

      const stats = repo.getStats();
      expect(stats.size).toBe(1);
    });
  });

  describe('fetch parameters', () => {
    it('supports prototypeId parameter in setupSnapshot', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [makePrototype({ id: 999, prototypeNm: 'specific' })],
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({}, {});
      await repo.setupSnapshot({ prototypeId: 999 });

      expect(fetchPrototypesMock).toHaveBeenCalledWith({
        offset: 0,
        limit: 10,
        prototypeId: 999,
      });

      const proto = await repo.getPrototypeFromSnapshotByPrototypeId(999);
      expect(proto?.prototypeNm).toBe('specific');
    });

    it('remembers prototypeId in subsequent refreshes', async () => {
      fetchPrototypesMock
        .mockResolvedValueOnce({
          ok: true,
          data: [makePrototype({ id: 888, prototypeNm: 'first' })],
        })
        .mockResolvedValueOnce({
          ok: true,
          data: [makePrototype({ id: 888, prototypeNm: 'refreshed' })],
        });

      const repo = new ProtopediaInMemoryRepositoryImpl({}, {});
      await repo.setupSnapshot({ prototypeId: 888, offset: 5, limit: 20 });

      expect(fetchPrototypesMock).toHaveBeenNthCalledWith(1, {
        offset: 5,
        limit: 20,
        prototypeId: 888,
      });

      await repo.refreshSnapshot();

      expect(fetchPrototypesMock).toHaveBeenNthCalledWith(2, {
        offset: 5,
        limit: 20,
        prototypeId: 888,
      });
    });

    it('handles all parameter combinations', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [makePrototype({ id: 1 })],
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({}, {});
      await repo.setupSnapshot({
        offset: 15,
        limit: 25,
        prototypeId: 777,
      });

      expect(fetchPrototypesMock).toHaveBeenCalledWith({
        offset: 15,
        limit: 25,
        prototypeId: 777,
      });
    });
  });

  describe('data normalization', () => {
    it('stores and retrieves normalized prototype data correctly', async () => {
      const rawPrototype = makePrototype({
        id: 12345,
        prototypeNm: 'Test Prototype',
        teamNm: 'Test Team',
        users: 'user1|user2|user3',
        mainUrl: 'https://example.com/proto',
        viewCount: 100,
        goodCount: 50,
      });

      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [rawPrototype],
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({}, {});
      await repo.setupSnapshot({});

      const stored = await repo.getPrototypeFromSnapshotByPrototypeId(12345);

      expect(stored).not.toBeNull();
      expect(stored?.id).toBe(12345);
      expect(stored?.prototypeNm).toBe('Test Prototype');
      expect(stored?.teamNm).toBe('Test Team');
      expect(stored?.mainUrl).toBe('https://example.com/proto');
    });

    it('handles prototypes with minimal data', async () => {
      const minimalPrototype = makePrototype({
        id: 1,
        prototypeNm: '',
        teamNm: '',
        users: '',
        mainUrl: '',
      });

      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [minimalPrototype],
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({}, {});
      await repo.setupSnapshot({});

      const stored = await repo.getPrototypeFromSnapshotByPrototypeId(1);
      expect(stored).not.toBeNull();
      expect(stored?.id).toBe(1);
    });
  });

  describe('boundary values', () => {
    it('handles limit of 1', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [makePrototype({ id: 1 })],
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({}, {});
      await repo.setupSnapshot({ limit: 1 });

      expect(fetchPrototypesMock).toHaveBeenCalledWith({
        offset: 0,
        limit: 1,
      });

      const stats = repo.getStats();
      expect(stats.size).toBe(1);
    });

    it('handles offset of 0 explicitly', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [makePrototype({ id: 1 })],
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({}, {});
      await repo.setupSnapshot({ offset: 0, limit: 5 });

      expect(fetchPrototypesMock).toHaveBeenCalledWith({
        offset: 0,
        limit: 5,
      });
    });

    it('handles large offset values', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [makePrototype({ id: 99999 })],
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({}, {});
      await repo.setupSnapshot({ offset: 10000, limit: 100 });

      expect(fetchPrototypesMock).toHaveBeenCalledWith({
        offset: 10000,
        limit: 100,
      });
    });

    it('handles large limit values', async () => {
      const largeDataset = Array.from({ length: 100 }, (_, i) =>
        makePrototype({ id: i + 1, prototypeNm: `proto-${i + 1}` }),
      );

      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: largeDataset,
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({}, {});
      await repo.setupSnapshot({ limit: 100 });

      const stats = repo.getStats();
      expect(stats.size).toBe(100);

      const first = await repo.getPrototypeFromSnapshotByPrototypeId(1);
      const last = await repo.getPrototypeFromSnapshotByPrototypeId(100);

      expect(first?.prototypeNm).toBe('proto-1');
      expect(last?.prototypeNm).toBe('proto-100');
    });
  });

  describe('sequential operations', () => {
    it('handles rapid successive reads after setup', async () => {
      fetchPrototypesMock.mockResolvedValueOnce({
        ok: true,
        data: [
          makePrototype({ id: 1, prototypeNm: 'one' }),
          makePrototype({ id: 2, prototypeNm: 'two' }),
        ],
      });

      const repo = new ProtopediaInMemoryRepositoryImpl({}, {});
      await repo.setupSnapshot({});

      const results = await Promise.all([
        repo.getPrototypeFromSnapshotByPrototypeId(1),
        repo.getPrototypeFromSnapshotByPrototypeId(2),
        repo.getRandomPrototypeFromSnapshot(),
        Promise.resolve(repo.getStats()),
      ]);

      expect(results[0]?.prototypeNm).toBe('one');
      expect(results[1]?.prototypeNm).toBe('two');
      expect(results[2]).not.toBeNull();
      expect(results[3].size).toBe(2);
    });

    it('maintains consistency across alternating setup and read operations', async () => {
      fetchPrototypesMock
        .mockResolvedValueOnce({
          ok: true,
          data: [makePrototype({ id: 1, prototypeNm: 'first' })],
        })
        .mockResolvedValueOnce({
          ok: true,
          data: [makePrototype({ id: 2, prototypeNm: 'second' })],
        });

      const repo = new ProtopediaInMemoryRepositoryImpl({}, {});

      await repo.setupSnapshot({ offset: 0 });
      let proto = await repo.getPrototypeFromSnapshotByPrototypeId(1);
      expect(proto?.prototypeNm).toBe('first');

      await repo.setupSnapshot({ offset: 10 });
      proto = await repo.getPrototypeFromSnapshotByPrototypeId(2);
      expect(proto?.prototypeNm).toBe('second');

      const missingOld = await repo.getPrototypeFromSnapshotByPrototypeId(1);
      expect(missingOld).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('handles instance isolation - multiple instances do not share state', async () => {
      fetchPrototypesMock.mockResolvedValue({
        ok: true,
        data: [makePrototype({ id: 1 })],
      });

      const repo1 = new ProtopediaInMemoryRepositoryImpl({}, {});
      const repo2 = new ProtopediaInMemoryRepositoryImpl({}, {});

      await repo1.setupSnapshot({});

      const stats1 = repo1.getStats();
      const stats2 = repo2.getStats();

      expect(stats1.size).toBe(1);
      expect(stats2.size).toBe(0);
    });
  });
});
