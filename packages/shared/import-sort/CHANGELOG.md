# @april/import-sort

## 1.0.0

### Major Changes

- ad389fb: First stable release. These presets and the import sorter have been the shared baseline of the workspace since their first versions; their public surface is now considered stable and follows semantic versioning from 1.0.0 on.

## 0.2.0

### Minor Changes

- efe1e21: Fix a family of comment-handling defects in `import-sort/order` and tighten the core engine:

  - Group comments (`commentAbove`) are no longer duplicated when a new import sorts ahead of the opener, and a label left above the wrong import is removed and reported with the new `duplicateGroupComment` message. A label written with extra whitespace is rewritten instead of crashing the rule.
  - A trailing `// import-sort-ignore` or partition comment on the previous line no longer pins or partitions the import below it.
  - `algorithm: 'unsorted'` keeps source order across mixed kinds and shapes; `line-length` breaks ties with `fallbackSort` rather than the source length; the fallback pass gets its own collator, so a natural fallback no longer makes an alphabetical primary pass numeric; `ignoreCase` now applies to the `custom` alphabet.
  - `commentAbove` rejects multi-line and unterminated block comments, an invalid `locales` value throws a `TypeError` like every other option, `./index.test.js` is a sibling rather than an index import, a `paths` alias of `*` is skipped, aliases keep their suffix, and a malformed `tsconfig.json` yields no patterns instead of throwing.
  - `eslint-disable-line` is no longer treated as a comment that binds to the line below it.
  - `renderChunk` takes the configured group comments and reports stray and rewritten labels; the tsconfig lookup is cached per directory.

## 0.1.0

### Minor Changes

- ad1170a: Add `@april/import-sort`, an in-house import sorter for JavaScript and TypeScript: a host-agnostic sorting engine (`@april/import-sort/core`) plus the ESLint rule `import-sort/order`.

  Grouping: configurable `groups` (built-in, merged, or the long form with `commentAbove` and `newlinesInside`), regex `customGroups`, `internalPattern`, and an optional `tsconfig` option that turns `compilerOptions.paths` aliases into the `internal` group.

  Ordering: `natural`, `alphabetical`, `line-length`, `custom` and `unsorted` algorithms with a `fallbackSort`, `asc`/`desc` direction, locale-aware comparison (`locales`, `ignoreCase`, `specialCharacters`), `kindOrder` for `import` vs `import type`, and named-specifier sorting with `typeSpecifiers` placement.

  Safety: side-effect imports are immovable boundaries unless `safeSideEffects` or the `side-effect` group opts them in, `// import-sort-ignore` pins a single import, `partitionByComment` preserves hand-written sections, comments and indentation travel with their import, directive comments never lose the line they bind to, and the fixer breaks neither a semicolon-free code style nor a trailing line comment. One report and one idempotent fix per import block.

  `@april/eslint-config` now enforces import ordering through `import-sort/order` (with `@april/*` as the `internal` group) and no longer enables `import/order` or `perfectionist/sort-named-imports`.
