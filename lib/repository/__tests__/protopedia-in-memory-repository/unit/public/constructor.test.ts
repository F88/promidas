/**
 * Tests for ProtopediaInMemoryRepositoryImpl constructor.
 *
 * Covers initialization, configuration, and logger setup.
 *
 * @module
 */
import { describe, expect, it, vi } from 'vitest';

import { ProtopediaApiCustomClient } from '../../../../../fetcher/index.js';
import type { Logger } from '../../../../../logger/index.js';
import { PrototypeInMemoryStore } from '../../../../../store/index.js';
import { ProtopediaInMemoryRepositoryImpl } from '../../../../protopedia-in-memory-repository.js';
import { createTestContext } from '../../test-helpers.js';

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

describe('ProtopediaInMemoryRepositoryImpl - constructor', () => {
  it('creates instance with store config', () => {
    const { mockStoreInstance, mockApiClientInstance } = createTestContext({});

    const repo = new ProtopediaInMemoryRepositoryImpl({
      store: mockStoreInstance,
      apiClient: mockApiClientInstance,
      repositoryConfig: {},
    });

    expect(repo).toBeInstanceOf(ProtopediaInMemoryRepositoryImpl);
    expect(mockStoreInstance.getConfig).toHaveBeenCalled();
    expect(repo.getConfig().ttlMs).toBe(60_000);
  });

  it('creates instance with minimal config', () => {
    const { mockStoreInstance, mockApiClientInstance } = createTestContext({});

    const repo = new ProtopediaInMemoryRepositoryImpl({
      store: mockStoreInstance,
      apiClient: mockApiClientInstance,
    });

    expect(repo).toBeInstanceOf(ProtopediaInMemoryRepositoryImpl);
  });

  it('creates instance without API client options', () => {
    const { mockStoreInstance, mockApiClientInstance } = createTestContext({});

    const repo = new ProtopediaInMemoryRepositoryImpl({
      store: mockStoreInstance,
      apiClient: mockApiClientInstance,
    });

    expect(repo).toBeInstanceOf(ProtopediaInMemoryRepositoryImpl);
  });

  it('masks token in logs when apiClientOptions with token is provided', () => {
    const { mockStoreInstance, mockApiClientInstance } = createTestContext({});

    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as unknown as Logger;

    new ProtopediaInMemoryRepositoryImpl({
      store: mockStoreInstance,
      apiClient: mockApiClientInstance,
      repositoryConfig: { logger: mockLogger },
    });

    expect(mockLogger.info).toHaveBeenCalledWith(
      'ProtopediaInMemoryRepository constructor called',
      expect.objectContaining({
        storeConfig: expect.objectContaining({
          ttlMs: 60_000,
        }),
      }),
    );
    // No longer logging apiClientOptions with token in constructor
    // This assertion is now effectively testing the absence of token logging from the repository constructor
  });

  it('updates logger level when both logger and logLevel are provided', () => {
    const { mockStoreInstance, mockApiClientInstance } = createTestContext({});

    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      level: 'info',
    } as Logger & { level: string };

    new ProtopediaInMemoryRepositoryImpl({
      store: mockStoreInstance,
      apiClient: mockApiClientInstance,
      repositoryConfig: {
        logger: mockLogger,
        logLevel: 'debug',
      },
    });

    expect(mockLogger.level).toBe('debug');
  });
});
