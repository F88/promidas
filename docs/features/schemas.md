---
title: Schemas
instructions-for-ais:
    - This document should be written in Japanese.
    - Use half-width characters for numbers, letters, and symbols.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document
---

# Schemas (実行時検証スキーマ)

`lib/schemas` は、Zodを使用した実行時バリデーションスキーマを提供するモジュールです。
外部データ(APIレスポンス、ファイル、スナップショット)の妥当性を実行時にチェックします。

## 役割

Schemas モジュールは以下の役割を担います:

1. **実行時バリデーション**: 外部データが期待する形式に適合しているか検証
2. **型安全なパース**: バリデーション成功時に型付きデータを提供
3. **厳密なコード値チェック**: `status: 1|2|3|4`など、特定の値のみ許可

## 主なスキーマ

### `normalizedPrototypeSchema`

`NormalizedPrototype` 型のZodスキーマです。

```typescript
import { normalizedPrototypeSchema } from 'promidas/schemas';

// API レスポンスをバリデーション
const result = normalizedPrototypeSchema.safeParse(apiResponse);

if (result.success) {
    // 型安全なデータ (NormalizedPrototype)
    console.log(result.data.prototypeId);
} else {
    // エラー詳細
    console.error(result.error.issues);
}
```

## 使用例

### ファイルからの読み込み

```typescript
import { normalizedPrototypeSchema } from 'promidas/schemas';
import { readFileSync } from 'fs';

const fileContent = readFileSync('snapshot.json', 'utf-8');
const parsedData = JSON.parse(fileContent);

const result = normalizedPrototypeSchema.array().safeParse(parsedData);

if (result.success) {
    // バリデーション済みデータを使用
    const prototypes = result.data;
    console.log(`Loaded ${prototypes.length} prototypes`);
} else {
    console.error('Invalid snapshot format:', result.error.message);
}
```

### APIレスポンスの検証

```typescript
import { normalizedPrototypeSchema } from 'promidas/schemas';

async function fetchPrototype(id: number) {
    const response = await fetch(`/api/prototypes/${id}`);
    const data = await response.json();

    const result = normalizedPrototypeSchema.safeParse(data);

    if (!result.success) {
        throw new Error(`Invalid API response: ${result.error.message}`);
    }

    return result.data; // 型安全な NormalizedPrototype
}
```

## lib/types との関係

- **lib/types**: コンパイル時の型定義 (TypeScript)
- **lib/schemas**: 実行時の検証スキーマ (Zod)

両者は密接に連携し、完全な型安全性を提供します:

```typescript
import type { NormalizedPrototype } from 'promidas/types';
import { normalizedPrototypeSchema } from 'promidas/schemas';

// TypeScript: コンパイル時に型をチェック
function processPrototype(prototype: NormalizedPrototype) {
    console.log(prototype.title);
}

// Zod: 実行時に外部データを検証
const externalData = getDataFromAPI();
const result = normalizedPrototypeSchema.safeParse(externalData);

if (result.success) {
    processPrototype(result.data); // 型安全
}
```

## 詳細ドキュメント

より詳しい情報は、以下のドキュメントを参照してください:

- [README](https://github.com/F88/promidas/blob/main/lib/schemas/README.md) - モジュール概要
- [Usage Guide](https://github.com/F88/promidas/blob/main/lib/schemas/docs/USAGE.md) - 実用的な使い方
- [Design Document](https://github.com/F88/promidas/blob/main/lib/schemas/docs/DESIGN.md) - 設計思想と実装詳細
