/**
 * Shared strict base ESLint configuration for the April monorepo.
 *
 * This preset is environment-agnostic (it declares no runtime globals) and is
 * consumed by the `frontend` and `backend` presets. It composes:
 *
 * - `@eslint/js` recommended (core correctness rules)
 * - `typescript-eslint` strict + stylistic, fully type-checked
 * - `eslint-plugin-regexp`, `eslint-plugin-sonarjs`, `eslint-plugin-promise`
 * - `eslint-plugin-perfectionist` (deterministic ordering)
 * - `eslint-plugin-unicorn`, `eslint-plugin-import-x`, `eslint-plugin-jsdoc`
 *
 * On top of the recommended presets it layers an opinionated, deliberately
 * strict overlay: hard complexity limits, broad restrictions, documentation
 * requirements, and consistent style.
 */

import eslintComments from '@eslint-community/eslint-plugin-eslint-comments';
import js from '@eslint/js';
import checkFile from 'eslint-plugin-check-file';
import eslintPluginImportX from 'eslint-plugin-import-x';
import eslintPluginJsdoc from 'eslint-plugin-jsdoc';
import perfectionist from 'eslint-plugin-perfectionist';
import promise from 'eslint-plugin-promise';
import * as regexp from 'eslint-plugin-regexp';
import sonarjs from 'eslint-plugin-sonarjs';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import tseslint from 'typescript-eslint';

/**
 * The strict, type-checked base configuration.
 *
 * Consumers must set `languageOptions.parserOptions.tsconfigRootDir` (and
 * provide runtime globals) via the `frontend` / `backend` presets or their own
 * project config.
 */
