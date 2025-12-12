/**
 * @file Test helper utilities for normalizePrototype test suite
 *
 * @description
 * This module provides shared utility functions used across all normalizePrototype tests.
 * The primary utility is createMinimalUpstream, which generates valid UpstreamPrototype
 * objects with sensible defaults that can be selectively overridden for specific test cases.
 *
 * @utilities
 * - createMinimalUpstream: Factory function for creating test UpstreamPrototype instances
 *
 * @usage
 * ```typescript
 * // Create minimal valid upstream
 * const upstream = createMinimalUpstream();
 *
 * // Override specific fields for testing
 * const customUpstream = createMinimalUpstream({
 *   id: 999,
 *   prototypeNm: 'Custom Name'
 * });
 * ```
 *
 * @remarks
 * This helper centralizes the creation of test data, ensuring consistency across all test
 * files and reducing code duplication. It guarantees that all required fields are present
 * with valid default values, while allowing flexible overrides for specific test scenarios.
 *
 * @seeAlso
 * - {@link ./fields.test.ts} - Field validation tests
 * - {@link ./type-safety.test.ts} - Type safety tests
 * - {@link ./transformation.test.ts} - Transformation tests
 * - {@link ./error-handling.test.ts} - Error handling tests
 */

import type { UpstreamPrototype } from '../../../types/prototype-api.types.js';

/**
 * Helper to create a minimal valid UpstreamPrototype for testing
 */
export function createMinimalUpstream(
  overrides?: Partial<UpstreamPrototype>,
): UpstreamPrototype {
  return {
    id: 1,
    createDate: '2024-01-01 00:00:00.0',
    updateDate: '2024-01-02 00:00:00.0',
    createId: 100,
    updateId: 200,
    releaseFlg: 2,
    status: 1,
    prototypeNm: 'Test Prototype',
    summary: 'A test prototype',
    freeComment: 'A comment',
    systemDescription: 'A description',
    users: 'user1|user2',
    teamNm: 'Team Alpha',
    tags: 'IoT|AI',
    materials: 'material1',
    events: 'event1',
    awards: 'award1',
    officialLink: 'https://example.com',
    videoUrl: 'https://youtube.com/watch',
    mainUrl: 'https://example.com/image.jpg',
    relatedLink: 'https://example.com/related',
    relatedLink2: 'https://example.com/related2',
    relatedLink3: 'https://example.com/related3',
    relatedLink4: 'https://example.com/related4',
    relatedLink5: 'https://example.com/related5',
    viewCount: 0,
    goodCount: 0,
    commentCount: 0,
    uuid: 'test-uuid',
    nid: 'test-nid',
    revision: 0,
    licenseType: 1,
    thanksFlg: 0,
    slideMode: 0,
    ...overrides,
  };
}
