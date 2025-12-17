---
lang: ja
title: Repository Factory
title-en: Repository Factory
title-ja: リポジトリファクトリー
instructions-for-ais:
    - This document should be written in Japanese.
    - Use half-width characters for numbers, letters, and symbols.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document
---

# Repository Factory (リポジトリ ファクトリー)

`Factory` は、Repository インスタンスを素早く簡単に作成するためのヘルパー関数群です。
一般的なユースケースに合わせて事前に最適化された設定を提供するため、多くのユーザーにとって推奨されるエントリーポイントです。

## 提供されているファクトリー関数

PROMIDAS は、実行環境に応じた2つのファクトリー関数を提供しています。

### 1. ローカル開発・スクリプト用 (`createPromidasForLocal`)

個人のPCでの開発、CLIツール、データ分析スクリプトなどに最適化されています。

```typescript
import { createPromidasForLocal } from '@f88/promidas';

const repository = createPromidasForLocal({
    protopediaApiToken: 'your-api-token',
});
```

**特徴:**

- **ログ**: `info` レベル(開発中の動作確認用)
- **TTL**: 30分(頻繁なAPIアクセスを避ける)
- **タイムアウト**: 90秒(不安定な回線でも動作するように長めに設定)

### 2. サーバー・本番環境用 (`createPromidasForServer`)

Webサーバー、バッチ処理、サーバーレス関数などのバックエンド環境に最適化されています。

```typescript
import { createPromidasForServer } from '@f88/promidas';

// トークンは環境変数 PROTOPEDIA_API_V2_TOKEN から自動読み込み
const repository = createPromidasForServer();
```

**特徴:**

- **ログ**: `warn` レベル(エラーと警告のみ、ログ量を抑制)
- **TTL**: 10分(メモリ効率を優先し、データ鮮度を保つ)
- **タイムアウト**: 30秒(サーバー間の高速な通信を想定)
- **トークン**: 環境変数 `PROTOPEDIA_API_V2_TOKEN` が必須

## 設定の比較

| 設定項目                     | `createPromidasForLocal` | `createPromidasForServer`            |
| :--------------------------- | :----------------------- | :----------------------------------- |
| **主な用途**                 | ローカル開発、CLIツール  | Webサーバー、バッチ処理              |
| **推奨トークン管理**         | 引数で渡す               | 環境変数 (`PROTOPEDIA_API_V2_TOKEN`) |
| **デフォルトログレベル**     | `info`                   | `warn`                               |
| **キャッシュ有効期限 (TTL)** | 30分                     | 10分                                 |
| **APIタイムアウト**          | 90秒                     | 30秒                                 |
| **User-Agent**               | `PromidasForLocal/...`   | `PromidasForServer/...`              |

## カスタマイズ

ファクトリー関数でも、ログレベルのオーバーライドなど最低限のカスタマイズは可能です。

```typescript
const repository = createPromidasForLocal({
    protopediaApiToken: '...',
    logLevel: 'debug', // 詳細なログを出力したい場合
});
```

これ以上の詳細な設定(例:TTLの変更、カスタムロガーの使用など)が必要な場合は、[Builder](./builder.md) パターンを使用してください。
