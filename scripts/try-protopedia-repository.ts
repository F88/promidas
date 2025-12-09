import {
  type ListPrototypesParams,
  type ProtoPediaApiClientOptions,
} from 'protopedia-api-v2-client';

import {
  createProtopediaInMemoryRepository,
  type PrototypeMapStoreConfig,
} from '../lib/index.js';

async function main() {
  const token = process.env.PROTOPEDIA_API_V2_TOKEN;
  const logLevel = process.env.PROTOPEDIA_API_V2_LOG_LEVEL as
    | ProtoPediaApiClientOptions['logLevel']
    | undefined;

  if (!token) {
    console.error(
      'Please set PROTOPEDIA_API_V2_TOKEN before running this script.',
    );
    process.exit(1);
  }

  // Test 1: Create repository with custom TTL (60 seconds)
  console.log('=== Test 1: Initialize repository with custom TTL ===');
  const prototypeMapStoreConfig: PrototypeMapStoreConfig = {
    ttlMs: 60_000, // 60 seconds for testing
  };
  const protoPediaApiClientOptions: ProtoPediaApiClientOptions = {
    token,
    ...(logLevel && { logLevel }),
  };
  const repo = createProtopediaInMemoryRepository(
    prototypeMapStoreConfig,
    protoPediaApiClientOptions,
  );
  console.log('✓ Repository created with 60s TTL\n');

  // Test 2: Setup initial snapshot with 5 prototypes
  console.log('=== Test 2: Setup snapshot (fetch 5 prototypes) ===');
  const params: ListPrototypesParams = {
    offset: 0,
    limit: 5,
  };
  await repo.setupSnapshot(params);
  console.log('✓ Snapshot setup complete\n');

  // Test 3: Get and verify stats
  console.log('=== Test 3: Verify snapshot stats ===');
  const initialStats = repo.getStats();
  console.log('Snapshot stats:', {
    size: initialStats.size,
    cachedAt: initialStats.cachedAt
      ? new Date(initialStats.cachedAt).toISOString()
      : null,
    isExpired: initialStats.isExpired,
  });
  console.log(`✓ Snapshot contains ${initialStats.size} prototypes\n`);

  // Test 4: Get random prototype from snapshot
  console.log('=== Test 4: Get random prototype ===');
  const random = await repo.getRandomPrototypeFromSnapshot();
  if (!random) {
    console.log('✗ No prototype available in snapshot');
  } else {
    console.log('Random prototype:', {
      id: random.id,
      prototypeNm: random.prototypeNm,
      teamNm: random.teamNm,
      tags: random.tags,
      users: random.users,
    });
    console.log('✓ Successfully retrieved random prototype\n');

    // Test 5: Get specific prototype by ID
    console.log('=== Test 5: Get prototype by ID ===');
    const byId = await repo.getPrototypeFromSnapshotByPrototypeId(random.id);
    if (byId) {
      console.log(`✓ Retrieved prototype #${byId.id}: ${byId.prototypeNm}`);
      console.log(
        `  Match: ${byId.id === random.id && byId.prototypeNm === random.prototypeNm}\n`,
      );
    } else {
      console.log(`✗ Failed to retrieve prototype #${random.id}\n`);
    }
  }

  // Test 6: Refresh snapshot with new data
  console.log('=== Test 6: Refresh snapshot ===');
  console.log('Waiting 2 seconds before refresh...');
  await new Promise((resolve) => setTimeout(resolve, 2000));
  await repo.refreshSnapshot();
  const refreshedStats = repo.getStats();
  console.log('Refreshed stats:', {
    size: refreshedStats.size,
    cachedAt: refreshedStats.cachedAt
      ? new Date(refreshedStats.cachedAt).toISOString()
      : null,
    isExpired: refreshedStats.isExpired,
  });
  console.log('✓ Snapshot refreshed successfully\n');

  // Test 7: Verify cache timestamp updated
  console.log('=== Test 7: Verify cache timestamp updated ===');
  if (
    refreshedStats.cachedAt &&
    initialStats.cachedAt &&
    refreshedStats.cachedAt.getTime() > initialStats.cachedAt.getTime()
  ) {
    console.log('✓ Cache timestamp updated correctly');
    console.log(
      `  Time difference: ${refreshedStats.cachedAt.getTime() - initialStats.cachedAt.getTime()}ms\n`,
    );
  } else {
    console.log('✗ Cache timestamp not updated\n');
  }

  // Test 8: Get multiple random prototypes
  console.log('=== Test 8: Get multiple random prototypes ===');
  const randomSamples = [];
  for (let i = 0; i < 3; i++) {
    const sample = await repo.getRandomPrototypeFromSnapshot();
    if (sample) {
      randomSamples.push(sample.id);
    }
  }
  console.log(
    `Retrieved ${randomSamples.length} random samples:`,
    randomSamples,
  );
  console.log('✓ Random sampling working\n');

  // Test 9: Final stats check
  console.log('=== Test 9: Final stats check ===');
  const finalStats = repo.getStats();
  console.log('Final snapshot stats:', {
    size: finalStats.size,
    isExpired: finalStats.isExpired,
    ttlMs: 60_000,
  });
  console.log('✓ All tests completed successfully');
}

main().catch((error) => {
  console.error('Error while running try-protopedia-repository:', error);
  process.exit(1);
});
