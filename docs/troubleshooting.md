---
lang: ja
title: Troubleshooting
title-en: Troubleshooting
title-ja: トラブルシューティング
related:
    - ./getting-started.md "Getting Started"
    - ./cookbook.md "Cookbook"
    - https://protopediav2.docs.apiary.io/ "ProtoPedia API Docs"
instructions-for-ais:
    - This document should be written in Japanese.
    - Use half-width characters for numbers, letters, and symbols.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document.
---

# トラブルシューティング (FAQ)

PROMIDASを使っていて問題が発生した場合の対処法をまとめました。

## ⚠️ API・認証エラー

### `401 Unauthorized` が発生する

APIトークンが正しく設定されていないか、間違っています。

**チェックリスト:**

- **環境変数は正しいですか?**
    - `.env` ファイルに `PROTOPEDIA_API_V2_TOKEN=...` と書いていますか?
    - 変数名の綴り (`PROTOPEDIA_API_V2_TOKEN`) は正しいですか?
- **`.env` は読み込まれていますか?**
    - コードの冒頭で `import 'dotenv/config'; // (例)` を記述していますか?
- **トークン自体は有効ですか?**
    - ProtoPediaのサイトから取得したトークンをコピー&ペーストし直してみてください。余計なスペースが入っていないか確認してください。

### `403 Forbidden` が発生する

トークンは正しいですが、その操作を行う権限がありません。

PROMIDASは通常「作品一覧取得」しか行わないため、このエラーが出ることは稀ですが、もし発生した場合はトークンの種類を確認してください。

### データが空っぽ(0件)になる

エラーは出ないが、`repo.getAllFromSnapshot()` の結果が空配列 `[]` になる場合。

**原因と対策:**

- **`setupSnapshot()` が失敗している:**
    - `setupSnapshot()` の戻り値 `result.ok` を確認してください。
    - `result.error` にエラー詳細が入っているはずです。

## 🛠️ 環境・実行エラー

### `ReferenceError: process is not defined`

ブラウザ環境(フロントエンド)で実行しようとしていませんか?

PROMIDASは **Node.js 環境**(サーバーサイドやローカルスクリプト)での動作を前提としています。`process.env` はブラウザでは使えません。

#### 対策

- Next.jsなどの場合、API Routes (`pages/api/*` や `app/api/*`) の中で実行してください。
- Viteなどのフロントエンドツールで使う場合、`import.meta.env` などへの書き換えが必要ですが、**セキュリティ上、ブラウザでAPIトークンを扱うことは非推奨です**。

### `Error: Cannot find module ...`

必要なパッケージがインストールされていません。

#### 対策

```bash
npm install github:F88/promidas protopedia-api-v2-client dotenv
```

### TypeScriptの型エラーが出る

`Property '...' does not exist on type 'NormalizedPrototype'.`

#### 対策

PROMIDASが提供する `NormalizedPrototype` 型と、あなたがアクセスしようとしているプロパティ名が一致していません。
APIの生データとは構造が異なる場合があります(正規化されているため)。
[Getting Started](./getting-started.md#データ構造を見てみよう) でデータ構造を確認してください。

## 🐌 パフォーマンス

### 初回実行が遅い

`setupSnapshot()` に時間がかかる。

**原因:**
大量のデータを取得しようとすると、APIリクエストとデータ正規化に時間がかかります。

**対策:**
開発中やテスト時は `limit` オプションで件数を制限してください。

```typescript
// デフォルトは limit: 10 (最初の10件のみ)
await repo.setupSnapshot({});

// より多くのデータが必要な場合
await repo.setupSnapshot({ limit: 1000 }); // 1000件取得

// 開発中は少なめに
await repo.setupSnapshot({ limit: 100 }); // 100件で十分
```

**補足:**
ネットワーク環境やAPIサーバーの応答速度も影響します。詳細ログで実際の処理時間を確認してください。

## それでも解決しない場合

1. **エラーログを詳細に出す:**

    ```typescript
    const repo = createPromidasForLocal({
        // ...
        logLevel: 'debug', // 詳細ログを有効化
    });
    ```

    これで実行すると、APIリクエストの詳細などがコンソールに表示されます。

2. **コミュニティに聞く:**
    - [GitHub Discussions](https://github.com/F88/promidas/discussions) で質問してください。
    - 質問する際は、上記で出力したデバッグログを添えると解決が早くなります(**トークン部分は隠してください**)。
