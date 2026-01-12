---
lang: ja
title: Schemas Usage
title-en: Schemas Usage
title-ja: スキーマ使用ガイド
related:
    - ../README.md "Schemas Overview"
    - DESIGN.md "Schemas Design"
instructions-for-ais:
    - This document should be written in Japanese.
    - Use half-width characters for numbers, letters, and symbols.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document.
---

# Schemas Usage

このドキュメントでは、`lib/schemas` モジュールの実践的な使用方法を説明します。

## 目次

- [基本的な使い方](#基本的な使い方)
- [エラーハンドリング](#エラーハンドリング)
- [実践的なパターン](#実践的なパターン)
- [他モジュールとの組み合わせ](#他モジュールとの組み合わせ)
- [トラブルシューティング](#トラブルシューティング)

## 基本的な使い方

### インポート

```typescript
// Zodスキーマをインポート
import { normalizedPrototypeSchema } from '@f88/promidas/schemas';

// 型定義も必要な場合
import type { NormalizedPrototype } from '@f88/promidas/types';
```

### 基本的な検証

```typescript
import { normalizedPrototypeSchema } from '@f88/promidas/schemas';

const data = {
    id: 1,
    prototypeNm: 'テストプロトタイプ',
    status: 1,
    releaseFlg: 2,
    // ... その他のフィールド
};

// 検証実行
const result = normalizedPrototypeSchema.safeParse(data);

if (result.success) {
    // 検証成功 - データは NormalizedPrototype 型
    console.log('Valid prototype:', result.data);
} else {
    // 検証失敗 - エラー詳細を取得
    console.error('Validation failed:', result.error);
}
```

### `.parse()` vs `.safeParse()`

```typescript
// safeParse: エラーを返す (推奨)
const result = normalizedPrototypeSchema.safeParse(data);
if (!result.success) {
    // エラー処理
    handleError(result.error);
}

// parse: 例外を投げる (try-catch が必要)
try {
    const validated = normalizedPrototypeSchema.parse(data);
    console.log(validated);
} catch (error) {
    // ZodError がスローされる
    console.error(error);
}
```

**推奨**: 通常は `.safeParse()` を使用してください。例外処理よりも型安全です。

## エラーハンドリング

### エラー情報の取得

```typescript
const result = normalizedPrototypeSchema.safeParse(invalidData);

if (!result.success) {
    // エラー詳細を取得
    const errors = result.error.issues;

    errors.forEach((issue) => {
        console.log('Field:', issue.path.join('.'));
        console.log('Error:', issue.message);
        console.log('Code:', issue.code);
    });
}
```

### カスタムエラーメッセージ

```typescript
import { z } from 'zod';

const customSchema = z.object({
    status: z
        .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)])
        .refine((val) => [1, 2, 3, 4].includes(val), {
            message:
                'status は 1(アイデア), 2(開発中), 3(完成), 4(供養) のいずれかである必要があります',
        }),
});
```

### ユーザーフレンドリーなエラー表示

```typescript
function formatValidationError(error: z.ZodError): string {
    return error.issues
        .map((issue) => {
            const field = issue.path.join('.');
            const message = issue.message;
            return `- ${field}: ${message}`;
        })
        .join('\n');
}

const result = normalizedPrototypeSchema.safeParse(data);
if (!result.success) {
    const errorMessage = formatValidationError(result.error);
    console.error('検証エラー:\n' + errorMessage);
}
```

## 実践的なパターン

### 1. JSONファイルからのインポート

```typescript
import fs from 'fs/promises';
import { normalizedPrototypeSchema } from '@f88/promidas/schemas';

async function loadPrototypesFromFile(filePath: string) {
    // ファイル読み込み
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);

    // 各プロトタイプを検証
    const validated = data.prototypes.map((proto: unknown, index: number) => {
        const result = normalizedPrototypeSchema.safeParse(proto);

        if (!result.success) {
            throw new Error(
                `Prototype ${index} validation failed: ${result.error.message}`,
            );
        }

        return result.data;
    });

    return validated;
}
```

### 2. 配列の一括検証

```typescript
import { z } from 'zod';
import { normalizedPrototypeSchema } from '@f88/promidas/schemas';

// 配列スキーマを定義
const prototypesArraySchema = z.array(normalizedPrototypeSchema);

function validatePrototypesArray(data: unknown) {
    const result = prototypesArraySchema.safeParse(data);

    if (!result.success) {
        // どのインデックスで失敗したかを特定
        const firstError = result.error.issues[0];
        const index = firstError.path[0];
        console.error(`Prototype at index ${index} is invalid`);
        return null;
    }

    return result.data;
}
```

### 3. 部分的な検証

```typescript
import { normalizedPrototypeSchema } from '@f88/promidas/schemas';

// 一部のフィールドのみ検証
const partialSchema = normalizedPrototypeSchema.pick({
    id: true,
    prototypeNm: true,
    status: true,
});

const result = partialSchema.safeParse({
    id: 1,
    prototypeNm: 'Test',
    status: 1,
    // その他のフィールドは無視される
});
```

### 4. デフォルト値の設定

```typescript
import { z } from 'zod';
import { normalizedPrototypeSchema } from '@f88/promidas/schemas';

// オプショナルフィールドにデフォルト値を設定
const schemaWithDefaults = normalizedPrototypeSchema.extend({
    viewCount: z.number().int().default(0),
    goodCount: z.number().int().default(0),
    commentCount: z.number().int().default(0),
});

const result = schemaWithDefaults.parse({
    id: 1,
    // viewCount, goodCount, commentCount は自動的に 0 になる
    // ...
});
```

### 5. 変換(Transform)の追加

```typescript
import { z } from 'zod';

// 文字列の正規化を追加
const schemaWithTransform = normalizedPrototypeSchema.extend({
    prototypeNm: z.string().transform((s) => s.trim()),
    summary: z.string().transform((s) => s.trim()),
});

const result = schemaWithTransform.parse({
    prototypeNm: '  Test  ', // => 'Test'
    summary: '  Summary  ', // => 'Summary'
    // ...
});
```

## 他モジュールとの組み合わせ

### Repositoryでの使用

```typescript
import { normalizedPrototypeSchema } from '@f88/promidas/schemas';
import type { NormalizedPrototype } from '@f88/promidas/types';

class CustomRepository {
    async importSnapshot(data: unknown) {
        // スナップショット全体の検証
        const snapshotSchema = z.object({
            version: z.string(),
            prototypes: z.array(normalizedPrototypeSchema),
        });

        const result = snapshotSchema.safeParse(data);

        if (!result.success) {
            return { ok: false, error: result.error };
        }

        // 検証済みデータを使用
        await this.store.setAll(result.data.prototypes);
        return { ok: true };
    }
}
```

### Utilsでの使用

```typescript
import { normalizedPrototypeSchema } from '@f88/promidas/schemas';
import type { Logger } from '@f88/promidas/logger';

export function validatePrototype(
    data: unknown,
    logger?: Logger,
): { ok: true; data: NormalizedPrototype } | { ok: false; error: string } {
    const result = normalizedPrototypeSchema.safeParse(data);

    if (!result.success) {
        logger?.warn('Prototype validation failed', {
            errors: result.error.issues,
        });

        return {
            ok: false,
            error: result.error.issues
                .map((i) => `${i.path.join('.')}: ${i.message}`)
                .join('; '),
        };
    }

    logger?.debug('Prototype validated successfully', {
        id: result.data.id,
    });

    return { ok: true, data: result.data };
}
```

### Fetcherでの使用

```typescript
import { normalizedPrototypeSchema } from '@f88/promidas/schemas';

async function fetchAndValidate(url: string) {
    const response = await fetch(url);
    const data = await response.json();

    // APIレスポンスを検証
    const prototypes = data.prototypes
        .map((proto: unknown) => {
            const result = normalizedPrototypeSchema.safeParse(proto);

            if (!result.success) {
                console.warn('Skipping invalid prototype:', result.error);
                return null;
            }

            return result.data;
        })
        .filter(Boolean);

    return prototypes;
}
```

## トラブルシューティング

### よくあるエラー

#### 1. Invalid status code

```
Error: status must be 1, 2, 3, or 4
Received: 99
```

**原因**: `status` フィールドに許可されていない値が含まれている

**解決策**:

```typescript
// データソースを確認して正しい値に修正
const correctedData = {
    ...data,
    status: 1, // 1, 2, 3, 4 のいずれか
};
```

#### 2. Missing required field

```
Error: Required field 'id' is missing
```

**原因**: 必須フィールドが欠落している

**解決策**:

```typescript
// 必須フィールドをすべて含める
const completeData = {
    id: 1,
    prototypeNm: 'Name',
    createDate: '2025-01-01T00:00:00.000Z',
    // ... その他の必須フィールド
};
```

#### 3. Type mismatch

```
Error: Expected string, received number
Path: prototypeNm
```

**原因**: フィールドの型が間違っている

**解決策**:

```typescript
// 型を修正
const fixedData = {
    ...data,
    prototypeNm: String(data.prototypeNm), // 文字列に変換
};
```

### デバッグテクニック

#### 1. 詳細なエラーログ

```typescript
const result = normalizedPrototypeSchema.safeParse(data);

if (!result.success) {
    console.log('Validation errors:', JSON.stringify(result.error, null, 2));
}
```

#### 2. フィールドごとの検証

```typescript
// 問題のあるフィールドを特定
const fields = ['id', 'prototypeNm', 'status', 'releaseFlg'];

fields.forEach((field) => {
    const fieldSchema = normalizedPrototypeSchema.shape[field];
    const result = fieldSchema.safeParse(data[field]);

    if (!result.success) {
        console.log(`Field '${field}' validation failed:`, result.error);
    }
});
```

#### 3. スキーマの可視化

```typescript
// スキーマ構造を確認
console.log(normalizedPrototypeSchema.shape);
```

### パフォーマンス最適化

#### 大量データの検証

```typescript
// バッチ処理で検証
function validateInBatches(prototypes: unknown[], batchSize: number = 100) {
    const results = [];

    for (let i = 0; i < prototypes.length; i += batchSize) {
        const batch = prototypes.slice(i, i + batchSize);
        const validated = batch.map((p) =>
            normalizedPrototypeSchema.safeParse(p),
        );
        results.push(...validated);
    }

    return results;
}
```

#### キャッシュ戦略

```typescript
const validationCache = new Map<string, NormalizedPrototype>();

function validateWithCache(data: unknown) {
    const key = JSON.stringify(data);

    if (validationCache.has(key)) {
        return { ok: true, data: validationCache.get(key)! };
    }

    const result = normalizedPrototypeSchema.safeParse(data);

    if (result.success) {
        validationCache.set(key, result.data);
    }

    return result;
}
```

## 参考情報

### 関連ドキュメント

- [Zod公式ドキュメント](https://zod.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [設計思想](DESIGN.md)

### 型定義との対応

| スキーマフィールド | 型定義             | 制約              |
| ------------------ | ------------------ | ----------------- |
| `status`           | `StatusCode`       | `1\|2\|3\|4`      |
| `releaseFlg`       | `ReleaseFlagCode`  | `1\|2\|3`         |
| `licenseType`      | `LicenseTypeCode?` | `0\|1\|undefined` |
| `thanksFlg`        | `ThanksFlagCode?`  | `0\|1\|undefined` |
