---
'@april/import-sort': minor
'@april/eslint-config': minor
---

Add `@april/import-sort`, an in-house import sorter for JavaScript and TypeScript: a host-agnostic sorting engine (`@april/import-sort/core`) plus the ESLint rule `import-sort/order`.

Grouping: configurable `groups` (built-in, merged, or the long form with `commentAbove` and `newlinesInside`), regex `customGroups`, `internalPattern`, and an optional `tsconfig` option that turns `compilerOptions.paths` aliases into the `internal` group.

Ordering: `natural`, `alphabetical`, `line-length`, `custom` and `unsorted` algorithms with a `fallbackSort`, `asc`/`desc` direction, locale-aware comparison (`locales`, `ignoreCase`, `specialCharacters`), `kindOrder` for `import` vs `import type`, and named-specifier sorting with `typeSpecifiers` placement.

Safety: side-effect imports are immovable boundaries unless `safeSideEffects` or the `side-effect` group opts them in, `// import-sort-ignore` pins a single import, `partitionByComment` preserves hand-written sections, comments and indentation travel with their import, directive comments never lose the line they bind to, and the fixer breaks neither a semicolon-free code style nor a trailing line comment. One report and one idempotent fix per import block.

`@april/eslint-config` now enforces import ordering through `import-sort/order` (with `@april/*` as the `internal` group) and no longer enables `import/order` or `perfectionist/sort-named-imports`.
