# 0006 — What the quality gates cover, and what they deliberately do not

- **Status:** Accepted
- **Date:** 2026-09-03

## Context

The repository runs a stack of quality gates in CI. Several of them have a
_scope_ that is not obvious from their name, and each of those scopes is a decision someone made
for a reason:

- coverage thresholds apply to two packages, not to the workspace;
- linting runs at two different scopes, with different rule sets;
- benchmarks live next to tests but are not run by the test runner;
- one gate (Knip) is advisory on purpose.

A scope that is not written down erodes: an audit of this repository found that
the pre-commit ESLint hook and the root-level source files had silently been
outside every gate, because nothing recorded what the gates were supposed to
cover.

## Decision

- **Tests run from the root, not per package.** One `vitest.config.ts` collects
  `packages/*/tests` and `packages/shared/*/tests`, so there is a single test
  command, a single watch mode, and a single coverage report. Turborepo has no
  `test` task: there is nothing to parallelise across packages, and caching a
  suite this small would cost more than it saves.
- **Coverage thresholds (90% lines/branches/functions/statements) apply to an
  allowlist**, currently `@april/cyberflake` and `@april/import-sort`. Coverage
  is a signal about _logic_, and a declarative configuration package is not
  logic: including `@april/eslint-config` would report a rule table as
  "uncovered" and either dilute the number or force meaningless tests. A new
  package that contains behaviour is expected to be added to the `include` list
  in the same change that adds it.
- **Benchmarks are plain scripts, not test cases.** `packages/*/benchmarks/*`
  runs under `tsx` via `pnpm bench`, outside the test runner, so the hot path
  carries no framework overhead. They measure performance only; correctness is
  the test suite's job. They are linted, but not part of any gate — a benchmark
  is a tool, and a slow machine must not fail CI.
- **Linting runs at two scopes.** `pnpm lint` is the per-package Turborepo task
  over each package's own sources (fast, cacheable, what the editor mirrors).
  `pnpm lint:build` is `prettier --check . && eslint .` over the whole
  repository, which is what catches the root configuration files, `scripts/`,
  tests, and benchmarks. CI runs both; only the second one guarantees that no
  file escapes.
- **Knip is advisory.** It is the one gate that reports on _absence_ — unused
  exports and dependencies — which produces false positives around a public API
  that is deliberately broader than its current internal use. It runs in CI as
  a separate, non-blocking job so the signal is visible without being able to
  block an unrelated change. Promoting it to a gate is a decision to make once
  the API surface has settled.
- **`pnpm docs:api` is a gate, with `treatWarningsAsErrors`.** TypeDoc must
  build the public packages with no warnings at all, which turns a broken
  `{@link}`, or a type that leaks into a public signature without being
  exported, into a CI failure rather than a silently degraded documentation
  page.

## Consequences

- Anyone adding a package with real behaviour must add it to the coverage
  `include` list; nothing enforces that automatically, so it belongs in review.
- The two lint scopes can drift: a rule that only `lint:build` reaches will pass
  the per-package task. They share the same `eslint.config.ts`, so drift can
  only come from the file globs in that config, which is the single place to
  look.
- A machine-dependent benchmark result can never fail CI — and equally, a
  performance regression will not be caught automatically. That is an accepted
  gap, revisited if the benchmarks ever gain a stable baseline to compare
  against.
