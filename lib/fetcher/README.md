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

## 📥 インストールと使い方

このモジュールは単体でも使用できます:

```typescript
import {
    ProtopediaApiCustomClient,
    type NormalizedPrototype,
} from '@f88/promidas/fetcher';
```

## 🚀 簡単な使い方

```typescript
import { ProtopediaApiCustomClient } from '@f88/promidas/fetcher';

// 1. API クライアントを作成
const client = new ProtopediaApiCustomClient({
    protoPediaApiClientOptions: {
        token: process.env.PROTOPEDIA_API_V2_TOKEN, // あなたの API トークン
    },
    logLevel: 'info', // ログレベル (オプション)
});

// 2. データを取得
const result = await client.fetchPrototypes({
    limit: 10, // 最大10件取得
});

// 3. 結果を確認
if (result.ok) {
    console.log(`${result.data.length} 件のプロトタイプを取得しました`);

    result.data.forEach((prototype) => {
        console.log(`名前: ${prototype.prototypeNm}`);
        console.log(`タグ: ${prototype.tags.join(', ')}`);
    });
} else {
    console.error('エラー:', result.error);
}
```

## 📚 詳しく知りたい方へ

- **[使い方ガイド (USAGE.md)](./docs/USAGE.md)**: 詳しい使い方と実例
- **[設計ドキュメント (DESIGN.md)](./docs/DESIGN.md)**: 技術的な詳細

## 💡 主な機能

### API クライアントの作成

```typescript
import { ProtopediaApiCustomClient } from '@f88/promidas/fetcher';

const client = new ProtopediaApiCustomClient({
    protoPediaApiClientOptions: {
        token: 'your-api-token', // API トークン (必須)
        timeoutMs: 30000, // タイムアウト (ミリ秒, オプション)
    },
    logLevel: 'debug', // ログレベル (オプション)
});
```

### データの取得

```typescript
// 基本的な取得
const result = await client.fetchPrototypes({
    limit: 100, // 取得件数
});

// 検索条件を指定
const filtered = await client.fetchPrototypes({
    limit: 50,
    status: 'active', // 公開中のもののみ
});
```

### エラーハンドリング

```typescript
const result = await client.fetchPrototypes({ limit: 10 });

if (result.ok) {
    // 成功した場合
    console.log('データ:', result.data);
} else {
    // 失敗した場合
    console.error('エラー:', result.error);

    if (result.status === 401) {
        console.log('認証エラーです。APIトークンを確認してください。');
    } else if (result.status === 500) {
        console.log(
            'サーバーエラーです。しばらく待ってから再試行してください。',
        );
    }
}
```

## 🔗 関連モジュール

- [Utils](../utils/README.md) - データ変換ユーティリティ
- [Repository](../repository/README.md) - 取得したデータを保存・検索
- [Logger](../logger/README.md) - ログ出力

## ⚙️ 取得されるデータ

`client.fetchPrototypes()` で取得できるデータの例:

```typescript
{
  prototypeId: 12345,
  prototypeNm: 'サンプルプロトタイプ',
  status: 1,                  // ステータスコード
  tags: ['IoT', 'Arduino'],   // 配列に変換済み
  createDate: '2025-12-12T01:00:00.000Z',  // UTC に変換済み
  // ... その他多数のフィールド
}
```

---

**困ったときは**: [USAGE.md](./docs/USAGE.md) に詳しい説明とトラブルシューティングがあります
