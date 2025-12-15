import { defineConfig } from 'vitepress';

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'PROMIDAS',
  description:
    'In-memory snapshot manager for ProtoPedia prototypes with TTL and efficient data access',
  lang: 'ja',
  base: '/promidas/',
  appearance: true, // or 'dark' for dark by default, 'force-dark' to force dark mode

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: '/logo.svg',

    nav: [
      { text: 'Home', link: '/' },
      { text: 'Use Cases', link: '/usecase' },
      { text: 'GitHub', link: 'https://github.com/F88/promidas' },
    ],

    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Documentation Index', link: '/' },
          { text: 'Getting Started', link: '/getting-started' },
          { text: 'Use Cases', link: '/usecase' },
          { text: 'Philosophy', link: '/philosophy' },
        ],
      },
      {
        text: 'Use Cases',
        items: [
          { text: 'Local Execution', link: '/usecase-local' },
          { text: 'Server Execution', link: '/usecase-webapp' },
        ],
      },
      {
        text: 'Security',
        items: [{ text: 'Security Guidelines', link: '/security' }],
      },
      {
        text: 'Development',
        items: [
          {
            text: 'Development Guide',
            link: 'https://github.com/F88/promidas/blob/main/DEVELOPMENT.md',
          },
          {
            text: 'Contributing',
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
