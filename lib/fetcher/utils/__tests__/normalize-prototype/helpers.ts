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
