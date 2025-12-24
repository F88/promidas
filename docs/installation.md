---
lang: ja
title: Installation and Update
title-en: Installation and Update
title-ja: インストールとアップデート
related:
    - ./getting-started.md "Getting Started"
    - ./quickstart-beginners.md "Quickstart for Beginners"
instructions-for-ais:
    - This document should be written in Japanese.
    - Use half-width characters for numbers, letters, and symbols.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document.
---

# インストールとアップデート

このドキュメントでは、PROMIDASのインストールとアップデートの方法を説明します。

## 📖 目次

- [前提条件](#前提条件)
- [インストール](#インストール)
- [アップデート](#アップデート)
- [バージョン確認](#バージョン確認)
- [アンインストール](#アンインストール)

## 前提条件

PROMIDASを使用するには、以下の環境が必要です:

- **Node.js**: バージョン 20 以上
- **パッケージマネージャー**: npm または yarn

### Node.jsのインストール確認

ターミナルで以下のコマンドを実行して、Node.jsがインストールされているか確認できます:

```bash
node -v
```

`v20.0.0` 以上のバージョンが表示されれば問題ありません。

Node.jsがインストールされていない場合は、[超初心者向けクイックスタート](./quickstart-beginners.md)を参照してください。

## インストール

### npm でインストール

```bash
npm install github:F88/promidas protopedia-api-v2-client
```

### yarn でインストール

```bash
yarn add github:F88/promidas protopedia-api-v2-client
```

### インストールの確認

インストールが成功したか確認するには、以下のコマンドを実行します:

```bash
npm list @f88/promidas
```

または yarn の場合:

```bash
yarn list --pattern @f88/promidas
```

パッケージのバージョンが表示されれば、インストールは成功です。

## アップデート

PROMIDASを最新バージョンに更新する方法です。

### npm でアップデート

```bash
npm install github:F88/promidas
```

### yarn でアップデート

```bash
yarn add github:F88/promidas
```

### アップデート後の確認

アップデートが成功したか確認するには、[バージョン確認](#バージョン確認)のセクションを参照してください。

## バージョン確認

現在インストールされているPROMIDASのバージョンを確認する方法です。

### コマンドラインで確認

npm を使用している場合:

```bash
npm list @f88/promidas
```

yarn を使用している場合:

```bash
yarn list --pattern @f88/promidas
```

### コード内で確認

TypeScriptまたはJavaScriptのコード内でバージョンを確認することもできます:

```typescript
import { version } from '@f88/promidas';

console.log(`PROMIDAS version: ${version}`);
```

## アンインストール

PROMIDASをアンインストールする場合は、以下のコマンドを実行します。

### npm でアンインストール

```bash
npm uninstall @f88/promidas
```

### yarn でアンインストール

```bash
yarn remove @f88/promidas
```

## GitHub Packages について

PROMIDASは現在、GitHubリポジトリから直接インストールする形式で提供されています。

将来的にGitHub Packagesやnpmレジストリからの提供に移行する可能性があります。その場合、このドキュメントは更新されます。

## トラブルシューティング

### インストールに失敗する場合

1. **Node.jsのバージョンを確認**:

    ```bash
    node -v
    ```

    バージョン 20 以上であることを確認してください。

2. **npmキャッシュをクリア**:

    ```bash
    npm cache clean --force
    ```

3. **node_modules を削除して再インストール**:

    ```bash
    rm -rf node_modules package-lock.json
    npm install
    ```

### アップデートが反映されない場合

1. **package-lock.json を削除して再インストール**:

    ```bash
    rm package-lock.json
    npm install github:F88/promidas
    ```

2. **強制的に再インストール**:

    ```bash
    npm install github:F88/promidas --force
    ```

## 次のステップ

インストールが完了したら、以下のドキュメントを参照して実際にPROMIDASを使い始めましょう:

- **[Getting Started](./getting-started.md)**: 環境変数の設定と最初のコード例
- **[超初心者向けクイックスタート](./quickstart-beginners.md)**: 段階的に学ぶガイド
- **[Cookbook](./cookbook.md)**: コピー&ペーストで使えるコード集
