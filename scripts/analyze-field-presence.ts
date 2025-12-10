import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load real data
const dataPath = path.join(
  __dirname,
  'sample-data/20251210-232338-prototypes-10000.json',
);
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

console.log(`=== フィールド存在率分析 (${data.length}件のデータ) ===\n`);

// Collect all field names from the first item
const sampleItem = data[0];
const allFields = Object.keys(sampleItem);

// Count presence for each field
const fieldStats: Record<
  string,
  { present: number; absent: number; presentRate: number }
> = {};

allFields.forEach((field) => {
  let present = 0;
  let absent = 0;

  data.forEach((item: any) => {
    if (item[field] !== undefined && item[field] !== null) {
      present++;
    } else {
      absent++;
    }
  });

  fieldStats[field] = {
    present,
    absent,
    presentRate: (present / data.length) * 100,
  };
});

// Sort by presence rate (ascending to show problematic fields first)
const sortedFields = Object.entries(fieldStats).sort(
  (a, b) => a[1].presentRate - b[1].presentRate,
);

console.log('【1. フィールド存在率一覧】');
console.log('(存在率の低い順にソート)\n');

sortedFields.forEach(([field, stats]) => {
  const rate = stats.presentRate.toFixed(2);
  const icon = stats.presentRate === 100 ? '✅' : '⚠️ ';
  const absentInfo = stats.absent > 0 ? ` (欠損: ${stats.absent}件)` : '';
  console.log(`${icon} ${field.padEnd(20)} ${rate.padStart(6)}%${absentInfo}`);
});

console.log('\n【2. optional (?) にすべきフィールド】');
const optionalFields = sortedFields.filter(
  ([, stats]) => stats.presentRate < 100,
);

if (optionalFields.length === 0) {
  console.log('✅ 全フィールドが100%存在します');
} else {
  console.log(
    `以下の ${optionalFields.length} 個のフィールドを optional にすべきです:\n`,
  );
  optionalFields.forEach(([field, stats]) => {
    const rate = stats.presentRate.toFixed(2);
    console.log(`  ${field}?: ... // ${rate}% (欠損: ${stats.absent}件)`);
  });
}

console.log('\n【3. 型定義の推奨修正】');
console.log('ResultOfListPrototypesApiResponse で以下を修正:');
console.log('');
optionalFields.forEach(([field]) => {
  console.log(`-   ${field}: number;  // または string など`);
  console.log(`+   ${field}?: number; // optional に変更`);
  console.log('');
});

console.log('\n【4. 欠損データのサンプル】');
optionalFields.slice(0, 3).forEach(([field, stats]) => {
  if (stats.absent > 0) {
    console.log(`\n${field} が undefined/null のサンプル (最初の3件):`);
    const samples = data
      .filter((item: any) => item[field] === undefined || item[field] === null)
      .slice(0, 3);
    samples.forEach((item: any) => {
      console.log(`  ID:${item.id} "${item.prototypeNm}"`);
    });
  }
});
