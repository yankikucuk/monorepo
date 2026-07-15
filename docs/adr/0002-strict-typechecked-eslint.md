# 0002 — Strict, type-checked ESLint & toolchain pins

- **Status:** Accepted
- **Date:** 2026-07-16

## Context

We want maximum static-analysis strictness, but the toolchain's "latest"
versions are not always mutually compatible.

## Decision

- **`@april/eslint-config`** owns all ESLint plugins and exposes `base`,
  `frontend`, and `backend` presets built on `typescript-eslint`
  `strictTypeChecked` + `stylisticTypeChecked` (fully type-aware), plus
  `@eslint/js`, sonarjs, regexp, promise, perfectionist, unicorn, import-x, and
  jsdoc. Product code (`packages/*/src`) is type-checked; tooling/tests use a
  `disableTypeChecked` block.
- **`frontend`** hard-bans `alert`/`confirm`/`prompt`; **`backend`** adds
  `no-magic-numbers` and `no-sync`.
- **No inline `eslint-disable` in product code** (`eslint-comments/no-use`).
  Legitimate, file-scoped exceptions live in the central config instead.
- **`perfectionist` is scoped to import/export ordering only** — `sort-objects`
  / `sort-classes` / `sort-interfaces` are disabled to preserve semantic order.
- **`restrict-template-expressions` allows numbers** (pragmatic relaxation of
  the `strictTypeChecked` default).

### Forced version pins

- **TypeScript is capped below 6.1** because `typescript-eslint@8` requires
  `typescript <6.1.0`; TypeScript 7 also removes config options the project
  relies on. Latest usable: **6.0.x** (`module`/`moduleResolution: NodeNext`).
- **`eslint-plugin-import-x`** (not the legacy `eslint-plugin-import`) because
  `eslint-plugin-unicorn` requires ESLint ≥10.4 while the legacy plugin caps at
  ESLint ≤9.
- **`@eslint/js` is versioned independently of ESLint** (latest 10.0.1, not
  tracking `eslint@10.7`).

## Consequences

- ~570 active lint rules, type-aware — one of the strictest practical setups.
- TypeScript and ESLint **major** upgrades must be done manually with peer-range
  coordination; Renovate is configured to hold those majors back.
