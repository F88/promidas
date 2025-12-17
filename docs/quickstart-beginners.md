---
lang: ja
title: Quickstart for Beginners
title-en: Quickstart for Beginners
title-ja: 超初心者向けクイックスタート
related:
    - ./getting-started.md "Standard Getting Started"
    - ./cookbook.md "Cookbook"
instructions-for-ais:
    - This document should be written in Japanese.
    - Use half-width characters for numbers, letters, and symbols.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document
---

# 超初心者向けクイックスタート

**「Node.js って何？」「黒い画面（ターミナル）は怖い」という方のためのガイドです。**

このページでは、Windows や Mac を使っている方が、**とにかく最短で** PROMIDAS を動かしてみるまでの手順を、専門用語をできるだけ使わずに解説します。

## ⏱️ 所要時間: 約 10分

## ステップ 1: Node.js のインストール

PROMIDAS を動かすための「エンジン」である Node.js をインストールします。すでにインストール済みの方はスキップしてください。

1. **[公式サイト (nodejs.org)](https://nodejs.org/)** にアクセスします。
2. **「LTS (推奨版)」** と書かれているボタンをクリックしてダウンロードします。
3. ダウンロードしたファイルを開き、画面の指示に従って「次へ (Next)」を押し続けてインストールします（設定はすべてデフォルトでOKです）。

### インストールできたか確認

1. **コマンド実行ツールを開きます**:
    - **Windows**: スタートメニューで「PowerShell」と検索して開きます。
    - **Mac**: Spotlight (Command + Space) で「ターミナル (Terminal)」と検索して開きます。
2. 以下の文字を入力して、Enterキーを押します:

    ```bash
    node -v
    ```

3. `v20.10.0` のような数字が表示されれば成功です！

## ステップ 2: フォルダの作成

プロジェクト用のフォルダを作って、準備をします。

1. デスクトップなど、わかりやすい場所に新しいフォルダを作ります。名前は `my-promidas` としましょう。
2. **先ほど開いた PowerShell (またはターミナル) で、そのフォルダに移動します。**

**ヒント (簡単な移動方法):**

1. PowerShell (ターミナル) に `cd` (cdとスペース) と入力します。
2. 作成した `my-promidas` フォルダを、PowerShell (ターミナル) の画面の中にドラッグ＆ドロップします。
3. フォルダのパス（場所）が自動で入力されるので、Enterキーを押します。

## ステップ 3: ツールのインストール

PROMIDAS をダウンロードして使えるようにします。
以下のコマンドをコピーして、PowerShell (ターミナル) に貼り付け、Enterキーを押してください。

**Windows/Mac 共通:**

```bash
npm init -y
npm install github:F88/promidas protopedia-api-v2-client dotenv
```

これだけで、必要なツールがすべて揃います。数分かかる場合があります。

**⚠️ エラーが出る場合:**
「Git」というツールが入っていないと失敗することがあります。エラーが出た場合は、[Gitの公式サイト](https://git-scm.com/) から Git をインストールして、もう一度試してみてください。

## ステップ 4: APIトークンの準備

ProtoPedia のデータにアクセスするための「鍵 (トークン)」を準備します。

1. **[ProtoPedia API ドキュメント](https://protopediav2.docs.apiary.io/)** にアクセスします。
2. 手順に従って **Bearer Token** を取得します。
3. `my-promidas` フォルダの中に、新しいファイルを作ります。
    - ファイル名: `.env` (ドット イーエヌブイ)
    - ※ 拡張子 (.txtなど) がつかないように注意してください！
4. `.env` ファイルをメモ帳などで開き、以下のように書いて保存します（`あなたのトークン` を取得した実際のトークンに書き換えてください）。

```text
PROTOPEDIA_API_V2_TOKEN=あなたのトークン
```

## ステップ 5: プログラムを書く

いよいよプログラムを書きます。

1. `my-promidas` フォルダの中に、新しいファイルを作ります。
    - ファイル名: `index.mjs` (インデックス ドット エムジェイエス)
    - ※ `.js` ではなく `.mjs` にすることで、設定なしで最新の機能が使えます。
2. `index.mjs` をテキストエディタ（メモ帳やVS Codeなど）で開き、以下のコードをすべてコピー＆ペーストして保存します。

```javascript
// 必要な機能を取り込む
import 'dotenv/config';
import { createPromidasForLocal } from '@f88/promidas';

// メインの処理
async function main() {
    console.log('🚀 準備中... (データを取得しています)');

    // ツールを初期化 (トークンは .env から自動で読み込まれます)
    const repo = createPromidasForLocal({
        protopediaApiToken: process.env.PROTOPEDIA_API_V2_TOKEN,
    });

    // データ取得開始
    const result = await repo.setupSnapshot({ limit: 50 }); // 最新50件を取得

    if (!result.ok) {
        console.error('❌ 失敗しました:', result.error);
        return;
    }

    console.log('✅ データ取得完了！');

    // ランダムに1つ選んで表示
    const randomPrototype = await repo.getRandomPrototypeFromSnapshot();

    if (randomPrototype) {
        console.log('\n=============================================');
        console.log(`✨ 今日のラッキー作品: ${randomPrototype.prototypeNm}`);
        console.log(`🔗 URL: ${randomPrototype.mainUrl}`);
        console.log(`❤️ いいね数: ${randomPrototype.likes}`);
        console.log(`🏷️ タグ: ${randomPrototype.tags.join(', ')}`);
        console.log('=============================================\n');
    } else {
        console.log('作品が見つかりませんでした。');
    }
}

// プログラム実行
main();
```

## ステップ 6: 実行する

PowerShell (ターミナル) で、以下のコマンドを入力して Enterキーを押します。

```bash
node index.mjs
```

画面に `🚀 準備中...` と表示され、しばらくして「今日のラッキー作品」が表示されれば大成功です！🎉

---

## うまくいかない時は？

- **エラーが出る:** `.env` ファイルのトークンが正しいか確認してください。
- **「コマンドが見つかりません」:** Node.js のインストール後に、PowerShell (ターミナル) を再起動しましたか？

## 次は何をする？

無事に動いたら、プログラムを少し書き換えてみましょう。
**[Cookbook (逆引きレシピ集)](./cookbook.md)** には、コピペで使える便利なコードがたくさん載っています。

- 特定のタグ（M5Stackなど）の作品一覧を表示する
- データをCSVファイルとして保存する
- 人気ランキングを作る

👉 **[Cookbook へ移動する](./cookbook.md)**
