# @april/eslint-config

## 1.0.0

### Major Changes

- ad389fb: First stable release. These presets and the import sorter have been the shared baseline of the workspace since their first versions; their public surface is now considered stable and follows semantic versioning from 1.0.0 on.

### Patch Changes

- Updated dependencies [ad389fb]
  - @april/import-sort@1.0.0

## 0.3.0

### Minor Changes

- 148c297: Remove the unused `ignores` export. The root configuration keeps its own ignore list, and shipping a second one only invited drift.

### Patch Changes

- Updated dependencies [efe1e21]
  - @april/import-sort@0.2.0

## 0.2.0

### Minor Changes

- ad1170a: Add `@april/import-sort`, an in-house import sorter for JavaScript and TypeScript: a host-agnostic sorting engine (`@april/import-sort/core`) plus the ESLint rule `import-sort/order`.

  Grouping: configurable `groups` (built-in, merged, or the long form with `commentAbove` and `newlinesInside`), regex `customGroups`, `internalPattern`, and an optional `tsconfig` option that turns `compilerOptions.paths` aliases into the `internal` group.

  Ordering: `natural`, `alphabetical`, `line-length`, `custom` and `unsorted` algorithms with a `fallbackSort`, `asc`/`desc` direction, locale-aware comparison (`locales`, `ignoreCase`, `specialCharacters`), `kindOrder` for `import` vs `import type`, and named-specifier sorting with `typeSpecifiers` placement.

  Safety: side-effect imports are immovable boundaries unless `safeSideEffects` or the `side-effect` group opts them in, `// import-sort-ignore` pins a single import, `partitionByComment` preserves hand-written sections, comments and indentation travel with their import, directive comments never lose the line they bind to, and the fixer breaks neither a semicolon-free code style nor a trailing line comment. One report and one idempotent fix per import block.

  `@april/eslint-config` now enforces import ordering through `import-sort/order` (with `@april/*` as the `internal` group) and no longer enables `import/order` or `perfectionist/sort-named-imports`.

### Patch Changes

- ad1170a: Upgrade the linting toolchain: `eslint-plugin-unicorn` 72 → 74, `eslint-plugin-jsdoc` 63 → 64, `typescript-eslint` 8.64 → 8.69, plus patch releases of `eslint-plugin-check-file`, `eslint-plugin-perfectionist`, `eslint-plugin-regexp` and `globals`. No rule configuration changed; every existing source still lints clean.
- Updated dependencies [ad1170a]
  - @april/import-sort@0.1.0
