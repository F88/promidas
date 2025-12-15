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

PROMIDASのドキュメント一覧です。目的に応じて適切なドキュメントを参照してください。

## 🚀 はじめに

### 初めての方へ

1. **[ユースケース](./usecase.md)** - まずここから
    - 実行場所(ローカル/サーバー)とセキュリティについて理解する
    - 自分の用途に合ったユースケースを選ぶ
    - API初心者の方は特に重要

2. **[Getting Started](./getting-started.md)** - 基本的な使い方
    - ProtoPedia API Ver 2.0について
    - BEARER TOKENの取得方法
    - インストールと初期設定
    - 最初のコード例

### 推奨学習フロー

```
ユースケース確認 → Getting Started → ローカル実行で試す → (必要なら)サーバー実行へ
```

## 📚 ユースケース別ドキュメント

### ローカル実行(安全・初心者向け)

- **[ローカル実行向けユースケース](./usecase-local.md)**
    - データ分析・調査
    - ツール開発
    - 設定パターンとサンプルコード
    - FAQ
- **[Cookbook (逆引きレシピ集)](./cookbook.md)**
    - よくあるデータ操作のコード例
    - 検索、フィルタリング、集計、エクスポート

### サーバー実行(セキュリティ知識必須)

- **[サーバー実行向けユースケース](./usecase-webapp.md)** (準備中)
    - Webアプリケーション開発
    - TOKEN管理のベストプラクティス
    - CI/CD統合
    - セキュリティ考慮事項

## 🔧 モジュール別リファレンス

### Repository (統合モジュール)

- **[README](https://github.com/F88/promidas/blob/main/lib/repository/README.md)** - Repository APIの概要
- **[Usage Guide](https://github.com/F88/promidas/blob/main/lib/repository/docs/USAGE.md)** - 実装パターンとサンプル
- **[Design Document](https://github.com/F88/promidas/blob/main/lib/repository/docs/DESIGN.md)** - 内部アーキテクチャ

### Store (In-memoryストレージ)

- **[README](https://github.com/F88/promidas/blob/main/lib/store/README.md)** - Store APIの概要
- **[Usage Guide](https://github.com/F88/promidas/blob/main/lib/store/docs/USAGE.md)** - 使い方とパターン
- **[Design Document](https://github.com/F88/promidas/blob/main/lib/store/docs/DESIGN.md)** - 設計思想

### Fetcher (APIクライアント)

- **[README](https://github.com/F88/promidas/blob/main/lib/fetcher/README.md)** - Fetcher APIの概要
- **[Usage Guide](https://github.com/F88/promidas/blob/main/lib/fetcher/docs/USAGE.md)** - カスタムフェッチャーの実装
- **[Design Document](https://github.com/F88/promidas/blob/main/lib/fetcher/docs/DESIGN.md)** - アーキテクチャ詳細

### Logger (ロギング)

- **[README](https://github.com/F88/promidas/blob/main/lib/logger/README.md)** - Logger インターフェース
- **[Usage Guide](https://github.com/F88/promidas/blob/main/lib/logger/docs/USAGE.md)** - カスタムロガーの実装
- **[Design Document](https://github.com/F88/promidas/blob/main/lib/logger/docs/DESIGN.md)** - 設計原則

### Utils (ユーティリティ)

- **[README](https://github.com/F88/promidas/blob/main/lib/utils/README.md)** - ユーティリティ関数
- **[Usage Guide](https://github.com/F88/promidas/blob/main/lib/utils/docs/USAGE.md)** - 関数リファレンス
- **[Design Document](https://github.com/F88/promidas/blob/main/lib/utils/docs/DESIGN.md)** - 型定義と変換

## 🛠️ 開発者向け

### プロジェクト理念

- **[Philosophy](./philosophy.md)** - プロジェクトの設計思想と判断基準

### プロジェクト貢献

- **[Development Guide](https://github.com/F88/promidas/blob/main/DEVELOPMENT.md)** - 開発環境のセットアップ
- **[Contributing Guide](https://github.com/F88/promidas/blob/main/CONTRIBUTING.md)** - プロジェクトへの貢献方法
- **[Release Process](https://github.com/F88/promidas/blob/main/RELEASE.md)** - リリース手順

### 変更履歴

- **[Changelog](https://github.com/F88/promidas/blob/main/CHANGELOG.md)** - バージョンごとの変更内容

## 🔗 外部リソース

### デモサイト

- **[PROMIDAS Demo](https://f88.github.io/PROMIDAS-demo/)** - 実際の動作デモ (作成中)

### 公式リソース

- **[ProtoPedia API Ver 2.0 · Apiary](https://protopediav2.docs.apiary.io/)** - API仕様とTOKEN取得
- **[GitHub Repository](https://github.com/F88/promidas)** - ソースコード
- **[GitHub Issues](https://github.com/F88/promidas/issues)** - バグ報告・機能リクエスト
- **[GitHub Discussions](https://github.com/F88/promidas/discussions)** - 質問・議論

## 💡 よくある質問

### どのドキュメントから読めば良いですか?

1. 初めての方: [ユースケース](./usecase.md) → [Getting Started](./getting-started.md)
2. ローカルで試したい: [ローカル実行向けユースケース](./usecase-local.md)
3. Webアプリに組み込みたい: まず[ローカル実行](./usecase-local.md)で基礎を学んでから[サーバー実行](./usecase-webapp.md)へ
4. APIリファレンスが見たい: 各モジュールの[Usage Guide](#-モジュール別リファレンス)

### API初心者ですが大丈夫ですか?

はい、[ユースケース](./usecase.md)と[Getting Started](./getting-started.md)でAPI初心者向けに基礎から説明しています。特にBEARER TOKENの扱いとセキュリティについて理解してから使い始めることをお勧めします。

### すぐにコードを試したいのですが?

[Getting Started](./getting-started.md)に最小限のコード例があります。ただし、**必ず先に[ユースケース](./usecase.md)で実行場所とセキュリティを確認してください**。

## 📄 ライセンス

MIT License - 詳細は[LICENSE](https://github.com/F88/promidas/blob/main/LICENSE)を参照してください。
