import * as tsParser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';

import { order } from '../src/eslint/rules/order.js';

import type { RuleDefinition } from 'eslint';

/**
 * `import-sort/order` rule tests.
 *
 * Every invalid case's `output` is also registered as a valid case, which
 * proves the fixer converges in one pass (idempotency) and never produces
 * code the rule would flag again.
 */

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

type Valid = RuleTester.ValidTestCase;
type Invalid = RuleTester.InvalidTestCase;

/**
 * Joins lines with LF and appends the final newline every real file has.
 * @param {...string} lines - Source lines.
 * @returns {string} The source text.
 */
function src(...lines: string[]): string {
  return `${lines.join('\n')}\n`;
}

const valid: Valid[] = [
  {
    name: 'default layout with one blank line between groups',
    code: src(
      "import fs from 'node:fs';",
      "import path from 'node:path';",
      '',
      "import { Linter } from 'eslint';",
      "import react from 'react';",
      '',
      "import { util } from '#internal/util';",
      '',
      "import { up } from '../up.js';",
      '',
      "import { a } from './a.js';",
      "import { b } from './b.js';",
      '',
      "import { root } from './index.js';",
      '',
      "import styles from './styles.module.css';",
      '',
      "import type { Config } from 'eslint';",
      "import type { Local } from './types.js';"
    ),
  },
  { name: 'no imports at all', code: 'const answer = 42;\n' },
  { name: 'a single import with sorted specifiers', code: src("import { a, b, c } from 'x';") },
  {
    name: 'side-effect imports are boundaries nothing moves across',
    code: src("import z from 'z';", "import './setup.js';", "import a from 'a';"),
  },
  {
    name: 'comments above the first import stay in place',
    code: src('/** @file Module header. */', '', "import a from 'a';", "import b from 'b';"),
  },
  {
    name: 'non-import statements split the file into independent chunks',
    code: src("import b from 'b';", 'const x = 1;', "import a from 'a';"),
  },
  {
    name: 're-exports are boundaries, like any other non-import statement',
    code: src("import b from 'b';", "export { x } from './x.js';", "import a from 'a';"),
  },
  {
    name: 'an empty specifier list is a side-effect import, so it is a boundary too',
    code: src("import z from 'z';", "import {} from './setup.js';", "import a from 'a';"),
  },
  {
    name: 'imports nested in an ambient module declaration are sorted on their own',
    code: src("declare module 'legacy' {", "  import a from 'a';", "  import b from 'b';", '}'),
  },
  {
    name: 'a hashbang stays on the first line',
    code: src('#!/usr/bin/env node', "import a from 'a';", "import b from 'b';"),
  },
  {
    name: 'an import-sort-ignore comment pins an import in place',
    code: src("import z from 'z';", '// import-sort-ignore', "import m from 'm';", "import a from 'a';"),
  },
  {
    name: 'an import-sort-ignore comment works as a trailing comment too',
    code: src("import z from 'z';", "import m from 'm'; // import-sort-ignore", "import a from 'a';"),
  },
  {
    name: 'safeSideEffects lets stylesheet side effects be sorted normally',
    code: src("import a from 'a';", '', "import './a.css';", "import './b.css';"),
    options: [{ safeSideEffects: ['\\.css$'], groups: ['external', 'style'] }],
  },
  {
    name: 'partitionByComment keeps hand-written sections apart',
    code: src("import z from 'z';", '// --- fixtures', "import a from 'a';", "import m from 'm';"),
    options: [{ partitionByComment: ['^---'] }],
  },
  {
    name: 'an indented block that is already sorted',
    code: src("  import fs from 'node:fs';", '', "  import { a } from './a.js';"),
  },
  {
    name: 'a semicolon-free style with a leading-semicolon statement after the imports',
    code: src('import a from "a"', 'import b from "b"', ';[1].forEach(log)'),
  },
  {
    name: 'TypeScript import-equals declarations are boundaries',
    code: src("import b from 'b';", "import x = require('x');", "import a from 'a';"),
  },
  {
    name: 'import attributes are preserved and sorted like any other import',
    code: src("import a from 'a';", '', "import data from './data.json' with { type: 'json' };"),
  },
  {
    name: 'declarations with comments inside are never rewritten',
    code: src("import { b, /* keep */ a } from 'x';"),
  },
  {
    name: 'value import precedes the type import of the same source when type is not a group',
    code: src("import a from 'a';", "import type { A } from 'a';", "import type { B } from 'b';"),
    options: [{ groups: ['external'] }],
  },
  {
    name: 'newlinesBetween: never',
    code: src("import a from 'a';", "import { b } from './b.js';"),
    options: [{ newlinesBetween: 'never' }],
  },
  {
    name: 'sortSpecifiers: false',
    code: src("import { b, a } from 'x';"),
    options: [{ sortSpecifiers: false }],
  },
  {
    name: 'order: desc',
    code: src(
      "import b from 'b';",
      "import a from 'a';",
      '',
      "import { z } from './z.js';",
      "import { y } from './y.js';"
    ),
    options: [{ order: 'desc' }],
  },
  {
    name: 'algorithm: alphabetical compares digits as characters',
    code: src("import v10 from 'v10';", "import v2 from 'v2';"),
    options: [{ algorithm: 'alphabetical' }],
  },
  {
    name: 'ignoreCase: false keeps case as a tiebreaker, not as the primary key',
    code: src("import a from 'a';", "import b from 'B';"),
    options: [{ ignoreCase: false }],
  },
  {
    name: 'ignoreCase: false orders two spellings of the same name, lower case first',
    code: src("import lower from 'a';", "import upper from 'A';"),
    options: [{ ignoreCase: false }],
  },
  {
    name: 'custom groups',
    code: src("import react from 'react';", "import { render } from 'react-dom';", '', "import axios from 'axios';"),
    options: [{ groups: ['react', 'external'], customGroups: { react: '^react(?:-|$)' } }],
  },
  {
    name: 'merged groups sort as one list without blank lines',
    code: src("import a from '@acme/a';", "import fs from 'node:fs';", "import z from 'z';"),
    options: [{ groups: [['builtin', 'external', 'internal']], internalPattern: ['^@acme/'] }],
  },
  {
    name: 'side-effect group keeps source order',
    code: src("import './z.js';", "import './a.js';", '', "import a from 'a';"),
    options: [{ groups: ['side-effect', 'external'] }],
  },
  {
    name: 'CRLF line endings',
    code: "import a from 'a';\r\n\r\nimport { b } from './b.js';\r\n",
  },
];

