---
lang: ja
title: Security Guidelines
title-en: Security Guidelines
title-ja: セキュリティガイドライン
related:
    - ./USECASE.md "Use Cases"
    - ./GETTING-STARTED.md "Getting Started"
    - ./USECASE-WEBAPP.md "Server Execution Use Cases"
instructions-for-ais:
    - This document should be written in Japanese.
    - Use half-width characters for numbers, letters, and symbols.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document.
---

# セキュリティガイドライン

📢 ProtoPedia API Ver 2.0 で利用する `Bearer Token` についての正確な情報は、必ず公式ドキュメントを参照してください。
(PROMIDASの作者は ProtoPedia API Ver 2.0 の開発者ではありません)

ProtoPedia API Ver 2.0 · Apiary
<https://protopediav2.docs.apiary.io/>

このドキュメントでは、`Bearer Token` の適切な取り扱いとセキュリティに関する推奨事項を説明します。

## 📖 目次

- [重要な前提](#重要な前提)
- [TOKENの特性](#tokenの特性)
- [リスクレベル別ガイドライン](#リスクレベル別ガイドライン)
- [判断の指針](#判断の指針)
- [PROMIDAS](#promidas)

## 重要な前提

⚠️ **このドキュメントの内容は推測に基づいています**

ProtoPedia API Ver 2.0の公式ドキュメントには、 `Bearer Token` の取り扱いに関する明確な指針が記載されていません。
以下の内容は、 `Bearer Token` の形式やAPIの挙動、ドキュメントの記載から推測したものであり、実際の仕様や想定される用途は異なる可能性があります。

**利用者自身の判断と責任でTOKENを管理してください。**

## `Bearer Token` の特性

### 観察される特徴

- **形式**: 32文字の16進数文字列
- **構造**: JWT等の署名付きトークンとは異なるシンプルな形式
- **公式情報**: APIドキュメントに取り扱いに関する明確な記載なし
- **推測される目的**: ユーザー識別と緊急時のTOKEN無効化（推測）

### 不明な点

以下の重要な情報が公式に明示されていないため、慎重な対応が必要です:

- TOKEN漏洩時の影響範囲
- 有効期限の有無と期間
- 再発行ポリシー
- Rate Limitの詳細仕様
- アクセス可能なデータの範囲
- 書き込み操作の権限範囲

## リスクレベル別ガイドライン

公式の取り扱い指針がなく、書き込み操作も可能なため、**慎重な対応**を推奨します。

### 🔴 絶対に避けるべき

**リスクが確実に高い行為:**

#### GitHubなど公開リポジトリへのコミット

- 永続的に公開され、取り消し不可
- 検索エンジンでインデックスされる可能性
- 第三者による悪用のリスク

#### ソースコードへのハードコード

- ビルド後のコードで確認可能
- デコンパイルやソース閲覧で露出

**対策:**

- 環境変数（`.env`ファイル）を使用
- `.gitignore`に必ず`.env`を追加
- Secrets管理サービスを利用（GitHub Secrets、Vercel環境変数等）

### 🟡 慎重に判断すべき

**フロントエンド（ブラウザ）での使用**

#### 潜在的なリスク

- **DevToolsで確認可能**: ブラウザの開発者ツールでTOKENが見える
- **書き込み操作を含む不正使用**: API仕様上、POST/DELETE操作が可能
- **Rate Limit消費**: 全ユーザーで共有されるRate Limitへの影響（仕様不明）
- **影響範囲が不明**: ユーザーデータへのアクセス範囲が不明確

⚠️ **PROMIDASは読み取り専用ですが、TOKEN自体は書き込み可能なため注意が必要です**

#### 許容される可能性がある場合

以下の条件を**すべて満たす場合のみ**、リスクを理解した上で検討可能:

- 短期間のデモ・プロトタイプ（限定的な用途）
- 影響範囲とリスクを完全に理解している
- Rate Limitが問題にならない小規模利用
- 緊急時にTOKENを無効化できる準備がある

**本番環境では強く非推奨**

### 🟢 強く推奨する

**バックエンド（サーバー）での使用**

#### メリット

- **TOKEN管理が容易**: 環境変数やSecrets管理で安全に保管
- **外部からアクセス不可**: ユーザーのブラウザからTOKENが見えない
- **ログ・監視が可能**: アクセスログや異常検知が実装可能
- **書き込み操作を制御可能**: 必要に応じて機能を制限できる

#### 実装例

**Next.js API Routes:**

```typescript
// pages/api/prototypes.ts (サーバーサイド)
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

**環境変数設定:**

```bash
# .env (Gitにコミットしない)
PROTOPEDIA_API_TOKEN=your-token-here
```

```gitignore
# .gitignore
.env
.env.local
```

## PROMIDAS

### サポートするエンドポイント

PROMIDASは `GET https://protopedia.net/v2/api/prototype/list`（作品一覧取得）**のみ**をサポートしています。

これらの操作が必要な場合は、ProtoPedia APIを直接使用する必要があります。

## さらに詳しく

### 関連ドキュメント

- **[ユースケース](./USECASE.md)**: 実行場所とセキュリティの基礎
- **[Getting Started](./GETTING-STARTED.md)**: TOKENの取得と環境設定
- **[サーバー実行向けユースケース](./USECASE-WEBAPP.md)**: サーバー環境での実装パターン

### 公式リソース

- **[ProtoPedia API Ver 2.0 · Apiary](https://protopediav2.docs.apiary.io/)**: API仕様とTOKEN取得

## サポート

セキュリティに関する質問や報告は:

- **[GitHub Issues](https://github.com/F88/promidas/issues)**: セキュリティに関する質問
- **[GitHub Discussions](https://github.com/F88/promidas/discussions)**: コミュニティでの議論

⚠️ **重大なセキュリティ問題を発見した場合は、公開Issueではなく直接プロジェクトメンテナーに連絡してください。**

## ライセンス

MIT License - 詳細は[LICENSE](../LICENSE)を参照してください。
