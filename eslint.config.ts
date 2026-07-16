import { backend } from '@april/eslint-config/backend';
import tseslint from 'typescript-eslint';

/**
 * Root ESLint configuration for the April monorepo.
 *
 * - Product source (`packages/*​/src`) is linted with the strict, fully
 *   type-checked `backend` preset from `@april/eslint-config`.
 * - Tooling files (config, the shared eslint-config source, tests, benchmarks)
 *   are not part of the type-checked product graph, so they use the same rules
 *   with type-aware checks disabled and a few product-only rules relaxed.
 */
export default tseslint.config(
  {
    ignores: ['**/artifacts/**', '**/node_modules/**', '**/.turbo/**'],
  },
  {
    files: ['packages/cyberflake/src/**/*.ts'],
    extends: [backend],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: [
      'eslint.config.ts',
      '*.config.ts',
      'scripts/**/*.mjs',
      'packages/shared/*/src/**/*.ts',
      'packages/*/tests/**/*.ts',
      'packages/*/benchmarks/**/*.ts',
    ],
    extends: [backend, tseslint.configs.disableTypeChecked],
    rules: {
      'no-console': 'off',
      'no-magic-numbers': 'off',
      'max-lines': 'off',
      'max-lines-per-function': 'off',
      'max-statements': 'off',
      'id-length': 'off',
      'capitalized-comments': 'off',
      'sonarjs/no-duplicate-string': 'off',
      // Tooling and tests may use inline escape hatches; product code may not.
      'eslint-comments/no-use': 'off',
    },
  },
  /*
   * Product-code rule exceptions.
   *
   * Inline `eslint-disable` comments are banned in product source, so the few
   * legitimate, file-scoped exceptions live here in the central config instead.
   */
  {
    files: ['packages/cyberflake/src/constants.ts'],
    rules: {
      'no-bitwise': 'off',
      'no-magic-numbers': 'off',
    },
  },
  {
    files: ['packages/cyberflake/src/internal/encoding.ts'],
    rules: {
      'no-bitwise': 'off',
    },
  }
);
