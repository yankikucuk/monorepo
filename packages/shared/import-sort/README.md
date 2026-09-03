# @april/import-sort

Deterministic import sorting for JavaScript and TypeScript.

The package has two layers:

- **`@april/import-sort`** — an ESLint plugin (flat config) with one rule,
  `import-sort/order`, that sorts import declarations by configurable groups,
  sorts the specifiers inside braces, normalizes blank lines between groups, and
  fixes everything with a single autofix per import block.
- **`@april/import-sort/core`** — the sorting engine behind the rule. It has no
  ESLint dependency, works on plain data, and is fully unit-tested, so the same
  semantics can power a CLI, an editor integration, or a codemod.

Every other package in the monorepo gets the rule automatically through
[`@april/eslint-config`](../eslint-config/README.md), which enables it in its `base`
preset. This README documents the rule and the engine in full.

---

## Contents

- [Features](#features)
- [Installation](#installation)
- [Quick start](#quick-start)
- [Rule: import-sort/order](#rule-import-sortorder)
  - [Options](#options)
  - [Groups](#groups)
  - [Merged blocks](#merged-blocks)
  - [Custom groups](#custom-groups)
  - [Ordering inside a group](#ordering-inside-a-group)
  - [Type imports](#type-imports)
  - [Side-effect imports](#side-effect-imports)
  - [Partitions and opt-outs](#partitions-and-opt-outs)
  - [tsconfig paths](#tsconfig-paths)
  - [Comments](#comments)
  - [Indentation and statement boundaries](#indentation-and-statement-boundaries)
  - [Blank lines and group comments](#blank-lines-and-group-comments)
  - [Specifier sorting](#specifier-sorting)
  - [Diagnostics](#diagnostics)
  - [Autofix guarantees](#autofix-guarantees)
- [Recipes](#recipes)
- [Programmatic API](#programmatic-api)
- [Working with other rules](#working-with-other-rules)
- [Limitations](#limitations)
- [Architecture](#architecture)
- [Testing](#testing)
- [License](#license)

---

## Features

- **Grouped ordering** — built-ins, packages, internal modules, relative paths,
  stylesheets, and type-only imports each get their own block, in any order you
  choose. Groups can be merged into one block.
- **Five comparison algorithms** — `natural` (the default, digit runs compare
  numerically), `alphabetical`, `line-length`, a `custom` alphabet, and
  `unsorted` for grouping without reordering, plus a `fallbackSort` to combine
  two of them.
- **Locale-aware** — `Intl.Collator` with a configurable `locales`, so `./été.js`
  sorts next to `./ete.js` instead of after `./z.js`.
- **Ascending or descending** — `order: 'asc' | 'desc'` inside every group.
- **Case handling** — `ignoreCase` (default `true`) and `specialCharacters`,
  always with a deterministic tie-break, so sorting never depends on input
  order.
- **Segment-aware comparison** — `react` < `react/jsx-runtime` < `react-dom`,
  `@eslint/js` < `@eslint-community/eslint-utils`, `../../shared` < `../local`.
- **Specifier sorting** — `import { b, a }` becomes `import { a, b }` while the
  original layout (single-line or multi-line) is preserved.
- **Layout control** — blank lines between and inside blocks, and optional
  `commentAbove` labels that are inserted once and recognised afterwards.
- **Comment-safe** — comments move with the import they annotate; file headers
  and hashbangs above the first import never move, while directive comments
  (`@ts-expect-error`, `eslint-disable-next-line`, …) always travel with the
  line they bind to.
- **Side-effect-safe** — `import './polyfills'` is never reordered unless you
  opt in, because its position can change runtime behaviour; `safeSideEffects`
  releases the ones that are safe (stylesheets, say).
- **Escape hatches** — pin a single import with `// import-sort-ignore`, or
  keep hand-written sections with `partitionByComment`.
- **Aware of its surroundings** — indentation travels with each import, ambient
  module blocks are sorted on their own, `tsconfig` aliases can define the
  `internal` group, and neither a semicolon-free code style nor a trailing line
  comment can be broken by the fixer.
- **One report, one fix per import block** — the autofix converges in a single
  pass and is idempotent.
- **Fail-fast configuration** — an unknown group name, a duplicated group, an
  unused custom group, or an invalid pattern throws a descriptive `TypeError`
  instead of silently disabling sorting.
- **Strict TypeScript, zero runtime dependencies** beyond
  `@typescript-eslint/utils` (for typed rule and AST definitions).

---

## Installation

The package is private to the monorepo and consumed via the workspace
protocol:

```jsonc
// package.json
{
  "devDependencies": {
    "@april/import-sort": "workspace:*",
  },
}
```

Requirements: Node.js `>=26`, ESLint `>=10` (flat config).

> If your package uses `@april/eslint-config`, you are done — the rule is already
> part of the `base`, `frontend`, and `backend` presets, with
> `internalPattern: ['^@april/']`.

---

## Quick start

```ts
// eslint.config.ts
import importSort from '@april/import-sort';

export default [
  // Registers the plugin as `import-sort` and enables `import-sort/order` (error) with defaults.
  importSort.configs.recommended,
];
```

With options:

```ts
import importSort from '@april/import-sort';

export default [
  {
    plugins: { 'import-sort': importSort },
    rules: {
      'import-sort/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index'], 'type'],
          internalPattern: ['^@acme/'],
          order: 'asc',
          algorithm: 'natural',
          newlinesBetween: 'always',
        },
      ],
    },
  },
];
```

`configs.recommended` and a manual `plugins` registration reference the same
plugin object, so combining them does not trigger ESLint's
"Cannot redefine plugin" error.

Run with `eslint --fix` to sort; without `--fix` the rule reports one problem
per import block that is out of order.

---

## Rule: import-sort/order

Type: `layout` · Fixable: `code` · Recommended: yes

Enforces a deterministic order for **top-level** import declarations. The rule
computes the canonical form of every import block and reports when the source
differs from it.

### Options

The rule takes a single optional object. Every field is optional.

| Option               | Type                                                                     | Default                                                                              | Description                                                                                                              |
| -------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `groups`             | `(GroupName \| GroupName[] \| GroupBlock)[]`                             | `['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'style', 'type']` | Ordered layout. An inner array merges several groups into one block; the long form adds `commentAbove`/`newlinesInside`. |
| `customGroups`       | `Record<string, string \| string[]>`                                     | `{}`                                                                                 | Extra groups keyed by name, each a regular expression source (compiled with the `u` flag) tested against the specifier.  |
| `internalPattern`    | `string[]`                                                               | `[]`                                                                                 | Regular expression sources that mark a specifier as `internal`. Node subpath imports (`#…`) are always internal.         |
| `safeSideEffects`    | `string[]`                                                               | `[]`                                                                                 | Side-effect imports matching one of these are sorted like ordinary imports instead of acting as boundaries.              |
| `order`              | `'asc' \| 'desc'`                                                        | `'asc'`                                                                              | Direction inside every group. Group order itself never changes.                                                          |
| `algorithm`          | `'alphabetical' \| 'natural' \| 'line-length' \| 'custom' \| 'unsorted'` | `'natural'`                                                                          | See [Ordering inside a group](#ordering-inside-a-group).                                                                 |
| `ignoreCase`         | `boolean`                                                                | `true`                                                                               | Fold case (and accents) when comparing; ties are still broken case-sensitively.                                          |
| `locales`            | `string \| string[]`                                                     | `'en'`                                                                               | Locale(s) for `alphabetical` and `natural` comparison.                                                                   |
| `specialCharacters`  | `'keep' \| 'trim' \| 'remove'`                                           | `'keep'`                                                                             | Whether leading — or all — non-alphanumeric characters take part in comparison.                                          |
| `alphabet`           | `string`                                                                 | `''`                                                                                 | Character order for `algorithm: 'custom'`. Required by that algorithm.                                                   |
| `fallbackSort`       | `{ algorithm?, order? }`                                                 | `{ algorithm: 'unsorted' }`                                                          | Comparison applied when the primary one ties. `order` defaults to the primary direction.                                 |
| `kindOrder`          | `'value-first' \| 'type-first'`                                          | `'value-first'`                                                                      | Which of `import` and `import type` comes first when both import the same source.                                        |
| `newlinesBetween`    | `'always' \| 'never' \| number`                                          | `'always'`                                                                           | Blank lines between blocks: one, none, or an exact count.                                                                |
| `sortSpecifiers`     | `boolean`                                                                | `true`                                                                               | Sort named specifiers inside braces.                                                                                     |
| `typeSpecifiers`     | `'mixed' \| 'first' \| 'last'`                                           | `'mixed'`                                                                            | Where inline `type` specifiers (`import { type A, b }`) go inside the braces.                                            |
| `partitionByComment` | `boolean \| string \| string[] \| { block?, line? }`                     | `false`                                                                              | Comments that open an independently sorted block. See [Partitions](#partitions-and-opt-outs).                            |
| `tsconfig`           | `{ filename?, rootDir? }`                                                | disabled                                                                             | Read `compilerOptions.paths` and treat those aliases as `internal`. See [tsconfig paths](#tsconfig-paths).               |

Configuration mistakes throw a `TypeError` with the offending option path, e.g.
`Unknown group "vendor" in "groups". Use a built-in group (…) or declare it in "customGroups".`

### Groups

| Group         | Matches                                                                                        | In default layout |
| ------------- | ---------------------------------------------------------------------------------------------- | ----------------- |
| `side-effect` | Imports without bindings: `import './setup.js'`                                                | no (see below)    |
| `builtin`     | Node.js core modules: `node:fs`, `fs`, `fs/promises`, `node:test`                              | 1                 |
| `external`    | Bare specifiers: `react`, `@scope/pkg`, `lodash/fp`                                            | 2                 |
| `internal`    | `internalPattern` matches and Node subpath imports (`#internal/util`)                          | 3                 |
| `parent`      | `..`, `../…`                                                                                   | 4                 |
| `sibling`     | `./…` that is not an index import                                                              | 5                 |
| `index`       | `.`, `./`, `./index`, `./index.js`, `./index.d.ts`                                             | 6                 |
| `style`       | `.css`, `.less`, `.scss`, `.sass`, `.styl`, `.pcss` sources, with an optional `?query`/`#hash` | 7                 |
| `type`        | `import type … from` declarations                                                              | 8                 |
| `unknown`     | Absolute paths, URLs, other schemes (`npm:`, `bun:`), empty strings                            | appended last     |

A specifier is classified along a **candidate chain**, most specific first, and
lands in the first candidate that is part of `groups`:

1. `side-effect` (if the import has no bindings)
2. `type` (if it is an `import type`)
3. every matching custom group, in declaration order
4. `style` (if the specifier is a stylesheet)
5. its structural category: `builtin` · `external` · `internal` · `parent` · `sibling` · `index` · `unknown`
6. structural fallbacks: `index → sibling`, `builtin → external`, `internal → external`
7. `unknown`

So with `groups: ['external', 'sibling']`, an `import './index.js'` lands in
`sibling`, `import fs from 'node:fs'` lands in `external`, and `import '../x'`
lands in the implicit trailing `unknown` block. Partial layouts stay
intuitive.

Node.js built-ins are recognised with `node:module`'s `isBuiltin`, so the list
follows the running Node version instead of a hard-coded table.

### Merged blocks

An inner array merges groups into one block: no blank line between them, and
their imports sorted together as one list.

```ts
// groups: ['builtin', 'external', ['parent', 'sibling', 'index']]
import fs from 'node:fs';

import react from 'react';

import { shared } from '../../shared.js';
import { up } from '../up.js';
import { a } from './a.js';
import { root } from './index.js';
```

### Custom groups

```ts
'import-sort/order': ['error', {
  groups: ['react', 'builtin', 'external', 'internal', 'sibling'],
  customGroups: {
    react: ['^react$', '^react-'],   // `react`, `react-dom`, `react-router`
  },
  internalPattern: ['^@acme/', '^~/'],
}]
```

- Custom group names must also appear in `groups` (otherwise: `TypeError`).
- A custom name cannot shadow a built-in group name.
- Patterns are compiled with `new RegExp(source, 'u')`; escape accordingly.
- When several custom groups match, the one declared first in `customGroups`
  wins.

### Ordering inside a group

Specifiers are compared **segment by segment**, splitting on `/`. This keeps a
package next to its subpaths and ahead of packages that merely share a prefix,
and it keeps relative paths ordered from far to near:

| Sorted result                                        | Why                                                                  |
| ---------------------------------------------------- | -------------------------------------------------------------------- |
| `react` · `react/jsx-runtime` · `react-dom`          | `react` is a prefix of `react-dom`; subpaths stay with their package |
| `@eslint/js` · `@eslint-community/eslint-utils`      | `@eslint` sorts before `@eslint-community`                           |
| `./a` · `./a/b` · `./ab`                             | segment `a` sorts before `ab`                                        |
| `../../shared` · `../local` · `./sibling`            | dot-only segments with more dots sort first                          |
| `v2` · `v10` (natural) / `v10` · `v2` (alphabetical) | natural compares digit runs numerically                              |

Within a segment, `algorithm`, `ignoreCase`, `locales` and `specialCharacters`
apply:

| `algorithm`    | Compares                                                                                       |
| -------------- | ---------------------------------------------------------------------------------------------- |
| `natural`      | Locale-aware, digit runs numerically: `v2` before `v10`. The default.                          |
| `alphabetical` | Locale-aware, character by character: `v10` before `v2`.                                       |
| `line-length`  | The length of the whole declaration (of the name, for specifiers). Shortest first under `asc`. |
| `custom`       | The position of each character in `alphabet`; characters outside it sort last.                 |
| `unsorted`     | Nothing — records keep their source order inside their group. Useful for grouping only.        |

`alphabetical` and `natural` use `Intl.Collator`, so `./été.js` sorts next to
`./ete.js` rather than after `./z.js`, and `locales` decides what "next to"
means (in `sv`, `ä` is its own letter after `z`). Collator ties — case with
`ignoreCase: true`, accents either way — are broken by character code, so the
result is always a total order: the same input sorts the same way everywhere.
`ignoreCase: false` does not put every upper-case name first; it makes case a
tiebreaker, which is what locale-aware collation means.

`fallbackSort` runs between the primary comparison and that final tiebreak,
which is how you combine two algorithms:

```ts
// Shortest imports first; equal lengths alphabetically.
{ algorithm: 'line-length', fallbackSort: { algorithm: 'natural' } }
```

`specialCharacters: 'trim'` ignores leading punctuation (`_internal` sorts as
`internal`), `'remove'` ignores all of it.

`order: 'desc'` reverses the comparison inside each group. It does **not**
reverse the group layout, and it does not change the kind and shape tie-breaks
described next.

### Type imports

- When `type` is in `groups` (the default), every `import type` declaration
  moves to that block. Inside it, imports are ordered by the block their source
  **would** occupy as a value import — built-ins, then packages, then relative
  paths — and then by specifier. The type block therefore mirrors the value
  layout instead of collapsing into one list where `./a` sorts before `react`.
- When `type` is not in `groups`, type imports sort inside the group of their
  source, and a value import always precedes the type import of the same
  source.
- The same rule applies when `type` shares a block with another group
  (`groups: [['external', 'type']]`): every member of the block is ordered by
  the block its source would occupy as a value import, so `import type` of a
  relative path lands after the packages instead of in the middle of them.

```ts
import fs from 'node:fs';

import { Linter } from 'eslint';

import { helper } from './helper.js';

import type { Config } from 'eslint';
import type { Options } from './helper.js';
```

Inline type specifiers (`import { type A, b }`) are ordinary specifiers: they
are sorted by name and the declaration stays a value import. `typeSpecifiers`
moves them as a block instead:

```ts
// typeSpecifiers: 'mixed'  →  import { type A, b, type C, d } from 'x';
// typeSpecifiers: 'first'  →  import { type A, type C, b, d } from 'x';
// typeSpecifiers: 'last'   →  import { b, d, type A, type C } from 'x';
```

When a value import and an `import type` share a source, the value import comes
first; `kindOrder: 'type-first'` swaps that. Two imports of the same source and
kind are ordered by shape — `import * as ns` first, then the default import,
then the named one — which mirrors what a single declaration would have to look
like.

### Side-effect imports

`import './polyfills.js'` runs code when evaluated, so moving it can change
behaviour. The rule is conservative:

- **By default** (`side-effect` not in `groups`) side-effect imports are
  **boundaries**: they are never moved, and no import is moved across them. The
  imports before and after a boundary are sorted independently.
- **Opt in** by adding `side-effect` to `groups`. Side-effect imports are then
  gathered into that block **in their original relative order** — they are
  never sorted by name among themselves. If a block merges `side-effect` with
  other groups, side-effect imports come first.

```ts
// default
import z from 'z';
import './setup.js'; // boundary: `z` and `a` are sorted separately
import a from 'a';
```

`import {} from './setup.js'` has no specifiers either and still evaluates the
module, so it counts as a side-effect import too.

`safeSideEffects` narrows the conservative default to the imports that really
are order-sensitive. Stylesheets almost never are:

```ts
{
  safeSideEffects: ['\\.css$'];
}

// ⇣ `./b.css` and `./a.css` now sort; `reflect-metadata` still pins everything
import 'reflect-metadata';
import './a.css';
import './b.css';
```

A safe side-effect import is grouped like an ordinary value import, so
`./a.css` lands in `style` rather than in `side-effect`.

### Partitions and opt-outs

Two escape hatches keep the rule out of the way where the order is deliberate.

**Pin one import** with an `import-sort-ignore` comment, written either above it
or at the end of its line. The import never moves, and nothing moves across it:

```ts
import z from 'z';
// import-sort-ignore
import { patchGlobals } from './patch.js'; // must run before the imports below
import a from 'a';
```

**Keep hand-written sections** with `partitionByComment`. An import whose
leading comments match opens a new block, sorted on its own:

```ts
{
  partitionByComment: ['^---'];
}

// --- production
import a from 'a';
import z from 'z';
// --- test doubles
import b from 'b';
import y from 'y';
```

The option accepts `true` (every comment), one pattern, a list of patterns, or
`{ block, line }` to treat the two comment kinds differently.

### tsconfig paths

Rather than repeating the compiler's aliases in `internalPattern`, read them:

```ts
{
  tsconfig: {
    rootDir: import.meta.dirname;
  }
}
```

Every key of `compilerOptions.paths` becomes an `internal` pattern — `@app/*`
matches by prefix, `~config` matches exactly — and they are merged with any
`internalPattern` you wrote by hand. `extends` chains are resolved by
TypeScript itself, which is loaded lazily: the option needs `typescript`
installed (an optional peer dependency) and silently yields no patterns when it
is missing or no configuration file is found. Results are cached per
configuration file for the lifetime of the process.

### Comments

- A comment on the same line **after** an import belongs to that import and
  moves with it.
- Comments on the lines **directly above** an import belong to that import and
  move with it (`// eslint-disable-next-line`, docs, TODOs).
- Comments above the **first import of a block** stay where they are. This
  keeps file headers, licence banners, hashbangs, and `/* eslint-disable */`
  pragmas at the top of the file.
- The one exception: **directive comments** bind to the line below them, so the
  unbroken run of them directly above the first import travels with it —
  leaving them behind would silently re-target the directive at whichever
  import the fixer moves up. Recognised directives are
  `eslint-disable-next-line`, `eslint-disable-line`, `@ts-ignore`,
  `@ts-expect-error`, `prettier-ignore`, `biome-ignore`, and
  `c8`/`v8`/`istanbul ignore`. A blank line between a directive and the import
  breaks the run.
- A declaration that contains comments **inside** it (between specifiers) is
  never rewritten, so a comment can never be attached to the wrong specifier.

```ts
// header — stays at the top
import b from 'b';
// about a — travels with `a`
import a from 'a'; // trailing — travels with `a`

// ⇣ fixed
// header — stays at the top
// about a — travels with `a`
import a from 'a'; // trailing — travels with `a`
import b from 'b';
```

### Indentation and statement boundaries

- Each import keeps its own indentation when it moves, so imports written
  inside an indented block (a `<script>` tag, for example) stay indented.
- In a semicolon-free code style a parser attaches the semicolon of
  `;[1].forEach(log)` to the import above it. The rule detects that case and
  leaves the semicolon where it is, so the statement below the imports keeps
  working.
- An import whose trailing `// comment` would end up in front of code that
  stayed on the block's last line gets a line break after it, so the comment
  can never swallow that code.

### Blank lines and group comments

- Inside a block: imports are separated by exactly one line break, or by
  `newlinesInside` blank lines when the block asks for them.
- Between blocks: one blank line (`newlinesBetween: 'always'`), none
  (`'never'`), or an exact count (`newlinesBetween: 2`).
- Any other whitespace between imports (extra blank lines, trailing spaces) is
  reported and normalised.

A block written in its long form can also label itself:

```ts
{
  groups: [
    { group: 'builtin', commentAbove: 'Platform' },
    { group: ['external', 'internal'], commentAbove: '// Packages', newlinesInside: 1 },
    'parent',
  ],
}
```

`commentAbove` is inserted as a line comment (a value that already starts with
`//` or `/*` is used verbatim) and is recognised again on the next run, so it is
never duplicated. Moving a labelled group moves its comment with it.

The fixer follows the file's line terminator: separators are emitted as CRLF
when the file contains a CRLF anywhere, and as LF otherwise.

### Specifier sorting

With `sortSpecifiers: true` (default), the named specifiers inside braces are
sorted with the same comparator as module specifiers, by imported name and then
by local name:

```ts
import { z as first, 'b-b' as bb, type C, a } from 'x';
// ⇣
import { a, 'b-b' as bb, type C, z as first } from 'x';
```

The rewrite touches only the text between the first and last specifier and
reuses the original separators, so multi-line lists keep their shape:

```ts
import { b, a } from 'x';
// ⇣
import { a, b } from 'x';
```

### Diagnostics

The rule reports **one** problem per import block, choosing the most useful
message. All messages carry the module specifier so they read well in editors
and CI logs.

| Message id             | When                                                               | Example                                                                          |
| ---------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `unsortedImports`      | An import is not at its canonical position.                        | `'node:fs' should be imported before './a.js'.`                                  |
| `unsortedSpecifiers`   | Statement order is right, but specifiers inside braces are not.    | `Specifiers of 'x' are not sorted: 'a' should come before 'b'.`                  |
| `missingBlankLine`     | Two blocks are not separated by a blank line.                      | `Expected one blank line before the import of './b.js' (it starts a new group).` |
| `unexpectedBlankLine`  | A blank line appears inside a block, or more than one between two. | `Unexpected blank line before the import of 'b'.`                                |
| `unexpectedWhitespace` | The gap between two imports contains stray whitespace.             | `Unexpected whitespace before the import of 'b'.`                                |
| `sameLine`             | Two imports share a line.                                          | `Expected the import of 'b' to start on its own line.`                           |
| `missingGroupComment`  | A group configured with `commentAbove` is not labelled.            | `Expected the comment '// Packages' above the group starting with 'react'.`      |

`unsortedImports` is anchored on the import that has to move up, mirroring how
`import/order` reports.

### Autofix guarantees

- **Single pass** — the fix replaces the whole block with its canonical text,
  so one `eslint --fix` run is enough.
- **Idempotent** — the test-suite feeds every fixer output back to the rule as
  a valid case.
- **Loss-free** — every byte of every import (declaration, attributes such as
  `with { type: 'json' }`, owned comments) is copied verbatim; only positions
  change. Whitespace between imports is regenerated.
- **No fixer conflicts** — the rule reports exactly one fix per block. ESLint
  applies non-overlapping fixes from other rules in the same pass and re-runs
  until stable.

---

## Recipes

**Descending inside groups**

```ts
'import-sort/order': ['error', { order: 'desc' }]
```

**Plain alphabetical, case-sensitive**

```ts
'import-sort/order': ['error', { algorithm: 'alphabetical', ignoreCase: false }]
```

**Framework first, then everything else, relative paths together**

```ts
'import-sort/order': ['error', {
  groups: ['react', 'builtin', 'external', 'internal', ['parent', 'sibling', 'index'], 'style', 'type'],
  customGroups: { react: ['^react$', '^react-', '^next(?:/|$)'] },
  internalPattern: ['^@acme/', '^~/'],
}]
```

**Type imports next to their value imports (no separate type block)**

```ts
'import-sort/order': ['error', {
  groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
}]
```

**Compact blocks without blank lines**

```ts
'import-sort/order': ['error', { newlinesBetween: 'never' }]
```

**Statement order only, leave specifiers alone**

```ts
'import-sort/order': ['error', { sortSpecifiers: false }]
```

**Group side-effect imports at the top (opt-in, see caveats above)**

```ts
'import-sort/order': ['error', {
  groups: ['side-effect', 'builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'type'],
}]
```

**Sort stylesheet side effects, pin everything else**

```ts
'import-sort/order': ['error', { safeSideEffects: ['\\.css$', '\\.scss$'] }]
```

**Shortest imports first, ties alphabetically**

```ts
'import-sort/order': ['error', {
  algorithm: 'line-length',
  fallbackSort: { algorithm: 'natural' },
}]
```

**Group without reordering (keep the author's order inside each block)**

```ts
'import-sort/order': ['error', { algorithm: 'unsorted' }]
```

**Labelled groups, spaced out**

```ts
'import-sort/order': ['error', {
  groups: [
    { group: 'builtin', commentAbove: 'Platform' },
    { group: ['external', 'internal'], commentAbove: 'Packages' },
    { group: ['parent', 'sibling', 'index'], commentAbove: 'Local' },
    'type',
  ],
  newlinesBetween: 1,
}]
```

**Take the internal group from the TypeScript configuration**

```ts
'import-sort/order': ['error', { tsconfig: { rootDir: import.meta.dirname } }]
```

**Keep the sections a file already has**

```ts
'import-sort/order': ['error', { partitionByComment: ['^-{3,}', '^Section:'] }]
```

---

## Programmatic API

`@april/import-sort/core` exposes the engine. It never touches ESLint or an
AST: you describe imports as records, it returns ordered blocks.

```ts
import { resolveOptions, sortImports } from '@april/import-sort/core';

import type { ImportRecord } from '@april/import-sort/core';

interface MyImport extends ImportRecord {
  readonly line: number; // hosts may attach anything; records pass through untouched
}

const records: MyImport[] = [
  { source: './b.js', kind: 'value', sideEffect: false, line: 1 },
  { source: 'react', kind: 'value', sideEffect: false, line: 2 },
  { source: 'node:fs', kind: 'type', sideEffect: false, line: 3 },
];

const options = resolveOptions({ groups: ['builtin', 'external', 'sibling', 'type'] });

for (const block of sortImports(records, options)) {
  console.log(
    block.groups,
    block.records.map(record => record.source)
  );
}
// ['builtin']  []            ← empty blocks are omitted, so this line never prints
// ['external'] ['react']
// ['sibling']  ['./b.js']
// ['type']     ['node:fs']
```

| Export                                                     | Purpose                                                                                       |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `resolveOptions(options?)`                                 | Validate and normalize `SortOptions` → `ResolvedSortOptions`. Throws `TypeError` on mistakes. |
| `sortImports(records, options?)`                           | Bucket records into blocks and sort each. Accepts raw or resolved options. Stable.            |
| `classifySource(source, resolved)`                         | Structural category of a specifier (`builtin`, `external`, …).                                |
| `groupCandidates(record, resolved)`                        | Candidate chain for a record, most specific first.                                            |
| `resolveGroup(record, resolved)`                           | The group and block index a record lands in.                                                  |
| `isStyleSource(source)`                                    | Stylesheet detection.                                                                         |
| `compareStrings(a, b, { algorithm, ignoreCase })`          | Total-order string comparison.                                                                |
| `compareModuleSources(a, b, { algorithm, ignoreCase })`    | Segment-wise specifier comparison.                                                            |
| `createComparator(resolved)`                               | Specifier comparator honouring `order`.                                                       |
| `createRecordComparator(resolved)`                         | Record comparator used inside blocks (side-effect and type rules included).                   |
| `applyOrder(result, order)`                                | Negates a comparator result for `desc` without producing `-0`.                                |
| `DEFAULT_GROUPS`, `DEFAULT_SORT_OPTIONS`, `BUILTIN_GROUPS` | Defaults and the list of built-in group names.                                                |

The plugin entry (`@april/import-sort`) additionally exports `plugin`
(default), `rules`, `configs`, `order` (the rule module),
`ORDER_OPTIONS_SCHEMA` (the rule's JSON schema), `DEFAULT_ORDER_RULE_OPTIONS`,
and the types `OrderRuleOptions`, `OrderMessageId`, `NewlinesBetween`.

---

## Working with other rules

- **`import/order` (eslint-plugin-import-x)** and **`sort-imports` (core)** —
  turn them off; two statement sorters will fight over the same lines.
- **`perfectionist/sort-named-imports`** — turn it off; `sortSpecifiers` owns
  the braces. `perfectionist/sort-exports` and `sort-named-exports` are
  unaffected and can stay on.
- **`import/no-duplicates`** — keep it. Merging duplicates and sorting are
  independent fixes; ESLint applies both across passes.
- **`import/first`** — keep it if you want imports hoisted above other code.
  `import-sort/order` sorts each contiguous block independently and never
  moves imports across non-import statements.

`@april/eslint-config` already applies this split.

---

## Limitations

- `import` declarations are sorted wherever they may appear: at the top level
  and inside ambient module blocks (`declare module 'x' { … }`), each body on
  its own. Dynamic `import()` expressions are never touched.
- `import x = require('x')` (TypeScript) is treated as a non-import statement,
  i.e. a block boundary.
- `export … from` re-exports are not sorted by this rule
  (`perfectionist/sort-exports` covers them in the shared config).
- Declarations containing comments between specifiers are not rewritten.
- Two imports of the same source and kind keep their original relative order;
  use `import/no-duplicates` to merge them.
- In a file with mixed line terminators, every separator the fixer writes is
  CRLF; the terminators inside untouched lines are left as they are.

---

## Architecture

```
src/
├── index.ts                 ESLint plugin entry (default export = plugin)
├── core/                    host-agnostic engine — no ESLint imports allowed
│   ├── types.ts             ImportRecord, SortOptions, ResolvedSortOptions, …
│   ├── options.ts           defaults + resolveOptions() validation
│   ├── compare.ts           compareStrings / compareModuleSources / createComparator
│   ├── classify.ts          classifySource / groupCandidates / resolveGroup
│   ├── sort.ts              sortImports / createRecordComparator
│   └── index.ts             public core API
└── eslint/                  ESLint adapter
    ├── entries.ts           AST node → ImportEntry (text span incl. owned comments)
    ├── specifiers.ts        named-specifier sorting with layout preservation
    ├── chunks.ts            container → import blocks (boundaries, pins, partitions)
    ├── partitions.ts        partitionByComment → comment predicate
    ├── render.ts            blocks → canonical text (EOL, blank lines, group comments)
    ├── diagnose.ts          canonical vs actual → one message per block
    ├── tsconfig.ts          compilerOptions.paths → internal patterns
    ├── ruleDocs.ts          docs URL helper
    ├── rules/order.ts       the rule: options schema, messages, create()
    └── plugin.ts            plugin object + configs.recommended
```

The `core/` ↔ `eslint/` boundary is enforced twice: `no-restricted-imports` in
the root ESLint config forbids ESLint packages under `core/`, and
dependency-cruiser forbids `core/` → `eslint/` edges.

---

## Testing

```bash
pnpm exec vitest run packages/shared/import-sort
```

- `tests/compare.test.ts`, `classify.test.ts`, `options.test.ts`,
  `sort.test.ts` — engine semantics in isolation.
- `tests/orderRule.test.ts` — the rule through ESLint's `RuleTester` with the
  TypeScript parser: groups, direction, algorithms, comments and directives,
  hashbangs, side-effects, boundaries, specifiers, CRLF, and idempotency (every
  fixer output is replayed as a valid case).
- `tests/diagnose.test.ts` — the diagnosis contract, including its invariant.
- `tests/partitions.test.ts`, `tests/tsconfig.test.ts` — the two option
  compilers, against real temporary `tsconfig.json` files.
- `tests/plugin.test.ts` — the flat-config surface end to end through
  `Linter`, with both the TypeScript parser and ESLint's default parser, plus
  schema and semantic option validation.

---

## License

Apache-2.0
