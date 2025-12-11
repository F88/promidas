import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { createProtoPediaClient } from 'protopedia-api-v2-client';

const PROTOTYPE_SAMPLE_OFFSET = 0;
const PROTOTYPE_SAMPLE_COUNT = 100;
// const PROTOTYPE_SAMPLE_COUNT = 10_000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SAMPLE_DATA_DIR = join(__dirname, 'sample-data');

const formatTimestamp = (date: Date): string => {
  const pad = (value: number) => value.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
};

const durationFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const formatDurationMs = (durationMs: number) =>
  durationFormatter.format(Math.round(durationMs));

const buildOutputPath = (
  timestamp: string,
  count: number,
  extension: 'json' | 'tsv',
) => {
  const filename = `${timestamp}-prototypes-${count}.${extension}`;
  const absolutePath = join(SAMPLE_DATA_DIR, filename);
  const relativePath = relative(process.cwd(), absolutePath);
  return { absolutePath, relativePath };
};

type SavePrototypesOptions = {
  limit?: number;
  offset?: number;
};

function getApiClient() {
  const token = process.env.PROTOPEDIA_API_V2_TOKEN;
  if (!token || token === 'your_token_here') {
    throw new Error('PROTOPEDIA_API_V2_TOKEN is required to fetch prototypes.');
  }

  const baseApiUrl = (
    process.env.PROTOPEDIA_API_V2_BASE_URL ?? 'https://protopedia.net/v2/api'
  ).replace(/\/+$/, '');

  return createProtoPediaClient({
    token: token,
    baseUrl: baseApiUrl,
    // logLevel: 'debug',
  });
}

/**
 * Fetch prototypes(JSON) and persist them as JSON for local inspection.
 */
export async function savePrototypesJsonToFile({
  limit = PROTOTYPE_SAMPLE_COUNT,
  offset = PROTOTYPE_SAMPLE_OFFSET,
}: SavePrototypesOptions = {}) {
  // Next.js を利用せずCLIから直接実行するため、既存のfetcherは利用しない。
  // const prototypes = await getPrototypes({ limit, offset });

  const protopedia = getApiClient();

  console.info(
    `Fetching up to ${limit} prototypes (JSON) starting at offset ${offset}...`,
  );
  const start = performance.now();
  const res = await protopedia.listPrototypes({ limit, offset });
  const durationMs = performance.now() - start;
  const prototypes = res.results ?? [];
  const jsonPayload = JSON.stringify(prototypes, null, 2);
  const byteSize = Buffer.byteLength(jsonPayload, 'utf8');

  console.info(
    `Fetched ${prototypes.length} prototypes (JSON) in ${formatDurationMs(durationMs)}ms (${byteSize.toLocaleString()} bytes).`,
  );

  const timestamp = formatTimestamp(new Date());
  const { absolutePath, relativePath } = buildOutputPath(
    timestamp,
    limit,
    'json',
  );

  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, jsonPayload, 'utf8');
  console.log(`Saved ${prototypes.length} prototypes to ${relativePath}`);
}

export async function savePrototypesTSVToFile({
  limit = PROTOTYPE_SAMPLE_COUNT,
  offset = PROTOTYPE_SAMPLE_OFFSET,
}: SavePrototypesOptions = {}) {
  const protopedia = getApiClient();

  console.info(
    `Fetching up to ${limit} prototypes (TSV) starting at offset ${offset}...`,
  );
  const start = performance.now();
  const res = await protopedia.downloadPrototypesTsv({ limit, offset });
  const durationMs = performance.now() - start;
  const byteSize = Buffer.byteLength(res, 'utf8');
  console.info(
    `Fetched prototypes (TSV) in ${formatDurationMs(durationMs)}ms (${byteSize.toLocaleString()} bytes).`,
  );

  const timestamp = formatTimestamp(new Date());
  const { absolutePath, relativePath } = buildOutputPath(
    timestamp,
    limit,
    'tsv',
  );

  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, res, 'utf8');
  console.log(`Saved prototypes to ${relativePath}`);
}

const isExecutedDirectly = (() => {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }
  return import.meta.url === pathToFileURL(entry).href;
})();

if (isExecutedDirectly) {
  void (async () => {
    try {
      await savePrototypesJsonToFile({
        offset: PROTOTYPE_SAMPLE_OFFSET,
        limit: PROTOTYPE_SAMPLE_COUNT,
      });

      await savePrototypesTSVToFile({
        offset: PROTOTYPE_SAMPLE_OFFSET,
        limit: PROTOTYPE_SAMPLE_COUNT,
      });
    } catch (error) {
      console.error('Failed to save prototypes:', error);
      process.exitCode = 1;
    }
  })();
}
