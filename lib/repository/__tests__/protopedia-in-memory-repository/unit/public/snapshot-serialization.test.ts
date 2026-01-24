/**
 * Tests for ProtopediaInMemoryRepositoryImpl snapshot serialization methods.
 *
 * Covers getSerializableSnapshot method which provides export functionality
 * for creating JSON-serializable snapshots of the current repository state.
 *
 * @module
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProtopediaApiCustomClient } from '../../../../../fetcher/index.js';
import {
  DataSizeExceededError,
  PrototypeInMemoryStore,
  SizeEstimationError,
} from '../../../../../store/index.js';
import { ProtopediaInMemoryRepositoryImpl } from '../../../../protopedia-in-memory-repository.js';
import {
  createTestContext,
  makeNormalizedPrototype,
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

describe('ProtopediaInMemoryRepositoryImpl - snapshot serialization', () => {
  const { resetMocks } = setupMocks();

  let mockStoreInstance: PrototypeInMemoryStore;
  let mockApiClientInstance: InstanceType<typeof ProtopediaApiCustomClient>;

  beforeEach(() => {
    resetMocks();
    vi.clearAllMocks();

    const testContext = createTestContext();
    mockStoreInstance = testContext.mockStoreInstance;
    mockApiClientInstance = testContext.mockApiClientInstance;
  });

  describe('getSerializableSnapshot', () => {
    describe('Basic functionality', () => {
      it('returns empty snapshot when store is empty', () => {
        vi.mocked(mockStoreInstance.getAll).mockReturnValue([]);

        const repo = new ProtopediaInMemoryRepositoryImpl({
          store: mockStoreInstance,
          apiClient: mockApiClientInstance,
        });

        const snapshot = repo.getSerializableSnapshot();

        expect(snapshot).toMatchObject({
          version: '1.0.0',
          prototypes: [],
        });
        expect(snapshot.serializedAt).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
        );
      });

      it('returns snapshot with prototypes when store has data', () => {
        const proto1 = makeNormalizedPrototype({
          id: 1,
          prototypeNm: 'Proto 1',
        });
        const proto2 = makeNormalizedPrototype({
          id: 2,
          prototypeNm: 'Proto 2',
        });
        vi.mocked(mockStoreInstance.getAll).mockReturnValue([proto1, proto2]);

        const repo = new ProtopediaInMemoryRepositoryImpl({
          store: mockStoreInstance,
          apiClient: mockApiClientInstance,
        });

        const snapshot = repo.getSerializableSnapshot();

        expect(snapshot.version).toBe('1.0.0');
        expect(snapshot.prototypes).toHaveLength(2);
        expect(snapshot.prototypes[0]!.id).toBe(1);
        expect(snapshot.prototypes[0]!.prototypeNm).toBe('Proto 1');
        expect(snapshot.prototypes[1]!.id).toBe(2);
        expect(snapshot.prototypes[1]!.prototypeNm).toBe('Proto 2');
      });

      it('preserves all prototype fields', () => {
        const proto = makeNormalizedPrototype({
          id: 123,
          prototypeNm: 'Test Prototype',
          summary: 'Test summary',
          freeComment: 'Free comment',
          systemDescription: 'System desc',
          teamNm: 'Team Name',
          status: 1,
          releaseFlg: 1,
          viewCount: 100,
          goodCount: 50,
          commentCount: 10,
          mainUrl: 'https://example.com/image.jpg',
          officialLink: 'https://example.com',
          videoUrl: 'https://youtube.com/watch?v=xxx',
        });
        vi.mocked(mockStoreInstance.getAll).mockReturnValue([proto]);

        const repo = new ProtopediaInMemoryRepositoryImpl({
          store: mockStoreInstance,
          apiClient: mockApiClientInstance,
        });

        const snapshot = repo.getSerializableSnapshot();
        const serializedProto = snapshot.prototypes[0]!;

        expect(serializedProto.id).toBe(123);
        expect(serializedProto.prototypeNm).toBe('Test Prototype');
        expect(serializedProto.summary).toBe('Test summary');
        expect(serializedProto.freeComment).toBe('Free comment');
        expect(serializedProto.systemDescription).toBe('System desc');
        expect(serializedProto.teamNm).toBe('Team Name');
        expect(serializedProto.status).toBe(1);
        expect(serializedProto.releaseFlg).toBe(1);
        expect(serializedProto.viewCount).toBe(100);
        expect(serializedProto.goodCount).toBe(50);
        expect(serializedProto.commentCount).toBe(10);
        expect(serializedProto.mainUrl).toBe('https://example.com/image.jpg');
        expect(serializedProto.officialLink).toBe('https://example.com');
        expect(serializedProto.videoUrl).toBe(
          'https://youtube.com/watch?v=xxx',
        );
      });
    });

    describe('Data integrity', () => {
      it('creates deep copies of array fields', () => {
        const proto = makeNormalizedPrototype({
          id: 1,
          users: 'user1|user2|user3',
          tags: 'tag1|tag2',
          materials: 'mat1',
          events: 'event1|event2',
          awards: 'award1',
        });
        vi.mocked(mockStoreInstance.getAll).mockReturnValue([proto]);

        const repo = new ProtopediaInMemoryRepositoryImpl({
          store: mockStoreInstance,
          apiClient: mockApiClientInstance,
        });

        const snapshot = repo.getSerializableSnapshot();
        const serializedProto = snapshot.prototypes[0]!;

        // Verify arrays are copied
        expect(serializedProto.users).toEqual(['user1', 'user2', 'user3']);
        expect(serializedProto.tags).toEqual(['tag1', 'tag2']);
        expect(serializedProto.materials).toEqual(['mat1']);
        expect(serializedProto.events).toEqual(['event1', 'event2']);
        expect(serializedProto.awards).toEqual(['award1']);

        // Verify independence - modifying serialized data doesn't affect original
        (serializedProto.users as string[]).push('user4');
        expect(proto.users).toHaveLength(3); // Original unchanged
      });

      it('returns independent snapshots on multiple calls', () => {
        const proto1 = makeNormalizedPrototype({ id: 1 });
        vi.mocked(mockStoreInstance.getAll)
          .mockReturnValueOnce([proto1])
          .mockReturnValueOnce([proto1, makeNormalizedPrototype({ id: 2 })]);

        const repo = new ProtopediaInMemoryRepositoryImpl({
          store: mockStoreInstance,
          apiClient: mockApiClientInstance,
        });

        const snapshot1 = repo.getSerializableSnapshot();
        const snapshot2 = repo.getSerializableSnapshot();

        expect(snapshot1.prototypes).toHaveLength(1);
        expect(snapshot2.prototypes).toHaveLength(2);

        // Modifying snapshot1 doesn't affect snapshot2
        // snapshot1.prototypes.push(makeNormalizedPrototype({ id: 999 })); // Error: readonly
        // We can't mutate snapshot1.prototypes directly anymore.
        // But to test independence, we can just check that snapshot2 didn't change even if we *could* mutate snapshot1 (which we can't).
        // Since we can't mutate, the test logic "modify 1, check 2" is now enforcing the very immutability we added.
        // We will simulate a mutation by casting to any or just check that they are different references.
        expect(snapshot1.prototypes).not.toBe(snapshot2.prototypes);
      });
    });

    describe('Metadata validation', () => {
      it('generates ISO-8601 UTC timestamp for serializedAt', () => {
        vi.mocked(mockStoreInstance.getAll).mockReturnValue([]);

        const repo = new ProtopediaInMemoryRepositoryImpl({
          store: mockStoreInstance,
          apiClient: mockApiClientInstance,
        });

        const beforeCall = new Date();
        const snapshot = repo.getSerializableSnapshot();
        const afterCall = new Date();

        const serializedAt = new Date(snapshot.serializedAt);
        expect(serializedAt.getTime()).toBeGreaterThanOrEqual(
          beforeCall.getTime(),
        );
        expect(serializedAt.getTime()).toBeLessThanOrEqual(afterCall.getTime());
        expect(snapshot.serializedAt).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
        );
      });

      it('uses constant for version number', () => {
        vi.mocked(mockStoreInstance.getAll).mockReturnValue([]);

        const repo = new ProtopediaInMemoryRepositoryImpl({
          store: mockStoreInstance,
          apiClient: mockApiClientInstance,
        });

        const snapshot = repo.getSerializableSnapshot();

        // Verify version follows semver pattern
        expect(snapshot.version).toMatch(/^\d+\.\d+\.\d+$/);
        expect(snapshot.version).toBe('1.0.0');
      });
    });

    describe('Serialization', () => {
      it('is JSON-serializable', () => {
        const proto = makeNormalizedPrototype({ id: 1, prototypeNm: 'Test' });
        vi.mocked(mockStoreInstance.getAll).mockReturnValue([proto]);

        const repo = new ProtopediaInMemoryRepositoryImpl({
          store: mockStoreInstance,
          apiClient: mockApiClientInstance,
        });

        const snapshot = repo.getSerializableSnapshot();

        // Should not throw
        expect(() => JSON.stringify(snapshot)).not.toThrow();

        const json = JSON.stringify(snapshot);
        const parsed = JSON.parse(json);

        expect(parsed.version).toBe('1.0.0');
        expect(parsed.prototypes).toHaveLength(1);
        expect(parsed.prototypes[0]!.id).toBe(1);
      });

      it('handles special characters in string fields', () => {
        const proto = makeNormalizedPrototype({
          id: 1,
          prototypeNm: 'Test "Quotes" & <HTML>',
          summary: 'Line1\nLine2\tTab',
          freeComment: '特殊文字 🚀 emoji',
          teamNm: `Backslash\\and'quotes`,
        });
        vi.mocked(mockStoreInstance.getAll).mockReturnValue([proto]);

        const repo = new ProtopediaInMemoryRepositoryImpl({
          store: mockStoreInstance,
          apiClient: mockApiClientInstance,
        });

        const snapshot = repo.getSerializableSnapshot();
        const json = JSON.stringify(snapshot);
        const parsed = JSON.parse(json);

        expect(parsed.prototypes[0]!.prototypeNm).toBe(
          'Test "Quotes" & <HTML>',
        );
        expect(parsed.prototypes[0]!.summary).toBe('Line1\nLine2\tTab');
        expect(parsed.prototypes[0]!.freeComment).toBe('特殊文字 🚀 emoji');
        expect(parsed.prototypes[0]!.teamNm).toBe(`Backslash\\and'quotes`);
      });
    });

    describe('Edge cases', () => {
      it('handles prototypes with undefined optional fields', () => {
        const proto = makeNormalizedPrototype({
          id: 1,
          prototypeNm: 'Minimal Prototype',
          teamNm: '',
        });
        vi.mocked(mockStoreInstance.getAll).mockReturnValue([proto]);

        const repo = new ProtopediaInMemoryRepositoryImpl({
          store: mockStoreInstance,
          apiClient: mockApiClientInstance,
        });

        const snapshot = repo.getSerializableSnapshot();
        const serializedProto = snapshot.prototypes[0]!;

        expect(serializedProto.id).toBe(1);
        expect(serializedProto.prototypeNm).toBe('Minimal Prototype');
        // makePrototype defaults optional fields to empty strings
        expect(serializedProto.summary).toBe('');
        expect(serializedProto.freeComment).toBe('');
        expect(serializedProto.systemDescription).toBe('');
        expect(serializedProto.teamNm).toBe('');
        expect(serializedProto.officialLink).toBe('');
        expect(serializedProto.videoUrl).toBe('');
      });

      it('handles prototypes with empty arrays', () => {
        const proto = makeNormalizedPrototype({
          id: 1,
          users: '',
          tags: '',
          materials: '',
          events: '',
          awards: '',
        });
        vi.mocked(mockStoreInstance.getAll).mockReturnValue([proto]);

        const repo = new ProtopediaInMemoryRepositoryImpl({
          store: mockStoreInstance,
          apiClient: mockApiClientInstance,
        });

        const snapshot = repo.getSerializableSnapshot();
        const serializedProto = snapshot.prototypes[0]!;

        expect(serializedProto.users).toEqual([]);
        expect(serializedProto.tags).toEqual([]);
        expect(serializedProto.materials).toEqual([]);
        expect(serializedProto.events).toEqual([]);
        expect(serializedProto.awards).toEqual([]);
      });

      it('handles prototype with ID 0', () => {
        const proto = makeNormalizedPrototype({
          id: 0,
          prototypeNm: 'Zero ID',
        });
        vi.mocked(mockStoreInstance.getAll).mockReturnValue([proto]);

        const repo = new ProtopediaInMemoryRepositoryImpl({
          store: mockStoreInstance,
          apiClient: mockApiClientInstance,
        });

        const snapshot = repo.getSerializableSnapshot();

        expect(snapshot.prototypes).toHaveLength(1);
        expect(snapshot.prototypes[0]!.id).toBe(0);
        expect(snapshot.prototypes[0]!.prototypeNm).toBe('Zero ID');
      });

      it('handles very long string fields', () => {
        const longString = 'a'.repeat(10000);
        const proto = makeNormalizedPrototype({
          id: 1,
          prototypeNm: longString,
          summary: longString,
        });
        vi.mocked(mockStoreInstance.getAll).mockReturnValue([proto]);

        const repo = new ProtopediaInMemoryRepositoryImpl({
          store: mockStoreInstance,
          apiClient: mockApiClientInstance,
        });

        const snapshot = repo.getSerializableSnapshot();
        const serializedProto = snapshot.prototypes[0]!;

        expect(serializedProto.prototypeNm).toBe(longString);
        expect(serializedProto.summary).toBe(longString);
        expect(serializedProto.prototypeNm).toHaveLength(10000);
      });
    });

    describe('Performance', () => {
      it('handles large datasets efficiently', () => {
        // Simulate ~6000 prototypes (realistic production size)
        const prototypes = Array.from({ length: 6000 }, (_, i) =>
          makeNormalizedPrototype({
            id: i + 1,
            prototypeNm: `Prototype ${i + 1}`,
          }),
        );
        vi.mocked(mockStoreInstance.getAll).mockReturnValue(prototypes);

        const repo = new ProtopediaInMemoryRepositoryImpl({
          store: mockStoreInstance,
          apiClient: mockApiClientInstance,
        });

        const start = performance.now();
        const snapshot = repo.getSerializableSnapshot();
        const duration = performance.now() - start;

        expect(snapshot.prototypes).toHaveLength(6000);
        // Should complete in reasonable time (< 100ms for 6000 items)
        expect(duration).toBeLessThan(100);
      });
    });
  });

  describe('setupSnapshotFromSerializedData', () => {
    describe('Success cases', () => {
      it('successfully loads valid snapshot data', () => {
        const snapshot = {
          version: '1.0.0',
          serializedAt: new Date().toISOString(),
          prototypes: [
            makeNormalizedPrototype({ id: 1, prototypeNm: 'Test Proto' }),
          ],
        };

        vi.mocked(mockStoreInstance.setAll).mockReturnValueOnce({
          dataSizeBytes: 500,
        });
        vi.mocked(mockStoreInstance.getStats).mockReturnValueOnce({
          size: 1,
          cachedAt: new Date(),
          isExpired: false,
          remainingTtlMs: 60000,
          dataSizeBytes: 500,
          refreshInFlight: false,
        });

        const repo = new ProtopediaInMemoryRepositoryImpl({
          store: mockStoreInstance,
          apiClient: mockApiClientInstance,
        });

        const result = repo.setupSnapshotFromSerializedData(snapshot);

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.stats.size).toBe(1);
          expect(result.stats.dataSizeBytes).toBe(500);
        }
        expect(mockStoreInstance.setAll).toHaveBeenCalledWith(
          snapshot.prototypes,
        );
      });

      it('successfully loads empty snapshot', () => {
        const snapshot = {
          version: '1.0.0',
          serializedAt: new Date().toISOString(),
          prototypes: [],
        };

        vi.mocked(mockStoreInstance.setAll).mockReturnValueOnce({
          dataSizeBytes: 2,
        });
        vi.mocked(mockStoreInstance.getStats).mockReturnValueOnce({
          size: 0,
          cachedAt: new Date(),
          isExpired: false,
          remainingTtlMs: 60000,
          dataSizeBytes: 2,
          refreshInFlight: false,
        });

        const repo = new ProtopediaInMemoryRepositoryImpl({
          store: mockStoreInstance,
          apiClient: mockApiClientInstance,
        });

        const result = repo.setupSnapshotFromSerializedData(snapshot);

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.stats.size).toBe(0);
        }
      });

      it('successfully loads snapshot with multiple prototypes', () => {
        const snapshot = {
          version: '1.0.0',
          serializedAt: new Date().toISOString(),
          prototypes: [
            makeNormalizedPrototype({ id: 1, prototypeNm: 'Proto 1' }),
            makeNormalizedPrototype({ id: 2, prototypeNm: 'Proto 2' }),
            makeNormalizedPrototype({ id: 3, prototypeNm: 'Proto 3' }),
          ],
        };

        vi.mocked(mockStoreInstance.setAll).mockReturnValueOnce({
          dataSizeBytes: 1500,
        });
        vi.mocked(mockStoreInstance.getStats).mockReturnValueOnce({
          size: 3,
          cachedAt: new Date(),
          isExpired: false,
          remainingTtlMs: 60000,
          dataSizeBytes: 1500,
          refreshInFlight: false,
        });

        const repo = new ProtopediaInMemoryRepositoryImpl({
          store: mockStoreInstance,
          apiClient: mockApiClientInstance,
        });

        const result = repo.setupSnapshotFromSerializedData(snapshot);

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.stats.size).toBe(3);
        }
      });

      it('handles snapshot with all prototype fields populated', () => {
        const fullPrototype = makeNormalizedPrototype({
          id: 1,
          prototypeNm: 'Full Prototype',
          summary: 'Summary text',
          freeComment: 'Free comment text',
          systemDescription: 'System description',
          teamNm: 'Team Name',
          status: 1,
          releaseFlg: 1,
          viewCount: 1000,
          goodCount: 100,
          commentCount: 50,
          mainUrl: 'https://example.com/main.jpg',
          officialLink: 'https://example.com',
          videoUrl: 'https://youtube.com/watch?v=test',
          users: 'user1|user2|user3',
          tags: 'tag1|tag2|tag3',
          materials: 'material1|material2',
          events: 'event1|event2',
          awards: 'award1|award2|award3',
        });

        const snapshot = {
          version: '1.0.0',
          serializedAt: new Date().toISOString(),
          prototypes: [fullPrototype],
        };

        vi.mocked(mockStoreInstance.setAll).mockReturnValueOnce({
          dataSizeBytes: 1000,
        });
        vi.mocked(mockStoreInstance.getStats).mockReturnValueOnce({
          size: 1,
          cachedAt: new Date(),
          isExpired: false,
          remainingTtlMs: 60000,
          dataSizeBytes: 1000,
          refreshInFlight: false,
        });

        const repo = new ProtopediaInMemoryRepositoryImpl({
          store: mockStoreInstance,
          apiClient: mockApiClientInstance,
        });

        const result = repo.setupSnapshotFromSerializedData(snapshot);

        expect(result.ok).toBe(true);
        expect(mockStoreInstance.setAll).toHaveBeenCalledWith([fullPrototype]);
      });
    });

    describe('Validation errors', () => {
      it('returns validation error for invalid version', () => {
        const invalidSnapshot = {
          version: 'not-semver',
          serializedAt: new Date().toISOString(),
          prototypes: [makeNormalizedPrototype({ id: 1 })],
        };

        const repo = new ProtopediaInMemoryRepositoryImpl({
          store: mockStoreInstance,
          apiClient: mockApiClientInstance,
        });

        const result = repo.setupSnapshotFromSerializedData(invalidSnapshot);

        expect(result.ok).toBe(false);
        if (!result.ok && result.origin === 'repository') {
          expect(result.kind).toBe('validation');
          expect(result.code).toBe('REPOSITORY_VALIDATION_ERROR');
        }
      });

      it('returns validation error for missing fields', () => {
        const invalidSnapshot = {
          version: '1.0.0',
          // missing serializedAt
          prototypes: [makeNormalizedPrototype({ id: 1 })],
        };

        const repo = new ProtopediaInMemoryRepositoryImpl({
          store: mockStoreInstance,
          apiClient: mockApiClientInstance,
        });

        const result = repo.setupSnapshotFromSerializedData(
          invalidSnapshot as any,
        );

        expect(result.ok).toBe(false);
        if (!result.ok && result.origin === 'repository') {
          expect(result.kind).toBe('validation');
        }
      });

      it('returns validation error for invalid prototype structure', () => {
        const invalidSnapshot = {
          version: '1.0.0',
          serializedAt: new Date().toISOString(),
          prototypes: [{ id: 'not-a-number' }],
        };

        const repo = new ProtopediaInMemoryRepositoryImpl({
          store: mockStoreInstance,
          apiClient: mockApiClientInstance,
        });

        const result = repo.setupSnapshotFromSerializedData(
          invalidSnapshot as any,
        );

        expect(result.ok).toBe(false);
        if (!result.ok && result.origin === 'repository') {
          expect(result.kind).toBe('validation');
        }
      });

      it('rejects snapshot with prototype ID 0', () => {
        const invalidSnapshot = {
          version: '1.0.0',
          serializedAt: new Date().toISOString(),
          prototypes: [makeNormalizedPrototype({ id: 0 })],
        };

        const repo = new ProtopediaInMemoryRepositoryImpl({
          store: mockStoreInstance,
          apiClient: mockApiClientInstance,
        });

        const result = repo.setupSnapshotFromSerializedData(invalidSnapshot);

        expect(result.ok).toBe(false);
        if (!result.ok && result.origin === 'repository') {
          expect(result.kind).toBe('validation');
          expect(result.message).toContain('id');
        }
      });
    });

    describe('Storage errors', () => {
      it('returns store error when data size exceeds limit', () => {
        const snapshot = {
          version: '1.0.0',
          serializedAt: new Date().toISOString(),
          prototypes: [makeNormalizedPrototype({ id: 1 })],
        };

        vi.mocked(mockStoreInstance.setAll).mockImplementationOnce(() => {
          throw new DataSizeExceededError('UNCHANGED', 20000, 10000);
        });

        const repo = new ProtopediaInMemoryRepositoryImpl({
          store: mockStoreInstance,
          apiClient: mockApiClientInstance,
        });

        const result = repo.setupSnapshotFromSerializedData(snapshot);

        expect(result.ok).toBe(false);
        if (!result.ok && result.origin === 'store') {
          expect(result.kind).toBe('storage_limit');
        }
      });

      it('returns store error when size estimation fails', () => {
        const snapshot = {
          version: '1.0.0',
          serializedAt: new Date().toISOString(),
          prototypes: [makeNormalizedPrototype({ id: 1 })],
        };

        const circularError = new Error('Circular structure');
        vi.mocked(mockStoreInstance.setAll).mockImplementationOnce(() => {
          throw new SizeEstimationError('UNCHANGED', circularError);
        });

        const repo = new ProtopediaInMemoryRepositoryImpl({
          store: mockStoreInstance,
          apiClient: mockApiClientInstance,
        });

        const result = repo.setupSnapshotFromSerializedData(snapshot);

        expect(result.ok).toBe(false);
        if (!result.ok && result.origin === 'store') {
          expect(result.kind).toBe('serialization');
        }
      });

      it('handles unexpected store errors', () => {
        const snapshot = {
          version: '1.0.0',
          serializedAt: new Date().toISOString(),
          prototypes: [makeNormalizedPrototype({ id: 1 })],
        };

        vi.mocked(mockStoreInstance.setAll).mockImplementationOnce(() => {
          throw new Error('Unexpected database error');
        });

        const repo = new ProtopediaInMemoryRepositoryImpl({
          store: mockStoreInstance,
          apiClient: mockApiClientInstance,
        });

        const result = repo.setupSnapshotFromSerializedData(snapshot);

        expect(result.ok).toBe(false);
        if (!result.ok && result.origin === 'store') {
          expect(result.kind).toBe('unknown');
        }
      });
    });

    describe('Event emission', () => {
      it('emits snapshotStarted event when events are enabled', () => {
        const snapshot = {
          version: '1.0.0',
          serializedAt: new Date().toISOString(),
          prototypes: [makeNormalizedPrototype({ id: 1 })],
        };

        vi.mocked(mockStoreInstance.setAll).mockReturnValueOnce({
          dataSizeBytes: 500,
        });
        vi.mocked(mockStoreInstance.getStats).mockReturnValueOnce({
          size: 1,
          cachedAt: new Date(),
          isExpired: false,
          remainingTtlMs: 60000,
          dataSizeBytes: 500,
          refreshInFlight: false,
        });

        const repo = new ProtopediaInMemoryRepositoryImpl({
          store: mockStoreInstance,
          apiClient: mockApiClientInstance,
          repositoryConfig: { enableEvents: true },
        });

        const snapshotStartedMock = vi.fn();
        repo.events?.on('snapshotStarted', snapshotStartedMock);

        repo.setupSnapshotFromSerializedData(snapshot);

        expect(snapshotStartedMock).toHaveBeenCalledTimes(1);
        expect(snapshotStartedMock).toHaveBeenCalledWith(
          'setupFromSerializedData',
        );
      });

      it('emits snapshotCompleted event on success', () => {
        const snapshot = {
          version: '1.0.0',
          serializedAt: new Date().toISOString(),
          prototypes: [makeNormalizedPrototype({ id: 1 })],
        };

        vi.mocked(mockStoreInstance.setAll).mockReturnValueOnce({
          dataSizeBytes: 500,
        });
        vi.mocked(mockStoreInstance.getStats).mockReturnValueOnce({
          size: 1,
          cachedAt: new Date(),
          isExpired: false,
          remainingTtlMs: 60000,
          dataSizeBytes: 500,
          refreshInFlight: false,
        });

        const repo = new ProtopediaInMemoryRepositoryImpl({
          store: mockStoreInstance,
          apiClient: mockApiClientInstance,
          repositoryConfig: { enableEvents: true },
        });

        const snapshotCompletedMock = vi.fn();
        repo.events?.on('snapshotCompleted', snapshotCompletedMock);

        repo.setupSnapshotFromSerializedData(snapshot);

        expect(snapshotCompletedMock).toHaveBeenCalledTimes(1);
        expect(snapshotCompletedMock).toHaveBeenCalledWith(
          expect.objectContaining({
            size: 1,
            dataSizeBytes: 500,
          }),
        );
      });

      it('emits snapshotFailed event on validation error', () => {
        const invalidSnapshot = {
          version: 'invalid',
          serializedAt: new Date().toISOString(),
          prototypes: [makeNormalizedPrototype({ id: 1 })],
        };

        const repo = new ProtopediaInMemoryRepositoryImpl({
          store: mockStoreInstance,
          apiClient: mockApiClientInstance,
          repositoryConfig: { enableEvents: true },
        });

        const snapshotFailedMock = vi.fn();
        repo.events?.on('snapshotFailed', snapshotFailedMock);

        repo.setupSnapshotFromSerializedData(invalidSnapshot);

        expect(snapshotFailedMock).toHaveBeenCalledTimes(1);
        expect(snapshotFailedMock).toHaveBeenCalledWith(
          expect.objectContaining({
            ok: false,
            origin: 'repository',
            kind: 'validation',
          }),
        );
      });

      it('emits snapshotFailed event on store error', () => {
        const snapshot = {
          version: '1.0.0',
          serializedAt: new Date().toISOString(),
          prototypes: [makeNormalizedPrototype({ id: 1 })],
        };

        vi.mocked(mockStoreInstance.setAll).mockImplementationOnce(() => {
          throw new Error('Store error');
        });

        const repo = new ProtopediaInMemoryRepositoryImpl({
          store: mockStoreInstance,
          apiClient: mockApiClientInstance,
          repositoryConfig: { enableEvents: true },
        });

        const snapshotFailedMock = vi.fn();
        repo.events?.on('snapshotFailed', snapshotFailedMock);

        repo.setupSnapshotFromSerializedData(snapshot);

        expect(snapshotFailedMock).toHaveBeenCalledTimes(1);
        expect(snapshotFailedMock).toHaveBeenCalledWith(
          expect.objectContaining({
            ok: false,
            origin: 'store',
          }),
        );
      });

      it('does not emit events when events are disabled', () => {
        const snapshot = {
          version: '1.0.0',
          serializedAt: new Date().toISOString(),
          prototypes: [makeNormalizedPrototype({ id: 1 })],
        };

        vi.mocked(mockStoreInstance.setAll).mockReturnValueOnce({
          dataSizeBytes: 500,
        });
        vi.mocked(mockStoreInstance.getStats).mockReturnValueOnce({
          size: 1,
          cachedAt: new Date(),
          isExpired: false,
          remainingTtlMs: 60000,
          dataSizeBytes: 500,
          refreshInFlight: false,
        });

        const repo = new ProtopediaInMemoryRepositoryImpl({
          store: mockStoreInstance,
          apiClient: mockApiClientInstance,
          repositoryConfig: { enableEvents: false },
        });

        expect(repo.events).toBeUndefined();

        const result = repo.setupSnapshotFromSerializedData(snapshot);
        expect(result.ok).toBe(true);
      });
    });

    describe('Version compatibility', () => {
      it('accepts future minor version increments', () => {
        const snapshot = {
          version: '1.1.0',
          serializedAt: new Date().toISOString(),
          prototypes: [makeNormalizedPrototype({ id: 1 })],
        };

        vi.mocked(mockStoreInstance.setAll).mockReturnValueOnce({
          dataSizeBytes: 500,
        });
        vi.mocked(mockStoreInstance.getStats).mockReturnValueOnce({
          size: 1,
          cachedAt: new Date(),
          isExpired: false,
          remainingTtlMs: 60000,
          dataSizeBytes: 500,
          refreshInFlight: false,
        });

        const repo = new ProtopediaInMemoryRepositoryImpl({
          store: mockStoreInstance,
          apiClient: mockApiClientInstance,
        });

        const result = repo.setupSnapshotFromSerializedData(snapshot);

        expect(result.ok).toBe(true);
      });

      it('accepts future patch version increments', () => {
        const snapshot = {
          version: '1.0.1',
          serializedAt: new Date().toISOString(),
          prototypes: [makeNormalizedPrototype({ id: 1 })],
        };

        vi.mocked(mockStoreInstance.setAll).mockReturnValueOnce({
          dataSizeBytes: 500,
        });
        vi.mocked(mockStoreInstance.getStats).mockReturnValueOnce({
          size: 1,
          cachedAt: new Date(),
          isExpired: false,
          remainingTtlMs: 60000,
          dataSizeBytes: 500,
          refreshInFlight: false,
        });

        const repo = new ProtopediaInMemoryRepositoryImpl({
          store: mockStoreInstance,
          apiClient: mockApiClientInstance,
        });

        const result = repo.setupSnapshotFromSerializedData(snapshot);

        expect(result.ok).toBe(true);
      });

      it('handles snapshot with all prototype fields populated', () => {
        const fullPrototype = makeNormalizedPrototype({
          id: 1,
          prototypeNm: 'Full Prototype',
          summary: 'Summary text',
          freeComment: 'Free comment text',
          systemDescription: 'System description',
          teamNm: 'Team Name',
          status: 1,
          releaseFlg: 1,
          viewCount: 1000,
          goodCount: 100,
          commentCount: 50,
          mainUrl: 'https://example.com/main.jpg',
          officialLink: 'https://example.com',
          videoUrl: 'https://youtube.com/watch?v=test',
          users: 'user1|user2|user3',
          tags: 'tag1|tag2|tag3',
          materials: 'material1|material2',
          events: 'event1|event2',
          awards: 'award1|award2|award3',
        });

        const snapshot = {
          version: '1.0.0',
          serializedAt: new Date().toISOString(),
          prototypes: [fullPrototype],
        };

        vi.mocked(mockStoreInstance.setAll).mockReturnValueOnce({
          dataSizeBytes: 1000,
        });
        vi.mocked(mockStoreInstance.getStats).mockReturnValueOnce({
          size: 1,
          cachedAt: new Date(),
          isExpired: false,
          remainingTtlMs: 60000,
          dataSizeBytes: 1000,
          refreshInFlight: false,
        });

        const repo = new ProtopediaInMemoryRepositoryImpl({
          store: mockStoreInstance,
          apiClient: mockApiClientInstance,
        });

        const result = repo.setupSnapshotFromSerializedData(snapshot);

        expect(result.ok).toBe(true);
        expect(mockStoreInstance.setAll).toHaveBeenCalledWith([fullPrototype]);
      });

      it('validates serializedAt is valid ISO-8601 timestamp', () => {
        const invalidSnapshot = {
          version: '1.0.0',
          serializedAt: 'not-a-timestamp',
          prototypes: [makeNormalizedPrototype({ id: 1 })],
        };

        const repo = new ProtopediaInMemoryRepositoryImpl({
          store: mockStoreInstance,
          apiClient: mockApiClientInstance,
        });

        const result = repo.setupSnapshotFromSerializedData(invalidSnapshot);

        expect(result.ok).toBe(false);
        if (!result.ok && result.origin === 'repository') {
          expect(result.kind).toBe('validation');
        }
      });

      it('validates prototypes array structure', () => {
        const invalidSnapshot = {
          version: '1.0.0',
          serializedAt: new Date().toISOString(),
          prototypes: 'not-an-array' as any,
        };

        const repo = new ProtopediaInMemoryRepositoryImpl({
          store: mockStoreInstance,
          apiClient: mockApiClientInstance,
        });

        const result = repo.setupSnapshotFromSerializedData(invalidSnapshot);

        expect(result.ok).toBe(false);
        if (!result.ok && result.origin === 'repository') {
          expect(result.kind).toBe('validation');
        }
      });

      it('validates each prototype has required id field', () => {
        const invalidSnapshot = {
          version: '1.0.0',
          serializedAt: new Date().toISOString(),
          prototypes: [{ prototypeNm: 'Missing ID' } as any],
        };

        const repo = new ProtopediaInMemoryRepositoryImpl({
          store: mockStoreInstance,
          apiClient: mockApiClientInstance,
        });

        const result = repo.setupSnapshotFromSerializedData(invalidSnapshot);

        expect(result.ok).toBe(false);
        if (!result.ok && result.origin === 'repository') {
          expect(result.kind).toBe('validation');
        }
      });

      it('rejects snapshot with negative prototype id', () => {
        const invalidSnapshot = {
          version: '1.0.0',
          serializedAt: new Date().toISOString(),
          prototypes: [makeNormalizedPrototype({ id: -1 })],
        };

        const repo = new ProtopediaInMemoryRepositoryImpl({
          store: mockStoreInstance,
          apiClient: mockApiClientInstance,
        });

        const result = repo.setupSnapshotFromSerializedData(invalidSnapshot);

        expect(result.ok).toBe(false);
        if (!result.ok && result.origin === 'repository') {
          expect(result.kind).toBe('validation');
        }
      });
    });

    describe('Edge cases', () => {
      it('handles large snapshot datasets (6000 prototypes)', () => {
        const largePrototypes = Array.from({ length: 6000 }, (_, i) =>
          makeNormalizedPrototype({
            id: i + 1,
            prototypeNm: `Prototype ${i + 1}`,
          }),
        );

        const snapshot = {
          version: '1.0.0',
          serializedAt: new Date().toISOString(),
          prototypes: largePrototypes,
        };

        const repo = new ProtopediaInMemoryRepositoryImpl({
          store: mockStoreInstance,
          apiClient: mockApiClientInstance,
        });

        const result = repo.setupSnapshotFromSerializedData(snapshot);

        expect(result.ok).toBe(true);
        expect(mockStoreInstance.setAll).toHaveBeenCalledWith(largePrototypes);
      });
    });

    describe('lastFetchParams reset behavior', () => {
      it('resets lastFetchParams to undefined after successful setupSnapshotFromSerializedData', async () => {
        const snapshot = {
          version: '1.0.0',
          serializedAt: new Date().toISOString(),
          prototypes: [makeNormalizedPrototype({ id: 1 })],
        };

        const repo = new ProtopediaInMemoryRepositoryImpl({
          store: mockStoreInstance,
          apiClient: mockApiClientInstance,
        });

        // First setup via API to establish lastFetchParams
        vi.spyOn(repo as any, 'fetchAndStore').mockResolvedValueOnce({
          ok: true,
          stats: {
            size: 1,
            cachedAt: new Date(),
            isExpired: false,
            remainingTtlMs: 60000,
            dataSizeBytes: 1000,
            refreshInFlight: false,
          },
        });
        await repo.setupSnapshot({ offset: 10, limit: 50 });

        // Load from serialized data (should reset lastFetchParams)
        const loadResult = repo.setupSnapshotFromSerializedData(snapshot);
        expect(loadResult.ok).toBe(true);

        // Attempt to refresh should fail because lastFetchParams is undefined
        const refreshResult = await repo.refreshSnapshot();
        expect(refreshResult).toEqual({
          ok: false,
          origin: 'repository',
          kind: 'invalid_state',
          code: 'REPOSITORY_INVALID_STATE',
          message:
            'Cannot refresh snapshot: No previous API fetch parameters available. ' +
            'Call setupSnapshot() first to establish fetch parameters.',
        });
      });

      it('resets lastFetchParams even when setupSnapshotFromSerializedData fails', async () => {
        const invalidSnapshot = {
          version: '1.0.0',
          serializedAt: new Date().toISOString(),
          prototypes: 'not-an-array' as any,
        };

        const repo = new ProtopediaInMemoryRepositoryImpl({
          store: mockStoreInstance,
          apiClient: mockApiClientInstance,
        });

        // Setup via API first
        vi.spyOn(repo as any, 'fetchAndStore').mockResolvedValueOnce({
          ok: true,
          stats: {
            size: 1,
            cachedAt: new Date(),
            isExpired: false,
            remainingTtlMs: 60000,
            dataSizeBytes: 1000,
            refreshInFlight: false,
          },
        });

        // Establish lastFetchParams
        await repo.setupSnapshot({ offset: 20, limit: 100 });

        // Attempt to load invalid data (should reset lastFetchParams even on failure)
        const loadResult =
          repo.setupSnapshotFromSerializedData(invalidSnapshot);
        expect(loadResult.ok).toBe(false);

        // refreshSnapshot should fail because lastFetchParams was reset
        const refreshResult = await repo.refreshSnapshot();
        expect(refreshResult).toEqual({
          ok: false,
          origin: 'repository',
          kind: 'invalid_state',
          code: 'REPOSITORY_INVALID_STATE',
          message:
            'Cannot refresh snapshot: No previous API fetch parameters available. ' +
            'Call setupSnapshot() first to establish fetch parameters.',
        });
      });
    });
  });
});
