import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import * as tsParser from '@typescript-eslint/parser';
import { Linter } from 'eslint';
import { afterAll, describe, expect, it } from 'vitest';

import { internalPatternsFromTsconfig } from '../src/eslint/tsconfig.js';
import importSort from '../src/index.js';

/** Temporary directories created by the tests, removed after the run. */
const directories: string[] = [];

/**
 * Writes a throwaway `tsconfig.json` and returns the directory holding it.
 * @param {string} contents - File contents.
 * @param {string} [name] - File name.
 * @returns {string} The directory.
 */
function withTsconfig(contents: string, name = 'tsconfig.json'): string {
  const directory = mkdtempSync(join(tmpdir(), 'import-sort-'));
  directories.push(directory);
  writeFileSync(join(directory, name), contents, 'utf8');
  return directory;
}

afterAll(() => {
  for (const directory of directories) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('internalPatternsFromTsconfig', () => {
  it('turns wildcard aliases into anchored patterns and exact aliases into literal ones', () => {
    const directory = withTsconfig(
      JSON.stringify({
        compilerOptions: { baseUrl: '.', paths: { '@app/*': ['src/*'], '~config': ['src/config.ts'] } },
      })
    );

    expect(internalPatternsFromTsconfig({ rootDir: directory }, join(directory, 'a.ts'))).toEqual([
      String.raw`^@app/.*$`,
      String.raw`^~config$`,
    ]);
  });

  it('tolerates comments and trailing commas, as tsc does', () => {
    const directory = withTsconfig('{\n  // aliases\n  "compilerOptions": { "paths": { "#lib/*": ["lib/*"] } },\n}');

    expect(internalPatternsFromTsconfig({ rootDir: directory }, join(directory, 'a.ts'))).toEqual([
      String.raw`^#lib/.*$`,
    ]);
  });

  it('escapes regular-expression metacharacters in aliases', () => {
    const directory = withTsconfig(JSON.stringify({ compilerOptions: { paths: { '$lib.core/*': ['lib/*'] } } }));

    expect(internalPatternsFromTsconfig({ rootDir: directory }, join(directory, 'a.ts'))).toEqual([
      String.raw`^\$lib\.core/.*$`,
    ]);
  });

  it('keeps a suffix after the wildcard and skips a catch-all alias', () => {
    const directory = withTsconfig(
      JSON.stringify({ compilerOptions: { paths: { '*': ['types/*'], '@app/*.js': ['src/*.ts'] } } })
    );

    expect(internalPatternsFromTsconfig({ rootDir: directory }, join(directory, 'a.ts'))).toEqual([
      String.raw`^@app/.*\.js$`,
    ]);
  });

  it('yields nothing for a malformed configuration file', () => {
    const directory = withTsconfig('{ "compilerOptions": { "paths": ');

    expect(internalPatternsFromTsconfig({ rootDir: directory }, join(directory, 'a.ts'))).toEqual([]);
  });

  it('yields nothing when the configuration has no paths', () => {
    const directory = withTsconfig(JSON.stringify({ compilerOptions: {} }));

    expect(internalPatternsFromTsconfig({ rootDir: directory }, join(directory, 'a.ts'))).toEqual([]);
  });

  it('honours a custom file name and yields nothing when it is missing', () => {
    const directory = withTsconfig(
      JSON.stringify({ compilerOptions: { paths: { '@x/*': ['x/*'] } } }),
      'tsconfig.lint.json'
    );

    expect(
      internalPatternsFromTsconfig({ rootDir: directory, filename: 'tsconfig.lint.json' }, join(directory, 'a.ts'))
    ).toEqual([String.raw`^@x/.*$`]);
    expect(
      internalPatternsFromTsconfig({ rootDir: directory, filename: 'nope.json' }, join(directory, 'a.ts'))
    ).toEqual([]);
  });
});

describe('the tsconfig option, end to end', () => {
  it('puts aliased imports in the internal group', () => {
    const directory = withTsconfig(JSON.stringify({ compilerOptions: { paths: { '@app/*': ['src/*'] } } }));
    const linter = new Linter();
    const config = [
      {
        files: ['**/*.ts'],
        languageOptions: { parser: tsParser, ecmaVersion: 'latest', sourceType: 'module' },
        plugins: { 'import-sort': importSort },
        rules: { 'import-sort/order': ['error', { tsconfig: { rootDir: directory } }] },
      },
    ] as never;

    const { output } = linter.verifyAndFix(
      "import local from './local.js';\nimport aliased from '@app/thing';\nimport pkg from 'zod';\n",
      config,
      'file.ts'
    );

    expect(output).toBe(
      "import pkg from 'zod';\n\nimport aliased from '@app/thing';\n\nimport local from './local.js';\n"
    );
  });
});
