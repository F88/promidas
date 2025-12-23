---
lang: ja
title: Repository
title-en: Repository
title-ja: リポジトリ
instructions-for-ais:
    - This document should be written in Japanese.
    - Use half-width characters for numbers, letters, and symbols.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document
---

# Repository (リポジトリ)

`Repository` は、このライブラリの中核となるコンポーネントです。
API から取得したプロトタイプ情報をメモリに保存し、高速に検索・アクセスする機能を提供します。

## 役割

Repository は以下の役割を担います:

1. **データの一元管理**: 外部 API から取得したデータをメモリ上の Store に保持します。
2. **抽象化されたアクセス**: データの取得元(API なのかキャッシュなのか)を意識せずにデータを扱えるようにします。
3. **ライフサイクル管理**: データの有効期限(TTL)を管理し、必要に応じて自動的にリフレッシュを促したり、状態を報告したりします。

## 主な機能

### データの初期読み込み (Setup)

最初に使用する前に、データをメモリにロードする必要があります。

```typescript
const result = await repository.setupSnapshot({
    limit: 1000, // 最大読み込み件数
});

if (!result.ok) {
    console.error('Failed to setup snapshot:', result.message);
}
```

### 高速な検索 (Query)

メモリ上に展開されたデータに対して、同期的かつ高速にアクセスできます。

```typescript
// IDで直接取得 (O(1))
const prototype = await repository.getPrototypeFromSnapshotByPrototypeId(123);

// 全件取得してフィルタリング
const all = await repository.getAllFromSnapshot();
const completed = all.filter((p) => p.status === 3);
```

### データの更新 (Refresh)

データが古くなった場合、API から最新情報を取得してメモリ内のデータを更新します。

```typescript
const result = await repository.refreshSnapshot();

if (!result.ok) {
    console.error('Failed to refresh snapshot:', result.error);
}
```

## 内部構造

Repository は内部的に以下のコンポーネントを組み合わせて動作します:

- **Store**: 実際にデータをメモリに保持するストレージ。
- **ApiClient**: 外部の ProtoPedia API と通信するクライアント。
- **Logger**: 動作ログを記録するロガー。

通常、ユーザーはこれらの内部コンポーネントを意識する必要はありませんが、`Builder` を使用することで個別にカスタマイズすることも可能です。

## 詳細ドキュメント

より詳細な仕様や設計については、以下のドキュメントを参照してください:

- [Repository Design](https://github.com/F88/promidas/blob/main/lib/repository/docs/DESIGN.md)
- [Repository Usage](https://github.com/F88/promidas/blob/main/lib/repository/docs/USAGE.md)
