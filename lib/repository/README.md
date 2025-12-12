---
lang: ja
title: Repository Module
title-en: Repository Module
title-ja: リポジトリモジュール
related:
    - ../../../README.md "Project Overview"
    - docs/USAGE.md "Repository Usage"
    - docs/DESIGN.md "Repository Design"
instructions-for-ais:
    - This document should be written in Japanese.
    - Use half-width characters for numbers, letters, and symbols.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document.
---

# Repository Module

ProtoPedia のプロトタイプデータをメモリに保存し、高速に検索できるモジュールです。

## 📦 これは何?

API から取得したプロトタイプ情報をメモリに保存して、素早くアクセスできるようにします。
データベースを使わずに、メモリ上でデータを管理します。

## 🚀 簡単な使い方

```typescript
import {
    createProtopediaInMemoryRepository,
    createProtopediaApiCustomClient,
} from '@f88/promidas';

// 1. リポジトリを作成
const repository = createProtopediaInMemoryRepository({
    apiClient: createProtopediaApiCustomClient({
        token: process.env.PROTOPEDIA_API_TOKEN,
    }),
});

// 2. データを読み込む
await repository.initialize({ limit: 1000 });

// 3. データを検索
const activePrototypes = repository.findAll((p) => p.status === 'active');
console.log(`公開中: ${activePrototypes.length} 件`);

// 4. タグで検索
const iotPrototypes = repository.findAll((p) => p.tags.includes('IoT'));
console.log(`IoT関連: ${iotPrototypes.length} 件`);
```

## 📚 詳しく知りたい方へ

- **[使い方ガイド (USAGE.md)](./docs/USAGE.md)**: 詳しい使い方と実例
- **[設計ドキュメント (DESIGN.md)](./docs/DESIGN.md)**: 技術的な詳細

## 💡 主な機能

### データの初期読み込み

```typescript
// 初回のデータ読み込み
await repository.initialize({
    limit: 1000, // 最大1000件
});

// データが読み込まれているか確認
const stats = repository.getStats();
console.log(`保存件数: ${stats.totalCount} 件`);
```

### データの検索

```typescript
// すべてのデータを取得
const all = repository.findAll();

// 条件で絞り込み
const filtered = repository.findAll((prototype) => {
    return prototype.status === 'active' && prototype.tags.includes('Arduino');
});

// 最初の1件だけ取得
const first = repository.findFirst((p) => p.status === 'active');
```

### データの更新

```typescript
// API から最新データを取得して更新
await repository.refresh({ limit: 1000 });

console.log('データを更新しました');
```

### データの統計

```typescript
const stats = repository.getStats();

console.log(`保存件数: ${stats.totalCount} 件`);
console.log(`最終更新: ${stats.lastUpdatedAt}`);
```

## 🔗 関連モジュール

- [Fetcher](../fetcher/README.md) - API からデータを取得
- [Store](../store/README.md) - データ保存の内部実装
- [Utils](../utils/README.md) - データ変換ユーティリティ

## 🎯 使い方のパターン

### パターン1: 起動時に一度だけ読み込む

```typescript
// アプリケーション起動時
await repository.initialize({ limit: 10000 });

// あとは何度でも検索できる
const data1 = repository.findAll((p) => p.status === 'active');
const data2 = repository.findAll((p) => p.licenseType === 'MIT');
```

### パターン2: 定期的に更新

```typescript
// 初回読み込み
await repository.initialize({ limit: 10000 });

// 30分ごとに更新
setInterval(
    async () => {
        await repository.refresh({ limit: 10000 });
        console.log('データを更新しました');
    },
    30 * 60 * 1000,
);
```

### パターン3: 条件付き更新

```typescript
const stats = repository.getStats();
const oneHour = 60 * 60 * 1000;

// 1時間以上経過していたら更新
if (Date.now() - stats.lastUpdatedAt.getTime() > oneHour) {
    await repository.refresh({ limit: 10000 });
}
```

## 📊 検索の実例

### ステータスで検索

```typescript
import { StatusType } from '@f88/promidas/utils';

const active = repository.findAll((p) => p.status === StatusType.Active);
const inactive = repository.findAll((p) => p.status === StatusType.Inactive);
```

### タグで検索

```typescript
// 特定のタグを持つプロトタイプ
const iot = repository.findAll((p) => p.tags.includes('IoT'));

// 複数のタグのいずれかを持つ
const tech = repository.findAll((p) =>
    p.tags.some((tag) => ['IoT', 'Arduino', 'Raspberry Pi'].includes(tag)),
);
```

### 日付で検索

```typescript
// 2025年に作成されたもの
const recent = repository.findAll((p) => {
    const year = new Date(p.createDate).getFullYear();
    return year === 2025;
});
```

### 複合条件で検索

```typescript
// 公開中 かつ IoTタグ付き かつ MITライセンス
const filtered = repository.findAll(
    (p) =>
        p.status === 'active' &&
        p.tags.includes('IoT') &&
        p.licenseType === 'MIT',
);
```

## ⚠️ 注意点

- データはメモリ上に保存されます (大量データには向きません)
- アプリを再起動すると、データは消えます
- 推奨データ量: 10,000件程度まで

---

**困ったときは**: [USAGE.md](./docs/USAGE.md) に詳しい使い方と最適化のヒントがあります
