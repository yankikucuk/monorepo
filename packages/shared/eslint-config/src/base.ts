/**
 * Shared strict base ESLint configuration for the April monorepo.
 *
 * This preset is environment-agnostic (it declares no runtime globals) and is
 * consumed by the `frontend` and `backend` presets. It composes:
 *
 * - `@eslint/js` recommended (core correctness rules)
 * - `typescript-eslint` strict + stylistic, fully type-checked
 * - `eslint-plugin-regexp`, `eslint-plugin-sonarjs`, `eslint-plugin-promise`
 * - `eslint-plugin-import-x` (ordering + hygiene), `eslint-plugin-perfectionist`
 *   (named-import/export sorting), `eslint-plugin-unicorn`,
 *   `eslint-plugin-jsdoc`, `eslint-plugin-check-file`
 *
 * Rules are organized into named groups (shared core, TypeScript extensions,
 * type-aware, plugins, docs) so each concern can be reviewed and evolved in
 * isolation.
 */

import js from '@eslint/js';
import eslintComments from '@eslint-community/eslint-plugin-eslint-comments';
import checkFile from 'eslint-plugin-check-file';
import eslintPluginImportX from 'eslint-plugin-import-x';
import eslintPluginJsdoc from 'eslint-plugin-jsdoc';
import perfectionist from 'eslint-plugin-perfectionist';
import promise from 'eslint-plugin-promise';
import * as regexp from 'eslint-plugin-regexp';
import sonarjs from 'eslint-plugin-sonarjs';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import tseslint from 'typescript-eslint';
import type { Linter } from 'eslint';

/**
 * Build artifacts and vendored directories that must never be linted.
 */
export const ignores: Linter.Config = {
  ignores: ['**/artifacts/', '**/dist/', '**/build/', '**/node_modules/', '**/.turbo/', '**/.vendor/', '**/.claude/'],
};

/**
 * Core rules applied identically to JavaScript and TypeScript sources:
 * correctness hardening, complexity/size limits, restrictions, and style.
 */
const SHARED_RULES: Linter.RulesRecord = {
  /* ── Possible errors not in recommended ─────────────────────────────── */
  'no-await-in-loop': 'error',
  'no-promise-executor-return': 'error',
  'no-template-curly-in-string': 'error',
  'no-unmodified-loop-condition': 'error',
  'no-unreachable-loop': 'error',
  'require-atomic-updates': 'error',

  /* ── Complexity & size limits ────────────────────────────────────────── */
  complexity: 'error',
  'max-classes-per-file': 'error',
  'max-depth': 'error',
  'max-lines': ['error', { max: 500, skipBlankLines: true, skipComments: true }],
  'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
  'max-nested-callbacks': 'error',
  'max-params': ['error', { max: 5 }],
  'max-statements': ['error', { max: 20 }],

  /* ── Best practices & restrictions ──────────────────────────────────── */
  'accessor-pairs': 'error',
  'array-callback-return': 'error',
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
  'func-names': ['error', 'as-needed'],
  'func-style': ['error', 'declaration', { allowArrowFunctions: true }],
  'grouped-accessor-pairs': 'error',
  'guard-for-in': 'error',
  'id-denylist': 'error',
  'id-length': 'error',
  'id-match': 'error',
  'logical-assignment-operators': 'error',
  'new-cap': 'error',
  'no-alert': 'error',
  'no-array-constructor': 'error',
  'no-bitwise': 'error',
  'no-caller': 'error',
  'no-console': 'warn',
  'no-constructor-return': 'error',
  'no-continue': 'error',
  'no-div-regex': 'error',
  'no-duplicate-imports': 'error',
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
  'no-proto': 'error',
  'no-restricted-globals': ['error', { name: 'event', message: 'Use a local parameter instead.' }],
  'no-restricted-properties': [
    'error',
    { property: '__defineGetter__', message: 'Use Object.defineProperty instead.' },
  ],
  'no-restricted-syntax': [
    'error',
    { selector: 'ForInStatement', message: 'Use Object.keys/values/entries() instead of for…in.' },
  ],
  'no-return-assign': 'error',
  'no-script-url': 'error',
  'no-self-compare': 'error',
  'no-sequences': 'error',
  'no-undef-init': 'error',
  'no-undefined': 'error',
  'no-underscore-dangle': 'error',
  'no-unneeded-ternary': 'error',
  'no-useless-call': 'error',
  'no-useless-computed-key': 'error',
  'no-useless-concat': 'error',
  'no-useless-rename': 'error',
  'no-useless-return': 'error',
  'no-var': 'error',
  'no-void': ['error', { allowAsStatement: true }],
  'no-warning-comments': 'error',
  'object-shorthand': 'error',
  'operator-assignment': 'error',
  'prefer-arrow-callback': 'error',
  'prefer-const': 'error',
  'prefer-exponentiation-operator': 'error',
  'prefer-named-capture-group': 'error',
  'prefer-numeric-literals': 'error',
  'prefer-object-has-own': 'error',
  'prefer-object-spread': 'error',
  'prefer-regex-literals': 'error',
  'prefer-rest-params': 'error',
  'prefer-spread': 'error',
  'prefer-template': 'error',
  radix: 'error',
  'require-unicode-regexp': 'error',
  strict: 'error',
  'symbol-description': 'error',
  'unicode-bom': 'error',
  'vars-on-top': 'error',
  yoda: 'error',
};

/**
 * TypeScript extension rules — the core versions are disabled and replaced by
 * their type-system-aware `@typescript-eslint` equivalents.
 */
