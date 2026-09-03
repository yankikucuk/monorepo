/**
 * The ESLint plugin object (flat config only).
 *
 * `configs.recommended` registers the plugin under the `import-sort` namespace
 * and enables `import-sort/order` with its defaults. The plugin and the config
 * reference the *same* object, so consumers may combine `configs.recommended`
 * with a manual `plugins: { 'import-sort': plugin }` registration without
 * hitting ESLint's "Cannot redefine plugin" error.
 * @packageDocumentation
 */

import { createRequire } from 'node:module';

import { order } from './rules/order.js';

import type { TSESLint } from '@typescript-eslint/utils';

/** The subset of `package.json` the plugin exposes through `meta`. */
interface PackageManifest {
  readonly name: string;
  readonly version: string;
}

const loadJson = createRequire(import.meta.url);
const { name, version } = loadJson('../../package.json') as PackageManifest;

/** Every rule of the plugin, keyed by its short name. */
export const rules = { order } as const;

const base = { meta: { name, version }, rules } satisfies TSESLint.FlatConfig.Plugin;

/** Shared configurations. */
export const configs = {
  /** Registers the plugin as `import-sort` and enables `import-sort/order` (error) with default options. */
  recommended: {
    name: 'import-sort/recommended',
    plugins: { 'import-sort': base },
    rules: { 'import-sort/order': 'error' },
  } satisfies TSESLint.FlatConfig.Config,
};

/** The plugin: `meta`, `rules`, and `configs`. */
export const plugin = Object.assign(base, { configs });

/** Type of the plugin object. */
export type ImportSortPlugin = typeof plugin;
