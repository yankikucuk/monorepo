import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/tests/*.test.ts', 'packages/shared/*/tests/*.test.ts'],
    passWithNoTests: true,
    coverage: {
      enabled: false,
      reporter: ['text', 'lcov', 'json'],
      provider: 'v8',
      include: ['packages/cyberflake/src/**/*.ts', 'packages/shared/import-sort/src/**/*.ts'],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
  },
});
