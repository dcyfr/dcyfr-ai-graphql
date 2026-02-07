import { defineConfig } from 'vitest/config';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);

export default defineConfig({
  resolve: {
    alias: {
      // Force single graphql instance - resolve workspace hoisting
      graphql: path.dirname(require.resolve('graphql/package.json')),
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
