---
lang: ja
title: Cookbook
title-en: Cookbook
title-ja: 逆引きレシピ集
instructions-for-ais:
    - This document should be written in Japanese.
    - Use half-width characters for numbers, letters, and symbols.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document.
---

# Cookbook (逆引きレシピ集)

このドキュメントは、PROMIDAS を使って ProtoPedia のデータを操作するための実用的なコードスニペット集です。
記載されているコードは、環境変数を設定し `createPromidasForLocal` でリポジトリが初期化されていることを前提としています。

```typescript
// 以下を事前に設定していることを想定しています。
// process.env.PROTOPEDIA_API_V2_TOKEN = 'YOUR_TOKEN_HERE';

import { createPromidasForLocal } from '@f88/promidas';
import type { NormalizedPrototype } from '@f88/promidas/types';

const repo = createPromidasForLocal({
    protopediaApiToken: process.env.PROTOPEDIA_API_V2_TOKEN,
});

// 例: 最初にスナップショットをセットアップ (必要に応じてオプションを調整)
// const setupResult = await repo.setupSnapshot({ limit: 10000 });
// if (!setupResult.ok) {
//     console.error('Failed to setup snapshot:', setupResult.message);
//     process.exit(1);
// }
```

## 🔍 基本的な検索・フィルタリング

### 特定のステータスの作品を取得する

「完成」状態の作品だけを取得したい場合。(ステータスコード 3 が '完成' を示すと仮定します)

```typescript
// 事前に repo.setupSnapshot() が実行され、データがメモリにロードされている必要があります。
const allPrototypes: NormalizedPrototype[] = await repo.getAllFromSnapshot();
const completedPrototypes = allPrototypes.filter((p) => p.status === 3);
console.log(`Completed prototypes: ${completedPrototypes.length}`);
// return completedPrototypes;
```

### 特定のタグを含む作品を探す

「M5Stack」タグが付いている作品を抽出します。タグの大文字・小文字は区別しません。

```typescript
// 事前に repo.setupSnapshot() が実行され、データがメモリにロードされている必要があります。
const allPrototypes: NormalizedPrototype[] = await repo.getAllFromSnapshot();
const targetTag = 'M5Stack';
const prototypesWithTag = allPrototypes.filter((p) =>
    p.tags.some((t) => t.toLowerCase() === targetTag.toLowerCase()),
);
console.log(`Prototypes with tag "${targetTag}": ${prototypesWithTag.length}`);
// return prototypesWithTag;
```

### 特定のユーザーの作品を取得する

ユーザーID `1234` の作品一覧を取得します。

```typescript
// 事前に repo.setupSnapshot() が実行され、データがメモリにロードされている必要があります。
const allPrototypes: NormalizedPrototype[] = await repo.getAllFromSnapshot();
const targetUserId = 1234;
const userPrototypes = allPrototypes.filter((p) =>
    p.members.some((m) => m.userId === targetUserId),
);
console.log(`Prototypes by user ID ${targetUserId}: ${userPrototypes.length}`);
// return userPrototypes;
```

### キーワード検索

タイトルや概要に特定のキーワードを含む作品を検索します。大文字・小文字は区別しません。

```typescript
// 事前に repo.setupSnapshot() が実行され、データがメモリにロードされている必要があります。
const allPrototypes: NormalizedPrototype[] = await repo.getAllFromSnapshot();
const keyword = 'ロボット';
const searchResults = allPrototypes.filter(
    (p) =>
        p.prototypeNm.toLowerCase().includes(keyword.toLowerCase()) ||
        p.summary.toLowerCase().includes(keyword.toLowerCase()) ||
        p.freeComment.toLowerCase().includes(keyword.toLowerCase()),
);
console.log(`Prototypes containing "${keyword}": ${searchResults.length}`);
// return searchResults;
```

## 📅 日付・期間に関する操作

### 最新のN件を取得する

作成日順(降順)にソートして最新のN件を取得します。

```typescript
// 事前に repo.setupSnapshot() が実行され、データがメモリにロードされている必要があります。
const allPrototypes: NormalizedPrototype[] = await repo.getAllFromSnapshot();
const n = 5; // 取得したい件数
const latestPrototypes = allPrototypes
    .sort(
        (a, b) =>
            new Date(b.createDate).getTime() - new Date(a.createDate).getTime(),
    )
    .slice(0, n);
console.log(
    `Latest ${n} prototypes:`,
    latestPrototypes.map((p) => p.prototypeNm),
);
// return latestPrototypes;
```

