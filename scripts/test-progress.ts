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
console.log('Test 2: Custom event-driven progress tracking');
console.log('Expected: Custom progress output with all events\n');

let progressCount = 0;
let requestStartTime = 0;
let responseReceivedTime = 0;

const client2 = new ProtopediaApiCustomClient({
  protoPediaApiClientOptions: {
    token,
  },
  logLevel: 'info', // No debug logs
  progressLog: false, // Disable default logging
  progressCallback: (event) => {
    switch (event.type) {
      case 'request-start':
        requestStartTime = Date.now();
        console.log(`🚀 Request Start`);
        break;
      case 'response-received':
        responseReceivedTime = Date.now();
        console.log(
          `📡 Response Received: limit=${event.limit}, ${event.estimatedTotal} bytes (estimated), prepared in ${event.prepareTimeMs}ms`,
        );
        break;
      case 'download-progress':
        progressCount++;
        console.log(
          `📥 Progress #${progressCount}: ${event.percentage.toFixed(1)}% (${event.received}/${event.total} bytes)`,
        );
        break;
      case 'complete':
        console.log(
          `🏁 Complete: ${event.received} bytes in ${event.downloadTimeMs}ms (total: ${event.totalTimeMs}ms)`,
        );
        break;
    }
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
