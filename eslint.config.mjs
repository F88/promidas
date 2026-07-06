import eslintPluginImportX from 'eslint-plugin-import-x';
import eslintPluginTs from '@typescript-eslint/eslint-plugin';
import eslintParserTs from '@typescript-eslint/parser';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'eslint.config.mjs',
      'prettier.config.mjs',
      '**/*.d.ts',
      '__tests__/**',
      'vitest.exports.config.ts',
      'docs/.vitepress/**',
    ],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: eslintParserTs,
      parserOptions: {
        project: ['./tsconfig.json'],
        sourceType: 'module',
        ecmaVersion: 'latest',
      },
    },
    plugins: {
      '@typescript-eslint': eslintPluginTs,
      'import-x': eslintPluginImportX,
    },
    rules: {
      // General
      'no-console': 'off',

      // TypeScript
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',

      // Import ordering / hygiene
      'import-x/order': [
        'warn',
        {
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],

      // Let Prettier handle formatting concerns
      'max-len': 'off',
    },
  },
];