const invalid: Invalid[] = [
  {
    name: 'unsorted statements inside one group',
    code: src("import b from 'b';", "import a from 'a';"),
    output: src("import a from 'a';", "import b from 'b';"),
    errors: [{ messageId: 'unsortedImports', data: { source: 'a', before: 'b' }, line: 2 }],
  },
  {
    name: 'groups out of order',
    code: src("import { a } from './a.js';", "import fs from 'node:fs';"),
    output: src("import fs from 'node:fs';", '', "import { a } from './a.js';"),
    errors: [{ messageId: 'unsortedImports', data: { source: 'node:fs', before: './a.js' }, line: 2 }],
  },
  {
    name: 'missing blank line between groups',
    code: src("import a from 'a';", "import { b } from './b.js';"),
    output: src("import a from 'a';", '', "import { b } from './b.js';"),
    errors: [{ messageId: 'missingBlankLine', data: { source: './b.js' }, line: 2 }],
  },
  {
    name: 'blank line inside a group',
    code: src("import a from 'a';", '', "import b from 'b';"),
    output: src("import a from 'a';", "import b from 'b';"),
    errors: [{ messageId: 'unexpectedBlankLine', data: { source: 'b' }, line: 3 }],
  },
  {
    name: 'two blank lines between groups',
    code: src("import a from 'a';", '', '', "import { b } from './b.js';"),
    output: src("import a from 'a';", '', "import { b } from './b.js';"),
    errors: [{ messageId: 'unexpectedBlankLine', data: { source: './b.js' }, line: 4 }],
  },
  {
    name: 'trailing spaces between imports',
    code: "import a from 'a';   \nimport b from 'b';\n",
    output: src("import a from 'a';", "import b from 'b';"),
    errors: [{ messageId: 'unexpectedWhitespace', data: { source: 'b' }, line: 2 }],
  },
  {
    name: 'blank line with newlinesBetween: never',
    code: src("import a from 'a';", '', "import { b } from './b.js';"),
    output: src("import a from 'a';", "import { b } from './b.js';"),
    options: [{ newlinesBetween: 'never' }],
    errors: [{ messageId: 'unexpectedBlankLine', data: { source: './b.js' }, line: 3 }],
  },
  {
    name: 'unsorted specifiers',
    code: src("import { b, a } from 'x';"),
    output: src("import { a, b } from 'x';"),
    errors: [{ messageId: 'unsortedSpecifiers', data: { source: 'x', specifier: 'a', before: 'b' } }],
  },
  {
    name: 'specifiers with aliases, string names, and inline type modifiers',
    code: src("import { z as first, 'b-b' as bb, type C, a } from 'x';"),
    output: src("import { a, 'b-b' as bb, type C, z as first } from 'x';"),
    errors: [{ messageId: 'unsortedSpecifiers', data: { source: 'x', specifier: 'a', before: 'z' } }],
  },
  {
    name: 'multi-line specifier lists keep their layout',
    code: src('import {', '  b,', '  a,', "} from 'x';"),
    output: src('import {', '  a,', '  b,', "} from 'x';"),
    errors: [{ messageId: 'unsortedSpecifiers', data: { source: 'x', specifier: 'a', before: 'b' } }],
  },
  {
    name: 'default plus named specifiers',
    code: src("import B, { z, y } from 'b';", "import A from 'a';"),
    output: src("import A from 'a';", "import B, { y, z } from 'b';"),
    errors: [{ messageId: 'unsortedImports', data: { source: 'a', before: 'b' }, line: 2 }],
  },
  {
    name: 'leading comments travel with their import',
    code: src("import b from 'b';", '// about a', "import a from 'a';"),
    output: src('// about a', "import a from 'a';", "import b from 'b';"),
    errors: [{ messageId: 'unsortedImports', data: { source: 'a', before: 'b' }, line: 3 }],
  },
  {
    name: 'multi-line leading comment blocks travel as a whole',
    code: src("import b from 'b';", '/**', ' * a docs', ' */', '// still a', "import a from 'a';"),
    output: src('/**', ' * a docs', ' */', '// still a', "import a from 'a';", "import b from 'b';"),
    errors: [{ messageId: 'unsortedImports', data: { source: 'a', before: 'b' }, line: 6 }],
  },
  {
    name: 'trailing comments travel with their import',
    code: src("import b from 'b'; // b", "import a from 'a'; // a"),
    output: src("import a from 'a'; // a", "import b from 'b'; // b"),
    errors: [{ messageId: 'unsortedImports', data: { source: 'a', before: 'b' }, line: 2 }],
  },
  {
    name: 'comments above the first import stay at the top',
    code: src('// header', "import b from 'b';", "import a from 'a';"),
    output: src('// header', "import a from 'a';", "import b from 'b';"),
    errors: [{ messageId: 'unsortedImports', data: { source: 'a', before: 'b' }, line: 3 }],
  },
  {
    name: 'directive comments above the first import travel with it',
    code: src('// @ts-expect-error untyped module', "import b from 'b';", "import a from 'a';"),
    output: src("import a from 'a';", '// @ts-expect-error untyped module', "import b from 'b';"),
    errors: [{ messageId: 'unsortedImports', data: { source: 'a', before: 'b' }, line: 3 }],
  },
  {
    name: 'a file header stays while the directives below it travel',
    code: src(
      '/** @file Module header. */',
      '// prettier-ignore',
      '// @ts-expect-error untyped module',
      "import b from 'b';",
      "import a from 'a';"
    ),
    output: src(
      '/** @file Module header. */',
      "import a from 'a';",
      '// prettier-ignore',
      '// @ts-expect-error untyped module',
      "import b from 'b';"
    ),
    errors: [{ messageId: 'unsortedImports', data: { source: 'a', before: 'b' }, line: 5 }],
  },
  {
    name: 'imports inside an ambient module declaration are sorted, indentation included',
    code: src("declare module 'legacy' {", "  import b from 'b';", "  import a from 'a';", '}'),
    output: src("declare module 'legacy' {", "  import a from 'a';", "  import b from 'b';", '}'),
    errors: [{ messageId: 'unsortedImports', data: { source: 'a', before: 'b' }, line: 3 }],
  },
  {
    name: 'imports on both sides of a pinned import are sorted independently',
    code: src(
      "import z from 'z';",
      "import y from 'y';",
      '// import-sort-ignore',
      "import m from 'm';",
      "import b from 'b';",
      "import a from 'a';"
    ),
    output: src(
      "import y from 'y';",
      "import z from 'z';",
      '// import-sort-ignore',
      "import m from 'm';",
      "import a from 'a';",
      "import b from 'b';"
    ),
    errors: [
      { messageId: 'unsortedImports', data: { source: 'y', before: 'z' }, line: 2 },
      { messageId: 'unsortedImports', data: { source: 'a', before: 'b' }, line: 6 },
    ],
  },
  {
    name: 'safeSideEffects imports join their structural group',
    code: src("import './b.css';", "import './a.css';", "import a from 'a';"),
    output: src("import a from 'a';", '', "import './a.css';", "import './b.css';"),
    options: [{ safeSideEffects: ['\\.css$'], groups: ['external', 'style'] }],
    errors: [{ messageId: 'unsortedImports', data: { source: 'a', before: './b.css' }, line: 3 }],
  },
  {
    name: 'a partition comment starts a new independently sorted block',
    code: src(
      "import z from 'z';",
      "import y from 'y';",
      '// --- fixtures',
      "import b from 'b';",
      "import a from 'a';"
    ),
    output: src(
      "import y from 'y';",
      "import z from 'z';",
      '// --- fixtures',
      "import a from 'a';",
      "import b from 'b';"
    ),
    options: [{ partitionByComment: ['^---'] }],
    errors: [
      { messageId: 'unsortedImports', data: { source: 'y', before: 'z' }, line: 2 },
      { messageId: 'unsortedImports', data: { source: 'a', before: 'b' }, line: 5 },
    ],
  },
  {
    name: 'type-first ordering puts import type before the value import of the same source',
    code: src("import a from 'a';", "import type { A } from 'a';"),
    output: src("import type { A } from 'a';", "import a from 'a';"),
    options: [{ kindOrder: 'type-first', groups: ['external'] }],
    errors: [{ messageId: 'unsortedImports', data: { source: 'a', before: 'a' }, line: 2 }],
  },
  {
    name: 'typeSpecifiers: last moves inline type specifiers to the end',
    code: src("import { type A, b, type C, d } from 'x';"),
    output: src("import { b, d, type A, type C } from 'x';"),
    options: [{ typeSpecifiers: 'last' }],
    errors: [{ messageId: 'unsortedSpecifiers', data: { source: 'x', specifier: 'b', before: 'A' } }],
  },
  {
    name: 'typeSpecifiers: first moves inline type specifiers to the front',
    code: src("import { b, type A, d, type C } from 'x';"),
    output: src("import { type A, type C, b, d } from 'x';"),
    options: [{ typeSpecifiers: 'first' }],
    errors: [{ messageId: 'unsortedSpecifiers', data: { source: 'x', specifier: 'A', before: 'b' } }],
  },
  {
    name: 'a namespace import precedes the default and named imports of the same source',
    code: src("import { a } from 'mod';", "import * as N from 'mod';", "import D from 'mod';"),
    output: src("import * as N from 'mod';", "import D from 'mod';", "import { a } from 'mod';"),
    errors: [{ messageId: 'unsortedImports', data: { source: 'mod', before: 'mod' }, line: 2 }],
  },
  {
    name: 'newlinesBetween accepts an exact blank-line count',
    code: src("import s from './s.js';", "import fs from 'node:fs';"),
    output: src("import fs from 'node:fs';", '', '', "import s from './s.js';"),
    options: [{ newlinesBetween: 2 }],
    errors: [{ messageId: 'unsortedImports', data: { source: 'node:fs', before: './s.js' }, line: 2 }],
  },
  {
    name: 'newlinesInside spaces out the members of one group',
    code: src("import b from 'b';", "import a from 'a';"),
    output: src("import a from 'a';", '', "import b from 'b';"),
    options: [{ groups: [{ group: 'external', newlinesInside: 1 }] }],
    errors: [{ messageId: 'unsortedImports', data: { source: 'a', before: 'b' }, line: 2 }],
  },
  {
    name: 'commentAbove labels a group',
    code: src("import fs from 'node:fs';", '', "import a from 'a';"),
    output: src('// Platform', "import fs from 'node:fs';", '', '// Packages', "import a from 'a';"),
    options: [
      {
        groups: [
          { group: 'builtin', commentAbove: 'Platform' },
          { group: 'external', commentAbove: '// Packages' },
        ],
      },
    ],
    errors: [{ messageId: 'missingGroupComment', data: { comment: '// Platform', source: 'node:fs' }, line: 1 }],
  },
  {
    name: 'line-length sorting orders whole declarations',
    code: src("import { alpha, beta } from 'a';", "import z from 'z';"),
    output: src("import z from 'z';", "import { beta, alpha } from 'a';"),
    options: [{ algorithm: 'line-length', groups: ['external'] }],
    errors: [{ messageId: 'unsortedImports', data: { source: 'z', before: 'a' }, line: 2 }],
  },
  {
    name: 'a leading-semicolon statement keeps its semicolon when imports move',
    code: src('import b from "b"', 'import a from "a"', ';[1].forEach(log)'),
    output: src('import a from "a"', 'import b from "b"', ';[1].forEach(log)'),
    errors: [{ messageId: 'unsortedImports', data: { source: 'a', before: 'b' }, line: 2 }],
  },
  {
    name: 'a trailing line comment never ends up in front of code on the closing line',
    code: src("import b from 'b'; // keep b", "import a from 'a'; const x = 1;"),
    output: src("import a from 'a';", "import b from 'b'; // keep b", ' const x = 1;'),
    errors: [{ messageId: 'unsortedImports', data: { source: 'a', before: 'b' }, line: 2 }],
  },
  {
    name: 'indentation travels with each import',
    code: src("  import b from 'b';", "  import a from 'a';"),
    output: src("  import a from 'a';", "  import b from 'b';"),
    errors: [{ messageId: 'unsortedImports', data: { source: 'a', before: 'b' }, line: 2 }],
  },
  {
    name: 'indented blocks keep their indentation across group boundaries',
    code: src("  import s from './s.js';", "  import fs from 'node:fs';"),
    output: src("  import fs from 'node:fs';", '', "  import s from './s.js';"),
    errors: [{ messageId: 'unsortedImports', data: { source: 'node:fs', before: './s.js' }, line: 2 }],
  },
  {
    name: 'a blank line breaks the directive run above the first import',
    code: src('// prettier-ignore', '', "import b from 'b';", "import a from 'a';"),
    output: src('// prettier-ignore', '', "import a from 'a';", "import b from 'b';"),
    errors: [{ messageId: 'unsortedImports', data: { source: 'a', before: 'b' }, line: 4 }],
  },
  {
    name: 'a hashbang never travels with the import below it',
    code: src('#!/usr/bin/env node', "import b from 'b';", "import a from 'a';"),
    output: src('#!/usr/bin/env node', "import a from 'a';", "import b from 'b';"),
    errors: [{ messageId: 'unsortedImports', data: { source: 'a', before: 'b' }, line: 3 }],
  },
  {
    name: 'imports sharing a line are split onto their own lines',
    code: "import a from 'a'; import b from 'b';\n",
    output: src("import a from 'a';", "import b from 'b';"),
    errors: [{ messageId: 'sameLine', data: { source: 'b' }, line: 1 }],
  },
  {
    name: 'a type group merged with external keeps the value layout',
    code: src("import type { S } from './s.js';", "import type { R } from 'react';", "import a from 'a';"),
    output: src("import a from 'a';", "import type { R } from 'react';", "import type { S } from './s.js';"),
    options: [{ groups: [['external', 'type']] }],
    errors: [{ messageId: 'unsortedImports', data: { source: 'a', before: './s.js' }, line: 3 }],
  },
  {
    name: 'an empty groups list sorts every import into one block',
    code: src("import fs from 'node:fs';", "import a from 'a';"),
    output: src("import a from 'a';", "import fs from 'node:fs';"),
    options: [{ groups: [] }],
    errors: [{ messageId: 'unsortedImports', data: { source: 'a', before: 'node:fs' }, line: 2 }],
  },
  {
    name: 'a blank-line separated comment above the first import stays too',
    code: src('/* license: Apache-2.0 */', '', "import b from 'b';", "import a from 'a';"),
    output: src('/* license: Apache-2.0 */', '', "import a from 'a';", "import b from 'b';"),
    errors: [{ messageId: 'unsortedImports', data: { source: 'a', before: 'b' }, line: 4 }],
  },
  {
    name: 'type imports move to the type group',
    code: src("import type { A } from 'a';", "import b from 'b';"),
    output: src("import b from 'b';", '', "import type { A } from 'a';"),
    errors: [{ messageId: 'unsortedImports', data: { source: 'b', before: 'a' }, line: 2 }],
  },
  {
    name: 'the type group mirrors the value layout',
    code: src(
      "import type { S } from './s.js';",
      "import type { U } from '@x/utils';",
      "import type { F } from 'node:fs';"
    ),
    output: src(
      "import type { F } from 'node:fs';",
      "import type { U } from '@x/utils';",
      "import type { S } from './s.js';"
    ),
    errors: [{ messageId: 'unsortedImports', data: { source: 'node:fs', before: './s.js' }, line: 3 }],
  },
  {
    name: 'natural order puts v2 before v10',
    code: src("import v10 from 'v10';", "import v2 from 'v2';"),
    output: src("import v2 from 'v2';", "import v10 from 'v10';"),
    errors: [{ messageId: 'unsortedImports', data: { source: 'v2', before: 'v10' }, line: 2 }],
  },
  {
    name: 'case-insensitive by default',
    code: src("import b from 'B';", "import a from 'a';"),
    output: src("import a from 'a';", "import b from 'B';"),
    errors: [{ messageId: 'unsortedImports', data: { source: 'a', before: 'B' }, line: 2 }],
  },
  {
    name: 'order: desc reverses groups internally',
    code: src("import a from 'a';", "import b from 'b';"),
    output: src("import b from 'b';", "import a from 'a';"),
    options: [{ order: 'desc' }],
    errors: [{ messageId: 'unsortedImports', data: { source: 'b', before: 'a' }, line: 2 }],
  },
  {
    name: 'side-effect group collects side-effect imports in source order',
    code: src("import a from 'a';", "import './x.js';", "import './w.js';"),
    output: src("import './x.js';", "import './w.js';", '', "import a from 'a';"),
    options: [{ groups: ['side-effect', 'external'] }],
    errors: [{ messageId: 'unsortedImports', data: { source: './x.js', before: 'a' }, line: 2 }],
  },
  {
    name: 'segments between side-effect boundaries are sorted independently',
    code: src(
      "import b from 'b';",
      "import a from 'a';",
      "import './boundary.js';",
      "import d from 'd';",
      "import c from 'c';"
    ),
    output: src(
      "import a from 'a';",
      "import b from 'b';",
      "import './boundary.js';",
      "import c from 'c';",
      "import d from 'd';"
    ),
    errors: [
      { messageId: 'unsortedImports', data: { source: 'a', before: 'b' }, line: 2 },
      { messageId: 'unsortedImports', data: { source: 'c', before: 'd' }, line: 5 },
    ],
  },
  {
    name: 'every chunk of the file is fixed',
    code: src("import b from 'b';", "import a from 'a';", 'const x = 1;', "import d from 'd';", "import c from 'c';"),
    output: src("import a from 'a';", "import b from 'b';", 'const x = 1;', "import c from 'c';", "import d from 'd';"),
    errors: [
      { messageId: 'unsortedImports', data: { source: 'a', before: 'b' }, line: 2 },
      { messageId: 'unsortedImports', data: { source: 'c', before: 'd' }, line: 5 },
    ],
  },
  {
    name: 'merged groups',
    code: src("import z from 'z';", "import a from '@acme/a';"),
    output: src("import a from '@acme/a';", "import z from 'z';"),
    options: [{ groups: ['builtin', ['external', 'internal']], internalPattern: ['^@acme/'] }],
    errors: [{ messageId: 'unsortedImports', data: { source: '@acme/a', before: 'z' }, line: 2 }],
  },
  {
    name: 'custom groups',
    code: src("import axios from 'axios';", "import react from 'react';"),
    output: src("import react from 'react';", '', "import axios from 'axios';"),
    options: [{ groups: ['react', 'external'], customGroups: { react: '^react$' } }],
    errors: [{ messageId: 'unsortedImports', data: { source: 'react', before: 'axios' }, line: 2 }],
  },
  {
    name: 'stylesheets go to the style group',
    code: src("import styles from './x.module.css';", "import a from 'a';"),
    output: src("import a from 'a';", '', "import styles from './x.module.css';"),
    errors: [{ messageId: 'unsortedImports', data: { source: 'a', before: './x.module.css' }, line: 2 }],
  },
  {
    name: 'unknown sources go last',
    code: src("import x from '/abs/x.js';", "import a from 'a';"),
    output: src("import a from 'a';", '', "import x from '/abs/x.js';"),
    errors: [{ messageId: 'unsortedImports', data: { source: 'a', before: '/abs/x.js' }, line: 2 }],
  },
  {
    name: 'index imports go after siblings',
    code: src("import { root } from './index.js';", "import { a } from './a.js';"),
    output: src("import { a } from './a.js';", '', "import { root } from './index.js';"),
    errors: [{ messageId: 'unsortedImports', data: { source: './a.js', before: './index.js' }, line: 2 }],
  },
  {
    name: 'CRLF line endings are preserved by the fixer',
    code: "import b from 'b';\r\nimport { a } from './a.js';\r\n",
    output: "import b from 'b';\r\n\r\nimport { a } from './a.js';\r\n",
    errors: [{ messageId: 'missingBlankLine', data: { source: './a.js' }, line: 2 }],
  },
  {
    name: 'statements and specifiers are fixed together, order reported first',
    code: src("import { d, c } from './c.js';", "import { b, a } from 'a';"),
    output: src("import { a, b } from 'a';", '', "import { c, d } from './c.js';"),
    errors: [{ messageId: 'unsortedImports', data: { source: 'a', before: './c.js' }, line: 2 }],
  },
];

