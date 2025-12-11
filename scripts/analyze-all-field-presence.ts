/**
 * Analyze presence rate for all fields in prototype data
 *
 * This script calculates the presence rate of all fields in the prototype dataset,
 * distinguishing between:
 * - present: field has a non-null, non-empty value
 * - missing: field is null or undefined
 * - empty_string: field is an empty string
 * - empty_array: field is an empty array
 *
 * Usage:
 *   tsx scripts/analyze-all-field-presence.ts [path-to-json-file]
 *
 * Example:
 *   tsx scripts/analyze-all-field-presence.ts scripts/sample-data/20251210-232338-prototypes-10000.json
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface FieldStats {
  field: string;
  present: number;
  missing: number;
  emptyString: number;
  emptyArray: number;
  total: number;
  presenceRate: number;
}

function analyzeFieldPresence(data: Array<Record<string, unknown>>): void {
  const total = data.length;

  // Field order matching NormalizedPrototype type definition
  const normalizedPrototypeFields = [
    // ID
    'id',

    // Basic Info
    'status',
    'prototypeNm',
    'summary',
    'freeComment',
    'systemDescription',

    // Tag/Material/Award/Event Info
    'tags',
    'materials',
    'awards',
    'events',

    // Team/User Info
    'teamNm',
    'users',

    // Editorial Info
    'createId',
    'createDate',
    'updateId',
    'updateDate',
    'releaseDate',

    // Count
    'viewCount',
    'goodCount',
    'commentCount',

    // Link
    'officialLink',
    'videoUrl',
    'mainUrl',
    'relatedLink',
    'relatedLink2',
    'relatedLink3',
    'relatedLink4',
    'relatedLink5',

    // Others
    'revision',
    'releaseFlg',
    'licenseType',
    'thanksFlg',
  ];

  // Collect all unique field names from data
  const allFields = new Set<string>();
  for (const item of data) {
    for (const key of Object.keys(item)) {
      allFields.add(key);
    }
  }

  // Combine: NormalizedPrototype fields first, then additional fields
  const additionalFields = Array.from(allFields).filter(
    (field) => !normalizedPrototypeFields.includes(field),
  );
  const orderedFields = [...normalizedPrototypeFields, ...additionalFields];

  // Initialize stats for each field
  const stats: Map<string, FieldStats> = new Map();
  for (const field of orderedFields) {
    stats.set(field, {
      field,
      present: 0,
      missing: 0,
      emptyString: 0,
      emptyArray: 0,
      total,
      presenceRate: 0,
    });
  }

  // Count occurrences
  for (const item of data) {
    for (const field of orderedFields) {
      const value = item[field];
      const stat = stats.get(field)!;

      if (value === null || value === undefined) {
        stat.missing++;
      } else if (typeof value === 'string' && value === '') {
        stat.emptyString++;
      } else if (Array.isArray(value) && value.length === 0) {
        stat.emptyArray++;
      } else {
        stat.present++;
      }
    }
  }

  // Calculate presence rates
  for (const stat of stats.values()) {
    stat.presenceRate = Math.round((stat.present / total) * 10000) / 100;
  }

  // Use ordered fields (NormalizedPrototype order + additional fields)
  const sortedStats = orderedFields.map((field) => stats.get(field)!);

  // Output results
  console.log('\n=== Field Presence Analysis ===');
  console.log(`Total records: ${total}\n`);

  console.log(
    'Field'.padEnd(20) +
      'Present'.padStart(10) +
      'Rate'.padStart(8) +
      'Missing'.padStart(10) +
      'Empty'.padStart(10) +
      'EmptyArr'.padStart(10),
  );
  console.log('-'.repeat(78));

  for (const stat of sortedStats) {
    console.log(
      stat.field.padEnd(20) +
        stat.present.toString().padStart(10) +
        `${stat.presenceRate}%`.padStart(8) +
        stat.missing.toString().padStart(10) +
        stat.emptyString.toString().padStart(10) +
        stat.emptyArray.toString().padStart(10),
    );
  }

  // Summary
  console.log('\n=== Summary ===');
  const fullyPresent = sortedStats.filter((s) => s.presenceRate === 100);
  const partiallyPresent = sortedStats.filter(
    (s) => s.presenceRate > 0 && s.presenceRate < 100,
  );
  const neverPresent = sortedStats.filter((s) => s.presenceRate === 0);

  console.log(`Fully present (100%): ${fullyPresent.length} fields`);
  if (fullyPresent.length > 0) {
    console.log(`  ${fullyPresent.map((s) => s.field).join(', ')}`);
  }

  console.log(
    `\nPartially present (0-100%): ${partiallyPresent.length} fields`,
  );
  if (partiallyPresent.length > 0) {
    for (const stat of partiallyPresent) {
      console.log(`  ${stat.field}: ${stat.presenceRate}%`);
    }
  }

  if (neverPresent.length > 0) {
    console.log(`\nNever present (0%): ${neverPresent.length} fields`);
    console.log(`  ${neverPresent.map((s) => s.field).join(', ')}`);
  }

  // Additional fields section
  if (additionalFields.length > 0) {
    console.log('\n=== Additional Fields (not in NormalizedPrototype) ===');
    for (const field of additionalFields) {
      const stat = stats.get(field)!;
      console.log(`  ${field}: ${stat.presenceRate}%`);
    }
  }
}

// Main
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Error: Please provide a path to the JSON file');
  console.error(
    'Usage: tsx scripts/analyze-all-field-presence.ts <path-to-json-file>',
  );
  process.exit(1);
}

const filePath = resolve(args[0]!);
try {
  const content = readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content) as Array<Record<string, unknown>>;

  if (!Array.isArray(data)) {
    throw new Error('JSON file must contain an array of objects');
  }

  analyzeFieldPresence(data);
} catch (error) {
  console.error('Error reading or parsing file:', error);
  process.exit(1);
}
