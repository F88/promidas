import { defineConfig } from 'vitepress';

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: '🧰 PROMIDAS',
  description:
    'In-memory snapshot manager for ProtoPedia prototypes with TTL and efficient data access',
  lang: 'ja',
  base: '/promidas/',
  appearance: true, // or 'dark' for dark by default, 'force-dark' to force dark mode

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    // logo: '/logo.svg',

    nav: [
      { text: 'ホーム', link: '/' },
      { text: 'デモ', link: 'https://f88.github.io/PROMIDAS-demo/' },
      {
        text: `ProtoPedia`,
        link: 'https://protopedia.net/prototype/7917',
      },
    ],

    sidebar: [
      {
        text: '🚀 はじめに',
        collapsed: true,
        items: [
          { text: 'PROMIDAS とは', link: '/' },
          { text: '初心者向けクイックスタート', link: '/quickstart-beginners' },
          { text: 'スタートガイド', link: '/getting-started' },
        ],
      },
      {
        text: '💡 ユースケース',
        collapsed: false,
        items: [
          { text: 'ユースケース概要', link: '/use-case/' },
          { text: 'ローカルでの実行', link: '/use-case/local' },
          { text: 'サーバーでの実行', link: '/use-case/webapp' },
        ],
      },
      {
        text: '🍳 クックブック',
        collapsed: false,
        items: [{ text: '逆引きレシピ集', link: '/cookbook' }],
      },
      {
        text: '🧩 主な機能',
        collapsed: false,
        items: [
          {
            text: 'Repository (リポジトリ)',
            link: '/features/repository',
          },
          { text: 'Factory (ファクトリー)', link: '/features/factory' },
          { text: 'Builder (ビルダー)', link: '/features/builder' },
        ],
      },
      {
        text: '❓ 困ったときは',
        collapsed: false,
        items: [{ text: 'トラブルシューティング', link: '/troubleshooting' }],
      },
      {
        text: '🛡️ セキュリティ',
        collapsed: false,
        items: [{ text: 'セキュリティガイドライン', link: '/security' }],
      },
      {
        text: '🔍 深掘りPROMIDAS',
        collapsed: true,
        items: [
          { text: 'プロジェクトの哲学', link: '/philosophy' },
          {
            text: '開発ガイド',
            link: 'https://github.com/F88/promidas/blob/main/DEVELOPMENT.md',
          },
          {
            text: 'コントリビューション',
            link: 'https://github.com/F88/promidas/blob/main/CONTRIBUTING.md',
          },
        ],
      },
    ],

    socialLinks: [{ icon: 'github', link: 'https://github.com/F88/promidas' }],

    search: {
      provider: 'local',
      options: {
        translations: {
          button: {
            buttonText: '検索',
            buttonAriaLabel: '検索',
          },
          modal: {
            displayDetails: '詳細を表示',
            resetButtonTitle: 'クリア',
            backButtonTitle: '戻る',
            noResultsText: '見つかりませんでした',
            footer: {
              selectText: '選択',
              selectKeyAriaLabel: '選択',
              navigateText: '移動',
              navigateUpKeyAriaLabel: '上へ',
              navigateDownKeyAriaLabel: '下へ',
              closeText: '閉じる',
              closeKeyAriaLabel: '閉じる',
            },
          },
        },
      },
    },

    editLink: {
      pattern: 'https://github.com/F88/promidas/edit/main/docs/:path',
      text: 'このページを編集',
    },

    lastUpdated: {
      text: '最終更新',
      formatOptions: {
        dateStyle: 'medium',
        timeStyle: 'short',
      },
    },

    outline: {
      label: '目次',
      level: [2, 3],
    },

    docFooter: {
      prev: '前のページ',
      next: '次のページ',
    },

    returnToTopLabel: 'トップへ戻る',
    sidebarMenuLabel: 'メニュー',
    darkModeSwitchLabel: 'ダークモード',
  },

  markdown: {
    lineNumbers: true,
  },

  ignoreDeadLinks: false,

  head: [
    [
      'link',
      {
        rel: 'icon',
        type: 'image/svg+xml',
        href: '/promidas/logo.svg',
      },
    ],
  ],
});
