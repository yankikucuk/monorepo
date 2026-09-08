# 0001 — Monorepo tooling stack

- **Status:** Accepted
- **Date:** 2026-07-16

## Context

April is a small but growing TypeScript monorepo. We need a build/task layer,
package management, and shared configuration that scales without ceremony.

## Decision

- **pnpm workspaces** for package management (`linkWorkspacePackages`, workspace
  protocol). pnpm is pinned via `packageManager` (Corepack is no longer
  bundled with Node 26, so it is installed separately).
- **Turborepo** for task orchestration and caching (`build`, `typecheck`,
  `lint`, `format`, `clean`). Build outputs and task inputs are declared for
  caching, and the shared configuration packages are global hash inputs
  because every task reads them. Tests run once at the root through Vitest
  rather than as a Turborepo task (see [ADR 0006](0006-quality-gates.md)).
- **Shared config packages** rather than duplicated root config, grouped under
  `packages/shared/`: `@april/tsconfig` (TS presets), `@april/eslint-config`
  (flat ESLint presets), `@april/prettier-config` (Prettier), and
  `@april/stylelint-config` (Stylelint for Less sources). They are consumed
  by package name, so their location under `packages/shared/` is an
  organizational detail — moving them does not affect consumers.
- **Per-package `dist/`** build output for product packages (not a shared
  top-level `artifacts/`), with `exports`/`types` pointing at emitted `.d.ts`.
  The shared configuration packages are the exception: they ship their sources
  and have no build step — see [ADR 0004](0004-config-packages-ship-sources.md).
- **No TypeScript project references.** Turborepo already orchestrates build
  order and caching. The only cross-package type dependency today is
  `@april/eslint-config` importing `@april/import-sort`, which resolves to
  sources (ADR 0004) and needs no build, so project references would add
  complexity with no benefit. Revisit if packages begin depending on each
  other's emitted types.
- Quality/release tooling: Vitest (+ v8 coverage thresholds), Changesets,
  Renovate, Husky + lint-staged + commitlint, Knip, manypkg, dependency-cruiser,
  and TypeDoc — all wired into CI. What each gate covers, and what it
  deliberately leaves out, is recorded in [ADR 0006](0006-quality-gates.md);
  the dependency side of it in [ADR 0005](0005-supply-chain-policy.md).

## Consequences

- Adding a package means extending the shared presets; no config duplication.
- Packages are `private` and consumed internally via the workspace protocol;
  nothing is published to a registry (see the `Release` workflow, which only
  maintains the Changesets version PR).
- If publishing is ever needed, add `publishConfig`, npm provenance, and a
  `publish` step to the release workflow.
