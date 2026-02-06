import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      // Force single graphql instance - resolve CJS/ESM duplication
      graphql: path.resolve(__dirname, 'node_modules/graphql/index.mjs'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    server: {
      deps: {
        // Inline graphql-related packages to ensure single instance
        inline: [/graphql/, /@graphql-tools/],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/generated/**', 'src/index.ts'],
    },
    testTimeout: 10000,
  },
});
