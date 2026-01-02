import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['**/node_modules', '**/dist', '.git', '.cache', 'src', '.vscode', '.github'],
    include: ['./packages/*/tests/*.test.ts'],
    passWithNoTests: true,
    coverage: {
      enabled: false,
      reporter: ['text', 'lcov', 'json'],
      provider: 'v8',
      include: ['test'],
    },
  },
});