const TS_EXTENSION_RULES: Linter.RulesRecord = {
  'class-methods-use-this': 'off',
  '@typescript-eslint/class-methods-use-this': 'error',
  'default-param-last': 'off',
  '@typescript-eslint/default-param-last': 'error',
  'dot-notation': 'off',
  '@typescript-eslint/dot-notation': 'error',
  'init-declarations': 'off',
  '@typescript-eslint/init-declarations': 'error',
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
const TS_TYPE_AWARE_RULES: Linter.RulesRecord = {
  '@typescript-eslint/await-thenable': 'error',
  '@typescript-eslint/no-floating-promises': 'error',
  '@typescript-eslint/no-misused-promises': 'error',
  '@typescript-eslint/no-unnecessary-type-assertion': 'error',
  '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
  '@typescript-eslint/return-await': ['error', 'in-try-catch'],
};

/**
 * Unicorn rules. `unicorn/filename-case` is intentionally replaced by
 * `check-file/filename-naming-convention`, which checks basenames only —
 * unicorn's version also flags kebab-case package directories.
 */
const UNICORN_RULES: Linter.RulesRecord = {
  'unicorn/no-abusive-eslint-disable': 'error',
  'unicorn/no-empty-file': 'error',
  'unicorn/prefer-at': 'error',
  'unicorn/prefer-includes': 'error',
  'unicorn/prefer-node-protocol': 'error',
  'unicorn/prefer-string-slice': 'error',
  'unicorn/throw-new-error': 'error',
};

/**
 * Import hygiene and deterministic ordering. Statement ordering is owned by
 * `import/order`; perfectionist sorts the specifiers inside braces (a concern
 * `import/order` does not cover).
 */
const IMPORT_RULES: Linter.RulesRecord = {
  'import/no-dynamic-require': 'error',
  'import/no-self-import': 'error',
  'import/no-useless-path-segments': 'error',
  'import/order': [
    'error',
    {
      groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type'],
      alphabetize: { order: 'asc' },
    },
  ],
  'perfectionist/sort-exports': ['error', { type: 'natural' }],
  'perfectionist/sort-named-exports': ['error', { type: 'natural' }],
  'perfectionist/sort-named-imports': ['error', { type: 'natural' }],
};

/**
 * JSDoc rules for TypeScript sources. Type-annotation requirements
 * (`require-*-type`, `check-types`, `valid-types`) are intentionally omitted:
 * TypeScript already enforces types, and duplicating them in JSDoc is
 * redundant and noisy. The JS-specific additions live in
 * {@link JSDOC_JS_TYPE_RULES}.
 */
const JSDOC_RULES: Linter.RulesRecord = {
  'jsdoc/check-access': 'warn',
  'jsdoc/check-alignment': 'warn',
  'jsdoc/check-param-names': 'warn',
  'jsdoc/check-property-names': 'warn',
  'jsdoc/check-tag-names': ['warn', { definedTags: ['fileoverview'] }],
  'jsdoc/check-values': 'warn',
  'jsdoc/empty-tags': 'warn',
  'jsdoc/implements-on-classes': 'warn',
  'jsdoc/multiline-blocks': 'warn',
  'jsdoc/no-multi-asterisks': 'warn',
  'jsdoc/require-jsdoc': 'warn',
  'jsdoc/require-param': 'warn',
  'jsdoc/require-param-description': 'warn',
  'jsdoc/require-param-name': 'warn',
  'jsdoc/require-property': 'warn',
  'jsdoc/require-property-description': 'warn',
  'jsdoc/require-property-name': 'warn',
  'jsdoc/require-returns': 'warn',
  'jsdoc/require-returns-check': 'warn',
  'jsdoc/require-yields': 'warn',
  'jsdoc/require-yields-check': 'warn',
  'jsdoc/tag-lines': 'warn',
};

/**
 * JSDoc type-annotation rules for plain JavaScript files, where no compiler
 * enforces types. Apply on top of {@link JSDOC_RULES} for `.js`/`.mjs`/`.cjs`.
 */
export const JSDOC_JS_TYPE_RULES: Linter.RulesRecord = {
  'jsdoc/check-types': 'warn',
  'jsdoc/require-param-type': 'warn',
  'jsdoc/require-property-type': 'warn',
  'jsdoc/require-returns-type': 'warn',
  'jsdoc/valid-types': 'warn',
};

/**
 * Relaxed limits for test files: test bodies legitimately run longer than
 * product functions, and fixture values read clearer inline.
 */
export const TEST_RULES: Linter.RulesRecord = {
  'max-lines-per-function': ['error', { max: 100, skipBlankLines: true, skipComments: true }],
  'max-statements': ['error', { max: 40 }],
};

/**
 * Repository governance rules: no inline escape hatches in product code and
 * camelCase file names (basenames only, so kebab-case package directories
 * remain valid).
 */
const GOVERNANCE_RULES: Linter.RulesRecord = {
  'eslint-comments/no-use': 'error',
  'check-file/filename-naming-convention': [
    'error',
    { '**/*.{js,ts}': 'CAMEL_CASE' },
    { ignoreMiddleExtensions: true },
  ],
};

/**
 * The strict, type-checked base configuration.
 *
 * Consumers must set `languageOptions.parserOptions.tsconfigRootDir` (and
 * provide runtime globals) via the `frontend` / `backend` presets or their own
 * project config.
 */
export const base = tseslint.config(
  ignores,
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
      ...SHARED_RULES,
      ...TS_EXTENSION_RULES,
      ...TS_TYPE_AWARE_RULES,
      ...UNICORN_RULES,
      ...IMPORT_RULES,
      ...JSDOC_RULES,
      ...GOVERNANCE_RULES,
    },
  }
);