### 最近更新された作品を取得する

更新日順(降順)にソートして最新のN件を取得します。`updateDate` がない作品は除外します。

```typescript
// 事前に repo.setupSnapshot() が実行され、データがメモリにロードされている必要があります。
const allPrototypes: NormalizedPrototype[] = await repo.getAllFromSnapshot();
const n = 5; // 取得したい件数
const recentlyUpdatedPrototypes = allPrototypes
    .filter((p) => p.updateDate) // updateDateが存在するもののみ
    .sort(
        (a, b) =>
            new Date(b.updateDate!).getTime() -
            new Date(a.updateDate!).getTime(),
    ) // updateDate! で null/undefinedを除外
    .slice(0, n);
console.log(
    `Recently updated ${n} prototypes:`,
    recentlyUpdatedPrototypes.map((p) => p.prototypeNm),
);
// return recentlyUpdatedPrototypes;
```

### 特定の期間に投稿された作品を取得する

指定した日付範囲(例:2024年1月1日~2024年12月31日)に `createDate` が含まれる作品を取得します。

```typescript
// 事前に repo.setupSnapshot() が実行され、データがメモリにロードされている必要があります。
const allPrototypes: NormalizedPrototype[] = await repo.getAllFromSnapshot();
const startDate = new Date('2024-01-01T00:00:00Z'); // 期間開始
const endDate = new Date('2024-12-31T23:59:59Z'); // 期間終了

const prototypesInPeriod = allPrototypes.filter((p) => {
    const createDateTime = new Date(p.createDate).getTime();
    return (
        createDateTime >= startDate.getTime() &&
        createDateTime <= endDate.getTime()
    );
});
console.log(
    `Prototypes created in period (${startDate.toDateString()} - ${endDate.toDateString()}): ${prototypesInPeriod.length}`,
);
// return prototypesInPeriod;
```

## 📊 集計・ランキング

### 人気のタグを集計する (タグクラウド用データ)

よく使われているタグのトップNを集計し、タグクラウドのデータとして利用可能な形式で取得します。

```typescript
// 事前に repo.setupSnapshot() が実行され、データがメモリにロードされている必要があります。
const allPrototypes: NormalizedPrototype[] = await repo.getAllFromSnapshot();
const tagCounts = new Map<string, number>();

allPrototypes.forEach((p) => {
    p.tags.forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    });
});

const topNTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1]) // 出現回数が多い順にソート
    .slice(0, 10); // 例: トップ10
console.log('Top 10 tags:', topNTags);
// return topNTags;
```

### 投稿数の多いユーザーランキングを作成する

作品投稿数が多いユーザーのランキングを作成します。ユーザーIDと作品数を取得します。

```typescript
// 事前に repo.setupSnapshot() が実行され、データがメモリにロードされている必要があります。
const allPrototypes: NormalizedPrototype[] = await repo.getAllFromSnapshot();
const userCounts = new Map<number, number>(); // Map<userId, count>

allPrototypes.forEach((p) => {
    p.members.forEach((m) => {
        userCounts.set(m.userId, (userCounts.get(m.userId) || 0) + 1);
    });
});

const userRanking = Array.from(userCounts.entries()).sort(
    (a, b) => b[1] - a[1],
); // 作品数が多い順にソート
console.log('User prototype counts ranking:', userRanking);
// return userRanking;
```

### ステータスごとの件数を集計する (円グラフ用データ)

作品のステータス(例:開発中、完成)ごとの件数を集計し、円グラフなどで可視化できるデータを作成します。

```typescript
// 事前に repo.setupSnapshot() が実行され、データがメモリにロードされている必要があります。
const allPrototypes: NormalizedPrototype[] = await repo.getAllFromSnapshot();
const statusMap = new Map<number, string>([
    [0, '未定義'],
    [1, 'アイデア'],
    [2, '開発中'],
    [3, '完成'],
    [4, '部品化'],
]);

const statusCounts = new Map<string, number>(); // Map<statusName, count>

allPrototypes.forEach((p) => {
    const statusName = statusMap.get(p.status) || `不明 (${p.status})`;
    statusCounts.set(statusName, (statusCounts.get(statusName) || 0) + 1);
});

const statusDistribution = Array.from(statusCounts.entries());
console.log('Status distribution:', statusDistribution);
// return statusDistribution;
```

### ライセンス種別ごとの分布を調べる

作品に設定されているライセンス種別ごとの件数を集計し、分布を調べます。

