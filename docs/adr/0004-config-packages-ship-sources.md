# 0004 — Configuration packages ship TypeScript sources

- **Status:** Accepted
- **Date:** 2026-09-03

## Context

[ADR 0001](0001-monorepo-tooling.md) records "per-package `dist/` build output,
with `exports`/`types` pointing at emitted `.d.ts`". That is how
`@april/cyberflake` works, but it is not how any of the shared configuration
packages work, and the difference has never been written down.

A configuration package is consumed by a tool, not by application code:
`eslint.config.ts` imports `@april/eslint-config`, `prettier.config.ts`
re-exports `@april/prettier-config`, and `@april/import-sort` is loaded by
ESLint as a plugin. Building those to `dist/` would mean every config change
needs a build before the linter sees it — including inside the editor, and
including the pre-commit hook — and a stale `dist/` would silently lint the
repository with yesterday's rules.

## Decision

- **Product packages build; configuration packages do not.** Only
  `@april/cyberflake` has a `build` script and a `dist/`. The shared packages
  point `exports` straight at their sources and have no build step:

  | Package                   | `exports` target                | Loaded by                           |
  | ------------------------- | ------------------------------- | ----------------------------------- |
  | `@april/eslint-config`    | `./src/*.ts`                    | ESLint, through jiti                |
  | `@april/import-sort`      | `./src/index.ts`, `./core`      | ESLint, through jiti                |
  | `@april/prettier-config`  | `./src/index.ts`                | Prettier's TypeScript config loader |
  | `@april/stylelint-config` | `./src/index.js`                | Stylelint                           |
  | `@april/tsconfig`         | `./base.json`, `./library.json` | TypeScript                          |

- **The loader decides the language.** ESLint and Prettier both resolve
  TypeScript config files (the repository ships `jiti` for that), so those
  packages are written in TypeScript and type-checked like everything else.
  Stylelint has no TypeScript config loader, so `@april/stylelint-config` is
  plain JavaScript with JSDoc types — enforced by `JSDOC_JS_TYPE_RULES` in the
  root ESLint config, because there is no compiler to catch mistakes there.
  `@april/tsconfig` ships JSON, which is the only thing `extends` accepts.
- **Type-checking replaces building.** Every configuration package still runs
  `tsc --noEmit` in the `typecheck` task, so a broken preset fails CI even
  though nothing is emitted. `turbo run build` simply has no work to do for
  them.
- **`types: ["node"]` is declared explicitly** where the type-check graph
  reaches Node APIs. TypeScript 6 stopped auto-including `@types/*`, and these
  packages are not covered by an application's tsconfig that would otherwise
  pull them in.

## Consequences

- A rule change in `@april/eslint-config` takes effect on the next lint run,
  with no build and no cache to invalidate — which is what makes the editor,
  the pre-commit hook, and CI agree.
- The shared packages can only be consumed inside this workspace. Publishing
  any of them would require adding a build step and switching `exports` to the
  emitted files; nothing is published today (ADR 0001), so that cost is not
  paid.
- Anything a configuration package imports must be resolvable by the _tool's_
  loader, not just by `tsc`. Keeping them dependency-light is therefore a
  constraint, not a preference.
- ADR 0001's "per-package `dist/`" bullet should be read as applying to product
  packages only.
