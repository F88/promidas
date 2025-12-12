---
lang: ja
title: Logger Module
title-en: Logger Module
title-ja: ロガーモジュール
related:
    - ../../../README.md "Project Overview"
    - docs/USAGE.md "Logger Usage"
    - docs/DESIGN.md "Logger Design"
instructions-for-ais:
    - This document should be written in Japanese.
    - Use half-width characters for numbers, letters, and symbols.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document.
---

# Logger Module

アプリケーションのログ出力を管理するモジュールです。

## 📦 これは何?

プログラムの動作状況をログに記録するための仕組みです。
開発中のデバッグや、本番環境での問題調査に役立ちます。

## 🚀 簡単な使い方

### 基本的な使い方

```typescript
import { createConsoleLogger } from '@f88/promidas/logger';

// ロガーを作成
const logger = createConsoleLogger();

// ログを出力
logger.info('アプリケーションを起動しました');
logger.warn('メモリ使用量が多くなっています');
logger.error('データの取得に失敗しました');
```

### デバッグ用の詳細ログ

```typescript
import { createConsoleLogger, LogLevel } from '@f88/promidas/logger';

// デバッグレベルのロガー (開発中に便利)
const logger = createConsoleLogger({ level: LogLevel.Debug });

logger.debug('詳細なデバッグ情報'); // 開発中のみ表示
logger.info('通常の情報');
logger.error('エラー情報');
```

## 📚 詳しく知りたい方へ

- **[使い方ガイド (USAGE.md)](./docs/USAGE.md)**: 詳しい使い方と実例
- **[設計ドキュメント (DESIGN.md)](./docs/DESIGN.md)**: 技術的な詳細

## 💡 主な機能

### ログレベル

重要度に応じてログを分類できます:

```typescript
import { LogLevel } from '@f88/promidas/logger';

// 利用可能なログレベル (重要度順)
LogLevel.Debug; // デバッグ情報 (開発中のみ)
LogLevel.Info; // 一般的な情報
LogLevel.Warn; // 警告
LogLevel.Error; // エラー
```

### コンソール出力

```typescript
import { createConsoleLogger } from '@f88/promidas/logger';

const logger = createConsoleLogger({
    level: LogLevel.Info, // Info 以上のログを出力
});

logger.debug('これは表示されません'); // Debug < Info
logger.info('これは表示されます'); // Info = Info
logger.error('これも表示されます'); // Error > Info
```

### ログ出力を無効化

```typescript
import { createNoopLogger } from '@f88/promidas/logger';

// 何もログを出力しないロガー (テストや本番環境で便利)
const logger = createNoopLogger();

logger.info('このログは出力されません');
logger.error('このエラーログも出力されません');
```

### カスタムロガー

独自のログ出力先を作成できます:

```typescript
import type { Logger } from '@f88/promidas/logger';

const fileLogger: Logger = {
    debug: (message) => writeToFile('DEBUG: ' + message),
    info: (message) => writeToFile('INFO: ' + message),
    warn: (message) => writeToFile('WARN: ' + message),
    error: (message) => writeToFile('ERROR: ' + message),
};
```

## 🔗 関連モジュール

- [Fetcher](../fetcher/README.md) - API データ取得時のログ出力
- [Repository](../repository/README.md) - データ操作時のログ出力

## 🎯 使い分けのヒント

### 開発中

```typescript
const logger = createConsoleLogger({ level: LogLevel.Debug });
// すべてのログが見られるので、デバッグしやすい
```

### 本番環境

```typescript
const logger = createConsoleLogger({ level: LogLevel.Warn });
// 警告とエラーのみ記録して、ノイズを減らす
```

### テスト実行時

```typescript
const logger = createNoopLogger();
// ログを出力せず、テスト結果が見やすくなる
```

## 📝 実用例

```typescript
import { createConsoleLogger, LogLevel } from '@f88/promidas/logger';

const logger = createConsoleLogger({ level: LogLevel.Info });

async function fetchData() {
    logger.info('データ取得を開始します');

    try {
        const data = await apiClient.fetch();
        logger.info(`${data.length} 件のデータを取得しました`);
        return data;
    } catch (error) {
        logger.error('データ取得に失敗しました: ' + error.message);
        throw error;
    }
}
```

---

**困ったときは**: [USAGE.md](./docs/USAGE.md) に詳しい使い方とベストプラクティスがあります
