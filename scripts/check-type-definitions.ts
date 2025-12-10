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

console.log(`=== 型定義の妥当性チェック (${data.length}件のデータ) ===\n`);

// Collect unique values for each field
const uniqueValues: Record<string, Set<number>> = {
  status: new Set(),
  releaseFlg: new Set(),
  licenseType: new Set(),
  thanksFlg: new Set(),
};

const undefinedCounts: Record<string, number> = {
  status: 0,
  releaseFlg: 0,
  licenseType: 0,
  thanksFlg: 0,
};

data.forEach((p: any) => {
  ['status', 'releaseFlg', 'licenseType', 'thanksFlg'].forEach((field) => {
    if (p[field] === undefined || p[field] === null) {
      undefinedCounts[field]++;
    } else {
      uniqueValues[field].add(p[field]);
    }
  });
});

console.log('【1. フィールドの存在確認】');
Object.entries(undefinedCounts).forEach(([field, count]) => {
  const rate = ((count / data.length) * 100).toFixed(2);
  if (count > 0) {
    console.log(`⚠️  ${field}: ${count}件 (${rate}%) が undefined/null`);
  } else {
    console.log(`✅ ${field}: 全データに存在`);
  }
});

console.log('\n【2. 型定義との照合】');

// StatusCode = 1 | 2 | 3 | 4
const statusValues = Array.from(uniqueValues.status).sort((a, b) => a - b);
const validStatus = [1, 2, 3, 4];
const invalidStatus = statusValues.filter((v) => !validStatus.includes(v));
console.log('status:');
console.log('  定義: 1 | 2 | 3 | 4');
console.log('  実データ:', statusValues.join(', '));
if (invalidStatus.length > 0) {
  console.log('  ❌ 定義外の値:', invalidStatus.join(', '));
} else {
  console.log('  ✅ 全て定義範囲内');
}

// ReleaseFlagCode = 1 | 2 | 3
const releaseFlagValues = Array.from(uniqueValues.releaseFlg).sort(
  (a, b) => a - b,
);
const validReleaseFlag = [1, 2, 3];
const invalidReleaseFlag = releaseFlagValues.filter(
  (v) => !validReleaseFlag.includes(v),
);
console.log('\nreleaseFlg:');
console.log('  定義: 1 | 2 | 3');
console.log('  実データ:', releaseFlagValues.join(', '));
if (invalidReleaseFlag.length > 0) {
  console.log('  ❌ 定義外の値:', invalidReleaseFlag.join(', '));
} else {
  console.log('  ✅ 全て定義範囲内');
}

// LicenseTypeCode = 0 | 1
const licenseTypeValues = Array.from(uniqueValues.licenseType).sort(
  (a, b) => a - b,
);
const validLicenseType = [0, 1];
const invalidLicenseType = licenseTypeValues.filter(
  (v) => !validLicenseType.includes(v),
);
console.log('\nlicenseType:');
console.log('  定義: 0 | 1');
console.log('  実データ:', licenseTypeValues.join(', '));
if (invalidLicenseType.length > 0) {
  console.log('  ❌ 定義外の値:', invalidLicenseType.join(', '));
} else {
  console.log('  ✅ 全て定義範囲内');
}

// ThanksFlagCode = 0 | 1
const thanksFlagValues = Array.from(uniqueValues.thanksFlg).sort(
  (a, b) => a - b,
);
const validThanksFlag = [0, 1];
const invalidThanksFlag = thanksFlagValues.filter(
  (v) => !validThanksFlag.includes(v),
);
console.log('\nthanksFlg:');
console.log('  定義: 0 | 1');
console.log('  実データ:', thanksFlagValues.join(', '));
if (invalidThanksFlag.length > 0) {
  console.log('  ❌ 定義外の値:', invalidThanksFlag.join(', '));
} else {
  console.log('  ✅ 全て定義範囲内');
}

console.log('\n【3. undefined/null が含まれる具体例】');
if (undefinedCounts.thanksFlg > 0) {
  const samples = data
    .filter((p: any) => p.thanksFlg === undefined || p.thanksFlg === null)
    .slice(0, 5);
  samples.forEach((p: any) => {
    console.log(`  ID:${p.id} "${p.prototypeNm}" (thanksFlg: ${p.thanksFlg})`);
  });
}

console.log('\n【4. 結論】');
const hasUndefined = Object.values(undefinedCounts).some((c) => c > 0);
const hasInvalid =
  invalidStatus.length > 0 ||
  invalidReleaseFlag.length > 0 ||
  invalidLicenseType.length > 0 ||
  invalidThanksFlag.length > 0;

if (hasUndefined) {
  console.log(
    '⚠️  一部フィールドに undefined/null が存在 → 型に | undefined を追加すべき',
  );
} else {
  console.log('✅ 全フィールドが全データに存在');
}

if (hasInvalid) {
  console.log('❌ 型定義外の値が存在 → 型定義の見直しが必要');
} else {
  console.log('✅ 全ての値が型定義の範囲内');
}
