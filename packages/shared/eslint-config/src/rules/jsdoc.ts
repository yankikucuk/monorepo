/**
 * JSDoc documentation rules.
 *
 * Documentation is mandatory across the monorepo, but type annotations are
 * only required where no compiler enforces them: TypeScript sources use
 * {@link JSDOC_RULES} alone, while plain JavaScript files layer
 * {@link JSDOC_JS_TYPE_RULES} on top.
 * @packageDocumentation
 */

import type { Linter } from 'eslint';

/**
 * JSDoc rules for TypeScript sources. Type-annotation requirements
 * (`require-*-type`, `check-types`, `valid-types`) are intentionally omitted:
 * TypeScript already enforces types, and duplicating them in JSDoc is
 * redundant and noisy.
 */
export const JSDOC_RULES: Linter.RulesRecord = {
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
