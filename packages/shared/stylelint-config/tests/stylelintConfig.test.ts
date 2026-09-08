import stylelint from 'stylelint';
import { describe, expect, it } from 'vitest';

import config from '../src/index.js';

/**
 * Smoke tests for `@april/stylelint-config`.
 *
 * The repository contains no Less sources yet, so without these tests the
 * config would have zero CI coverage: a broken rule name, an incompatible
 * Stylelint upgrade, or a failing `postcss-less` resolution would ship
 * silently and only surface months later in a consuming package.
 *
 * The suite locks in the config's two contracts:
 * - idiomatic Less must produce zero diagnostics (no false positives), and
 * - real errors must be caught by the expected rules.
 */

/**
 * Lints a Less source string with the shared config and returns the result
 * for the single virtual file.
 * @param {string} code - Less source to lint.
 * @returns {Promise<stylelint.LintResult>} The lint result for `code`.
 */
async function lintLess(code: string): Promise<stylelint.LintResult> {
  const outcome = await stylelint.lint({ code, config });
  const [result] = outcome.results;

  if (!result) {
    throw new Error('stylelint returned no results');
  }

  return result;
}

describe('@april/stylelint-config', () => {
  /**
   * Idiomatic Less — `//` comments, `@variables`, empty hook mixins, Less
   * color functions, `:extend()`, positional selector repetition, and
   * variable-driven font stacks — must lint completely clean.
   */
  it('accepts idiomatic Less without false positives', async () => {
    const result = await lintLess(`
// Single-line Less comment
@global-color: #1e87f0;
@global-font-family: -apple-system, sans-serif;

.hook-button() {}

.button {
  color: darken(@global-color, 10%);
  font-family: @global-font-family;
  .hook-button();
}

.dropdown:extend(.button) {
  background: lighten(@global-color, 30%);
}

.button {
  border-radius: 4px;
}
`);

    expect(result.parseErrors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.errored).toBeFalsy();
  });

  /**
   * A block of genuine errors must be caught, each by the rule that owns it.
   * This guards every enabled rule name against typos and upstream renames.
   */
  it('catches real errors with the expected rules', async () => {
    const result = await lintLess(`
.broken {
  color: #zzz;
  width: 10pixels;
  margin: 5px 5px 5px 5px;
  font-family: Arial, Arial, sans-serif;
  background: linear-gradient(top, #fff, #000);
  padding: calc(100%-20px);
  border: 1px solid red;
  border: 1px solid red;
}
/**/
`);

    const firedRules = new Set(result.warnings.map(warning => warning.rule));

    expect(firedRules).toContain('color-no-invalid-hex');
    expect(firedRules).toContain('unit-no-unknown');
    expect(firedRules).toContain('shorthand-property-no-redundant-values');
    expect(firedRules).toContain('font-family-no-duplicate-names');
    expect(firedRules).toContain('function-linear-gradient-no-nonstandard-direction');
    expect(firedRules).toContain('function-calc-no-unspaced-operator');
    expect(firedRules).toContain('declaration-block-no-duplicate-properties');
    expect(firedRules).toContain('comment-no-empty');
  });

  /**
   * Locks in the simplification of `property-no-unknown`: Stylelint exempts
   * custom properties and vendor-prefixed properties by default, so the
   * config needs no ignore list — but genuinely unknown properties must
   * still be flagged.
   */
  it('reports unknown properties while exempting custom and prefixed ones', async () => {
    const result = await lintLess(`
.probe {
  --custom-prop: 10px;
  -webkit-imaginary-thing: 1;
  definitely-not-a-property: 1;
}
`);

    const unknownPropertyWarnings = result.warnings.filter(warning => warning.rule === 'property-no-unknown');

    expect(unknownPropertyWarnings).toHaveLength(1);
    expect(unknownPropertyWarnings[0]?.text).toContain('definitely-not-a-property');
  });

  /**
   * The custom syntax must resolve to an absolute path inside this package's
   * dependency tree — the guarantee that consumers never need to install
   * `postcss-less` themselves under pnpm's strict layout.
   */
  it('resolves postcss-less from its own dependency tree', () => {
    expect(typeof config.customSyntax).toBe('string');
    expect(config.customSyntax).toMatch(/postcss-less/u);
    expect(String(config.customSyntax).startsWith('/')).toBe(true);
  });
});
