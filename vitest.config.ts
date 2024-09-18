import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['**/node_modules', '**/dist', '.git', '.cache', 'src', '.vscode', '.github'],
    passWithNoTests: true,
    coverage: {
      enabled: false,
      all: true,
      reporter: ['text', 'lcov', 'json'],
      provider: 'v8',
      include: ['test'],
      extension: ['.ts'],
    },
  },
});
