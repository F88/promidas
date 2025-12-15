---
lang: ja
title: Server Execution Use Cases
title-en: Server Execution Use Cases
title-ja: サーバー実行向けユースケース
related:
    - ./usecase.md "Use Cases Overview"
    - ./usecase-local.md "Local Execution Use Cases"
    - ./getting-started.md "Getting Started"
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

1. **[ユースケース](./usecase.md)** - 実行場所とセキュリティの基礎
2. **[Getting Started](./getting-started.md)** - BEARER TOKENとAPIの基本
3. **[ローカル実行向けユースケース](./usecase-local.md)** - PROMIDASの基本的な使い方

特に、**BEARER TOKENのセキュリティリスク**を理解せずにWebアプリ開発を始めることは危険です。

## セキュリティガイドライン

⚠️ **サーバー実行では、 `Bearer Token` のセキュリティ管理が非常に重要です**

詳細なセキュリティガイドラインは **[セキュリティガイドライン](./security.md)** を必ずお読みください。

### 重要なポイント

**🔴 絶対に避けるべき:**

- GitHubなど公開リポジトリへのコミット
- ソースコードへのハードコード

**🟡 慎重に判断すべき:**

- フロントエンド(ブラウザ)での使用
- DevToolsで確認可能なため、本番環境では非推奨

**🟢 強く推奨:**

- バックエンド(サーバー)での使用
- 環境変数やSecrets管理を使用

```typescript
// ✅ 推奨 - バックエンドでのみ実行
export async function GET() {
    const repo = createPromidasRepository({
        apiClientOptions: {
            token: process.env.PROTOPEDIA_API_TOKEN, // 安全
        },
    });
    const data = await repo.getAllFromSnapshot();
    return Response.json(data);
}
```

詳細なリスク分析、判断基準、実装パターンは **[セキュリティガイドライン](./security.md)** をご覧ください。

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
