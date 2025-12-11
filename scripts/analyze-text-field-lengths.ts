/**
 * Analyze text field lengths in prototype data
 *
 * This script calculates statistics (min, max, average) for text fields:
 * - prototypeNm
 * - summary
 * - freeComment
 * - systemDescription
 *
 * Usage:
 *   tsx scripts/analyze-text-field-lengths.ts [path-to-json-file]
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface TextFieldStats {
  field: string;
  min: number;
  max: number;
  avg: number;
  total: number;
  present: number;
}

function analyzeTextFieldLengths(data: Array<Record<string, unknown>>): void {
  const fields = ['prototypeNm', 'summary', 'freeComment', 'systemDescription'];
  const stats: TextFieldStats[] = [];

  for (const field of fields) {
    const lengths: number[] = [];
    let present = 0;

    for (const item of data) {
      const value = item[field];
      if (value !== null && value !== undefined && value !== '') {
        const length = String(value).length;
        lengths.push(length);
        present++;
      }
    }

    if (lengths.length > 0) {
      stats.push({
        field,
        min: Math.min(...lengths),
        max: Math.max(...lengths),
        avg: Math.floor(lengths.reduce((a, b) => a + b, 0) / lengths.length),
        total: data.length,
        present,
      });
    } else {
      stats.push({
        field,
        min: 0,
        max: 0,
        avg: 0,
        total: data.length,
        present: 0,
      });
    }
  }

  // Output results
  console.log('\n=== Text Field Length Analysis ===');
  console.log(`Total records: ${data.length}\n`);

  console.log(
    'Field'.padEnd(20) +
      'Present'.padStart(10) +
      'Min'.padStart(10) +
      'Max'.padStart(10) +
      'Avg'.padStart(10),
  );
  console.log('-'.repeat(60));

  for (const stat of stats) {
    console.log(
      stat.field.padEnd(20) +
        stat.present.toString().padStart(10) +
        stat.min.toString().padStart(10) +
        stat.max.toString().padStart(10) +
        stat.avg.toString().padStart(10),
    );
  }
}

// Main
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Error: Please provide a path to the JSON file');
  console.error(
    'Usage: tsx scripts/analyze-text-field-lengths.ts <path-to-json-file>',
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

  analyzeTextFieldLengths(data);
} catch (error) {
  console.error('Error reading or parsing file:', error);
  process.exit(1);
}
