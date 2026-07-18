import { backend, JSDOC_JS_TYPE_RULES, TEST_RULES } from '@april/eslint-config';
import tseslint from 'typescript-eslint';

/**
 * Root ESLint configuration for the April monorepo.
 *
 * - Product source (`packages/*​/src`) is linted with the strict, fully
 *   type-checked `backend` preset from `@april/eslint-config`.
 * - Tooling files (config, the shared config sources, benchmarks, scripts)
 *   are not part of the type-checked product graph, so they use the same rules
 *   with type-aware checks disabled and a few product-only rules relaxed.
 * - Tests get the shared `TEST_RULES` limits plus repo-specific exemptions.
 */
export default tseslint.config(
  {
    ignores: ['**/artifacts/**', '**/dist/**', '**/build/**', '**/node_modules/**', '**/.turbo/**', '**/.claude/**'],
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
      'packages/*/benchmarks/**/*.ts',
    ],
    extends: [backend, tseslint.configs.disableTypeChecked],
    rules: {
      'no-console': 'off',
      'no-magic-numbers': 'off',
      '@typescript-eslint/no-magic-numbers': 'off',
      'max-lines': 'off',
      'max-lines-per-function': 'off',
      'max-statements': 'off',
      'id-length': 'off',
      'capitalized-comments': 'off',
      'sonarjs/no-duplicate-string': 'off',
      // Tooling may use inline escape hatches; product code may not.
      'eslint-comments/no-use': 'off',
    },
  },
  {
    // Plain JavaScript has no compiler enforcing types, so JSDoc must carry them.
    files: ['scripts/**/*.mjs'],
    rules: JSDOC_JS_TYPE_RULES,
  },
  {
    files: ['packages/*/tests/**/*.ts'],
    extends: [backend, tseslint.configs.disableTypeChecked],
    rules: {
      ...TEST_RULES,
      // Deterministic timestamps and layout constants read clearer inline.
      'no-magic-numbers': 'off',
      '@typescript-eslint/no-magic-numbers': 'off',
      // A vitest describe() body legitimately exceeds function-size limits.
      'max-lines-per-function': 'off',
      'max-lines': 'off',
      'id-length': 'off',
      'capitalized-comments': 'off',
      'sonarjs/no-duplicate-string': 'off',
      // Tests may use inline escape hatches (e.g. bit-layout literals).
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
      '@typescript-eslint/no-magic-numbers': 'off',
    },
  },
  {
    files: ['packages/cyberflake/src/internal/encoding.ts'],
    rules: {
      'no-bitwise': 'off',
    },
  }
);
