---
lang: ja
title: Types Module
title-en: Types Module
title-ja: 型定義モジュール
related:
    - ../../README.md "Project Overview"
instructions-for-ais:
    - This document should be written in Japanese.
    - Use half-width characters for numbers, letters, and symbols.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document.
---

# Types Module

ライブラリ全体で共有される型定義です。

## 📦 これは何?

ProtoPediaのデータを型安全に扱うための型定義を提供します。
全てのモジュール(Fetcher、Store、Repository)で共通して使用される標準的なデータ構造を定義しています。

## 🚀 使い方

```typescript
import type { NormalizedPrototype } from '@f88/promidas/types';

// 正規化されたプロトタイプデータの型
const prototype: NormalizedPrototype = {
    id: 1,
    prototypeNm: 'サンプルプロトタイプ',
    createDate: '2025-12-12T00:00:00.000Z',
    updateDate: '2025-12-12T01:00:00.000Z',
    status: 1,
    releaseFlg: 2,
    summary: '説明文',
    freeComment: 'コメント',
    systemDescription: 'システム説明',
    teamNm: 'チーム名',
    mainUrl: 'https://example.com/image.jpg',
    viewCount: 0,
    goodCount: 0,
    commentCount: 0,
    users: ['user1', 'user2'],
    tags: ['IoT', 'AI'],
    materials: [],
    events: [],
    awards: [],
    revision: 0,
    licenseType: 1,
    thanksFlg: 0,
};
```

## 📘 主な型定義

### NormalizedPrototype

ProtoPediaプロトタイプの標準化されたデータ構造です。

**特徴**:

- **型安全**: 必須フィールドとオプショナルフィールドが明確に区別されています
- **正規化済み**: パイプ区切り文字列(`tag1|tag2`)は配列(`['tag1', 'tag2']`)に変換されています
- **UTC変換済み**: タイムスタンプはJST → UTC ISO 8601形式に変換されています
- **exactOptionalPropertyTypes対応**: TypeScriptの厳密な型チェックに対応しています

**フィールド構成**:

```typescript
{
  // 必須フィールド
  id: number;
  createDate: string;         // ISO 8601 UTC
  status: number;
  prototypeNm: string;
  mainUrl: string;
  viewCount: number;
  goodCount: number;
  commentCount: number;
  users: string[];            // パイプ区切り → 配列
  tags: string[];             // パイプ区切り → 配列
  // ... その他多数

  // オプショナルフィールド
  releaseDate?: string;       // ISO 8601 UTC
  createId?: number;
  updateId?: number;
  officialLink?: string;
  // ... その他
}
```

### 使用例

#### 型安全なデータアクセス

```typescript
import type { NormalizedPrototype } from '@f88/promidas/types';

function displayPrototype(prototype: NormalizedPrototype) {
    // 必須フィールドは常にアクセス可能
    console.log(prototype.id);
    console.log(prototype.prototypeNm);

    // 配列フィールドは型安全
    prototype.tags.forEach((tag) => {
        console.log(tag); // tag is string
    });

    // オプショナルフィールドはundefinedチェックが必要
    if (prototype.releaseDate !== undefined) {
        console.log(prototype.releaseDate); // string
    }
}
```

#### 型ガードとの組み合わせ

```typescript
import type { NormalizedPrototype } from '@f88/promidas/types';

function hasVideo(prototype: NormalizedPrototype): boolean {
    return prototype.videoUrl !== undefined;
}

function getVideoUrl(prototype: NormalizedPrototype): string | undefined {
    return prototype.videoUrl;
}
```

## 💡 データ変換について

この型は、ProtoPedia APIから取得した生データを正規化した後の形式です。

```typescript
// 生データ (UpstreamPrototype)
{
  tags: 'IoT|AI|ML',              // パイプ区切り文字列
  createDate: '2025-12-12 09:00:00.0'  // JST形式
}

// ↓ normalizePrototype() で変換

// 正規化後 (NormalizedPrototype)
{
  tags: ['IoT', 'AI', 'ML'],      // 配列
  createDate: '2025-12-12T00:00:00.000Z'  // UTC ISO 8601
}
```

変換処理の詳細は、[Fetcherモジュール](../fetcher/README.md)の`normalizePrototype`関数を参照してください。

## 🔗 関連モジュール

- [Fetcher](../fetcher/README.md) - この型を使ってデータを取得・正規化
- [Store](../store/README.md) - この型でデータを保存・管理
- [Repository](../repository/README.md) - この型を返すメソッドを提供
- [Utils](../utils/README.md) - この型に関連するユーティリティ関数

## 📚 詳細情報

型定義の詳細なドキュメントは、ソースコード内のTSDocコメントを参照してください:

- `lib/types/normalized-prototype.ts` - フィールド定義と説明
- `lib/types/index.ts` - モジュールの概要

---

**Note**: このモジュールは型定義のみを提供します。実行時のロジックは含まれません。
