---
lang: ja
title: Project Philosophy
title-en: Project Philosophy
title-ja: プロジェクトの哲学
related:
    - ./index.md "Documentation Index"
    - ../README.md "Project Overview"
    - https://github.com/F88/promidas/blob/main/CONTRIBUTING.md "Contributing Guide"
instructions-for-ais:
    - This document should be written in Japanese.
    - Use half-width characters for numbers, letters, and symbols.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document.
---

# PROMIDAS プロジェクトの哲学

このドキュメントでは、PROMIDASの設計原則と開発哲学について説明します。

## 📖 目次

- [モジュラー設計](#モジュラー設計)
- [段階的な複雑性](#段階的な複雑性)
- [型安全性優先](#型安全性優先)
- [パフォーマンスと実用性のバランス](#パフォーマンスと実用性のバランス)
- [セキュリティ意識](#セキュリティ意識)
- [独立性と再利用性](#独立性と再利用性)

## モジュラー設計

PROMIDASは、すべてのユースケースをカバーする単一の巨大なAPIを提供することを意図していません。むしろ、**独立したモジュール**を組み合わせて使えるように設計されています。

### コアモジュール

```
types     → 型定義(全モジュールで共有)
utils     → ユーティリティ関数(単独で使える)
logger    → ロギングインターフェース(カスタマイズ可能)
store     → In-memoryストレージ(独立して使える)
fetcher   → APIクライアント(独立して使える)
repository → 統合モジュール(store + fetcher)
```

各モジュールは**独立して動作**し、必要な部分だけをimportできます:

```typescript
// 型定義のみ使用
import type { NormalizedPrototype } from '@f88/promidas/types';

// ユーティリティ関数のみ使用
import { parseProtoPediaTimestamp } from '@f88/promidas/utils';

// Storeのみ使用(独自のフェッチャーと組み合わせる)
import { PrototypeInMemoryStore } from '@f88/promidas/store';

// 統合されたRepository使用(最も簡単)
import { createPromidasForLocal } from '@f88/promidas';
```

### なぜモジュラー設計か

1. **必要な機能だけを使える** - バンドルサイズの最適化
2. **独自の実装と組み合わせ可能** - 柔軟性の確保
3. **長期的な保守性** - 各モジュールが独立して進化できる
4. **テスト容易性** - モジュール単位でテスト可能

## 段階的な複雑性

PROMIDASは、ユーザーの習熟度に応じて**段階的に複雑さを導入**する設計です。

### レベル1: シンプルなFactory関数

初心者や簡単なユースケース向け:

```typescript
import { createPromidasForLocal } from '@f88/promidas';

const repo = createPromidasForLocal({
    protopediaApiToken: process.env.PROTOPEDIA_API_V2_TOKEN,
});
```

- 1行で完結
- 環境別の最適化設定 (local / server)
- すぐに使い始められる

### レベル2: Builderパターン

複雑な設定や段階的な構成が必要な場合:

```typescript
const repo = new PromidasRepositoryBuilder()
    .setDefaultLogLevel('debug')
    .setStoreConfig({ ttlMs: 30 * 60 * 1000 })
    .setApiClientConfig({
        protoPediaApiClientOptions: {
            token: process.env.PROTOPEDIA_API_V2_TOKEN,
        },
    })
    .build();
```

- 段階的に設定を追加
- 条件分岐が簡単
- 共有Loggerの自動管理

### レベル3: 個別モジュールの組み合わせ

高度なカスタマイズが必要な場合:

```typescript
import { PrototypeInMemoryStore } from '@f88/promidas/store';
import { ProtopediaApiCustomClient } from '@f88/promidas/fetcher';

// 独自の組み合わせ
const store = new PrototypeInMemoryStore({ ttlMs: 60 * 60 * 1000 });
const client = new ProtopediaApiCustomClient({ token: myToken });
```

### 設計原則

- **簡単なことは簡単に** - Factory関数で即座に使える
- **複雑なことも可能に** - Builderや個別モジュールで柔軟に対応
- **強制しない** - ユーザーが自分のレベルを選べる

## 型安全性優先

PROMIDASは**TypeScriptファースト**の設計です。実行時エラーではなく、型エラーで問題を防ぎます。

### 完全な型サポート

```typescript
import { createPromidasForLocal } from '@f88/promidas';

// 型推論が効く
const repo = createPromidasForLocal({
    protopediaApiToken: process.env.PROTOPEDIA_API_V2_TOKEN,
});

const data = await repo.getAllFromSnapshot(); // readonly NormalizedPrototype[]
const byId = await repo.getPrototypeFromSnapshotByPrototypeId(123); // NormalizedPrototype | null

// 型エラーで防げる
repo.setupSnapshot({ limit: 'abc' }); // ❌ 型エラー
```

### Result型パターン

エラーハンドリングも型安全:

```typescript
const result = await repo.setupSnapshot({ limit: 1000 });

if (result.ok) {
    console.log('Success:', result.data);
} else {
    console.error('Error:', result.error); // 型推論される
}
```

### 設計原則

- **実行時エラーより型エラー** - コンパイル時に問題を発見
- **型推論の活用** - 明示的な型注釈を最小限に
- **null安全性** - `undefined`の明示的な扱い

## パフォーマンスと実用性のバランス

PROMIDASは、パフォーマンスを重視しつつ、**実用性とのバランス**を取ります。

### O(1)検索

IDベースの検索は内部インデックスによりO(1):

```typescript
// 高速 - O(1)
const prototype = await repo.getPrototypeFromSnapshotByPrototypeId(123);
```

### メモリ効率

TTLによる自動データ更新とメモリ管理:

```typescript
import { PromidasRepositoryBuilder } from '@f88/promidas';

const repo = new PromidasRepositoryBuilder()
    .setStoreConfig({
        ttlMs: 30 * 60 * 1000, // 30分で期限切れ
        maxDataSizeBytes: 10 * 1024 * 1024, // 10MB制限
    })
    .setApiClientConfig({
        protoPediaApiClientOptions: {
            token: process.env.PROTOPEDIA_API_V2_TOKEN,
        },
    })
    .build();
```

### 実用的な選択

- **JavaScriptでの実装** - Rust等ではなくJavaScript/TypeScript
- **柔軟性の確保** - 極限のパフォーマンスより、カスタマイズ性を優先
- **段階的な最適化** - 必要な箇所のみ最適化

### 設計原則

- **十分に速い** - ほとんどのユースケースで問題ないパフォーマンス
- **測定してから最適化** - 推測ではなく実測に基づく最適化
- **ユーザー体験優先** - APIの使いやすさを犠牲にしない

## セキュリティ意識

PROMIDASは、特に**BEARER TOKENのセキュリティ**を重視します。

### 初心者への配慮

ドキュメントでセキュリティリスクを**繰り返し警告**:

- [ユースケース](./usecase.md)で実行場所の重要性を説明
- [Getting Started](./getting-started.md)でTOKENの危険性を説明
- ローカル実行(安全)から始める学習パスを推奨

### 安全なデフォルト

```typescript
import { createPromidasForLocal } from '@f88/promidas';

// ✅ TOKENをハードコードしない設計
const repo = createPromidasForLocal({
    protopediaApiToken: process.env.PROTOPEDIA_API_V2_TOKEN, // 環境変数推奨
});
```

### サーバー実行への警告

[サーバー実行向けドキュメント](./usecase-webapp.md)で明確に警告:

- フロントエンドでTOKENを使わない
- バックエンドでのみ使用する
- セキュリティ知識が必須

### 設計原則

- **セキュアバイデフォルト** - 安全な使い方を促す
- **教育的ドキュメント** - なぜ危険か、どう使うべきかを説明
- **初心者保護** - API初心者が誤って危険な使い方をしないように

## 独立性と再利用性

PROMIDASの各モジュールは**独立して使える**ように設計されています。

### モジュールの独立性

```typescript
// Utilsだけ使う
import { parseProtoPediaTimestamp } from '@f88/promidas/utils';

// Storeだけ使う(独自のフェッチャーと組み合わせ)
import { PrototypeInMemoryStore } from '@f88/promidas/store';

// Fetcherだけ使う(独自のストレージと組み合わせ)
import { ProtopediaApiCustomClient } from '@f88/promidas/fetcher';
```

### 他プロジェクトからの抽出

PROMIDAS自体が[mugen-protopedia](https://github.com/F88/mugen-protopedia)から抽出された再利用可能なライブラリです:

- 特定のアプリケーションに依存しない
- 汎用的なデータ管理機能
- 他のProtoPediaプロジェクトでも使える

### 設計原則

- **疎結合** - モジュール間の依存を最小限に
- **高凝集** - 各モジュールは明確な責務を持つ
- **再利用性** - 他プロジェクトでも使えるように

## まとめ

PROMIDASの哲学は以下の原則に基づいています:

1. **モジュラー設計** - 小さなコア、組み合わせで拡張
2. **段階的な複雑性** - 簡単なことは簡単に、複雑なことも可能に
3. **型安全性優先** - 実行時エラーより型エラーで防ぐ
4. **バランス重視** - パフォーマンスと実用性のバランス
5. **セキュリティ意識** - 初心者がセキュアに使える設計
6. **独立性** - 各モジュールが独立して動作

これらの原則は、長期的な保守性、使いやすさ、安全性を確保するために設計されています。

## 関連ドキュメント

- **[ドキュメント一覧](./index.md)** - すべてのドキュメント
- **[Contributing Guide](https://github.com/F88/promidas/blob/main/CONTRIBUTING.md)** - プロジェクトへの貢献
- **[Design Documents](https://github.com/F88/promidas/blob/main/lib/repository/docs/DESIGN.md)** - 詳細な設計ドキュメント

## ライセンス

MIT License - 詳細は[LICENSE](https://github.com/F88/promidas/blob/main/LICENSE)を参照してください。
