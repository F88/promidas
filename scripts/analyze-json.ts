/**
 * Universal field presence and statistics analyzer for prototype data
 *
 * This script provides comprehensive analysis of all fields in the prototype dataset:
 *
 * ## Analysis Features
 *
 * 1. **Presence Analysis**
 *    - present: field has a non-null, non-empty value
 *    - missing: field is null or undefined
 *    - empty_string: field is an empty string ("")
 *    - empty_array: field is an empty array ([])
 *
 * 2. **Type Detection**
 *    - string: text fields
 *    - number: numeric fields
 *    - pipe-separated: fields containing pipe-delimited values (tags, users, awards, events, materials)
 *    - array, object, boolean: other types
 *
 * 3. **Statistical Metrics**
 *    - For string fields: min/max/avg character count
 *    - For number fields: min/max/avg values
 *    - For pipe-separated fields: min/max/avg element count
 *
 * 4. **Field Ordering**
 *    - Fields are displayed in NormalizedPrototype definition order
 *    - Additional fields (uuid, nid, slideMode) appear at the end
 *
 * ## Output Format
 *
 * ```
 * Field                Type        Present    Rate    Min    Max    Avg
 * ------------------------------------------------------------------------
 * prototypeNm         string         5861    100%      1    109     17
 * tags                pipe-separated 4715  80.45%      1     34      3
 * viewCount           number         5861    100%      2 101995    666
 * ```
 *
 * ## Usage
 *
 * ```bash
 * # Analyze prototype data
 * tsx scripts/analyze-all-field-presence.ts <path-to-json-file>
 *
 * # Example
 * tsx scripts/analyze-all-field-presence.ts scripts/sample-data/20251210-232338-prototypes-10000.json
 * ```
 *
 * ## Use Cases
 *
 * - Validate API response field presence rates
 * - Identify optional vs required fields for type definitions
 * - Analyze text field length constraints for UI design
 * - Discover data quality issues (missing fields, empty values)
 * - Track pipe-separated field element counts for array sizing
 *
 * @since 2024-12-11
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface FieldStats {
  field: string;
  type: string;
  present: number;
  missing: number;
  emptyString: number;
  emptyArray: number;
  total: number;
  presenceRate: number;
  min: number | null;
  max: number | null;
  avg: number | null;
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
    'uuid',
    'nid',
    'revision',
    'releaseFlg',
    'licenseType',
    'thanksFlg',
    'slideMode',
  ];

  // Pipe-separated fields (converted to arrays in normalized data)
  const pipeSeparatedFields = new Set([
    'tags',
    'users',
    'awards',
    'events',
    'materials',
  ]);

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
      type: 'unknown',
      present: 0,
      missing: 0,
      emptyString: 0,
      emptyArray: 0,
      total,
      presenceRate: 0,
      min: null,
      max: null,
      avg: null,
    });
  }

  // Count occurrences and collect values for min/max/avg calculation
  const valuesByField: Map<string, number[]> = new Map();
  for (const field of orderedFields) {
    valuesByField.set(field, []);
  }

  for (const item of data) {
    for (const field of orderedFields) {
      const value = item[field];
      const stat = stats.get(field)!;
      const values = valuesByField.get(field)!;

      if (value === null || value === undefined) {
        stat.missing++;
      } else if (typeof value === 'string' && value === '') {
        stat.emptyString++;
      } else if (Array.isArray(value) && value.length === 0) {
        stat.emptyArray++;
      } else {
        stat.present++;

        // Determine type and collect values
        if (pipeSeparatedFields.has(field) && typeof value === 'string') {
          // Pipe-separated field: count elements
          stat.type = 'pipe-separated';
          const elements = value.split('|').filter((v) => v.trim() !== '');
          values.push(elements.length);
        } else if (typeof value === 'string') {
          stat.type = 'string';
          values.push(value.length);
        } else if (typeof value === 'number') {
          stat.type = 'number';
          values.push(value);
        } else if (typeof value === 'boolean') {
          stat.type = 'boolean';
        } else if (Array.isArray(value)) {
          stat.type = 'array';
        } else if (typeof value === 'object') {
          stat.type = 'object';
        }
      }
    }
  }

  // Calculate min/max/avg for string lengths and numbers
  for (const field of orderedFields) {
    const stat = stats.get(field)!;
    const values = valuesByField.get(field)!;

    if (values.length > 0) {
      stat.min = Math.min(...values);
      stat.max = Math.max(...values);
      stat.avg = Math.floor(values.reduce((a, b) => a + b, 0) / values.length);
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
      'Type'.padStart(10) +
      'Present'.padStart(10) +
      'Rate'.padStart(8) +
      'Min'.padStart(10) +
      'Max'.padStart(10) +
      'Avg'.padStart(10),
  );
  console.log('-'.repeat(88));

  for (const stat of sortedStats) {
    const minStr = stat.min !== null ? stat.min.toString() : '-';
    const maxStr = stat.max !== null ? stat.max.toString() : '-';
    const avgStr = stat.avg !== null ? stat.avg.toString() : '-';

    console.log(
      stat.field.padEnd(20) +
        stat.type.padStart(10) +
        stat.present.toString().padStart(10) +
        `${stat.presenceRate}%`.padStart(8) +
        minStr.padStart(10) +
        maxStr.padStart(10) +
        avgStr.padStart(10),
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
