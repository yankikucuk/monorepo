import { createRequire } from 'node:module';

import * as tsParser from '@typescript-eslint/parser';
import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

import { plugin } from '../src/eslint/plugin.js';
import importSort, { configs, DEFAULT_ORDER_RULE_OPTIONS, order, ORDER_OPTIONS_SCHEMA, rules } from '../src/index.js';

/**
 * Plugin-level tests: the flat-config surface, end-to-end linting through
 * ESLint's `Linter` (both the TypeScript parser and the default ESTree
 * parser), and configuration validation.
 */

const manifest = createRequire(import.meta.url)('../package.json') as { name: string; version: string };

/**
 * Lints and fixes source with the recommended config.
 * @param {string} code - Source text.
 * @param {Linter.Config} [overrides] - Extra flat-config fields (parser, rule options).
 * @param {string} [filename] - Virtual file name.
 * @returns {Linter.FixReport} ESLint's fix report.
 */
function lint(code: string, overrides: Linter.Config = {}, filename = 'file.ts'): Linter.FixReport {
  const linter = new Linter();
  const config = { files: ['**/*.ts', '**/*.js'], ...(configs.recommended as Linter.Config), ...overrides };
  return linter.verifyAndFix(code, [config], { filename });
}

const typescript: Linter.Config = { languageOptions: { parser: tsParser } };

describe('plugin object', () => {
  it('reports its package name and version', () => {
    expect(plugin.meta).toEqual({ name: manifest.name, version: manifest.version });
    expect(plugin.meta.name).toBe('@april/import-sort');
  });

  it('exposes the order rule and the recommended config', () => {
    expect(Object.keys(rules)).toEqual(['order']);
    expect(rules.order).toBe(order);
    expect(plugin.rules).toBe(rules);
    expect(configs.recommended.rules).toEqual({ 'import-sort/order': 'error' });
    expect(configs.recommended.plugins['import-sort']).toBe(plugin);
    expect(plugin.configs.recommended).toBe(configs.recommended);
  });

  it('default-exports the same plugin object', () => {
    expect(importSort).toBe(plugin);
  });

  it('declares rule metadata ESLint needs for fixing and docs', () => {
    expect(order.meta.type).toBe('layout');
    expect(order.meta.fixable).toBe('code');
    expect(order.meta.docs?.url).toMatch(/#rule-import-sortorder$/u);
    expect(order.meta.schema).toEqual([ORDER_OPTIONS_SCHEMA]);
    expect(DEFAULT_ORDER_RULE_OPTIONS).toEqual({
      newlinesBetween: 'always',
      sortSpecifiers: true,
      typeSpecifiers: 'mixed',
    });
  });
});

describe('recommended config end to end', () => {
  it('sorts TypeScript sources through ESLint', () => {
    const report = lint(
      ["import type { T } from './t.js';", "import { b, a } from './ab.js';", "import fs from 'node:fs';", ''].join(
        '\n'
      ),
      typescript
    );
    expect(report.fixed).toBe(true);
    expect(report.messages).toEqual([]);
    expect(report.output).toBe(
      [
        "import fs from 'node:fs';",
        '',
        "import { a, b } from './ab.js';",
        '',
        "import type { T } from './t.js';",
        '',
      ].join('\n')
    );
  });

  it('works with the default ESTree parser on plain JavaScript', () => {
    const report = lint(["import b from 'b';", "import { d, c } from 'c';", ''].join('\n'), {}, 'file.js');
    expect(report.output).toBe(["import b from 'b';", "import { c, d } from 'c';", ''].join('\n'));
    expect(report.messages).toEqual([]);
  });

  it('accepts rule options through the config', () => {
    const report = lint(["import a from 'a';", "import b from 'b';", ''].join('\n'), {
      rules: { 'import-sort/order': ['error', { order: 'desc' }] },
    });
    expect(report.output).toBe(["import b from 'b';", "import a from 'a';", ''].join('\n'));
  });

  it('reports with rule id and message when not fixing', () => {
    const linter = new Linter();
    const messages = linter.verify("import b from 'b';\nimport a from 'a';\n", [configs.recommended as Linter.Config], {
      filename: 'file.js',
    });
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      ruleId: 'import-sort/order',
      messageId: 'unsortedImports',
      message: "'a' should be imported before 'b'.",
      line: 2,
      fix: expect.anything(),
    });
  });

  it('rejects unknown options through the JSON schema', () => {
    const linter = new Linter();
    expect(() =>
      linter.verify('', [
        { ...(configs.recommended as Linter.Config), rules: { 'import-sort/order': ['error', { nope: true }] } },
      ])
    ).toThrow(/nope/u);
  });

  it('fails fast on semantically invalid options', () => {
    const linter = new Linter();
    expect(() =>
      linter.verify("import a from 'a';\n", [
        { ...(configs.recommended as Linter.Config), rules: { 'import-sort/order': ['error', { groups: ['nope'] }] } },
      ])
    ).toThrow(/Unknown group "nope"/u);
  });
});
