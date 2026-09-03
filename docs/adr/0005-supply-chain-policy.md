# 0005 — Supply-chain and dependency policy

- **Status:** Accepted
- **Date:** 2026-09-03

## Context

The repository has almost no runtime dependencies but a very large _development_
dependency graph: a type-checked ESLint setup alone pulls in hundreds of
transitive packages. Every one of them is code that runs on a maintainer's
machine and in CI.

The controls for this were already in place — `allowBuilds` in the workspace
file, an audit job in CI, CodeQL, dependency-review, Renovate rules — but the
_policy_ behind them was not written down anywhere. Without that, the natural
reaction to a red audit job is to lower the threshold, and the natural reaction
to an `overrides` entry is to leave it there forever.

## Decision

- **No install-time code execution.** `allowBuilds` in `pnpm-workspace.yaml`
  denies postinstall build scripts. The two packages that would run one
  (`esbuild`, `unrs-resolver`) ship their platform binaries as
  `optionalDependencies`, so nothing is lost. A new package that genuinely
  needs a build script must be added to `allowBuilds` deliberately, in a
  reviewed change.
- **`pnpm audit --audit-level=high` is a CI gate**, not advisory. `high` rather
  than `moderate` is a deliberate threshold: a development-only graph this large
  produces a steady stream of moderate advisories in tooling that never touches
  untrusted input, and a gate that is routinely overridden stops being a gate.
- **Transitive fixes go through `overrides` in `pnpm-workspace.yaml`**, never
  through a threshold change or an audit-ignore list. Each entry carries the
  advisory identifiers and the dependency path it came through, and is written
  as a _range_ (`brace-expansion@>=4.0.0 <5.0.9`) so it stops applying on its
  own once dependents move past it. Entries are removed when every dependent has
  released a fix; `pnpm audit` staying green is the check that this is safe.
- **CI installs with `--frozen-lockfile`**, so a pull request that changes the
  dependency graph without committing the lockfile fails rather than silently
  resolving something else.
- **Renovate owns routine updates**, with three deliberate exceptions recorded
  in `renovate.json`: devDependencies are grouped into one pull request,
  GitHub Action digests are pinned (`helpers:pinGitHubActionDigests`), and
  TypeScript and ESLint **majors** are disabled because their peer ranges have to
  be coordinated by hand (see [ADR 0002](0002-strict-typechecked-eslint.md)).
  `lockFileMaintenance` is enabled so the lockfile does not drift.
- **Two scanners complement the audit:** CodeQL analyses our own source, and
  `dependency-review` fails a pull request that _introduces_ a dependency with a
  high-severity advisory — catching it in review, whereas `pnpm audit` catches
  what is already installed. It is configured on severity only; licence policy
  is not enforced automatically today.

## Consequences

- A newly published advisory can turn CI red without anyone changing the code.
  That is the intended behaviour; the fix is an override with a comment, or a
  dependency upgrade — both of which leave a reviewable trail.
- The `overrides` block needs periodic pruning. It is small by construction
  (only advisories that dependents have not yet fixed), and each entry's range
  makes it obvious when it has become a no-op.
- TypeScript and ESLint majors are a manual, coordinated task rather than an
  automatic pull request, and can lag behind upstream for months.
- Blocking postinstall scripts means a dependency that _requires_ one will fail
  loudly at install time instead of quietly running code. That is a deliberate
  trade of convenience for reviewability.
