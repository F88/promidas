---
lang: ja
title: Server Execution Use Cases
title-en: Server Execution Use Cases
title-ja: サーバー実行向けユースケース
related:
    - ./index.md "Use Cases Overview"
    - ./local.md "Local Execution Use Cases"
    - ../getting-started.md "Getting Started"
    - https://github.com/F88/promidas/blob/main/lib/repository/README.md "Repository Module"
instructions-for-ais:
    - This document should be written in Japanese.
    - Use half-width characters for numbers, letters, and symbols.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document.
---

# サーバー実行向けユースケース (Advanced)

⚠️ **上級者向けドキュメント**

このドキュメントは、Webアプリケーション開発やCI/CD統合など、高度な知識を必要とするユースケースのための**リソースマップ**です。

## 前提条件

サーバー実行を行う前に、以下のリスクと責任を完全に理解している必要があります。

- **[セキュリティガイドライン](../security.md)**: **BEARER TOKEN** の漏洩リスクとその対策を理解していること。
- **アーキテクチャ**: フロントエンドとバックエンドの境界、環境変数の扱いについて理解していること。

## 🗺️ 上級者向けリソースマップ

目的別に、読むべき詳細ドキュメント(各モジュールの設計書)を案内します。

### 1. Webアプリケーションへの組み込み

Webアプリ(Next.js API Route, Remix Loader, Express.jsなど)でPROMIDASを使用する場合。

- **Repositoryの基本実装パターン**
    - 👉 **[Repository Usage Guide](https://github.com/F88/promidas/blob/main/lib/repository/docs/USAGE.md)**
    - `createPromidasForServer()` の使用法、エラーハンドリング、シングルトンパターンの適用など。

- **データ更新とTTL管理**
    - 👉 **[Store Design Document](https://github.com/F88/promidas/blob/main/lib/store/docs/DESIGN.md)**
    - In-memoryキャッシュの挙動、TTL切れ時の自動更新ロジック、メモリ効率について。

### 2. 高度なカスタマイズ

デフォルトの設定では要件を満たせない場合。

- **通信のカスタマイズ (Retry, Timeout)**
    - 👉 **[Fetcher Design Document](https://github.com/F88/promidas/blob/main/lib/fetcher/docs/DESIGN.md)**
    - `ProtopediaApiCustomClient` を直接利用して、リトライ回数やタイムアウト時間を細かく制御する方法。

- **ログ出力の統合 (Pino, Winston)**
    - 👉 **[Logger Usage Guide](https://github.com/F88/promidas/blob/main/lib/logger/docs/USAGE.md)**
    - アプリケーション既存のロガー(Pino, Winstonなど)とPROMIDASのログ出力を統合する方法。`Logger` インターフェースの実装。

- **型定義とユーティリティ**
    - 👉 **[Utils Usage Guide](https://github.com/F88/promidas/blob/main/lib/utils/docs/USAGE.md)**
    - `NormalizedPrototype` 型の詳細、日付パース、ステータスコード変換などの低レイヤーユーティリティ。

### 3. CI/CDパイプライン

GitHub Actionsなどで定期的にデータを取得する場合。

- **CLIツールの作成**
    - 👉 **[Local Use Cases](./local.md)**
    - ローカル実行のノウハウはCI環境でもそのまま応用可能です。

## 実装のヒント

### 基本コード(Next.js App Router API Route例)

```typescript
import { createPromidasForServer } from '@f88/promidas';

// HMR (Hot Module Replacement) 対策: 開発環境でキャッシュがリセットされるのを防ぎます。
const globalForPromidas = global as unknown as {
  promidasRepo?: ReturnType<typeof createPromidasForServer>;
};

const repo = globalForPromidas.promidasRepo ?? createPromidasForServer();

if (process.env.NODE_ENV !== 'production') {
  globalForPromidas.promidasRepo = repo;
}

export async function GET() {
    // キャッシュがあれば即座に返す、なければAPI取得
    // TTL管理はRepository内部で自動的に行われる
    const setupResult = await repo.setupSnapshot({ limit: 1000 });

    if (!setupResult.ok) {
        return Response.json({ error: setupResult.error }, { status: 500 });
    }

    const data = await repo.getAllFromSnapshot();
    return Response.json(data);
}
```

### 環境変数の管理

サーバー実行では `.env` ファイルではなく、プラットフォームの環境変数設定機能を使用してください。

- **Vercel**: Project Settings > Environment Variables
- **GitHub Actions**: Settings > Secrets and variables > Actions
- **Docker**: `docker run -e PROTOPEDIA_API_V2_TOKEN=...`

## サポート

高度な技術的質問やアーキテクチャの相談は、GitHub Discussionsへどうぞ。

- **[GitHub Discussions](https://github.com/F88/promidas/discussions)**
