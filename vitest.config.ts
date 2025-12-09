import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Load environment variables following Vite/Vitest conventions:
  // .env, .env.local, .env.test, .env.test.local, etc.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    test: {
      include: ['lib/**/*.test.ts'],
      globals: true,
      environment: 'node',
      coverage: {
        provider: 'v8',
        include: [
          // Target files for coverage
          'lib/**/*.{ts,tsx}',
        ],
        exclude: [
          // Exclude files from coverage
          'coverage/**',
          'node_modules/**',
          'vitest.config.ts',
          '**/*.d.ts',
          '**/*.types.ts',
          '**/*.test.*',
          '**/__tests__/**',
          'lib/index.ts',
          'lib/core/types.ts',
          'lib/repository/index.ts',
        ],
      },
    },
    define: {
      // Make selected env vars available as process.env.* in tests if needed.
      // You can read them via process.env.PROTOPEDIA_API_V2_TOKEN, etc.
      'process.env.PROTOPEDIA_API_V2_TOKEN': JSON.stringify(
        env.PROTOPEDIA_API_V2_TOKEN,
      ),
    },
  };
});
