---
lang: ja
title: Use Cases
title-en: Use Cases
title-ja: ユースケース
related:
    - ../README.md "Project Overview"
    - ./GETTING-STARTED.md "Getting Started"
    - ./USECASE-LOCAL.md "Local Execution Use Cases"
    - ./USECASE-WEBAPP.md "Server Execution Use Cases"
    - ../DEVELOPMENT.md "Development Guide"
instructions-for-ais:
    - This document should be written in Japanese.
    - Use half-width characters for numbers, letters, and symbols.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document.
---

# PROMIDAS ユースケース

このドキュメントでは、PROMIDASの利用シーンを実行場所とセキュリティの観点から解説します。

## 📖 目次

- [このドキュメントについて](#このドキュメントについて)
- [PROMIDASとは](#promidasとは)
- [実行場所とセキュリティ](#実行場所とセキュリティ)
- [ユースケース例](#ユースケース例)
- [実行環境別の判断基準](#実行環境別の判断基準)
- [詳細ドキュメント](#詳細ドキュメント)
- [推奨学習パス](#推奨学習パス)

## このドキュメントについて

PROMIDASを使い始める前に、このドキュメントで**実行場所**と**セキュリティ**について理解してください。特にAPI初心者の方は、BEARER TOKENの扱いについて知ることが重要です。

## PROMIDASとは

**PROMIDAS** (ProtoPedia Resource Organized Management In-memory Data Access Store) は、[ProtoPedia](https://protopedia.net/) のプロトタイプデータをメモリ上で効率的に管理するためのライブラリです。

### 主な特徴

- **🚀 高速アクセス**: APIから取得したデータをメモリに保持し、O(1)での検索を実現
- **⏱️ 自動更新**: TTL (Time To Live) による自動データ更新
- **🔧 モジュラー設計**: 用途に応じて必要なモジュールのみを使用可能
- **📊 型安全**: TypeScriptによる完全な型サポート
- **🛠️ 柔軟なAPI**: シンプルなファクトリ関数と高度なBuilderパターンの両方をサポート

## 実行場所とセキュリティ

PROMIDASの使用には**BEARER TOKEN**が必要です。このTOKENはパスワードのように扱う必要がある重要な認証情報です。

### どこで実行しますか?

PROMIDASを使う前に、**どこでコードを実行するか**を決めることが最も重要です。実行場所によってセキュリティリスクが大きく異なります。

#### ローカル実行 (自分のPC上で実行)

**✅ 安全 - 初心者におすすめ**

- BEARER TOKENが自分のPC内に閉じるため漏洩リスクなし
- 環境変数に直接記述可能
- 必要な知識: TypeScript/Node.jsの基礎のみ

**こんな用途に最適:**

- データ分析・調査
- 個人用ツール開発
- 学習・実験

#### サーバー実行 (WebApp、CI/CD等)

**⚠️ 注意必要 - セキュリティ知識必須**

- BEARER TOKENをサーバー上で管理する必要がある
- フロントエンド(ブラウザ)にTOKENを送ってはいけない (判断次第)
- バックエンドでの適切なTOKEN管理が必須 (判断次第)
- 必要な知識: セキュリティ、バックエンド開発、TOKEN管理

**こんな用途に使用:**

- Webアプリケーション
- RESTful APIサーバー
- CI/CD自動化

### BEARER TOKENとは

BEARER TOKENは、ProtoPedia APIを利用するための認証情報です。このTOKENを持っている人は、あなたのアカウントでAPIを使用できます。

- **TOKENの取得方法**: [ProtoPedia API Ver 2.0 · Apiary](https://protopediav2.docs.apiary.io/) を参照
- **セキュリティの基礎**: 詳細は[Getting Started](./GETTING-STARTED.md)の「ProtoPedia API Ver 2.0について」を参照

### ベストプラクティス

**チーム利用時:**

- 各メンバーが自分のTOKENを使用すること
- TOKENの共有は避ける

**Webアプリ開発時:**

- フロントエンド(ブラウザで実行されるコード)に絶対にTOKENを書かない
- バックエンド(サーバー)でのみTOKENを使用する

## ユースケース例

以下は、PROMIDASの具体的な利用例です。各ユースケースには**実行環境**(ローカル/サーバー)を明記しています。

### データのエクスポート・変換

**実行環境: ローカル実行** ✅

ProtoPediaデータをCSV/JSON形式でエクスポートし、他のツールで利用可能な形式に変換します。

- CSVファイルへのエクスポート
- JSON形式での保存
- データクリーニング・前処理
- 他システムへのデータ連携

### 統計分析・データマイニング

**実行環境: ローカル実行** ✅

データを分析し、統計情報や傾向を調査します。

- タグの出現頻度分析
- ユーザー活動の統計
- ライセンス種別の集計
- 時系列データ分析
- 投稿パターンの調査

### レポート・グラフ生成

**実行環境: ローカル実行** ✅

データを可視化し、レポートを作成します。

- 月別投稿数グラフ
- タグクラウド生成
- ユーザーランキング作成
- 静的HTMLレポート出力
- プレゼンテーション資料作成

### 静的サイト生成のデータソース

**実行環境: ローカル実行** ✅

静的サイトジェネレーター(SSG)のビルド時にデータを取得します。

- ビルド時にデータを取得
- 静的HTMLファイル生成
- データ品質チェック
- サイトコンテンツ更新

### CLIツール開発

**実行環境: ローカル実行** ✅

コマンドラインで動作する個人用ツールを開発します。

- プロトタイプ検索CLIツール
- タグ監視ツール
- データバックアップスクリプト
- カスタム集計ツール

### 定期実行スクリプト

**実行環境: ローカル実行** ✅

cron等を使用してローカルPC上で定期実行します。

- 定期的なデータ取得とアーカイブ
- 変更検知と通知
- 定期レポート生成
- 個人用モニタリング

### 個人用管理ツール

**実行環境: ローカル実行** ✅

自分だけが使う管理・整理ツールを作成します。

- コンテスト応募作品チェックリスト
- 自分の作品管理ツール
- 類似プロジェクト検索ツール
- 個人メモ・タグ付けツール

### Webアプリケーション

**実行環境: サーバー実行** ⚠️

Webサーバー上で動作するアプリケーションを開発します。

- ProtoPedia検索・閲覧アプリ
- プロトタイプギャラリーサイト
- RESTful APIサーバー
- Next.js/Remix等での統合
- バックグラウンドワーカー

**注意**: セキュリティ知識が必須です。詳細は[サーバー実行向けユースケース](./USECASE-WEBAPP.md)を参照してください。

### CI/CD統合

**実行環境: サーバー実行** ⚠️

GitHub Actions等のCI/CD環境で自動実行します。

- GitHub Actionsでの定期データ取得
- 自動レポート生成パイプライン
- データ品質チェック自動化
- デプロイ時のデータ更新

**注意**: サーバー上でのTOKEN管理が必要です。詳細は[サーバー実行向けユースケース](./USECASE-WEBAPP.md)を参照してください。

## 実行環境別の判断基準

| 項目                   | ローカル実行                     | サーバー実行                   |
| ---------------------- | -------------------------------- | ------------------------------ |
| **実行時間**           | 短時間 (分〜時間単位)            | 長時間 (日〜月単位)            |
| **実行頻度**           | 1回限り、または定期実行 (cron等) | 常時稼働                       |
| **トークン管理**       | 環境変数で十分 (.env)            | 安全な管理が必要 (Secrets等)   |
| **セキュリティリスク** | 低 (PC内に閉じる)                | 高 (外部からアクセス可能)      |
| **エラーハンドリング** | シンプルでOK                     | 堅牢な実装が必要               |
| **ログ出力**           | デバッグログ有効                 | 本番環境向けに調整             |
| **データ更新**         | 起動時のみ                       | 定期的・自動的 (TTL)           |
| **監視**               | 不要                             | 推奨                           |
| **必要な知識レベル**   | TypeScript/Node.js基礎           | セキュリティ、バックエンド開発 |

| **必要な知識レベル** | TypeScript/Node.js基礎 | セキュリティ、バックエンド開発 |

## 詳細ドキュメント

### はじめる前に

**[Getting Started](./GETTING-STARTED.md)**

- ProtoPedia API Ver 2.0について
- BEARER TOKENの取得方法
- インストールと環境設定
- 最初のコード例
- 基本概念(Factory関数、Builder、Snapshot、TTL)

### ローカル実行の詳細

**[ローカル実行向けユースケース](./USECASE-LOCAL.md)**

- データ分析・調査の詳細
- ツール開発のパターン
- 設定例とサンプルコード
- よくある質問(FAQ)

### サーバー実行の詳細

**[サーバー実行向けユースケース](./USECASE-WEBAPP.md)** (準備中)

- Webアプリケーション開発
- TOKEN管理のベストプラクティス
- セキュリティ考慮事項
- CI/CD統合
- フレームワーク別の実装例

## 推奨学習パス

### 初心者の方へ

1. **このドキュメントを読む** - 実行場所とセキュリティを理解する
2. **[Getting Started](./GETTING-STARTED.md)を読む** - TOKENの取得と基本的な使い方を学ぶ
3. **ローカルで試す** - [ローカル実行向けユースケース](./USECASE-LOCAL.md)を参考に安全に実験
4. **必要なら応用へ** - Webアプリ開発が必要な場合のみ[サーバー実行](./USECASE-WEBAPP.md)へ進む

### 重要な注意点

- **まずローカル実行から始めることを強く推奨します**
- API初心者の方は、BEARER TOKENの扱いを理解するまでローカル実行のみを使用してください
- Webアプリ開発に進む前に、必ずセキュリティについて学習してください

## さらに詳しく知りたい方へ

### モジュール別ドキュメント

- **[Repository Module](../lib/repository/README.md)**: Repository APIの詳細
- **[Store Module](../lib/store/README.md)**: In-memoryストレージの仕組み
- **[Fetcher Module](../lib/fetcher/README.md)**: APIクライアントとデータ取得
- **[Logger Module](../lib/logger/README.md)**: ロギングのカスタマイズ
- **[Utils Module](../lib/utils/README.md)**: ユーティリティ関数

### プロジェクト情報

- **[Development Guide](../DEVELOPMENT.md)**: 開発環境のセットアップ
- **[Contributing Guide](../CONTRIBUTING.md)**: プロジェクトへの貢献方法
- **[Changelog](../CHANGELOG.md)**: バージョンごとの変更履歴

## サポート

- **Issues**: [GitHub Issues](https://github.com/F88/promidas/issues)
- **Discussions**: [GitHub Discussions](https://github.com/F88/promidas/discussions)

## ライセンス

MIT License - 詳細は[LICENSE](./LICENSE)を参照してください。
