/**
 * @fileoverview Shared Stylelint configuration for the April monorepo.
 *
 * Targets Less files used by April's CSS framework packages (e.g. the planned
 * `packages/interface`). Uses `postcss-less` as the custom syntax so
 * Less-specific constructs — variables, mixins, `//` single-line comments, and
 * `@`-rule extensions — are parsed correctly instead of being rejected as
 * invalid CSS.
 *
 * Rules are calibrated to catch real errors (invalid hex, unknown units,
 * duplicate properties) while suppressing false positives on valid Less
 * patterns that plain CSS-aware Stylelint would otherwise flag.
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
 * Stylelint configuration object for Less source files.
 *
 * Sets `postcss-less` as the custom syntax parser and configures a curated
 * rule set that enforces correctness without generating noise from Less idioms.
 * Rules are grouped by the Stylelint category they belong to; disabled rules
 * (`null`) include an inline comment explaining the Less-specific reason.
 * @type {import('stylelint').Config}
 */
export default {
  customSyntax: require.resolve('postcss-less'),
  rules: {
    // --- Color ---
    'color-no-invalid-hex': true,

    // --- Font ---
    'font-family-no-duplicate-names': true,
    // Font stacks live in @variables; the rule cannot see through Less
    // interpolation and would flag every variable-driven `font-family`.
    'font-family-no-missing-generic-family-keyword': null,

    // --- Function ---
    // Less ships its own functions (darken, lighten, data-uri, escape, replace…)
    // that Stylelint would flag as unknown — disable the rule entirely.
    'function-no-unknown': null,
    'function-calc-no-unspaced-operator': true,
    'function-linear-gradient-no-nonstandard-direction': true,

    // --- String ---
    'string-no-newline': true,

    // --- Unit ---
    'unit-no-unknown': true,

    // --- Custom property ---
    'custom-property-no-missing-var-function': true,

    // --- Property ---
    // Some Less-generated or vendor properties look "unknown" to Stylelint.
    'property-no-unknown': [
      true,
      {
        ignoreProperties: [
          // CSS custom properties generated via Less variable interpolation
          '/^--/',
          // Common vendor prefixes that postcss-less may not recognise
          '/^-webkit-/',
          '/^-moz-/',
          '/^-ms-/',
          '/^-o-/',
        ],
      },
    ],

    // --- Keyframe ---
    'keyframe-declaration-no-important': true,

    // --- Declaration block ---
    // Allow consecutive duplicate properties when the values differ
    // (a common pattern for progressive enhancement / fallback values).
    'declaration-block-no-duplicate-properties': [true, { ignore: ['consecutive-duplicates-with-different-values'] }],
    'declaration-block-no-shorthand-property-overrides': true,

    // --- Shorthand ---
    'shorthand-property-no-redundant-values': true,

    // --- Block ---
    // Less frameworks commonly define empty hook mixins (.hook-component() {})
    // as overridable extensibility stubs. These are intentionally empty and
    // would produce a flood of false positives — disable the rule.
    'block-no-empty': null,

    // --- Selector ---
    // Less files may intentionally repeat a selector in separate positional
    // sections (e.g. popover placement variants). Disable to avoid false
    // positives on valid Less architecture.
    'no-duplicate-selectors': null,
    // Framework cascade ordering (e.g. placement/state variants) routinely
    // violates specificity descent on purpose — the rule is all noise here.
    'no-descending-specificity': null,
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
    // Less uses many non-standard at-rules (@plugin, @import (reference), etc.)
    // and treats @variable declarations as at-rules — disable the rule entirely.
    'at-rule-no-unknown': null,
    'no-duplicate-at-import-rules': true,
    // Less allows @import anywhere (after variables, inside mixin guards…);
    // the CSS-positional restriction does not apply.
    'no-invalid-position-at-import-rule': null,

    // --- Comment ---
    // Less uses // single-line comments; Stylelint treats them as invalid
    // double-slash comments in standard CSS — disable the rule.
    'no-invalid-double-slash-comments': null,
    'comment-no-empty': true,

    // --- General ---
    'annotation-no-unknown': true,
    'no-irregular-whitespace': true,
  },
};
