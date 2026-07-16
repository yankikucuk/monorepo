# 0001 — Monorepo tooling stack

- **Status:** Accepted
- **Date:** 2026-07-16

## Context

April is a small but growing TypeScript monorepo. We need a build/task layer,
package management, and shared configuration that scales without ceremony.

## Decision

- **pnpm workspaces** for package management (`linkWorkspacePackages`, workspace
  protocol). pnpm is pinned via `packageManager` / Corepack.
- **Turborepo** for task orchestration and caching (`build`, `typecheck`,
  `lint`, `test`, `format`, `clean`). Build outputs are declared for caching.
- **Shared config packages** rather than duplicated root config, grouped under
  `packages/shared/`: `@april/tsconfig` (TS presets), `@april/eslint-config`
  (flat ESLint presets), `@april/prettier-config` (Prettier). They are consumed
  by package name, so their location under `packages/shared/` is an
  organizational detail — moving them does not affect consumers.
- **Per-package `dist/`** build output (not a shared top-level `artifacts/`),
  with `exports`/`types` pointing at emitted `.d.ts`.
- **No TypeScript project references.** Turborepo already orchestrates build
  order and caching, and there are no cross-package type dependencies today, so
  project references would add complexity with no benefit. Revisit if packages
  begin depending on each other's types.
- Quality/release tooling: Vitest (+ v8 coverage thresholds), Changesets,
  Renovate, Husky + lint-staged + commitlint, Knip, manypkg, dependency-cruiser,
  and TypeDoc — all wired into CI.

## Consequences

- Adding a package means extending the shared presets; no config duplication.
- Packages are `private` and consumed internally via the workspace protocol;
  nothing is published to a registry (see the `Release` workflow, which only
  maintains the Changesets version PR).
- If publishing is ever needed, add `publishConfig`, npm provenance, and a
  `publish` step to the release workflow.
