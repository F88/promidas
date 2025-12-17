---
lang: ja
title: Builder Concept
title-en: Builder Concept
title-ja: ビルダーコンセプト
instructions-for-ais:
    - This document should be written in Japanese.
    - Use half-width characters for numbers, letters, and symbols.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document
---

# Builder Concept

`Builder` パターンは、Repository の詳細なカスタマイズが必要な上級ユーザー向けの機能です。
`PromidasRepositoryBuilder` クラスを使用することで、Store、API Client、Repository の各コンポーネントをきめ細かく設定できます。

## 基本的な使い方

Factory 関数を使わずに、Builder を直接使用してインスタンスを作成します。

```typescript
import { PromidasRepositoryBuilder } from '@f88/promidas';

const builder = new PromidasRepositoryBuilder();
const repository = builder.build();
```

## 設定メソッド

Builder はメソッドチェーン(Fluent Interface)をサポートしています。

### `setStoreConfig(config)`

メモリ内ストアの設定を行います。

- `ttlMs`: データの有効期限(ミリ秒)
- `maxDataSizeBytes`: メモリ使用量の上限
- `logger`: ストア専用のロガー

### `setApiClientConfig(config)`

API クライアントの設定を行います。

- `protoPediaApiClientOptions`:
    - `token`: API トークン
    - `timeoutMs`: タイムアウト時間
- `logger`: クライアント専用のロガー

### `setRepositoryConfig(config)`

リポジトリ自体の設定を行います。

- `logger`: リポジトリ操作のロガー

## 高度なカスタマイズ例

### 例1: コンポーネントごとにログレベルを変える

デバッグ時に、特定のコンポーネントのログだけを詳細に見たい場合に便利です。

```typescript
const repository = new PromidasRepositoryBuilder()
    // Store は詳細なデバッグログを出す
    .setStoreConfig({ logLevel: 'debug' })
    // API 通信は警告以上のみ
    .setApiClientConfig({
        logLevel: 'warn',
        protoPediaApiClientOptions: { token: '...' },
    })
    // リポジトリ操作は情報を出す
    .setRepositoryConfig({ logLevel: 'info' })
    .build();
```

### 例2: カスタム TTL とタイムアウト

特定の要件に合わせて、キャッシュ期間やタイムアウト時間を調整します。

```typescript
const repository = new PromidasRepositoryBuilder()
    .setStoreConfig({
        ttlMs: 60 * 60 * 1000, // 1時間キャッシュ
    })
    .setApiClientConfig({
        protoPediaApiClientOptions: {
            token: '...',
            timeoutMs: 5000, // 5秒でタイムアウト(高速応答を強制)
        },
    })
    .build();
```

## 設計思想: イミュータビリティ

Builder の設定メソッドは、設定オブジェクトをディープマージして保持します。
また、`build()` メソッド呼び出し時に各コンポーネントに設定のコピー(またはマージされた結果)を渡すため、
生成後の Repository インスタンスが Builder の内部状態の影響を受けることはありません。
