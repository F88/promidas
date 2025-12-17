---
lang: ja
title: Documentation Index
title-en: Documentation Index
title-ja: ドキュメント一覧
instructions-for-ais:
    - This document should be written in Japanese.
    - Use half-width characters for numbers, letters, and symbols.
---

# PROMIDAS ドキュメント

PROMIDASのドキュメントへようこそ。
あなたの目的や習熟度に合わせて、最適なガイドを選んでください。

## 🗺️ 目的別ガイド

### 🔰 初めての方・APIを試してみたい

まずはここから始めましょう。セキュリティの基本と導入手順を解説します。

1. **[超初心者向けクイックスタート](./quickstart-beginners.md)**
    - Node.jsの知識がゼロでも安心。インストールから実行までを最短で行うためのガイドです。
2. **[ユースケース (Use Cases)](./usecase.md)**
    - ⚠️ **最重要**: 「どこで実行するか」によるセキュリティリスクの違いを理解します。
3. **[Getting Started](./getting-started.md)**
    - インストール、トークン取得、そして最初のコードを実行するまでのステップバイステップガイドです。

### 🧪 データを分析したい・ツールを作りたい

ローカル環境(自分のPC)で安全にデータを活用するためのガイドです。

1. **[ローカル実行向けユースケース](./usecase-local.md)**
    - データ分析、静的サイト生成、個人用ツール開発などの実践ガイド。
2. **[Cookbook (逆引きレシピ集)](./cookbook.md)**
    - 「特定のタグを検索したい」「CSV出力したい」「ランキングを作りたい」など、コピー＆ペーストで使えるコード集。

### 💻 Webアプリを作りたい・サーバーで動かしたい

**上級者向け**。セキュリティとアーキテクチャの深い理解が必要です。

1. **[サーバー実行向けユースケース](./usecase-webapp.md)**
    - Webアプリケーション開発のためのリソースマップ。高度なカスタマイズやセキュリティ設計について。
2. **[モジュール別リファレンス](#-モジュール別リファレンス)**
    - 各コンポーネントの詳細設計書へのリンクです。

---

## 📚 ドキュメント一覧

### 入門・ガイド

- **[ユースケース (Use Cases)](./usecase.md)** - 実行場所とセキュリティの基礎
- **[Getting Started](./getting-started.md)** - 導入とチュートリアル
- **[トラブルシューティング (FAQ)](./troubleshooting.md)** - よくあるエラーと対処法

### 実践レシピ

- **[ローカル実行向けユースケース](./usecase-local.md)** - 分析・ツール開発ガイド
- **[Cookbook (逆引きレシピ集)](./cookbook.md)** - 実用コードスニペット集
- **[サーバー実行向けユースケース](./usecase-webapp.md)** - WebApp開発リソースマップ

### 🔧 モジュール別リファレンス (高度な内容)

PROMIDASの内部構造や高度なカスタマイズを行いたい開発者向けの詳細資料です。各ディレクトリ内のドキュメントへリンクしています。

#### Repository (統合モジュール)

最も一般的な利用形態である `Repository` の詳細です。

- [README](https://github.com/F88/promidas/blob/main/lib/repository/README.md) / [Usage](https://github.com/F88/promidas/blob/main/lib/repository/docs/USAGE.md) / [Design](https://github.com/F88/promidas/blob/main/lib/repository/docs/DESIGN.md)

#### Fetcher (APIクライアント)

API通信部分のカスタマイズ（リトライ制御、モックなど）を行いたい場合。

- [README](https://github.com/F88/promidas/blob/main/lib/fetcher/README.md) / [Usage](https://github.com/F88/promidas/blob/main/lib/fetcher/docs/USAGE.md) / [Design](https://github.com/F88/promidas/blob/main/lib/fetcher/docs/DESIGN.md)

#### Store (In-memoryストレージ)

キャッシュの挙動やデータ保持の仕組みを深く理解したい場合。

- [README](https://github.com/F88/promidas/blob/main/lib/store/README.md) / [Usage](https://github.com/F88/promidas/blob/main/lib/store/docs/USAGE.md) / [Design](https://github.com/F88/promidas/blob/main/lib/store/docs/DESIGN.md)

#### Logger (ロギング)

ログ出力先を変更したり、独自のロガーを組み込みたい場合。

- [README](https://github.com/F88/promidas/blob/main/lib/logger/README.md) / [Usage](https://github.com/F88/promidas/blob/main/lib/logger/docs/USAGE.md) / [Design](https://github.com/F88/promidas/blob/main/lib/logger/docs/DESIGN.md)

#### Utils (ユーティリティ)

日付変換や型定義などのヘルパー関数について。

- [README](https://github.com/F88/promidas/blob/main/lib/utils/README.md) / [Usage](https://github.com/F88/promidas/blob/main/lib/utils/docs/USAGE.md) / [Design](https://github.com/F88/promidas/blob/main/lib/utils/docs/DESIGN.md)

---

## 🛠️ プロジェクト情報

### 理念・方針

- **[Philosophy](./philosophy.md)** - プロジェクトの設計思想
- **[セキュリティガイドライン](./security.md)** - Token管理の詳細

### 貢献・開発

- **[Development Guide](https://github.com/F88/promidas/blob/main/DEVELOPMENT.md)** - 開発環境セットアップ
- **[Contributing Guide](https://github.com/F88/promidas/blob/main/CONTRIBUTING.md)** - 貢献の手引き
- **[Release Process](https://github.com/F88/promidas/blob/main/RELEASE.md)** - リリース手順
- **[Changelog](https://github.com/F88/promidas/blob/main/CHANGELOG.md)** - 変更履歴

## 🔗 リンク

- [GitHub Repository](https://github.com/F88/promidas)
- [ProtoPedia API Ver 2.0 Docs](https://protopediav2.docs.apiary.io/)
- [PROMIDAS Demo (GitHub Pages)](https://f88.github.io/PROMIDAS-demo/)

## 📄 ライセンス

MIT License - See [LICENSE](https://github.com/F88/promidas/blob/main/LICENSE)
