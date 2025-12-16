---
lang: ja
title: Getting Started
title-en: Getting Started
title-ja: はじめに
related:
    - ./usecase.md "Use Cases"
    - ./usecase-local.md "Local Execution Use Cases"
    - ../README.md "Project Overview"
instructions-for-ais:
    - This document should be written in Japanese.
    - Use half-width characters for numbers, letters, and symbols.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document.
---

# Getting Started

このドキュメントでは、PROMIDASを使い始めるための基本的な手順を説明します。

## 📖 目次

- [まず読んでください](#まず読んでください)
- [ProtoPedia API Ver 2.0について](#protopedia-api-ver-20について)
- [インストール](#インストール)
- [環境変数の設定](#環境変数の設定)
- [最初のコード例](#最初のコード例)
- [基本概念](#基本概念)
- [次のステップ](#次のステップ)

## まず読んでください

⚠️ **コードを書く前に、必ず[ユースケース](./usecase.md)を読んでください**

PROMIDASの使用には**BEARER TOKEN**が必要です。実行場所(ローカル/サーバー)によってセキュリティリスクが大きく異なるため、自分の用途に合った使い方を理解することが重要です。

**特にAPI初心者の方は、[ユースケース](./usecase.md)の「実行場所とセキュリティ」セクションを必ず読んでください。**

## ProtoPedia API Ver 2.0について

### ProtoPedia APIとは

[ProtoPedia](https://protopedia.net/)は、メイカーやIoTプロジェクトを共有するプラットフォームです。PROMIDASは、ProtoPediaが提供するAPIからデータを取得し、使いやすい形式に変換してメモリ上に保持します。

### BEARER TOKENとは

BEARER TOKENは、ProtoPedia APIを利用するための認証情報です。パスワードのように扱う必要がある重要な情報です。

**重要な特性:**

- このTOKENを持っている人は、あなたのアカウントでAPIを使用できます
- 他人に見られないよう厳重に管理する必要があります
- GitHubなどの公開リポジトリに絶対にコミットしてはいけません

### TOKENの取得方法

1. **ProtoPedia APIドキュメント**にアクセス:
    - **[ProtoPedia API Ver 2.0 · Apiary](https://protopediav2.docs.apiary.io/)**
    - ドキュメントに記載されている「Bearer Tokenの発行」セクションを参照

2. \*\*`APIトークン` を取得:

`作品・開発素材一覧 API` を使用するための `APIトークン`を取得してください。

⚠️ **PROMIDASが使用するのは `作品・開発素材一覧 API`の APIトークン です**。 `イベント作品 API` の APIトークン とは異なります。

### セキュリティの基礎

**ローカル実行(安全):**

- 自分のPC上でコードを実行する場合
- TOKENは環境変数や`.env`ファイルに保存
- PC内に閉じるため漏洩リスクなし

**サーバー実行(注意必要):**

- Webアプリやサーバー上でコードを実行する場合
- TOKENをフロントエンド(ブラウザ)に送ってはいけない
- バックエンド(サーバー)でのみTOKENを使用
- Secrets管理やサーバー環境変数を使用

**詳しくは以下をご覧ください:**

- **[セキュリティガイドライン](./security.md)**: TOKEN管理とセキュリティのベストプラクティス
- **[ユースケース](./usecase.md)**: 実行場所とセキュリティの基礎

## インストール

### 前提条件

- Node.js 18以上
- npm または yarn

### パッケージのインストール

```bash
npm install github:F88/promidas protopedia-api-v2-client
```

または yarn の場合:

```bash
yarn add github:F88/promidas protopedia-api-v2-client
```

## 環境変数の設定

### 方法1: 環境変数に直接設定 (シンプル)

```bash
export PROTOPEDIA_API_TOKEN="your-token-here"
```

### 方法2: .envファイルを使用 (推奨)

1. `dotenv`パッケージをインストール:

```bash
npm install dotenv
```

2. プロジェクトルートに`.env`ファイルを作成:

```properties
PROTOPEDIA_API_TOKEN=your-token-here
```

3. **重要**: `.gitignore`に`.env`を追加:

```docker
# .gitignore
.env
```

4. コードの冒頭で読み込み:

```typescript
import 'dotenv/config';
```

## 最初のコード例

### 最小限のコード (ローカル実行)

以下は、ProtoPediaデータを取得して表示する最もシンプルな例です:

**方法1: Factory関数 (推奨 - 初心者向け)**

```typescript
import 'dotenv/config';
import { createPromidasForLocal } from '@f88/promidas';

async function main() {
    // Repositoryの作成 (ローカル/開発環境向け設定)
    const repo = createPromidasForLocal({
        protopediaApiToken: process.env.PROTOPEDIA_API_TOKEN,
        logLevel: 'info', // optional
    });

    // データ取得
    console.log('Fetching data from ProtoPedia API...');
    const result = await repo.setupSnapshot({ limit: 100 });

    if (!result.ok) {
        console.error('Failed to fetch data:', result.error);
        process.exit(1);
    }

    // 全データ取得
    const allData = await repo.getAllFromSnapshot();
    console.log(`Total prototypes: ${allData.length}`);

    // ランダムに1つ表示
    const random = await repo.getRandomPrototypeFromSnapshot();
    if (random) {
        console.log(`\nRandom prototype:`);
        console.log(`  ID: ${random.prototypeId}`);
        console.log(`  Name: ${random.prototypeNm}`);
        console.log(`  Tags: ${random.tags.join(', ')}`);
    }
}

main().catch(console.error);
```

**方法2: Builder (高度な設定が必要な場合)**

```typescript
import 'dotenv/config';
import { PromidasRepositoryBuilder } from '@f88/promidas';

async function main() {
    // Builderを使った段階的な設定
    const repo = new PromidasRepositoryBuilder()
        .setDefaultLogLevel('info')
        .setApiClientConfig({
            protoPediaApiClientOptions: {
                token: process.env.PROTOPEDIA_API_TOKEN,
            },
        })
        .build();

    // 以降は同じ
    const result = await repo.setupSnapshot({ limit: 100 });
    // ...
}

main().catch(console.error);
```

### 実行方法

```bash
npx tsx your-script.ts
```

または、TypeScriptをコンパイルしてから実行:

```bash
npx tsc your-script.ts
node your-script.js
```

## 基本概念

### Factory関数 (推奨 - 初心者向け)

**Factory関数**は、環境に応じて最適な設定で簡単にRepositoryを作成できる関数です。

#### 1. `createPromidasForLocal()` - ローカル/開発環境向け

**特徴:**
- デバッグ情報を含む詳細なログ (default: `'info'`)
- 長いTTL (30分) - 開発中のキャッシュ維持
- 90秒タイムアウト - 低速回線対応 (1-2 Mbps)
- トークンを引数で受け取る (環境変数から読み込んでコードで指定)

```typescript
import { createPromidasForLocal } from '@f88/promidas';

const repo = createPromidasForLocal({
    protopediaApiToken: process.env.PROTOPEDIA_API_TOKEN,
    logLevel: 'info', // optional, default: 'info'
});
```

**推奨用途:**
- ローカルでのデータ分析スクリプト
- 開発中のアプリケーション
- 静的サイト生成 (ビルド時)

#### 2. `createPromidasForServer()` - サーバー/本番環境向け

**特徴:**
- 最小限のログ (default: `'warn'`) - エラーと警告のみ
- 短いTTL (10分) - メモリ効率優先
- 30秒タイムアウト - サーバーグレード回線想定
- 環境変数から自動取得 (`PROTOPEDIA_API_V2_TOKEN` required)

```typescript
import { createPromidasForServer } from '@f88/promidas';

// 環境変数 PROTOPEDIA_API_V2_TOKEN が必須
const repo = createPromidasForServer({
    logLevel: 'warn', // optional, default: 'warn'
});
```

**推奨用途:**
- Webアプリケーションのバックエンド
- サーバーサイドAPI
- 本番環境での長時間稼働

**セキュリティ上の利点:**
- トークンをコードに書かない
- 環境変数が設定されていない場合はエラーをthrow (早期検出)

### Builderパターン (高度な設定が必要な場合)

**推奨**: 複雑な設定、段階的な構成、条件分岐が必要な場合

```typescript
import { PromidasRepositoryBuilder } from '@f88/promidas';

const repo = new PromidasRepositoryBuilder()
    .setDefaultLogLevel('debug')
    .setStoreConfig({ ttlMs: 30 * 60 * 1000 })
    .setApiClientConfig({
        protoPediaApiClientOptions: { token: process.env.PROTOPEDIA_API_TOKEN },
    })
    .build();
```

**メリット:**

- 設定を段階的に追加できる
- 条件分岐が簡単
- 共有Loggerパターンでメモリ効率向上
- ログレベルの優先順位管理

### どちらを使うべきか?

| 状況 | 推奨 |
|------|------|
| 初めてPROMIDASを使う | `createPromidasForLocal()` |
| ローカルスクリプト | `createPromidasForLocal()` |
| サーバーアプリケーション | `createPromidasForServer()` |
| 複雑な設定が必要 | `PromidasRepositoryBuilder` |
| 条件付き設定 | `PromidasRepositoryBuilder` |
| カスタムLogger使用 | `PromidasRepositoryBuilder` |

### Snapshot (スナップショット)

**Snapshot**とは、ある時点でのProtoPediaデータの完全なコピーです。メモリ上に保持され、高速にアクセスできます。

```typescript
// Snapshotの作成
await repo.setupSnapshot({ limit: 1000 });

// Snapshotからデータ取得
const allData = await repo.getAllFromSnapshot();
const byId = await repo.getPrototypeFromSnapshotById(123);
const random = await repo.getRandomPrototypeFromSnapshot();
```

**特徴:**

- O(1)での高速検索 (IDベース)
- メモリ上に保持
- TTL (有効期限) 管理

### TTL (Time To Live)

**TTL**は、Snapshotの有効期限です。TTLが切れると、次回アクセス時に自動的にAPIから最新データを取得します。

```typescript
const repo = createPromidasRepository({
    storeConfig: {
        ttlMs: 30 * 60 * 1000, // 30分間有効
    },
});
```

**用途別のTTL設定:**

- **データ分析スクリプト** (1回実行): TTL不要、または長めに設定
- **定期実行スクリプト**: 実行間隔より短く設定
- **Webアプリケーション**: データ更新頻度に応じて設定 (例: 30分)

### データ更新戦略

Snapshotを更新する方法は3つあります:

#### 1. 起動時のみ更新 (推奨: ローカルスクリプト)

```typescript
// スクリプト開始時に1回だけ取得
await repo.setupSnapshot({ limit: 1000 });

// 以降はメモリ内のデータを使用
const data = await repo.getAllFromSnapshot();
```

#### 2. TTLベース自動更新 (推奨: 長時間稼働アプリ)

```typescript
// TTLを設定
const repo = createPromidasRepository({
    storeConfig: { ttlMs: 30 * 60 * 1000 }, // 30分
});

// 初回取得
await repo.setupSnapshot();

// TTL切れ時に自動的に再取得される
const data = await repo.getAllFromSnapshot();
```

#### 3. 手動更新 (推奨: 明示的な制御が必要な場合)

```typescript
// 必要なタイミングで明示的に更新
await repo.refreshSnapshot();
```

### Stats (統計情報)

Snapshotの状態を確認できます:

```typescript
const stats = repo.getStats();
console.log(`Size: ${stats.size}`);
console.log(`Is expired: ${stats.isExpired}`);
console.log(`Last updated: ${stats.lastUpdatedAt}`);
console.log(`Expires at: ${stats.expiresAt}`);
```

## 次のステップ

### ローカル実行を試す

まずは安全なローカル実行から始めましょう:

1. **[ローカル実行向けユースケース](./usecase-local.md)**を読む
2. サンプルコードを試す
3. 自分の用途に合わせてカスタマイズ

### より詳しく学ぶ

- **[Repository Module README](https://github.com/F88/promidas/blob/main/lib/repository/README.md)**: Repository APIの詳細
- **[Repository Usage Guide](https://github.com/F88/promidas/blob/main/lib/repository/docs/USAGE.md)**: 実装パターンとサンプルコード
- **[Repository Design Document](https://github.com/F88/promidas/blob/main/lib/repository/docs/DESIGN.md)**: 内部アーキテクチャと設計思想

### Webアプリ開発へ進む場合

**重要**: Webアプリ開発に進む前に、以下を必ず理解してください:

1. [ユースケース](./usecase.md)の「実行場所とセキュリティ」
2. [ローカル実行](./usecase-local.md)での基礎知識
3. セキュリティとTOKEN管理の基本

その後、[サーバー実行向けユースケース](./usecase-webapp.md)へ進んでください。

## サポート

困ったときは:

- **[GitHub Issues](https://github.com/F88/promidas/issues)**: バグ報告・機能リクエスト
- **[GitHub Discussions](https://github.com/F88/promidas/discussions)**: 質問・議論
- **[ドキュメント一覧](./index.md)**: すべてのドキュメント

## ライセンス

MIT License - 詳細は[LICENSE](https://github.com/F88/promidas/blob/main/LICENSE)を参照してください。
