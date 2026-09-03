/**
 * Shared strict base ESLint configuration for the April monorepo.
 *
 * This preset is environment-agnostic (it declares no runtime globals) and is
 * consumed by the `frontend` and `backend` presets. It composes:
 *
 * - `@eslint/js` recommended (core correctness rules)
 * - `typescript-eslint` strict + stylistic, fully type-checked
 * - `eslint-plugin-regexp`, `eslint-plugin-sonarjs`, `eslint-plugin-promise`
 * - `@april/import-sort` (import statement + specifier ordering),
 *   `eslint-plugin-import-x` (import hygiene), `eslint-plugin-perfectionist`
 *   (export sorting), `eslint-plugin-unicorn`, `eslint-plugin-jsdoc`,
 *   `eslint-plugin-check-file`
 *
 * This module is composition only — every rule decision lives in a documented
 * group under `./rules/`, one file per concern.
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

import importSort from '@april/import-sort';

import { JSDOC_RULES } from './rules/jsdoc.js';
import { GOVERNANCE_RULES, IMPORT_RULES, PRESET_OVERRIDES, UNICORN_RULES } from './rules/plugins.js';
import { SHARED_RULES } from './rules/shared.js';
import { TS_EXTENSION_RULES, TS_TYPE_AWARE_RULES } from './rules/typescript.js';

import type { Linter } from 'eslint';

/**
 * Build artifacts and vendored directories that must never be linted.
 *
 * Deliberately not part of {@link base}: global ignores belong at the top of
 * the consuming config exactly once, whereas `base` may be extended by several
 * file-scoped blocks. Spread it as the first element of a package's own
 * `eslint.config.*`.
 */
export const ignores: Linter.Config = {
  ignores: ['**/artifacts/', '**/dist/', '**/build/', '**/node_modules/', '**/.turbo/', '**/.vendor/'],
};

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
      'import-sort': importSort,
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
    settings: {
      jsdoc: {
        // Keep @fileoverview as-is instead of rewriting it to @file; module
        // headers across the monorepo use the long form deliberately.
        tagNamePreference: { fileoverview: 'fileoverview' },
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
      ...PRESET_OVERRIDES,
    },
  }
);
