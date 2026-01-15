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

- **Converters**: 数値コードを日本語ラベルに変換 (例: ステータスコード `1` → `'アイデア'`)
- **Time Utilities**: 日時を扱う関数 (例: JST の日時を UTC に変換)
- **Validation**: データの妥当性検証 (例: 外部データの構造チェック)
- **Types**: TypeScript の型定義

## 📥 インストールと使い方

このモジュールは単体でも使用できます:

```typescript
import {
    parseProtoPediaTimestamp,
    getPrototypeStatusLabel,
    validateNormalizedPrototype,
} from 'promidas/utils';
```

型定義が必要な場合は、[Typesモジュール](../types/README.md)から import してください:

```typescript
import type { StatusCode, NormalizedPrototype } from 'promidas/types';
```

## 🚀 簡単な使い方

### データ変換の例

```typescript
import { getPrototypeStatusLabel } from 'promidas/utils';

// ステータスコードを日本語ラベルに変換
const label = getPrototypeStatusLabel(1);
console.log(label); // 'アイデア'
```

### 日時変換の例

```typescript
import { parseProtoPediaTimestamp } from 'promidas/utils';

// ProtoPedia の日時 (JST) を世界標準時 (UTC) に変換
const timestamp = parseProtoPediaTimestamp('2025-12-12 10:00:00.0');
console.log(timestamp); // '2025-12-12T01:00:00.000Z'
```

### データ検証の例

```typescript
import { validateNormalizedPrototype } from 'promidas/utils';

// 外部データを安全に検証
const result = validateNormalizedPrototype(untrustedData);

if (result.ok) {
    // 検証成功: result.value が使える
    console.log(result.value.prototypeId);
} else {
    // 検証失敗: result.error にエラー情報
    console.error(result.error.message);
}
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
    getPrototypeStatusLabel, // ステータスコード → ラベル
    getPrototypeLicenseTypeLabel, // ライセンスコード → ラベル
    getPrototypeReleaseFlagLabel, // リリースフラグコード → ラベル
    getPrototypeThanksFlagLabel, // サンクスフラグコード → ラベル
} from 'promidas/utils';
```

### 日時関連の定数と関数

```typescript
import {
    parseProtoPediaTimestamp, // ProtoPedia 形式をパース
    parseW3cDtfTimestamp, // 標準的な ISO 形式をパース
    JST_OFFSET_MS, // 日本時間のオフセット (9時間)
} from 'promidas/utils';
```

### 検証関数

```typescript
import {
    validateNormalizedPrototype, // 単一データの検証
    validateNormalizedPrototypeArray, // 配列データの検証
} from 'promidas/utils';
```

---

**困ったときは**: [USAGE.md](./docs/USAGE.md) に詳しい使い方とエラー対処法があります
