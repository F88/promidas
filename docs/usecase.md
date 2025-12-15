---
lang: ja
title: Use Cases
title-en: Use Cases
title-ja: ユースケース
related:
    - ../README.md "Project Overview"
    - ./getting-started.md "Getting Started"
    - ./usecase-local.md "Local Execution Use Cases"
    - ./usecase-webapp.md "Server Execution Use Cases"
    - https://github.com/F88/promidas/blob/main/DEVELOPMENT.md "Development Guide"
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

**詳しくは以下をご覧ください:**

- **[セキュリティガイドライン](./security.md)**: TOKEN管理とセキュリティのベストプラクティス
- **[Getting Started](./getting-started.md)**: TOKENの取得方法と基本的な使い方

## ユースケース例

以下は、PROMIDASの具体的な利用例です。

| 目的               | ユースケース                 | 推奨環境    | 難易度 | 概要                                                                                                                                         |
| ------------------ | ---------------------------- | ----------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| データ加工         | データのエクスポート・変換   | ローカル ✅ | 初級   | ProtoPediaデータをCSV/JSON形式でエクスポートし、他ツールで利用可能な形式に変換。データクリーニングや前処理にも対応                           |
| データ加工         | 相互投票で使う評価シート作成 | ローカル ✅ | 初級   | 相互投票イベントや審査用の評価シートをTSV/CSV形式で出力し、Googleスプレッドシート等に貼り付けて利用                                          |
| データ分析         | 統計分析・データマイニング   | ローカル ✅ | 初級   | タグ出現頻度、ユーザー活動統計、ライセンス種別集計などの分析。時系列データ分析や投稿パターン調査も可能                                       |
| 品質管理           | データ品質チェック           | ローカル ✅ | 初級   | 必須項目の欠損チェック、画像リンク切れ検出、タグの一貫性確認、異常値検出によるデータ品質保証                                                 |
| 可視化             | レポート・グラフ生成         | ローカル ✅ | 初級   | 月別投稿数グラフ、タグクラウド、ユーザーランキング等を生成。静的HTMLレポートやプレゼン資料作成にも活用                                       |
| 個人用途           | 個人用管理ツール             | ローカル ✅ | 初級   | コンテスト応募作品チェックリスト、自分の作品管理、類似プロジェクト検索、個人メモ・タグ付けツール                                             |
| イベント支援       | コンテスト応募作品一覧作成   | ローカル ✅ | 初級   | 特定タグ（コンテスト名等）の作品を抽出し、応募作品リストや投票用資料を自動生成。審査支援にも活用                                             |
| 学習教材           | 教育・学習向け利用           | ローカル ✅ | 初級   | データサイエンス学習の実践教材、API連携の練習、TypeScript/Node.js学習題材、チーム開発演習データソース                                        |
| 作業管理           | 作品評価シートアプリ開発     | ローカル ✅ | 中級   | ローカルで動作する作品評価アプリ。ローカルストレージに評価情報を保存、ショートカットキーによる快適な操作、評価進捗管理、コメント記録機能など |
| 高度な分析         | トレンド分析・予測           | ローカル ✅ | 中級   | タグトレンド分析、投稿数予測、人気プロジェクトの傾向分析、時系列での成長パターン可視化と将来予測                                             |
| ツール開発         | CLIツール開発                | ローカル ✅ | 中級   | コマンドラインで動作するプロトタイプ検索CLI、タグ監視ツール、データバックアップスクリプト、カスタム集計ツール                                |
| ツール開発         | ProtoPedia連携ツール開発     | ローカル ✅ | 中級   | お気に入り作品キュレーション、特定タグ新着通知、プロジェクト類似度分析、レコメンデーションエンジン、ブックマーク管理                         |
| プロジェクト管理   | プロジェクト管理ツール連携   | ローカル ✅ | 中級   | 自分の投稿作品の進捗管理、TODO管理、マイルストーン追跡、開発ログ記録による個人プロジェクトの体系的管理                                       |
| 自動化             | 定期実行スクリプト           | ローカル ✅ | 中級   | cron等を使用したローカルPC上での定期データ取得・アーカイブ、変更検知と通知、定期レポート生成、個人用モニタリング                             |
| 定期レポート       | 月次/週次レポート自動生成    | ローカル ✅ | 中級   | 指定期間の統計情報を自動集計し、HTMLまたはPDF形式のレポートを定期生成。チームやコミュニティでの共有にも対応                                  |
| チャット連携       | Slack/Discord bot連携        | 両方 ✅⚠️   | 中級   | チャットbot経由でProtoPediaデータを検索・取得、新着通知、コミュニティ内での情報共有とコラボレーション促進                                    |
| プレゼン・展示     | デモ・展示用途               | 両方 ✅⚠️   | 中級   | 技術プレゼンでのライブデモ、ポートフォリオサイトでの実績表示、データ可視化デモサイト、ハッカソン作品、技術ブログの実例                       |
| WebApp開発         | Webアプリケーション開発      | サーバー ⚠️ | 上級   | 作品情報を利用した面白アプリの開発、オレトク作品の開発、Next.js/Remix統合、バックグラウンドワーカー                                          |
| 自動化パイプライン | CI/CD統合                    | サーバー ⚠️ | 上級   | GitHub Actionsでの定期データ取得、自動レポート生成パイプライン、データ品質チェック自動化、デプロイ時データ更新                               |

