---
lang: ja
title: Local Script Use Cases
title-en: Local Script Use Cases
title-ja: ローカルスクリプト向けユースケース
related:
    - ./usecase.md "Use Cases Overview"
    - ./usecase-webapp.md "Server Execution Use Cases"
    - https://github.com/F88/promidas/blob/main/lib/repository/README.md "Repository Module"
instructions-for-ais:
    - This document should be written in Japanese.
    - Use half-width characters for numbers, letters, and symbols.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document.
---

# ローカルスクリプト向けユースケース

このドキュメントでは、ローカル環境でのデータ分析・加工スクリプトにPROMIDASを使う方法を説明します。

## 📖 目次

- [対象読者](#対象読者)
- [特徴](#特徴)
- [クイックスタート](#クイックスタート)
- [典型的なユースケース](#典型的なユースケース)
- [設定パターン](#設定パターン)
- [サンプルスクリプト集](#サンプルスクリプト集)
- [よくある質問](#よくある質問)

## 対象読者

- データサイエンティスト、研究者
- ProtoPediaデータを分析・可視化したい方
- 静的サイト生成のデータソースが必要な方
- 一度実行して終わるスクリプトを書く方

## 特徴

### ✅ シンプルな設定

ローカルスクリプトでは、複雑なエラーハンドリングやセキュリティ対策は不要です:

- トークンは環境変数に直接記述
- エラーが発生したらスクリプトを停止してOK
- デバッグログを詳細に出力
- TTLは短め (または更新なし) で十分

### ✅ データ取得は1回だけ

起動時に `setupSnapshot()` で全データを取得し、その後はメモリ内のデータを使います:

```typescript
const repo = createPromidasRepository({
    apiClientOptions: { token: process.env.PROTOPEDIA_API_TOKEN },
});

// 起動時に全データ取得
await repo.setupSnapshot({ limit: 10000 });

// あとはメモリ内のデータを使うだけ
const allData = await repo.getAllFromSnapshot();
```

### ✅ 簡単なエラーハンドリング

エラーが発生したら例外をthrowするだけでOK:

```typescript
const result = await repo.setupSnapshot({ limit: 1000 });
if (!result.ok) {
    console.error('Failed to fetch data:', result.error);
    process.exit(1); // スクリプト終了
}
```

## クイックスタート

### 1. インストール

```bash
npm install github:F88/promidas protopedia-api-v2-client
```

### 2. トークンを環境変数に設定

```bash
export PROTOPEDIA_API_TOKEN="your-token-here"
```

または `.env` ファイルを使う場合:

```bash
npm install dotenv
```

```javascript
// .env
PROTOPEDIA_API_TOKEN = your - token - here;
```

### 3. 最小限のスクリプト

**方法1: ファクトリ関数 (推奨)**

```typescript
import { createPromidasRepository } from '@f88/promidas';

const repo = createPromidasRepository({
    apiClientOptions: {
        token: process.env.PROTOPEDIA_API_TOKEN,
    },
});

// データ取得
const result = await repo.setupSnapshot({ limit: 1000 });
if (!result.ok) {
    console.error('Error:', result.error);
    process.exit(1);
}

// 全データ取得
const allData = await repo.getAllFromSnapshot();
console.log(`Total prototypes: ${allData.length}`);

// 分析例: 完成プロトタイプの数
const completed = allData.filter((p) => p.status === 3); // 3 = '完成'
console.log(`Completed: ${completed.length}`);
```

**方法2: Builder (高度な設定が必要な場合)**

```typescript
import { PromidasRepositoryBuilder } from '@f88/promidas';

const repo = new PromidasRepositoryBuilder()
    .setApiClientConfig({
        protoPediaApiClientOptions: {
            token: process.env.PROTOPEDIA_API_TOKEN,
        },
    })
    .build();

// 以降は同じ
const result = await repo.setupSnapshot({ limit: 1000 });
// ...
```

### 4. 実行

```bash
npx tsx script.ts
```

## 典型的なユースケース

### 1. データエクスポート (CSV/JSON)

ProtoPediaのデータをCSVやJSONファイルにエクスポート:

```typescript
import { createPromidasRepository } from '@f88/promidas';
import { writeFileSync } from 'fs';

const repo = createPromidasRepository({
    apiClientOptions: { token: process.env.PROTOPEDIA_API_TOKEN },
});

await repo.setupSnapshot({ limit: 10000 });
const allData = await repo.getAllFromSnapshot();

// JSON export
writeFileSync('prototypes.json', JSON.stringify(allData, null, 2));

// CSV export (simple example)
const csv = [
    'ID,Name,Status,Created',
    ...allData.map(
        (p) =>
            `${p.id},"${p.prototypeNm}",${p.status},"${p.newDate.toISOString()}"`,
    ),
].join('\n');
writeFileSync('prototypes.csv', csv);

console.log(`Exported ${allData.length} prototypes`);
```

### 2. 統計分析・データマイニング

タグ、ステータス、作成日などで統計を取る:

```typescript
import { createPromidasRepository } from '@f88/promidas';

const repo = createPromidasRepository({
    apiClientOptions: { token: process.env.PROTOPEDIA_API_TOKEN },
});

await repo.setupSnapshot({ limit: 10000 });
const allData = await repo.getAllFromSnapshot();

// ステータス別の集計
const statusCounts = allData.reduce(
    (acc, p) => {
        const statusName = ({ 0: '未定義', 1: 'アイデア', 2: '開発中', 3: '完成', 4: '部品化' })[p.status] || `不明 (${p.status})`;
        acc[statusName] = (acc[statusName] || 0) + 1;
        return acc;
    },
    {} as Record<string, number>,
);

console.log('Status distribution:', statusCounts);

// タグの頻度分析
const tagCounts = new Map<string, number>();
for (const p of allData) {
    for (const tag of p.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
}

const topTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

console.log('Top 20 tags:', topTags);
```

### 3. データ品質チェック

データの一貫性や品質をチェック:

```typescript
import { createPromidasRepository } from '@f88/promidas';

const repo = createPromidasRepository({
    apiClientOptions: { token: process.env.PROTOPEDIA_API_TOKEN },
});

await repo.setupSnapshot({ limit: 10000 });
const allData = await repo.getAllFromSnapshot();

// チェック1: 名前が空のプロトタイプ
const noName = allData.filter((p) => !p.prototypeNm.trim());
console.log(`Prototypes without name: ${noName.length}`);

// チェック2: タグが1つもないプロトタイプ
const noTags = allData.filter((p) => p.tags.length === 0);
console.log(`Prototypes without tags: ${noTags.length}`);

// チェック3: 画像がないプロトタイプ
const noImages = allData.filter((p) => p.images.length === 0);
console.log(`Prototypes without images: ${noImages.length}`);

// チェック4: 作成日が未来のプロトタイプ
const futureDate = allData.filter((p) => p.newDate > new Date());
console.log(`Prototypes with future date: ${futureDate.length}`);
```

### 4. 静的サイト生成のデータソース

Astro、VitePress、Next.js (SSG) などでProtoPediaデータを使う:

```typescript
import { createPromidasRepository } from '@f88/promidas';
import { writeFileSync, mkdirSync } from 'fs';

const repo = createPromidasRepository({
    apiClientOptions: { token: process.env.PROTOPEDIA_API_TOKEN },
});

await repo.setupSnapshot({ limit: 10000 });
const allData = await repo.getAllFromSnapshot();

// ビルド時にJSONを生成
mkdirSync('public/data', { recursive: true });
writeFileSync('public/data/prototypes.json', JSON.stringify(allData));

// タグ別にグループ化
const byTag = allData.reduce(
    (acc, p) => {
        for (const tag of p.tags) {
            if (!acc[tag]) acc[tag] = [];
            acc[tag].push(p);
        }
        return acc;
    },
    {} as Record<string, typeof allData>,
);

writeFileSync('public/data/by-tag.json', JSON.stringify(byTag));

console.log('Generated static data files');
```

## 設定パターン

### どちらのAPIを使うべきか?

| ケース         | 推奨API        | 理由                         |
| -------------- | -------------- | ---------------------------- |
| シンプルな設定 | ファクトリ関数 | 1行で完結、読みやすい        |
| 条件分岐あり   | Builder        | 段階的に設定を追加できる     |
| 複雑なログ設定 | Builder        | ログレベル優先順位を自動管理 |
| 設定の再利用   | どちらでも     | 設定objectを変数化           |

### パターン1: 最小限の設定 (デフォルト)

**ファクトリ関数:**

```typescript
const repo = createPromidasRepository({
    apiClientOptions: {
        token: process.env.PROTOPEDIA_API_TOKEN,
    },
});
```

**Builder:**

```typescript
const repo = new PromidasRepositoryBuilder()
    .setApiClientConfig({
        protoPediaApiClientOptions: {
            token: process.env.PROTOPEDIA_API_TOKEN,
        },
    })
    .build();
```

- TTL: デフォルト (1時間)
- ログレベル: `info`
- データサイズ制限: 10MB

### パターン2: デバッグログ有効

**ファクトリ関数:**

```typescript
const repo = createPromidasRepository({
    apiClientOptions: {
        token: process.env.PROTOPEDIA_API_TOKEN,
        logLevel: 'debug', // 詳細なログを出力
    },
});
```

**Builder:**

```typescript
const repo = new PromidasRepositoryBuilder()
    .setDefaultLogLevel('debug') // すべてのコンポーネントでdebugログ
    .setApiClientConfig({
        protoPediaApiClientOptions: {
            token: process.env.PROTOPEDIA_API_TOKEN,
        },
    })
    .build();
```

開発中のデバッグに便利です。

### パターン3: TTL無効 (データ更新なし)

```typescript
const repo = createPromidasRepository({
    storeConfig: {
        ttlMs: Infinity, // データ更新しない
    },
    apiClientOptions: {
        token: process.env.PROTOPEDIA_API_TOKEN,
    },
});
```

一度データを取得したら、そのデータを使い続けます。

### パターン4: 大量データ取得用

```typescript
const repo = createPromidasRepository({
    storeConfig: {
        maxDataSizeBytes: 50 * 1024 * 1024, // 50MB
    },
    apiClientOptions: {
        token: process.env.PROTOPEDIA_API_TOKEN,
    },
});

// 全データ取得 (limit: 0 = 無制限)
await repo.setupSnapshot({ limit: 0 });
```

### パターン5: カスタムロガー

**ファクトリ関数:**

```typescript
import { ConsoleLogger } from '@f88/promidas/logger';

const logger = new ConsoleLogger('debug');

const repo = createPromidasRepository({
    storeConfig: { logger },
    apiClientOptions: {
        token: process.env.PROTOPEDIA_API_TOKEN,
        logger, // 同じロガーを共有
    },
});
```

**Builder (共有ロガー自動管理):**

```typescript
const repo = new PromidasRepositoryBuilder()
    .setDefaultLogLevel('debug') // 共有ロガーが自動的に作成・共有される
    .setStoreConfig({ ttlMs: Infinity })
    .setApiClientConfig({
        protoPediaApiClientOptions: {
            token: process.env.PROTOPEDIA_API_TOKEN,
        },
    })
    .build();
```

Builderを使うと、明示的にロガーを作成・共有しなくても自動的に効率的なロガー管理が行われます。

## サンプルスクリプト集

### タグクラウド生成

```typescript
import { createPromidasRepository } from '@f88/promidas';

const repo = createPromidasRepository({
    apiClientOptions: { token: process.env.PROTOPEDIA_API_TOKEN },
});

await repo.setupSnapshot({ limit: 10000 });
const allData = await repo.getAllFromSnapshot();

const tagCounts = new Map<string, number>();
for (const p of allData) {
    for (const tag of p.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
}

// タグクラウド用HTML生成
const html = `<!DOCTYPE html>
<html>
<head><title>ProtoPedia Tag Cloud</title></head>
<body>
<h1>ProtoPedia Tag Cloud</h1>
${Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => {
        const size = Math.min(10 + count / 5, 50);
        return `<span style="font-size:${size}px;margin:5px">${tag} (${count})</span>`;
    })
    .join('\n')}
</body>
</html>`;

writeFileSync('tag-cloud.html', html);
console.log('Generated tag-cloud.html');
```

### 月別作成数グラフデータ

```typescript
import { createPromidasRepository } from '@f88/promidas';

const repo = createPromidasRepository({
    apiClientOptions: { token: process.env.PROTOPEDIA_API_TOKEN },
});

await repo.setupSnapshot({ limit: 10000 });
const allData = await repo.getAllFromSnapshot();

// 月別集計
const monthCounts = new Map<string, number>();
for (const p of allData) {
    const month = p.newDate.toISOString().slice(0, 7); // YYYY-MM
    monthCounts.set(month, (monthCounts.get(month) || 0) + 1);
}

// グラフ用データ (Chart.js等で使える形式)
const chartData = {
    labels: Array.from(monthCounts.keys()).sort(),
    datasets: [
        {
            label: 'Prototypes Created',
            data: Array.from(monthCounts.keys())
                .sort()
                .map((month) => monthCounts.get(month)),
        },
    ],
};

console.log(JSON.stringify(chartData, null, 2));
```

### ライセンス別集計

```typescript
import { createPromidasRepository } from '@f88/promidas';

const repo = createPromidasRepository({
    apiClientOptions: { token: process.env.PROTOPEDIA_API_TOKEN },
});

await repo.setupSnapshot({ limit: 10000 });
const allData = await repo.getAllFromSnapshot();

const licenseCounts = allData.reduce(
    (acc, p) => {
        const license = p.license || 'Unknown';
        acc[license] = (acc[license] || 0) + 1;
        return acc;
    },
    {} as Record<string, number>,
);

console.log('License distribution:', licenseCounts);

// パーセンテージも表示
const total = allData.length;
for (const [license, count] of Object.entries(licenseCounts)) {
    const percentage = ((count / total) * 100).toFixed(2);
    console.log(`${license}: ${count} (${percentage}%)`);
}
```

## よくある質問

### Q1. データ取得に時間がかかる

**A**: `limit` パラメータで取得件数を制限できます:

```typescript
// 最新100件のみ取得
await repo.setupSnapshot({ limit: 100 });
```

全データが必要な場合は、初回実行に時間がかかるのは仕方ありません。

### Q2. メモリが足りない

**A**: `maxDataSizeBytes` で制限を増やすか、データ量を減らします:

```typescript
const repo = createPromidasRepository({
    storeConfig: {
        maxDataSizeBytes: 100 * 1024 * 1024, // 100MB
    },
});
```

### Q3. エラーが発生したらどうすればいい?

**A**: ローカルスクリプトでは、エラーが発生したらスクリプトを終了してOKです:

```typescript
const result = await repo.setupSnapshot({ limit: 1000 });
if (!result.ok) {
    console.error('Error:', result.error.message);
    process.exit(1);
}
```

### Q4. デバッグログを見たい

**A**: `logLevel: 'debug'` を設定します:

```typescript
const repo = createPromidasRepository({
    apiClientOptions: {
        token: process.env.PROTOPEDIA_API_TOKEN,
        logLevel: 'debug',
    },
});
```

### Q5. データを何度も取得したくない

**A**: キャッシュファイルを使う方法があります:

```typescript
import { readFileSync, writeFileSync, existsSync } from 'fs';

const CACHE_FILE = 'cache.json';

let allData;
if (existsSync(CACHE_FILE)) {
    // キャッシュから読み込み
    allData = JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
    console.log('Loaded from cache');
} else {
    // APIから取得してキャッシュ
    const repo = createPromidasRepository({
        apiClientOptions: { token: process.env.PROTOPEDIA_API_TOKEN },
    });
    await repo.setupSnapshot({ limit: 10000 });
    allData = await repo.getAllFromSnapshot();
    writeFileSync(CACHE_FILE, JSON.stringify(allData));
    console.log('Fetched from API and cached');
}

// allData を使った処理
```

### Q6. TypeScriptの型定義が欲しい

**A**: `@f88/promidas/types` から型をimportできます:

```typescript
import type { NormalizedPrototype } from '@f88/promidas/types';

const prototypes: NormalizedPrototype[] = await repo.getAllFromSnapshot();
```

## 次のステップ

- [Repository Usage Guide](https://github.com/F88/promidas/blob/main/lib/repository/docs/USAGE.md): より高度な使い方
- Application Integration Use Cases: アプリケーション組み込み向けガイド（準備中）
- [Repository Design Document](https://github.com/F88/promidas/blob/main/lib/repository/docs/DESIGN.md): 内部アーキテクチャ

## サポート

- **Issues**: [GitHub Issues](https://github.com/F88/promidas/issues)
- **Discussions**: [GitHub Discussions](https://github.com/F88/promidas/discussions)
