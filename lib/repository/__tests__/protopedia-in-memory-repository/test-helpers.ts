/**
 * Shared test helpers and utilities for ProtopediaInMemoryRepositoryImpl tests.
 *
 * Note: Each test file must include the vi.mock() call at the top level.
 * Import this file after setting up the mock in each test file.
 *
 * @module
 */
import type { ResultOfListPrototypesApiResponse } from 'protopedia-api-v2-client';
import { vi } from 'vitest';

import { createProtopediaApiCustomClient } from '../../../fetcher/index.js';

/**
 * Helper to build minimal-but-valid upstream prototypes for testing.
 */
export const makePrototype = (
  overrides: Partial<ResultOfListPrototypesApiResponse> = {},
): ResultOfListPrototypesApiResponse => ({
  id: 1,
  uuid: 'uuid-1',
  nid: 'nid-1',
  createId: 1,
  createDate: '2024-01-01T00:00:00Z',
  updateId: 1,
  updateDate: '2024-01-01T00:00:00Z',
  releaseDate: '2024-01-02T00:00:00Z',
  summary: '',
  tags: '',
  teamNm: 'team',
  users: 'user1|user2',
  status: 1,
  releaseFlg: 1,
  revision: 1,
  prototypeNm: 'default name',
  freeComment: '',
  systemDescription: '',
  videoUrl: '',
  mainUrl: 'https://example.com',
  awards: '',
  viewCount: 0,
  goodCount: 0,
  commentCount: 0,
  relatedLink: '',
  relatedLink2: '',
  relatedLink3: '',
  relatedLink4: '',
  relatedLink5: '',
  licenseType: 0,
  thanksFlg: 0,
  events: '',
  officialLink: '',
  materials: '',
  slideMode: 0,
  ...overrides,
});

/**
 * Creates mock functions for the API client and configures them.
 *
 * @returns Object containing mock functions and setup helper
 */
export const setupMocks = () => {
  const listPrototypesMock = vi.fn();
  const fetchPrototypesMock = vi.fn();

  const resetMocks = () => {
    listPrototypesMock.mockReset();
    fetchPrototypesMock.mockReset();

    (
      createProtopediaApiCustomClient as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue({
      listPrototypes: listPrototypesMock,
      fetchPrototypes: fetchPrototypesMock,
    });
  };

  // Initial setup
  resetMocks();

  return {
    listPrototypesMock,
    fetchPrototypesMock,
    resetMocks,
  };
};
