---
lang: ja
title: Server Execution Use Cases
title-en: Server Execution Use Cases
title-ja: サーバー実行向けユースケース
related:
    - ./USECASE.md "Use Cases Overview"
    - ./USECASE-LOCAL.md "Local Execution Use Cases"
    - ./GETTING-STARTED.md "Getting Started"
    - ../lib/repository/README.md "Repository Module"
instructions-for-ais:
    - This document should be written in Japanese.
    - Use half-width characters for numbers, letters, and symbols.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document.
---

# サーバー実行向けユースケース

⚠️ **このドキュメントは準備中です**

Webアプリケーション開発やCI/CD統合など、サーバー上でPROMIDASを実行するためのガイドを準備中です。

## 前提条件

このドキュメントを読む前に、以下を必ず理解してください:

1. **[ユースケース](./USECASE.md)** - 実行場所とセキュリティの基礎
2. **[Getting Started](./GETTING-STARTED.md)** - BEARER TOKENとAPIの基本
3. **[ローカル実行向けユースケース](./USECASE-LOCAL.md)** - PROMIDASの基本的な使い方

特に、**BEARER TOKENのセキュリティリスク**を理解せずにWebアプリ開発を始めることは危険です。

## セキュリティガイドライン

### TOKEN の特性（現状の観察に基づく推測）

⚠️ **重要**: 以下はProtoPedia API TOKENの形式や挙動、APIドキュメントの記載から推測した内容です。
公式の取り扱い指針がないため、実際の仕様や想定される用途は異なる可能性があります。

**観察される特徴:**

- 32文字の16進数文字列（例: `689a2c110c18fc10cd92f52206c15b29`）
- JWT等の署名付きトークンとは異なるシンプルな形式
- APIドキュメントに取り扱いに関する明確な記載なし
- おそらくユーザー識別と緊急時のTOKEN無効化が主な目的（推測）

**APIの操作範囲（ドキュメントより）:**

- 作品一覧の取得（GET）
- 開発素材一覧の取得（GET）
- **イベント作品の登録（POST）**
- **イベント作品の削除（DELETE）**

※ PROMIDASは読み取り操作のみをサポートしていますが、APIとしては書き込み操作も可能です。

**不明な点:**

- TOKEN漏洩時の影響範囲
- 有効期限の有無と期間
- 再発行ポリシー
- Rate Limitの詳細仕様
- アクセス可能なデータの範囲

### 推奨する安全な取り扱い

公式の取り扱い指針がなく、書き込み操作も可能なため、**慎重な対応**を推奨します。

#### 🔴 絶対に避けるべき

- **GitHubなど公開リポジトリへのコミット** - 永続的に公開、取り消し不可
- **ソースコードへのハードコード** - 第三者に容易に閲覧される

#### 🟡 慎重に判断すべき

**フロントエンド（ブラウザ）での使用**

潜在的なリスク:

- DevToolsでTOKENが確認可能
- 書き込み操作を含む不正使用の可能性
- Rate Limitへの影響（仕様不明）
- ユーザーデータへの影響範囲が不明

PROMIDASは読み取り専用ですが、TOKEN自体は書き込み可能なため注意が必要です。

許容される可能性がある場合:

- 短期間のデモ・プロトタイプ（限定的な用途）
- 影響範囲を理解した上での使用
- **本番環境では推奨しません**

```typescript
// 🟡 慎重に判断 - フロントエンドでの使用例
const repo = createPromidasRepository({
    apiClientOptions: {
        token: 'your-token-here', // DevToolsで確認可能
    },
});
```

#### 🟢 強く推奨する

**バックエンド（サーバー）での使用**

- TOKEN管理が容易
- 外部からアクセス不可
- ログ・監視が可能
- 書き込み操作を制御可能