```typescript
// 事前に repo.setupSnapshot() が実行され、データがメモリにロードされている必要があります。
const allPrototypes: NormalizedPrototype[] = await repo.getAllFromSnapshot();
const licenseCounts = new Map<string, number>();

allPrototypes.forEach((p) => {
    const license = p.licenseType
        ? `License Type ${p.licenseType}`
        : '不明/未設定';
    licenseCounts.set(license, (licenseCounts.get(license) || 0) + 1);
});

const licenseDistribution = Array.from(licenseCounts.entries()).sort(
    (a, b) => b[1] - a[1],
);
console.log('License distribution:', licenseDistribution);
// return licenseDistribution;
```

## 🔌 エクスポート・連携

### スナップショットをJSONファイルに保存する (推奨)

スナップショット全体をメタデータ付きでJSONファイルに保存します。後で `setupSnapshotFromSerializedData()` で読み込むことができます。

```typescript
import { writeFileSync } from 'fs';
// 事前に repo.setupSnapshot() が実行され、データがメモリにロードされている必要があります。

// スナップショット全体を取得 (バージョン情報、タイムスタンプ付き)
const snapshot = repo.getSerializableSnapshot();

// JSON形式で保存
writeFileSync('snapshot.json', JSON.stringify(snapshot, null, 2));
console.log(`Saved snapshot with ${snapshot.prototypes.length} prototypes`);
console.log(
    `Version: ${snapshot.version}, Serialized at: ${snapshot.serializedAt}`,
);
```

### 保存したスナップショットを読み込む

オフライン環境や起動高速化のため、保存したスナップショットから直接データを読み込みます。

**重要**: この方法で読み込んだ後、`refreshSnapshot()` は使えません。API から最新データを取得したい場合は `setupSnapshot()` を実行してください。

```typescript
import { readFileSync } from 'fs';
import { createPromidasForLocal } from '@f88/promidas';

const repo = createPromidasForLocal({
    protopediaApiToken: process.env.PROTOPEDIA_API_V2_TOKEN,
});

// JSONファイルからスナップショットを読み込む
const json = readFileSync('snapshot.json', 'utf-8');
const snapshot = JSON.parse(json);

// スナップショットを復元
const result = repo.setupSnapshotFromSerializedData(snapshot);

if (result.ok) {
    console.log(`Loaded ${result.stats.size} prototypes from snapshot`);
} else {
    console.error(`Failed to load snapshot: ${result.message}`);
    process.exit(1);
}

// この後 refreshSnapshot() を呼ぶと REPOSITORY_INVALID_STATE エラーになります
// APIから最新データを取得したい場合は setupSnapshot() を実行してください
```

### JSONファイルとして保存する (データのみ)

取得した全データをそのままJSONファイルに保存します。バックアップや他のツールでの再利用に便利です。

```typescript
import { writeFileSync } from 'fs';
// 事前に repo.setupSnapshot() が実行され、データがメモリにロードされている必要があります。
const allPrototypes: NormalizedPrototype[] = await repo.getAllFromSnapshot();

// 読みやすい形式(インデント2)でJSONファイルに保存
writeFileSync('prototypes.json', JSON.stringify(allPrototypes, null, 2));
console.log(`Saved ${allPrototypes.length} prototypes to prototypes.json`);
```

### CSV形式でエクスポートする

Excelなどの表計算ソフトで開くために、主要な情報をCSVファイルに変換して保存します。

```typescript
import { writeFileSync } from 'fs';
// 事前に repo.setupSnapshot() が実行され、データがメモリにロードされている必要があります。
const allPrototypes: NormalizedPrototype[] = await repo.getAllFromSnapshot();

// ヘッダー行
const headers = [
    'ID',
    'Title',
    'Status',
    'ViewCount',
    'Main URL',
    'Created Date',
];

// データ行の作成 (CSV形式: カンマ区切り、ダブルクォートで囲む)
const rows = allPrototypes.map((p) => {
    // CSVで特殊文字をエスケープする関数
    const escapeCsv = (value: any) => {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (
            str.includes(',') ||
            str.includes('"') ||
            str.includes('\n') ||
            str.includes('\r')
        ) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    return [
        escapeCsv(p.id),
        escapeCsv(p.prototypeNm),
        escapeCsv(p.status),
        escapeCsv(p.viewCount),
        escapeCsv(p.mainUrl),
        escapeCsv(p.createDate),
    ].join(',');
});

const csvContent = [headers.join(','), ...rows].join('\n');

// BOM付きで保存(Excelで文字化けしないようにするため)
writeFileSync('prototypes.csv', '\uFEFF' + csvContent);
console.log('Saved to prototypes.csv');
```

