/**
 * Shared test helpers and utilities for ProtopediaInMemoryRepositoryImpl tests.
 *
 * This module provides reusable test utilities for creating test data and
 * configuring mocks across the repository test suite.
 *
 * ## Exports
 *
 * ### Data Builders
 * - {@link makePrototype} - Create minimal valid prototype data with overrides
 *
 * ### Mock Management
 * - {@link setupMocks} - Configure API client mocks with reset capability
 *
 * ## Usage Pattern
 *
 * **IMPORTANT**: Each test file must include the `vi.mock()` call at the top level
 * before importing this module.
 *
 * @example
 * ```typescript
 * // Step 1: Mock at top level (before imports)
 * vi.mock('../../../fetcher/index', async (importOriginal) => {
 *   const actual = await importOriginal<typeof import('../../../fetcher/index.js')>();
 *   return {
 *     ...actual,
 *     ProtopediaApiCustomClient: vi.fn(),
 *   };
 * });
 *
 * // Step 2: Import helpers after mock setup
 * import { makePrototype, setupMocks } from './test-helpers.js';
 *
 * describe('My tests', () => {
 *   const { fetchPrototypesMock, resetMocks } = setupMocks();
 *
 *   beforeEach(() => {
 *     resetMocks();
 *   });
 *
 *   it('should work', async () => {
 *     fetchPrototypesMock.mockResolvedValueOnce({
 *       ok: true,
 *       data: [makePrototype({ id: 42 })],
 *     });
 *     // ... test code
 *   });
 * });
 * ```
 *
 * ## Design Rationale
 *
 * ### makePrototype
 * Provides minimal valid prototype data to satisfy the API contract while
 * allowing selective override of specific fields for test scenarios.
 *
 * ### setupMocks
 * Returns configured mock functions with a reset helper to ensure clean
 * state between tests without shared beforeEach complexity.
 *
 * @module
 * @see {@link ResultOfListPrototypesApiResponse} for the prototype data structure
 */
import type { ResultOfListPrototypesApiResponse } from 'protopedia-api-v2-client';
import { vi } from 'vitest';

import { ProtopediaApiCustomClient } from '../../../fetcher/index.js';

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

    vi.mocked(ProtopediaApiCustomClient).mockImplementation(
      class {
        listPrototypes = listPrototypesMock;
        fetchPrototypes = fetchPrototypesMock;
      } as any,
    );
  };

  // Initial setup
  resetMocks();

  return {
    listPrototypesMock,
    fetchPrototypesMock,
    resetMocks,
  };
};

/**
 * Create a mock fetch function that returns successful prototype data.
 *
 * @param prototypes - Array of partial prototype data to return
 * @returns Mock fetch function that resolves to a successful response
 */
export const createMockFetchPrototypesSuccess = (
  prototypes: Array<Partial<ResultOfListPrototypesApiResponse>>,
) => {
  return () => {
    const fullPrototypes = prototypes.map((p) => makePrototype(p));
    return Promise.resolve(
      new Response(
        JSON.stringify({
          results: fullPrototypes,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );
  };
};