```typescript
// ✅ 推奨 - バックエンドでのみ実行
// Next.js API Routes, Server Components, getServerSideProps等
export async function GET() {
    const repo = createPromidasRepository({
        apiClientOptions: {
            token: process.env.PROTOPEDIA_API_TOKEN, // サーバー環境変数
        },
    });

    const data = await repo.getAllFromSnapshot();
    return Response.json(data);
}
```

### 判断の指針

1. **デモサイト・学習目的**: リスクを理解した上で自己判断
2. **個人プロジェクト**: 可能な限りバックエンドでの使用を推奨
3. **本番サービス**: バックエンドでの使用を強く推奨
4. **不明な場合**: 安全側（バックエンド）を選択
5. **書き込み操作を使用する場合**: 必ずバックエンドで実装

### PROMIDASの対応範囲

PROMIDASは`GET https://protopedia.net/v2/api/prototype/list`（作品一覧取得）**のみ**をサポートしています。

他のProtoPedia APIエンドポイント（作品一覧TSV取得、開発素材一覧取得、イベント作品の登録/削除等）は、PROMIDASの対応範囲外です。

## 準備中の内容

以下の内容を準備中です:

- [ ] Webアプリケーション開発パターン
- [ ] Next.js統合ガイド
- [ ] Remix統合ガイド
- [ ] CI/CD統合 (GitHub Actions等)
- [ ] TOKEN管理のベストプラクティス
- [ ] エラーハンドリングとリトライ戦略
- [ ] パフォーマンス最適化
- [ ] 監視とロギング

## 典型的なユースケース

### SPA (Single Page Application)

TBD

### サーバーサイドAPI

TBD

### バックグラウンドワーカー

TBD

## データ更新戦略

### 起動時のみ更新

TBD

### 定期的な更新

TBD

### TTL監視による自動更新

TBD

## エラーハンドリング詳細

### ネットワークエラー

TBD

### リトライ戦略

TBD

### 監視とアラート

TBD

## パフォーマンス最適化

### 推奨データ量

TBD

### メモリ管理

TBD

### 並行制御

TBD

## フレームワーク統合例

### Next.js統合

TBD

### Remix統合

TBD

## 暫定的なガイドライン

### TOKEN管理

**GitHub Actions:**

```yaml
# .github/workflows/fetch-data.yml
env:
    PROTOPEDIA_API_TOKEN: ${{ secrets.PROTOPEDIA_API_TOKEN }}
```

**Vercel:**

```bash
# Environment Variables設定でTOKENを追加
PROTOPEDIA_API_TOKEN=your-token-here
```

**Docker:**

```bash
docker run -e PROTOPEDIA_API_TOKEN=your-token-here your-image
```

### TTL設定

サーバー実行では、データ更新頻度に応じてTTLを設定してください:

```typescript
const repo = createPromidasRepository({
    storeConfig: {
        ttlMs: 30 * 60 * 1000, // 30分ごとに更新
    },
    apiClientOptions: {
        token: process.env.PROTOPEDIA_API_TOKEN,
    },
});
```

### エラーハンドリング

長時間稼働するアプリケーションでは、堅牢なエラーハンドリングが必要です:

```typescript
const result = await repo.setupSnapshot({ limit: 10000 });
if (!result.ok) {
    console.error('Failed to setup snapshot:', result.error);
    // リトライ戦略やフォールバック処理を実装
}
```

## さらに詳しく

より詳細な実装パターンは、以下のドキュメントを参照してください:

- **[Repository Usage Guide](../lib/repository/docs/USAGE.md)**: 実装パターンとサンプルコード
- **[Repository Design Document](../lib/repository/docs/DESIGN.md)**: 内部アーキテクチャ

## よくある質問

TBD

## チェックリスト

TBD

## サポート

質問や議論は:

- **[GitHub Issues](https://github.com/F88/promidas/issues)**: バグ報告・機能リクエスト
- **[GitHub Discussions](https://github.com/F88/promidas/discussions)**: 質問・議論

## ライセンス

MIT License - 詳細は[LICENSE](../LICENSE)を参照してください。
