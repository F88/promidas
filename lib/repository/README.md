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

## 📥 インストールと使い方

詳しい使い方は、[Getting Started Guide](https://f88.github.io/promidas/getting-started.html)を参照してください。

このモジュールは単体でも使用できます:

```typescript
import {
    type NormalizedPrototype,
    type Logger,
} from '@f88/promidas/repository';
```

## 🚀 クイックスタート

初心者向けのファクトリー関数を使った簡単な例:

```typescript
import { createPromidasForLocal } from '@f88/promidas';

// 1. リポジトリを作成 (ローカル開発用の最適化設定)
const repository = createPromidasForLocal({
    protopediaApiToken: process.env.PROTOPEDIA_API_V2_TOKEN,
});

// 2. データを読み込む
const result = await repository.setupSnapshot({ limit: 1000 });
if (!result.ok) {
    console.error('データ取得失敗:', result.error);
    throw new Error(result.error.message);
}

// 3. データを検索
const allData = await repository.getAllFromSnapshot();
const completed = allData.filter((p) => p.status === 3); // 3 = '完成'
console.log(`完成プロトタイプ: ${completed.length} 件`);
```

より詳細な例や高度な設定については、[ドキュメント](https://f88.github.io/promidas/)をご覧ください。

## 📚 詳しく知りたい方へ

- **[使い方ガイド (USAGE.md)](./docs/USAGE.md)**: 詳しい使い方と実例
- **[設計ドキュメント (DESIGN.md)](./docs/DESIGN.md)**: 技術的な詳細

## 💡 主な機能

### データの初期読み込み

```typescript
// 初回のデータ読み込み
const result = await repository.setupSnapshot({
    limit: 1000, // 最大1000件
});

if (result.ok) {
    console.log(`${result.data.count} 件のデータを読み込みました`);
} else {
    console.error('エラー:', result.error.message);
}

// データが読み込まれているか確認
const stats = repository.getStats();
console.log(`保存件数: ${stats.size} 件`);
console.log(`期限切れ: ${stats.isExpired}`);
```

### データの検索

```typescript
// すべてのデータを取得
const all = await repository.getAllFromSnapshot();

// 条件で絞り込み (JavaScriptの配列メソッドを使用)
const filtered = all.filter((prototype) => {
    return prototype.status === 3 && prototype.tags.includes('Arduino'); // 3 = '完成'
});

// 最初の1件だけ取得
const first = all.find((p) => p.status === 3);

// IDで特定のプロトタイプを取得 (O(1)の高速検索)
const prototype = await repository.getPrototypeFromSnapshotByPrototypeId(123);
if (prototype) {
    console.log(prototype.prototypeNm);
}
```

### データの更新

```typescript
// API から最新データを取得して更新
const result = await repository.refreshSnapshot();

if (result.ok) {
    console.log('データを更新しました');
    console.log(`更新後の件数: ${result.data.count} 件`);
} else {
    console.error('更新失敗:', result.error.message);
}
```

### データの統計

```typescript
const stats = repository.getStats();

console.log(`保存件数: ${stats.size} 件`);
console.log(`キャッシュ日時: ${stats.cachedAt}`);
console.log(`期限切れ: ${stats.isExpired}`);
console.log(`データサイズ: ${stats.dataSizeBytes} bytes`);

// プロトタイプIDの範囲を分析
const analysis = await repository.analyzePrototypes();
console.log(`最小ID: ${analysis.min}, 最大ID: ${analysis.max}`);
```

## 🔗 関連モジュール

- [Fetcher](../fetcher/README.md) - API からデータを取得
- [Store](../store/README.md) - データ保存の内部実装
- [Utils](../utils/README.md) - データ変換ユーティリティ

## 🎯 使い方のパターン

### パターン1: 起動時に一度だけ読み込む

```typescript
// アプリケーション起動時
await repository.setupSnapshot({ limit: 10000 });

// あとは何度でも検索できる (メモリ内なので高速)
const all = await repository.getAllFromSnapshot();
const completed = all.filter((p) => p.status === 3); // 3 = '完成'
const ccby = all.filter((p) => p.licenseType === 1); // 1 = 'CC:BY'
```

### パターン2: 定期的に更新

```typescript
// 初回読み込み
await repository.setupSnapshot({ limit: 10000 });

// 30分ごとに更新
setInterval(
    async () => {
        const result = await repository.refreshSnapshot();
        if (result.ok) {
            console.log(`データを更新しました: ${result.data.count} 件`);
        }
    },
    30 * 60 * 1000,
);
```

### パターン3: 期限切れ時に更新

```typescript
const stats = repository.getStats();

// TTLが切れていたら更新
if (stats.isExpired) {
    const result = await repository.refreshSnapshot();
    if (result.ok) {
        console.log('期限切れのため更新しました');
    }
}

// または、残り時間をチェック
if (stats.remainingTtlMs < 5 * 60 * 1000) {
    // 残り5分未満なら更新
    await repository.refreshSnapshot();
}
```

## 📊 検索の実例

### ステータスで検索

```typescript
const all = await repository.getAllFromSnapshot();

const idea = all.filter((p) => p.status === 1); // 1 = 'アイデア'
const developing = all.filter((p) => p.status === 2); // 2 = '開発中'
const completed = all.filter((p) => p.status === 3); // 3 = '完成'
const retired = all.filter((p) => p.status === 4); // 4 = '供養'
```

### タグで検索

```typescript
const all = await repository.getAllFromSnapshot();

// 特定のタグを持つプロトタイプ
const iot = all.filter((p) => p.tags.includes('IoT'));

// 複数のタグのいずれかを持つ
const tech = all.filter((p) =>
    p.tags.some((tag) => ['IoT', 'Arduino', 'Raspberry Pi'].includes(tag)),
);
```

### 日付で検索

```typescript
const all = await repository.getAllFromSnapshot();

// 2025年に作成されたもの
const recent = all.filter((p) => {
    const year = new Date(p.createDate).getFullYear();
    return year === 2025;
});
```

### 複合条件で検索

```typescript
const all = await repository.getAllFromSnapshot();

// 完成済み かつ IoTタグ付き かつ CC:BYライセンス
const filtered = all.filter(
    (p) =>
        p.status === 3 && // 3 = '完成'
        p.tags.includes('IoT') &&
        p.licenseType === 1, // 1 = 'CC:BY'
);
```

### ランダムサンプリング

```typescript
// ランダムに1件取得
const random = await repository.getRandomPrototypeFromSnapshot();
if (random) {
    console.log(random.prototypeNm);
}

// ランダムに10件取得
const sample = await repository.getRandomSampleFromSnapshot(10);
console.log(`サンプル: ${sample.length} 件`);
```

## ⚠️ 注意点

- データはメモリ上に保存されます (大量データには向きません)
- アプリを再起動すると、データは消えます
- 推奨データ量: 10,000件程度まで

---

**困ったときは**: [USAGE.md](./docs/USAGE.md) に詳しい使い方と最適化のヒントがあります
