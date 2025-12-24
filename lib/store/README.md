---
lang: ja
title: Store Module
title-en: Store Module
title-ja: ストアモジュール
related:
    - ../../../README.md "Project Overview"
    - docs/USAGE.md "Store Usage"
    - docs/DESIGN.md "Store Design"
instructions-for-ais:
    - This document should be written in Japanese.
    - Use half-width characters for numbers, letters, and symbols.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document.
---

# Store Module

データをメモリに保存・管理する低レベルなモジュールです。

## 📦 これは何?

プロトタイプのデータを配列としてメモリに保存します。
**通常は Repository モジュールを使ってください。** このモジュールは Repository の内部で使われています。

## 📥 インストールと使い方

このモジュールは単体でも使用できます:

```typescript
import {
    PrototypeInMemoryStore,
    type NormalizedPrototype,
} from '@f88/promidas/store';

// Result型も提供しています
import type { SetResult, SetSuccess, SetFailure } from '@f88/promidas/store';
```

**注意**: `PrototypeInMemoryStore`のメソッド(`setAll`など)は例外をthrowします。`SetResult`型は、Store操作の結果をResult型パターンで扱いたい場合に使用できます。

## 🚀 簡単な使い方

```typescript
import { PrototypeInMemoryStore } from '@f88/promidas/store';

// 1. ストアを作成
const store = new PrototypeInMemoryStore({
    ttlMs: 3600000, // データの有効期限 (1時間)
});

// 2. データを保存
store.setAll([
    { id: 1, prototypeNm: 'プロトタイプA' /* ... */ },
    { id: 2, prototypeNm: 'プロトタイプB' /* ... */ },
]);

// 3. データを取得
const data = store.getAll();
console.log(`${data.length} 件のデータ`);

// 4. データをクリア
store.clear();
```

## 📚 詳しく知りたい方へ

- **[使い方ガイド (USAGE.md)](./docs/USAGE.md)**: 詳しい使い方
- **[設計ドキュメント (DESIGN.md)](./docs/DESIGN.md)**: 技術的な詳細

## 💡 主な機能

### データの保存と取得

```typescript
// データを保存
store.setAll([
    { id: 1, prototypeNm: 'サンプル1' },
    { id: 2, prototypeNm: 'サンプル2' },
]);

// データを取得
const allData = store.getAll();
console.log(allData); // [{ id: 1, ... }, { id: 2, ... }]

// データがあるか確認
const hasData = store.size > 0;
console.log(hasData); // true
```

### データのクリア

```typescript
// すべてのデータを削除
store.clear();

console.log(store.size > 0); // false
console.log(store.getAll()); // []
```

### 有効期限 (TTL)

```typescript
import { PrototypeInMemoryStore } from '@f88/promidas/store';

// 30分で期限切れになるストア
const store = new PrototypeInMemoryStore({
    ttlMs: 30 * 60 * 1000, // ミリ秒単位
});

store.setAll([{ id: 1, prototypeNm: 'データ' }]);

// 30分後...
console.log(store.isExpired()); // true (期限切れを検出)
```

## 🔗 関連モジュール

- [Repository](../repository/README.md) - このモジュールを使った高機能版
- [Fetcher](../fetcher/README.md) - データ取得
- [Utils](../utils/README.md) - データ変換

## 🎯 Repository との違い

| 機能       | Store           | Repository |
| ---------- | --------------- | ---------- |
| データ保存 | ✅              | ✅         |
| データ検索 | ❌              | ✅         |
| API連携    | ❌              | ✅         |
| 自動更新   | ❌              | ✅         |
| 統計情報   | ⚠️ 基本的なもの | ✅ 詳細    |

**おすすめ**: ほとんどの場合、Repository を使う方が便利です!

## 📝 実用例

### 基本的な使い方

```typescript
import { PrototypeInMemoryStore } from '@f88/promidas/store';
import type { NormalizedPrototype } from '@f88/promidas/types';

const store = new PrototypeInMemoryStore({ ttlMs: 3600000 });

// データを保存
const prototypes: NormalizedPrototype[] = [
    { id: 1, prototypeNm: 'プロトA', status: 3 /* ... */ },
    { id: 2, prototypeNm: 'プロトB', status: 1 /* ... */ },
];
store.setAll(prototypes);

// データを取得して検索 (手動)
const completed = store.getAll().filter((p) => p.status === 3);
console.log(completed); // [{ id: 1, prototypeNm: 'プロトA', ... }]
```

### TTL の活用

```typescript
const store = new PrototypeInMemoryStore({
    ttlMs: 60 * 60 * 1000, // 1時間
});

// データを保存
store.setAll(data);

// しばらく後...
if (store.has()) {
    console.log('データはまだ有効です');
    const cached = store.get();
} else {
    console.log('データの期限が切れました');
    // 再取得が必要
}
```

### Logger の設定

```typescript
import { createConsoleLogger } from '@f88/promidas/logger';

// デフォルト: infoレベルのコンソールlogger
const store1 = new PrototypeInMemoryStore({
    ttlMs: 3600000,
});

// errorレベルのみ出力
const store2 = new PrototypeInMemoryStore({
    ttlMs: 3600000,
    logger: createConsoleLogger(),
    logLevel: 'error',
});

// ログを完全に無効化
const store3 = new PrototypeInMemoryStore({
    ttlMs: 3600000,
    logger: createConsoleLogger(),
    logLevel: 'silent',
});
```

**Loggerのライフサイクル:**

- Loggerはストア作成時に設定され、その後変更できません
- 設定しない場合、`createConsoleLogger()`がデフォルトで使われます（logLevel: 'info'）
- Loggerは以下の操作時に使用されます:
    - ストアの初期化 (`info`)
    - スナップショットの更新 (`info`)
    - データサイズ制限超過時の警告 (`warn`)

詳しい設定方法は [USAGE.md](./docs/USAGE.md) を参照してください。

## ⚙️ 内部の仕組み

Store は非常にシンプルです:

1. データを配列として保存
2. タイムスタンプを記録
3. TTL を超えたら自動削除

```typescript
// 内部的にはこのような感じ
class Store {
    private data: Prototype[] = [];
    private timestamp: number = 0;

    set(newData: Prototype[]) {
        this.data = newData;
        this.timestamp = Date.now();
    }

    get(): Prototype[] {
        if (this.isExpired()) {
            this.clear();
            return [];
        }
        return this.data;
    }
}
```

## ⚠️ 注意点

- **検索機能なし**: 自分で `filter()` などを使う必要があります
- **API連携なし**: データの取得は自分で実装が必要
- **シンプルな設計**: 高度な機能が必要なら Repository を使いましょう

## 🤔 いつ Store を直接使うべき?

Store を直接使うのは、以下のような場合だけです:

- Repository の機能が不要
- カスタムなデータ管理が必要
- 他のフレームワークと統合したい

**それ以外の場合は [Repository](../repository/README.md) を使いましょう!**

---

**困ったときは**: [USAGE.md](./docs/USAGE.md) に詳しい説明があります
