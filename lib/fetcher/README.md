---
lang: ja
title: Fetcher Module
title-en: Fetcher Module
title-ja: フェッチャーモジュール
related:
    - ../../../README.md "Project Overview"
    - docs/USAGE.md "Fetcher Usage"
    - docs/DESIGN.md "Fetcher Design"
instructions-for-ais:
    - This document should be written in Japanese.
    - Use half-width characters for numbers, letters, and symbols.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document
---

# Fetcher Module

ProtoPedia API からデータを取得し、使いやすい形に整えるモジュールです。

## 📦 これは何?

ProtoPedia の Web API にアクセスして、プロトタイプ情報を取得します。
取得したデータは自動的に使いやすい形式に変換されます。

## 🚀 簡単な使い方

```typescript
import {
    createProtopediaApiCustomClient,
    fetchAndNormalizePrototypes,
} from '@f88/promidas/fetcher';

// 1. API クライアントを作成
const client = createProtopediaApiCustomClient({
    token: process.env.PROTOPEDIA_API_TOKEN, // あなたの API トークン
});

// 2. データを取得
const result = await fetchAndNormalizePrototypes(client, {
    limit: 10, // 最大10件取得
});

// 3. 結果を確認
if (result.ok) {
    console.log(`${result.data.length} 件のプロトタイプを取得しました`);

    result.data.forEach((prototype) => {
        console.log(`名前: ${prototype.name}`);
        console.log(`タグ: ${prototype.tags.join(', ')}`);
    });
} else {
    console.error('エラー:', result.error.message);
}
```

## 📚 詳しく知りたい方へ

- **[使い方ガイド (USAGE.md)](./docs/USAGE.md)**: 詳しい使い方と実例
- **[設計ドキュメント (DESIGN.md)](./docs/DESIGN.md)**: 技術的な詳細

## 💡 主な機能

### API クライアントの作成

```typescript
import { createProtopediaApiCustomClient } from '@f88/promidas/fetcher';

const client = createProtopediaApiCustomClient({
    token: 'your-api-token', // API トークン (必須)
    timeout: 30000, // タイムアウト (ミリ秒, オプション)
});
```

### データの取得

```typescript
import { fetchAndNormalizePrototypes } from '@f88/promidas/fetcher';

// 基本的な取得
const result = await fetchAndNormalizePrototypes(client, {
    limit: 100, // 取得件数
});

// 検索条件を指定
const filtered = await fetchAndNormalizePrototypes(client, {
    limit: 50,
    status: 'active', // 公開中のもののみ
});
```

### エラーハンドリング

```typescript
const result = await fetchAndNormalizePrototypes(client, { limit: 10 });

if (result.ok) {
    // 成功した場合
    console.log('データ:', result.data);
} else {
    // 失敗した場合
    console.error('エラーの種類:', result.error.type);
    console.error('メッセージ:', result.error.message);

    if (result.error.type === 'network_failure') {
        console.log('ネットワークエラーです。接続を確認してください。');
    }
}
```

## 🔗 関連モジュール

- [Utils](../utils/README.md) - データ変換ユーティリティ
- [Repository](../repository/README.md) - 取得したデータを保存・検索
- [Logger](../logger/README.md) - ログ出力

## ⚙️ 取得されるデータ

fetchAndNormalizePrototypes で取得できるデータの例:

```typescript
{
  id: 12345,
  name: 'サンプルプロトタイプ',
  status: 'active',           // 型安全な値
  tags: ['IoT', 'Arduino'],   // 配列に変換済み
  createDate: '2025-12-12T01:00:00.000Z',  // UTC に変換済み
  // ... その他多数のフィールド
}
```

---

**困ったときは**: [USAGE.md](./docs/USAGE.md) に詳しい説明とトラブルシューティングがあります
