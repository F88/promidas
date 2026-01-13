---
lang: ja
title: Types
title-en: Types
title-ja: 型定義
instructions-for-ais:
    - This document should be written in Japanese.
    - Use half-width characters for numbers, letters, and symbols.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document
---

# Types (型定義)

`lib/types` は、PROMIDAS全体で共有されるTypeScript型定義を提供するモジュールです。
コンパイル時の型安全性を確保し、IDEでの補完やリファクタリングを容易にします。

## 役割

Types モジュールは以下の役割を担います:

1. **コンパイル時型チェック**: TypeScriptコンパイラによる静的型検証
2. **共通データ構造の定義**: 全モジュールで使用される`NormalizedPrototype`など
3. **コード値の型安全性**: `StatusCode`、`LicenseCode`などのリテラル型

## 主な型定義

### `NormalizedPrototype`

ProtoPediaのプロトタイプデータを正規化した型定義です。

```typescript
import type { NormalizedPrototype } from '@f88/promidas/types';

const prototype: NormalizedPrototype = {
    prototypeId: 123,
    uuid: 'abc-def-123',
    prototypeStatus: 2,
    title: 'Sample Project',
    // ... その他のフィールド
};
```

### `StatusCode`

プロトタイプのステータスを表すリテラル型です。

```typescript
import type { StatusCode } from '@f88/promidas/types';

const status: StatusCode = 1; // 1 | 2 | 3 | 4 のみ許可
```

### `LicenseCode`

ライセンスコードを表すリテラル型です。

```typescript
import type { LicenseCode } from '@f88/promidas/types';

const license: LicenseCode = 1; // 1 | 2 | 3 | 4 | 5 のみ許可
```

## lib/schemas との関係

- **lib/types**: コンパイル時の型安全性 (TypeScript)
- **lib/schemas**: 実行時のバリデーション (Zod)

両者を組み合わせることで、完全な型安全性(compile-time + runtime)を実現します。

```typescript
import type { NormalizedPrototype } from '@f88/promidas/types';
import { normalizedPrototypeSchema } from '@f88/promidas/schemas';

// コンパイル時: TypeScriptが型をチェック
const data: NormalizedPrototype = fetchedData;

// 実行時: Zodが実際の値をバリデーション
const result = normalizedPrototypeSchema.safeParse(fetchedData);
if (result.success) {
    const validData: NormalizedPrototype = result.data;
}
```

## 詳細ドキュメント

より詳しい情報は、以下のドキュメントを参照してください:

- [README](https://github.com/F88/promidas/blob/main/lib/types/README.md) - モジュール概要
- [Usage Guide](https://github.com/F88/promidas/blob/main/lib/types/docs/USAGE.md) - 実用的な使い方
- [Design Document](https://github.com/F88/promidas/blob/main/lib/types/docs/DESIGN.md) - 設計思想と実装詳細
