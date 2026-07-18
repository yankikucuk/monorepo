/**
 * @fileoverview Shared Stylelint configuration for the April monorepo.
 *
 * Targets Less files used by April's CSS framework packages (e.g. the planned
 * `packages/interface`). Uses `postcss-less` as the custom syntax so
 * Less-specific constructs — variables, mixins, `//` single-line comments, and
 * `@`-rule extensions — are parsed correctly instead of being rejected as
 * invalid CSS.
 *
 * Rules are split into two documented groups, mirroring the structure of
 * `@april/eslint-config`:
 *
 * - {@link CORRECTNESS_RULES} — enabled rules that catch real errors.
 * - {@link LESS_EXEMPTIONS} — rules disabled (`null`) because valid Less
 *   idioms would otherwise produce false positives; every entry carries its
 *   reason.
 *
 * Formatting is intentionally out of scope — Prettier owns it.
 *
 * ### Usage
 *
 * Reference this package from a project's `.stylelintrc.json`:
 * ```json
 * { "extends": ["@april/stylelint-config"] }
 * ```
 *
 * Or import and spread it in a `stylelint.config.js` to add overrides:
 * ```js
 * import base from '@april/stylelint-config';
 * export default { ...base, rules: { ...base.rules, 'color-no-invalid-hex': null } };
 * ```
 * @module @april/stylelint-config
 */

import { createRequire } from 'node:module';

/**
 * Resolves `postcss-less` from THIS package's dependency tree.
 *
 * Under pnpm's strict `node_modules` layout, passing the bare string
 * `'postcss-less'` would make Stylelint resolve it from the consumer's tree,
 * where it is not installed. Resolving to an absolute path here keeps the
 * syntax dependency fully encapsulated in this shareable config.
 */
const require = createRequire(import.meta.url);

/**
 * Enabled rules that catch real errors: invalid values, unknown constructs,
 * duplicates, and overrides that silently discard declarations.
 *
 * Note on `property-no-unknown`: no ignore list is needed — Stylelint already
 * exempts custom properties (`--foo`) and vendor-prefixed properties by
 * default (`checkPrefixed: false`), which the test suite locks in.
 * @type {import('stylelint').Config['rules']}
 */
const CORRECTNESS_RULES = {
  // --- Color ---
  'color-no-invalid-hex': true,

  // --- Font ---
  'font-family-no-duplicate-names': true,

  // --- Function ---
  'function-calc-no-unspaced-operator': true,
  'function-linear-gradient-no-nonstandard-direction': true,

  // --- String ---
  'string-no-newline': true,

  // --- Unit ---
  'unit-no-unknown': true,

  // --- Custom property ---
  'custom-property-no-missing-var-function': true,

  // --- Property ---
  'property-no-unknown': true,

  // --- Keyframe ---
  'keyframe-declaration-no-important': true,

  // --- Declaration block ---
  // Allow consecutive duplicate properties when the values differ
  // (a common pattern for progressive enhancement / fallback values).
  'declaration-block-no-duplicate-properties': [true, { ignore: ['consecutive-duplicates-with-different-values'] }],
  'declaration-block-no-shorthand-property-overrides': true,

  // --- Shorthand ---
  'shorthand-property-no-redundant-values': true,

  // --- Selector ---
  // Less uses :extend() and :global() as pseudo-classes.
  'selector-pseudo-class-no-unknown': [true, { ignorePseudoClasses: ['extend', 'global', 'local'] }],
  'selector-pseudo-element-no-unknown': true,
  // Allow custom elements used in component markup.
  'selector-type-no-unknown': [true, { ignore: ['custom-elements'] }],
  'selector-anb-no-unmatchable': true,

  // --- Grid ---
  'named-grid-areas-no-invalid': true,

  // --- Media ---
  'media-feature-name-no-unknown': true,

  // --- At-rule ---
  'no-duplicate-at-import-rules': true,

  // --- Comment ---
  'comment-no-empty': true,

  // --- General ---
  'annotation-no-unknown': true,
  'no-irregular-whitespace': true,
};

/**
 * Rules disabled because valid Less idioms would otherwise produce false
 * positives. Every entry documents the specific idiom that breaks it.
 * @type {import('stylelint').Config['rules']}
 */
const LESS_EXEMPTIONS = {
  // Less ships its own functions (darken, lighten, data-uri, escape, replace…)
  // that Stylelint would flag as unknown.
  'function-no-unknown': null,

  // Font stacks live in @variables; the rule cannot see through Less
  // interpolation and would flag every variable-driven `font-family`.
  'font-family-no-missing-generic-family-keyword': null,

  // Less frameworks commonly define empty hook mixins (.hook-component() {})
  // as overridable extensibility stubs; these are intentionally empty.
  'block-no-empty': null,

  // Less files may intentionally repeat a selector in separate positional
  // sections (e.g. popover placement variants).
  'no-duplicate-selectors': null,

  // Framework cascade ordering (e.g. placement/state variants) routinely
  // violates specificity descent on purpose — the rule is all noise here.
  'no-descending-specificity': null,

  // Less uses many non-standard at-rules (@plugin, @import (reference), etc.)
  // and treats @variable declarations as at-rules.
  'at-rule-no-unknown': null,

  // Less allows @import anywhere (after variables, inside mixin guards…);
  // the CSS-positional restriction does not apply.
  'no-invalid-position-at-import-rule': null,

  // Less uses // single-line comments; Stylelint treats them as invalid
  // double-slash comments in standard CSS.
  'no-invalid-double-slash-comments': null,
};

/**
 * Stylelint configuration object for Less source files.
 * @type {import('stylelint').Config}
 */
export default {
  customSyntax: require.resolve('postcss-less'),
  rules: {
    ...CORRECTNESS_RULES,
    ...LESS_EXEMPTIONS,
  },
};