**難易度の目安:**

- **初級**: TypeScript/Node.jsの基礎知識があれば実装可能
- **中級**: ツール開発やフレームワークの知識が必要
- **上級**: セキュリティ、バックエンド開発の深い知識が必要

**注意**: サーバー上でのTOKEN管理が必要です。詳細は[サーバー実行向けユースケース](./usecase-webapp.md)を参照してください。

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

## 詳細ドキュメント

### はじめる前に

**[Getting Started](./getting-started.md)**

- ProtoPedia API Ver 2.0について
- BEARER TOKENの取得方法
- インストールと環境設定
- 最初のコード例
- 基本概念(Factory関数、Builder、Snapshot、TTL)

### ローカル実行の詳細

**[ローカル実行向けユースケース](./usecase-local.md)**

- データ分析・調査の詳細
- ツール開発のパターン
- 設定例とサンプルコード
- よくある質問(FAQ)

### サーバー実行の詳細

**[サーバー実行向けユースケース](./usecase-webapp.md)** (準備中)

- Webアプリケーション開発
- TOKEN管理のベストプラクティス
- セキュリティ考慮事項
- CI/CD統合
- フレームワーク別の実装例

## 推奨学習パス

### 初心者の方へ

1. **このドキュメントを読む** - 実行場所とセキュリティを理解する
2. **[Getting Started](./getting-started.md)を読む** - TOKENの取得と基本的な使い方を学ぶ
3. **ローカルで試す** - [ローカル実行向けユースケース](./usecase-local.md)を参考に安全に実験
4. **必要なら応用へ** - Webアプリ開発が必要な場合のみ[サーバー実行](./usecase-webapp.md)へ進む

### 重要な注意点

- **まずローカル実行から始めることを強く推奨します**
- API初心者の方は、BEARER TOKENの扱いを理解するまでローカル実行のみを使用してください
- Webアプリ開発に進む前に、必ずセキュリティについて学習してください

## さらに詳しく知りたい方へ

### モジュール別ドキュメント

- **[Repository Module](https://github.com/F88/promidas/blob/main/lib/repository/README.md)**: Repository APIの詳細
- **[Store Module](https://github.com/F88/promidas/blob/main/lib/store/README.md)**: In-memoryストレージの仕組み
- **[Fetcher Module](https://github.com/F88/promidas/blob/main/lib/fetcher/README.md)**: APIクライアントとデータ取得
- **[Logger Module](https://github.com/F88/promidas/blob/main/lib/logger/README.md)**: ロギングのカスタマイズ
- **[Utils Module](https://github.com/F88/promidas/blob/main/lib/utils/README.md)**: ユーティリティ関数

### プロジェクト情報

- **[Development Guide](https://github.com/F88/promidas/blob/main/DEVELOPMENT.md)**: 開発環境のセットアップ
- **[Contributing Guide](https://github.com/F88/promidas/blob/main/CONTRIBUTING.md)**: プロジェクトへの貢献方法
- **[Changelog](https://github.com/F88/promidas/blob/main/CHANGELOG.md)**: バージョンごとの変更履歴

## サポート

- **Issues**: [GitHub Issues](https://github.com/F88/promidas/issues)
- **Discussions**: [GitHub Discussions](https://github.com/F88/promidas/discussions)

## ライセンス

MIT License - 詳細は[LICENSE](https://github.com/F88/promidas/blob/main/LICENSE)を参照してください。
