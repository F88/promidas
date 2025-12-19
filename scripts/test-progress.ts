/**
 * Download progress feature verification script
 *
 * This script tests the download progress tracking functionality
 * of ProtopediaApiCustomClient.
 */
import { ProtopediaApiCustomClient } from '../lib/fetcher/client/protopedia-api-custom-client.js';

const token = process.env.PROTOPEDIA_API_V2_TOKEN;

if (!token) {
  console.error(
    'Error: PROTOPEDIA_API_V2_TOKEN environment variable is required',
  );
  process.exit(1);
}

console.log('=== Download Progress Test ===\n');

// Test 1: With debug logging enabled
console.log('Test 1: Debug logging enabled');
console.log('Expected: Progress logs at debug level\n');

const client1 = new ProtopediaApiCustomClient({
  protoPediaApiClientOptions: {
    token,
  },
  logLevel: 'debug',
  progressLog: true, // default, but explicit for clarity
});

console.log('Fetching prototypes...');
const result1 = await client1.fetchPrototypes({ limit: 100 });

if (result1.ok) {
  console.log(`✅ Fetched ${result1.data.length} prototypes\n`);
} else {
  console.error(`❌ Error: ${result1.error}\n`);
}

// Test 2: With custom callback
console.log('Test 2: Custom callbacks (start, progress, complete)');
console.log('Expected: Custom progress output with all callbacks\n');

let progressCount = 0;
const client2 = new ProtopediaApiCustomClient({
  protoPediaApiClientOptions: {
    token,
  },
  logLevel: 'info', // No debug logs
  progressLog: false, // Disable default logging
  progressCallback: {
    onStart: (estimatedTotal, limit, prepareTime) => {
      console.log(
        `🚀 Start: limit=${limit}, ${estimatedTotal} bytes (estimated) (prepared in ${prepareTime}s)`,
      );
    },
    onProgress: (received, total, percentage) => {
      progressCount++;
      console.log(
        `📥 Progress #${progressCount}: ${percentage.toFixed(1)}% (${received}/${total} bytes)`,
      );
    },
    onComplete: (received, estimatedTotal, downloadTime, totalTime) => {
      console.log(
        `🏁 Complete: ${received} bytes (estimated ${estimatedTotal}) in ${downloadTime}s (total: ${totalTime}s)`,
      );
    },
  },
});

console.log('Fetching prototypes...');
const result2 = await client2.fetchPrototypes({ limit: 10000 });

if (result2.ok) {
  console.log(`✅ Fetched ${result2.data.length} prototypes`);
  console.log(`   Progress callback called ${progressCount} times\n`);
} else {
  console.error(`❌ Error: ${result2.error}\n`);
}

// Test 3: Progress disabled
console.log('Test 3: Progress tracking disabled');
console.log('Expected: No progress output\n');

const client3 = new ProtopediaApiCustomClient({
  protoPediaApiClientOptions: {
    token,
  },
  logLevel: 'debug',
  progressLog: false,
});

console.log('Fetching prototypes...');
const result3 = await client3.fetchPrototypes({ limit: 100 });

if (result3.ok) {
  console.log(
    `✅ Fetched ${result3.data.length} prototypes (no progress shown)\n`,
  );
} else {
  console.error(`❌ Error: ${result3.error}\n`);
}

console.log('=== All Tests Complete ===');