### Googleスプレッドシート貼り付け用 (TSV)

Googleスプレッドシートに直接貼り付けられるよう、タブ区切りテキスト(TSV)をクリップボードにコピー可能な形式でコンソールに出力します。

```typescript
// 事前に repo.setupSnapshot() が実行され、データがメモリにロードされている必要があります。
const allPrototypes: NormalizedPrototype[] = await repo.getAllFromSnapshot();

// ヘッダー
// Console.logはUTF-8で出力されるため、スプレッドシート側でエンコーディングを「UTF-8」として読み込む必要があります。
console.log(['ID', 'タイトル', 'タグ', '作成日', '概要'].join('\t'));

// データ出力
allPrototypes.slice(0, 20).forEach((p) => {
    // 例として20件だけ表示
    // TSVで特殊文字をエスケープする関数(タブや改行を考慮)
    const escapeTsv = (value: any) => {
        if (value === null || value === undefined) return '';
        const str = String(value);
        // タブ、改行、キャリッジリターンを考慮し、ダブルクォートで囲み、内部のダブルクォートをエスケープ
        if (
            str.includes('\t') ||
            str.includes('\n') ||
            str.includes('\r') ||
            str.includes('"')
        ) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    console.log(
        [
            escapeTsv(p.id),
            escapeTsv(p.prototypeNm),
            escapeTsv(p.tags.join(', ')), // タグはカンマ区切りで結合
            escapeTsv(p.createDate),
            escapeTsv(p.summary),
        ].join('\t'),
    );
});

console.log(
    '\n--- 上記の出力をコピーし、Googleスプレッドシートに貼り付けてください ---',
);
console.log(
    '(スプレッドシート側で「データをインポート」し、区切り文字を「タブ」、エンコードを「UTF-8」に設定してください)',
);
```

## ⏱️ 大量データ取得と進捗表示

### ダウンロード進捗をコールバックで取得する

大量のデータを取得する際、進捗状況を把握したい場合はカスタムコールバックを使用できます。

```typescript
import { ProtopediaApiCustomClient } from '@f88/promidas/fetcher';

// 進捗イベントハンドラー付きのカスタムクライアントを作成
const client = new ProtopediaApiCustomClient({
    protoPediaApiClientOptions: {
        token: process.env.PROTOPEDIA_API_V2_TOKEN,
    },
    progressLog: false, // 自動ログを無効化
    progressCallback: (event) => {
        switch (event.type) {
            case 'request-start':
                console.log('リクエスト開始');
                break;

            case 'response-received':
                console.log(
                    `レスポンス受信: 準備時間 ${event.prepareTimeMs}ms`,
                );
                break;

            case 'download-progress': {
                // プログレスバーの表示
                const barLength = 40;
                const filled = Math.floor((event.percentage / 100) * barLength);
                const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
                process.stdout.write(
                    `\r[${bar}] ${event.percentage.toFixed(1)}% (${event.received}/${event.total} バイト)`,
                );
                break;
            }

            case 'complete':
                console.log(
                    `\n完了: ${event.received} バイト受信 (ダウンロード ${event.downloadTimeMs}ms)`,
                );
                console.log(`合計時間: ${event.totalTimeMs}ms`);
                break;
        }
    },
});

// 大量データを取得
const result = await client.fetchPrototypes({ limit: 10000 });

if (result.ok) {
    console.log(`${result.data.length} 件のプロトタイプを取得しました`);
} else {
    console.error('取得失敗:', result.message);
}
```

### 自動進捗ログを有効にする

`createPromidasForLocal` を使う場合、デフォルトで進捗ログが有効になっています。
ログレベルを `info` 以上にすると、stderr に進捗が表示されます。

```typescript
import { createPromidasForLocal } from '@f88/promidas';

const repo = createPromidasForLocal({
    protopediaApiToken: process.env.PROTOPEDIA_API_V2_TOKEN,
    logLevel: 'info', // info 以上で進捗ログが表示される
});

// 10000件取得時は自動的に進捗が stderr に表示されます
const setupResult = await repo.setupSnapshot({ limit: 10000 });
// stderr output:
Download starting (limit=10000, 2670000 bytes (estimated)) (prepared in 0.05s)
// Download complete: 2670000 bytes received (estimated 2670000 bytes) in 1.23s (total: 1.28s)

if (setupResult.ok) {
    console.log(`スナップショット作成完了: ${setupResult.stats.size} 件`);
}
```