export const base = tseslint.config(
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  regexp.configs['flat/recommended'],
  sonarjs.configs.recommended,
  promise.configs['flat/recommended'],
  {
    plugins: {
      'check-file': checkFile,
      'eslint-comments': eslintComments,
      import: eslintPluginImportX,
      jsdoc: eslintPluginJsdoc,
      perfectionist,
      unicorn: eslintPluginUnicorn,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      /* ---------------------------------------------------------------- */
      /* Complexity & size limits                                         */
      /* ---------------------------------------------------------------- */
      complexity: ['error', { max: 10 }],
      'max-depth': ['error', { max: 4 }],
      'max-lines': ['error', { max: 500, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
      'max-nested-callbacks': ['error', { max: 3 }],
      'max-params': ['error', { max: 5 }],
      'max-statements': ['error', { max: 20 }],
      'max-classes-per-file': ['error', { max: 1 }],

      /* ---------------------------------------------------------------- */
      /* Restrictions                                                     */
      /* ---------------------------------------------------------------- */
      'no-alert': 'error',
      'no-await-in-loop': 'error',
      'no-bitwise': 'error',
      'no-caller': 'error',
      'no-console': 'error',
      'no-constructor-return': 'error',
      'no-continue': 'error',
      'no-div-regex': 'error',
      'no-else-return': 'error',
      'no-eq-null': 'error',
      'no-eval': 'error',
      'no-extend-native': 'error',
      'no-extra-bind': 'error',
      'no-extra-label': 'error',
      'no-implicit-coercion': 'error',
      'no-implicit-globals': 'error',
      'no-inline-comments': 'error',
      'no-iterator': 'error',
      'no-label-var': 'error',
      'no-labels': 'error',
      'no-lone-blocks': 'error',
      'no-lonely-if': 'error',
      'no-multi-assign': 'error',
      'no-multi-str': 'error',
      'no-negated-condition': 'error',
      'no-nested-ternary': 'error',
      'no-new': 'error',
      'no-new-func': 'error',
      'no-new-wrappers': 'error',
      'no-object-constructor': 'error',
      'no-octal-escape': 'error',
      'no-param-reassign': 'error',
      'no-plusplus': 'error',
      'no-promise-executor-return': 'error',
      'no-proto': 'error',
      'no-restricted-globals': ['error', { name: 'event', message: 'Please use a local parameter instead.' }],
      'no-return-assign': 'error',
      'no-script-url': 'error',
      'no-self-compare': 'error',
      'no-sequences': 'error',
      'no-template-curly-in-string': 'error',
      'no-undef-init': 'error',
      'no-undefined': 'error',
      'no-underscore-dangle': 'error',
      'no-unmodified-loop-condition': 'error',
      'no-unneeded-ternary': 'error',
      'no-useless-call': 'error',
      'no-useless-computed-key': 'error',
      'no-useless-concat': 'error',
      'no-useless-rename': 'error',
      'no-useless-return': 'error',
      'no-var': 'error',
      'no-void': 'error',
      'no-warning-comments': 'error',

      /* ---------------------------------------------------------------- */
      /* Style & best practices                                           */
      /* ---------------------------------------------------------------- */
      'accessor-pairs': 'error',
      'arrow-body-style': 'error',
      'block-scoped-var': 'error',
      camelcase: 'error',
      'capitalized-comments': 'error',
      'consistent-return': 'error',
      'consistent-this': 'error',
      curly: 'error',
      'default-case': 'error',
      'default-case-last': 'error',
      eqeqeq: 'error',
      'func-name-matching': 'error',
      'func-names': 'error',
      'func-style': 'error',
      'grouped-accessor-pairs': 'error',
      'guard-for-in': 'error',
      'id-denylist': 'error',
      'id-length': 'error',
      'id-match': 'error',
      'logical-assignment-operators': 'error',
      'new-cap': 'error',
      'no-duplicate-imports': 'error',
      'object-shorthand': 'error',
      'operator-assignment': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-const': 'error',
      'prefer-exponentiation-operator': 'error',
      'prefer-named-capture-group': 'error',
      'prefer-numeric-literals': 'error',
      'prefer-object-has-own': 'error',
      'prefer-object-spread': 'error',
      'prefer-promise-reject-errors': 'error',
      'prefer-regex-literals': 'error',
      'prefer-rest-params': 'error',
      'prefer-spread': 'error',
      'prefer-template': 'error',
      radix: 'error',
      'require-atomic-updates': 'error',
      'require-unicode-regexp': 'error',
      strict: 'error',
      'symbol-description': 'error',
      'unicode-bom': 'error',
      'vars-on-top': 'error',
      yoda: 'error',

      /* ---------------------------------------------------------------- */
      /* TypeScript extension rules (core turned off by presets)          */
      /* ---------------------------------------------------------------- */
      'class-methods-use-this': 'error',
      'default-param-last': 'off',
      '@typescript-eslint/default-param-last': 'error',
      'dot-notation': 'off',
      '@typescript-eslint/dot-notation': 'error',
      'init-declarations': 'off',
      '@typescript-eslint/init-declarations': 'error',
      'no-loop-func': 'off',
      '@typescript-eslint/no-loop-func': 'error',
      'no-shadow': 'off',
      '@typescript-eslint/no-shadow': 'error',
      'no-use-before-define': 'off',
      '@typescript-eslint/no-use-before-define': 'error',
      'prefer-destructuring': 'off',
      '@typescript-eslint/prefer-destructuring': 'error',

      /* ---------------------------------------------------------------- */
      /* Import hygiene & deterministic ordering (perfectionist)          */
      /* ---------------------------------------------------------------- */
      'import/no-dynamic-require': 'error',
      'import/no-self-import': 'error',
      'import/no-useless-path-segments': 'error',
      'perfectionist/sort-imports': ['error', { type: 'natural' }],
      'perfectionist/sort-named-imports': ['error', { type: 'natural' }],
      'perfectionist/sort-named-exports': ['error', { type: 'natural' }],
      'perfectionist/sort-exports': ['error', { type: 'natural' }],

      /* ---------------------------------------------------------------- */
      /* Type-checked tweaks                                              */
      /* ---------------------------------------------------------------- */
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],

      /* ---------------------------------------------------------------- */
      /* No inline escape hatches — exceptions must live in config        */
      /* ---------------------------------------------------------------- */
      'eslint-comments/no-use': 'error',

      /* ---------------------------------------------------------------- */
      /* Filenames — camelCase (checks basenames, not directories)        */
      /* ---------------------------------------------------------------- */
      'check-file/filename-naming-convention': [
        'error',
        { '**/*.{js,ts}': 'CAMEL_CASE' },
        { ignoreMiddleExtensions: true },
      ],

      /* ---------------------------------------------------------------- */
      /* Unicorn                                                          */
      /* ---------------------------------------------------------------- */
      'unicorn/no-abusive-eslint-disable': 'error',
      'unicorn/no-empty-file': 'error',
      'unicorn/prefer-at': 'error',
      'unicorn/prefer-includes': 'error',
      'unicorn/prefer-node-protocol': 'error',
      'unicorn/prefer-string-slice': 'error',
      'unicorn/throw-new-error': 'error',

      /* ---------------------------------------------------------------- */
      /* JSDoc — documentation is mandatory                               */
      /* ---------------------------------------------------------------- */
      'jsdoc/check-access': 'warn',
      'jsdoc/check-alignment': 'warn',
      'jsdoc/check-param-names': 'warn',
      'jsdoc/check-property-names': 'warn',
      'jsdoc/check-tag-names': 'warn',
      'jsdoc/check-types': 'warn',
      'jsdoc/check-values': 'warn',
      'jsdoc/empty-tags': 'warn',
      'jsdoc/implements-on-classes': 'warn',
      'jsdoc/multiline-blocks': 'warn',
      'jsdoc/no-multi-asterisks': 'warn',
      'jsdoc/require-param': 'warn',
      'jsdoc/require-param-description': 'warn',
      'jsdoc/require-param-name': 'warn',
      'jsdoc/require-param-type': 'warn',
      'jsdoc/require-property': 'warn',
      'jsdoc/require-property-description': 'warn',
      'jsdoc/require-property-name': 'warn',
      'jsdoc/require-property-type': 'warn',
      'jsdoc/require-returns': 'warn',
      'jsdoc/require-returns-check': 'warn',
      'jsdoc/require-returns-type': 'warn',
      'jsdoc/tag-lines': 'warn',
      'jsdoc/valid-types': 'warn',
    },
  }
);