/**
 * Registers every fixer output as a valid case, proving the fix is idempotent
 * under the same options. Outputs that duplicate an explicit valid case (or
 * each other) are skipped, because ESLint's RuleTester rejects duplicates.
 * @param {readonly Invalid[]} cases - Invalid cases with outputs.
 * @param {readonly Valid[]} explicit - Hand-written valid cases.
 * @returns {Valid[]} Valid cases derived from the outputs.
 */
function outputsAsValid(cases: readonly Invalid[], explicit: readonly Valid[]): Valid[] {
  const seen = new Set(explicit.map(testCase => JSON.stringify([testCase.code, testCase.options ?? []])));
  const derived: Valid[] = [];
  for (const testCase of cases) {
    const { output } = testCase;
    const key = JSON.stringify([output, testCase.options ?? []]);
    if (typeof output === 'string' && !seen.has(key)) {
      seen.add(key);
      derived.push({
        name: `fixed output is stable: ${testCase.name ?? output}`,
        code: output,
        ...(testCase.options ? { options: testCase.options } : {}),
      });
    }
  }
  return derived;
}

const ruleTester = new RuleTester({
  languageOptions: { parser: tsParser, ecmaVersion: 'latest', sourceType: 'module' },
});

ruleTester.run('order', order as unknown as RuleDefinition, {
  valid: [...valid, ...outputsAsValid(invalid, valid)],
  invalid,
});
