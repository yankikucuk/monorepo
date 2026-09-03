# 0003 — In-house import sorting (`@april/import-sort`)

- **Status:** Accepted
- **Date:** 2026-09-02

## Context

Import ordering was split across two third-party rules: `import/order`
(eslint-plugin-import-x) for statements and `perfectionist/sort-named-imports`
for specifiers. That split had real costs:

- **Two comparators.** `import/order` alphabetised case-sensitively and
  segment-wise; perfectionist used natural, case-insensitive order. The same
  file could be "sorted" under two incompatible definitions, and the ownership
  boundary (statements vs. braces) had to be documented so the fixers would not
  fight.
- **Weak layout control.** `newlines-between` was left on `ignore`, so blank
  lines between groups were inconsistent (`import type` sat directly under
  relative imports in several files).
- **No single place to encode our semantics.** Requirements such as "type
  imports mirror the value layout", "side-effect imports are boundaries", or
  "`@april/*` is internal" were scattered across rule options — and the next
  need (descending order, a framework-first group, a codemod outside ESLint)
  would have meant another plugin or a fork.

The monorepo already owns its ESLint, Prettier, TypeScript, and Stylelint
configuration; owning the one formatting rule with the most opinions is the
consistent next step.

## Decision

- **`@april/import-sort`** lives under `packages/shared/` and ships two layers:
  a host-agnostic sorting engine (`@april/import-sort/core`: records in, ordered
  blocks out, no ESLint dependency) and a thin ESLint adapter exposing a single
  rule, `import-sort/order`, with one report and one fix per import block.
- **Configurable along the axes the ecosystem has shown to matter:** ordered
  `groups` (merged blocks, or a long form carrying `commentAbove` and
  `newlinesInside`), `customGroups` (regex), `internalPattern` and a `tsconfig`
  option that derives it from `compilerOptions.paths`, `order` (`asc`/`desc`),
  `algorithm` (`natural`, `alphabetical`, `line-length`, `custom`, `unsorted`)
  with `fallbackSort`, locale-aware comparison (`locales`, `ignoreCase`,
  `specialCharacters`, `alphabet`), `kindOrder`, `newlinesBetween`,
  `sortSpecifiers` and `typeSpecifiers`, plus the `safeSideEffects`,
  `partitionByComment` and `// import-sort-ignore` escape hatches. The surface
  was set by auditing `eslint-plugin-import`, `eslint-plugin-simple-import-sort`,
  `eslint-plugin-perfectionist` and the two Prettier sort-imports plugins, and
  keeping what a shared config in this repository can plausibly need.
- **Opinionated safety defaults:** side-effect imports are immovable
  boundaries unless `side-effect` is configured as a group; comments above the
  first import never move; declarations with comments between specifiers are
  never rewritten; configuration errors throw instead of silently disabling the
  rule.
- **Segment-wise, total-order comparison** so results are deterministic on
  every platform (`react` < `react/jsx-runtime` < `react-dom`,
  `../../x` < `../y` < `./z`). Locale-aware collation decides the base order and
  a character-code comparison breaks its ties, so `./été.js` sorts next to
  `./ete.js` while the outcome never depends on input order.
- **`@april/eslint-config` adopts it in `base`** with
  `internalPattern: ['^@april/']`, and drops `import/order` and
  `perfectionist/sort-named-imports`. `import/no-duplicates` and perfectionist's
  export sorting stay.
- **Boundary enforcement:** `core/` must not import ESLint — checked by
  `no-restricted-imports` in the root config and by a dependency-cruiser rule.
- **Toolchain notes:** TypeScript 6 no longer auto-includes `@types/*`, so
  packages whose type-check graph reaches Node APIs (this one, and
  `@april/eslint-config` through it) declare `types: ["node"]` and depend on
  `@types/node`. `@typescript-eslint/utils` and `@typescript-eslint/parser` are
  kept on the same version as `typescript-eslint` to avoid two copies of the
  family in the lockfile.

## Consequences

- One definition of "sorted" for the whole repository, fixable in a single
  `pnpm format` pass; the existing files needed only blank-line insertions
  before `import type` groups.
- Other packages get the rule for free through the shared presets and can
  override options per package without adding plugins.
- The engine can be reused outside ESLint (CLI, codemods, editor tooling)
  without re-implementing the semantics.
- We now maintain a rule ourselves: parser changes (new import syntax such as
  `import defer`, attributes) must be covered by the test-suite. The rule copies
  declaration text verbatim, so unknown syntax degrades to "preserved, not
  understood" rather than to corruption.
- Text-level hazards other implementations learned the hard way are covered by
  regression tests: a semicolon that a semicolon-free style leaves for the next
  statement, a trailing `//` comment that would swallow code sharing the block's
  last line, and indentation inside `<script>` blocks or ambient modules.
- `typescript` is an optional peer dependency, needed only by the `tsconfig`
  option; it is loaded lazily so JavaScript-only consumers never pay for it.
- `perfectionist` remains a dependency for export sorting; if we ever own that
  too, the plugin can be removed entirely.
