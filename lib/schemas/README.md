---
lang: ja
title: Schemas Module
title-en: Schemas Module
title-ja: スキーマ検証モジュール
related:
    - ../../README.md "Project Overview"
    - docs/USAGE.md "Schemas Usage"
    - docs/DESIGN.md "Schemas Design"
instructions-for-ais:
    - This document should be written in Japanese.
    - Use half-width characters for numbers, letters, and symbols.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document.
---

# Schemas Module

ライブラリ全体で共有されるランタイム検証スキーマです。

## 📦 これは何?

Zodを使用したランタイム検証スキーマを提供します。
TypeScriptの型定義(`lib/types`)と組み合わせて、コンパイル時とランタイムの両方で型安全性を保証します。

## 🎯 主な特徴

- **ランタイム検証**: 外部データ(API、スナップショット、ファイル)を読み込む際の検証
- **厳格なコード値**: `status`, `releaseFlg` 等をリテラルユニオン(`1|2|3|4`)で制約
- **型との整合**: `lib/types` の型定義と完全に一致
- **再利用可能**: 複数モジュール(fetcher, repository, store)で共有

## 📥 インストールと使い方

このモジュールは単体でも使用できます:

```typescript
import { normalizedPrototypeSchema } from 'promidas/schemas';
```

## 🚀 使い方

### 基本的な検証

```typescript
import { normalizedPrototypeSchema } from 'promidas/schemas';

// 外部データを検証
const data = JSON.parse(jsonString);
const result = normalizedPrototypeSchema.safeParse(data);

if (result.success) {
    // 型安全なデータとして使用
    console.log(`ID: ${result.data.id}`);
    console.log(`Name: ${result.data.prototypeNm}`);
} else {
    // エラー詳細を取得
    console.error('Validation failed:', result.error.issues);
}
```

### スナップショットインポート時の検証

```typescript
import { normalizedPrototypeSchema } from 'promidas/schemas';

const snapshot = JSON.parse(await fs.readFile('snapshot.json', 'utf-8'));

// 各プロトタイプを検証
const validatedPrototypes = snapshot.prototypes.map((proto: unknown) => {
    const result = normalizedPrototypeSchema.safeParse(proto);
    if (!result.success) {
        throw new Error(`Invalid prototype: ${result.error.message}`);
    }
    return result.data;
});
```

### コード値の厳格な検証

```typescript
import { normalizedPrototypeSchema } from 'promidas/schemas';

// status は 1|2|3|4 のみ許可
const invalidData = {
    id: 1,
    status: 99, // ❌ エラー: 許可されていない値
    // ... other fields
};

const result = normalizedPrototypeSchema.safeParse(invalidData);
// result.success === false
// result.error.issues[0].path === ['status']
```

## 📋 提供されるスキーマ

### `normalizedPrototypeSchema`

正規化されたプロトタイプデータの検証スキーマ。

**制約されるコード値:**

- `status`: `1` (アイデア) | `2` (開発中) | `3` (完成) | `4` (供養)
- `releaseFlg`: `1` (下書き) | `2` (公開) | `3` (限定共有)
- `licenseType`: `0` (なし) | `1` (CC:BY)
- `thanksFlg`: `0` (未表示) | `1` (表示済) | `undefined` (古いデータ)

**対応する型:** `NormalizedPrototype` (`promidas/types`)

## 🔗 関連モジュール

- **`lib/types`**: TypeScript型定義 (コンパイル時の型安全性)
- **`lib/schemas`**: Zodスキーマ (ランタイム検証)
- **`lib/repository`**: スナップショット検証で使用
- **`lib/utils/validation`**: 共通バリデーションユーティリティ

## 📚 詳細ドキュメント

- [使用方法](docs/USAGE.md) - 詳細な使用例とパターン
- [設計思想](docs/DESIGN.md) - なぜこの設計にしたか

## 🤝 型との関係

```typescript
import type { NormalizedPrototype } from 'promidas/types';
import { normalizedPrototypeSchema } from 'promidas/schemas';

// TypeScript型 (コンパイル時)
const prototype: NormalizedPrototype = {
    id: 1,
    status: 1, // TypeScriptがチェック
    // ...
};

// Zodスキーマ (ランタイム)
const result = normalizedPrototypeSchema.safeParse(externalData);
if (result.success) {
    // result.data は NormalizedPrototype 型
    const validated: NormalizedPrototype = result.data;
}
```

## ⚙️ 技術スタック

- **Zod**: ランタイムスキーマ検証
- **TypeScript**: 型推論とコンパイル時チェック
- **exactOptionalPropertyTypes**: 厳密なオプショナル型

## 🔍 なぜ `lib/types` と分離?

| 側面           | `lib/types`            | `lib/schemas`    |
| -------------- | ---------------------- | ---------------- |
| 目的           | コンパイル時の型安全性 | ランタイム検証   |
| 実行環境       | ビルド時のみ           | ブラウザ/Node.js |
| バンドルサイズ | 0 (型情報は削除される) | Zod依存          |
| 用途           | 内部コード             | 外部データ検証   |

両方を組み合わせることで、完全な型安全性を実現しています。
