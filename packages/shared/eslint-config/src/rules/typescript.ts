/**
 * TypeScript rule groups.
 *
 * Two concerns live here:
 * - **Extension pairs**: core rules disabled and replaced by their
 *   `@typescript-eslint` equivalents, guaranteeing the two versions can never
 *   fire together on the same violation.
 * - **Type-aware rules**: rules that need `parserOptions.projectService`,
 *   pinned explicitly so they survive preset evolution.
 * @packageDocumentation
 */

import type { Linter } from 'eslint';

/**
 * Core rules replaced by their type-system-aware `@typescript-eslint`
 * equivalents. Every entry is an off/on pair.
 */
export const TS_EXTENSION_RULES: Linter.RulesRecord = {
  'class-methods-use-this': 'off',
  '@typescript-eslint/class-methods-use-this': 'error',
  'default-param-last': 'off',
  '@typescript-eslint/default-param-last': 'error',
  'dot-notation': 'off',
  '@typescript-eslint/dot-notation': 'error',
  'init-declarations': 'off',
  '@typescript-eslint/init-declarations': 'error',
  'no-array-constructor': 'off',
  '@typescript-eslint/no-array-constructor': 'error',
  'no-empty-function': 'off',
  '@typescript-eslint/no-empty-function': 'error',
  'no-implied-eval': 'off',
  '@typescript-eslint/no-implied-eval': 'error',
  'no-invalid-this': 'off',
  '@typescript-eslint/no-invalid-this': 'error',
  'no-loop-func': 'off',
  '@typescript-eslint/no-loop-func': 'error',
  'no-magic-numbers': 'off',
  '@typescript-eslint/no-magic-numbers': [
    'error',
    {
      // Structural values plus their bigint forms (Cyberflake packs bigints).
      ignore: [0, 1, -1, 2, '-1n', '0n', '1n'],
      ignoreArrayIndexes: true,
      ignoreEnums: true,
      ignoreNumericLiteralTypes: true,
      ignoreReadonlyClassProperties: true,
      enforceConst: true,
    },
  ],
  'no-redeclare': 'off',
  '@typescript-eslint/no-redeclare': 'error',
  'no-shadow': 'off',
  '@typescript-eslint/no-shadow': 'error',
  'no-throw-literal': 'off',
  '@typescript-eslint/only-throw-error': 'error',
  'no-unused-expressions': 'off',
  '@typescript-eslint/no-unused-expressions': 'error',
  'no-unused-vars': 'off',
  '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  'no-use-before-define': 'off',
  '@typescript-eslint/no-use-before-define': 'error',
  'prefer-destructuring': 'off',
  '@typescript-eslint/prefer-destructuring': 'error',
  'prefer-promise-reject-errors': 'off',
  '@typescript-eslint/prefer-promise-reject-errors': 'error',
  'require-await': 'off',
  '@typescript-eslint/require-await': 'error',
};

/**
 * Type-aware rules — require `parserOptions.projectService` to function.
 * Mostly pinned explicitly on top of `strictTypeChecked` so they survive
 * preset evolution.
 */
export const TS_TYPE_AWARE_RULES: Linter.RulesRecord = {
  '@typescript-eslint/await-thenable': 'error',
  '@typescript-eslint/no-floating-promises': 'error',
  '@typescript-eslint/no-misused-promises': 'error',
  '@typescript-eslint/no-unnecessary-type-assertion': 'error',
  '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
  '@typescript-eslint/return-await': ['error', 'in-try-catch'],
};
