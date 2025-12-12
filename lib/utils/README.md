---
lang: ja
title: Utils Module
title-en: Utils Module
title-ja: ユーティリティモジュール
related:
    - ../../../README.md "Project Overview"
    - docs/USAGE.md "Utils Usage"
    - docs/DESIGN.md "Utils Design"
instructions-for-ais:
    - This document should be written in Japanese.
    - Use half-width characters for numbers, letters, and symbols.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document.
---

# Utils Module

初心者にも使いやすい、ProtoPedia データを扱うためのユーティリティ関数集です。

## 📦 これは何?

ProtoPedia API から取得したデータを扱いやすくするための便利な関数を集めたモジュールです:

- **Converters**: 文字列を型安全な値に変換 (例: `"active"` → `StatusType.Active`)
- **Time Utilities**: 日時を扱う関数 (例: JST の日時を UTC に変換)
- **Types**: TypeScript の型定義

## 🚀 簡単な使い方

### データ変換の例

```typescript
import { convertToStatusType, StatusType } from '@f88/promidas/utils';

// API から受け取った文字列を型安全な値に変換
const status = convertToStatusType('active');

if (status === StatusType.Active) {
    console.log('このプロトタイプは公開中です');
}
```

### 日時変換の例

```typescript
import { parseProtoPediaTimestamp } from '@f88/promidas/utils';

// ProtoPedia の日時 (JST) を世界標準時 (UTC) に変換
const timestamp = parseProtoPediaTimestamp('2025-12-12 10:00:00.0');
console.log(timestamp); // '2025-12-12T01:00:00.000Z'
```

## 📚 詳しく知りたい方へ

- **[使い方ガイド (USAGE.md)](./docs/USAGE.md)**: たくさんの実例と詳しい説明
- **[設計ドキュメント (DESIGN.md)](./docs/DESIGN.md)**: 技術的な詳細と設計思想

## 🔗 関連モジュール

- [Fetcher](../fetcher/docs/USAGE.md) - API からデータを取得する
- [Repository](../repository/docs/USAGE.md) - データを保存・検索する
- [Store](../store/docs/USAGE.md) - メモリ上でデータを管理する

## 💡 よく使う機能

### 利用可能な変換関数

```typescript
import {
    convertToStatusType, // ステータス変換
    convertToLicenseType, // ライセンス変換
    convertToReleaseFlag, // リリース状態変換
    convertToThanksFlag, // サンクス状態変換
} from '@f88/promidas/utils';
```

### 日時関連の定数と関数

```typescript
import {
    parseProtoPediaTimestamp, // ProtoPedia 形式をパース
    parseW3cDtfTimestamp, // 標準的な ISO 形式をパース
    JST_OFFSET_MS, // 日本時間のオフセット (9時間)
} from '@f88/promidas/utils';
```

### 型定義

```typescript
import type {
    StatusType, // プロトタイプのステータス
    LicenseType, // ライセンスの種類
    ReleaseFlag, // リリース済みかどうか
    ThanksFlag, // サンクス機能の有効/無効
} from '@f88/promidas/utils';
```

---

**困ったときは**: [USAGE.md](./docs/USAGE.md) に詳しい使い方とエラー対処法があります
