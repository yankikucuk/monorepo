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
- **Rules live in named groups** (`SHARED_RULES`, `TS_EXTENSION_RULES`,
  `TS_TYPE_AWARE_RULES`, `JSDOC_RULES`, `GOVERNANCE_RULES`) ported from a
  proven external ruleset, with each concern reviewable in isolation.
- **`frontend`** hard-bans `alert`/`confirm`/`prompt`; **`backend`** adds
  `no-sync`. Magic-number policy lives in `base` as
  `@typescript-eslint/no-magic-numbers` (`enforceConst`, structural `0/1/-1/2`
  and bigint exemptions).
- **No inline `eslint-disable` in product code** (`eslint-comments/no-use`).
  Legitimate, file-scoped exceptions live in the central config instead.
- ~~**`import/order` owns statement ordering; `perfectionist` sorts only named
  specifiers**~~ — superseded by [ADR 0003](0003-in-house-import-sorting.md):
  `import-sort/order` now owns both. `perfectionist` sorts exports only;
  `sort-objects`/`sort-classes`/`sort-interfaces` stay disabled to preserve
  semantic order.
- **JSDoc type annotations are not required in TypeScript** (the compiler owns
  types); plain JS files opt in via `JSDOC_JS_TYPE_RULES`.
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
