# April

[![CI](https://github.com/yankikucuk/monorepo/actions/workflows/ci.yaml/badge.svg?branch=stage)](https://github.com/yankikucuk/monorepo/actions/workflows/ci.yaml)
[![CodeQL](https://github.com/yankikucuk/monorepo/actions/workflows/codeql.yaml/badge.svg?branch=stage)](https://github.com/yankikucuk/monorepo/actions/workflows/codeql.yaml)
[![Docs](https://github.com/yankikucuk/monorepo/actions/workflows/docs.yaml/badge.svg?branch=stage)](https://yankikucuk.github.io/monorepo/)
[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A526-brightgreen.svg)](.nvmrc)
[![pnpm](https://img.shields.io/badge/pnpm-11-f69220.svg)](package.json)
[![TypeScript](https://img.shields.io/badge/typescript-strict-3178c6.svg)](packages/shared/tsconfig)

A strict, type-safe TypeScript monorepo powered by **pnpm workspaces** and
**Turborepo**. Documentation for every package, generated from the packages
themselves, lives at **[yankikucuk.github.io/monorepo](https://yankikucuk.github.io/monorepo/)**.

## Packages

| Package                                                       | Description                                                                   |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [`@april/cyberflake`](packages/cyberflake)                    | Snowflake-inspired distributed ID generator (the core library).               |
| [`@april/eslint-config`](packages/shared/eslint-config)       | Shared strict, type-checked flat ESLint config (`base`/`frontend`/`backend`). |
| [`@april/import-sort`](packages/shared/import-sort)           | Deterministic import sorting: ESLint rule `import-sort/order` + core engine.  |
| [`@april/prettier-config`](packages/shared/prettier-config)   | Shared Prettier config.                                                       |
| [`@april/stylelint-config`](packages/shared/stylelint-config) | Shared Stylelint config for Less sources (postcss-less syntax).               |
| [`@april/tsconfig`](packages/shared/tsconfig)                 | Shared TypeScript config presets (`base`/`library`).                          |

All packages are `private` and consumed **internally** via the workspace
protocol; nothing is published to a registry. The shared config packages live
under `packages/shared/` and are consumed by package name, so any new package
added to the workspace can reuse them without extra setup.

## Requirements

- Node.js `>=26` (see [`.nvmrc`](.nvmrc))
- pnpm `>=11` (the exact version is pinned in `packageManager`; Node 26 no
  longer bundles Corepack, so install pnpm with `npm i -g pnpm` or enable
  Corepack separately)

## Getting started

```bash
pnpm install
pnpm build
pnpm test
```

## Scripts

| Script               | What it does                                                                            |
| -------------------- | --------------------------------------------------------------------------------------- |
| `pnpm dev`           | Run each package's `dev` script (Turbo, persistent).                                    |
| `pnpm build`         | Emit the product packages to `dist/` (config packages ship sources).                    |
| `pnpm typecheck`     | `tsc --noEmit` across packages, then the repository tsconfig (tests, configs, scripts). |
| `pnpm lint`          | Prettier + strict ESLint across package sources.                                        |
| `pnpm lint:build`    | The same checks across the whole repository.                                            |
| `pnpm format`        | Auto-format and auto-fix across packages.                                               |
| `pnpm format:build`  | Auto-format and auto-fix the whole repository.                                          |
| `pnpm test`          | Run the Vitest suite.                                                                   |
| `pnpm test:coverage` | Run tests with V8 coverage (90% thresholds).                                            |
| `pnpm knip`          | Report unused dependencies / exports.                                                   |
| `pnpm manypkg`       | Validate workspace package.json consistency.                                            |
| `pnpm depcruise`     | Enforce dependency boundaries (dependency-cruiser).                                     |
| `pnpm sort:pkg`      | Sort package.json files (scripts kept logical).                                         |
| `pnpm docs:dev`      | Serve the documentation site locally, regenerated from the packages.                    |
| `pnpm docs:build`    | Build the documentation site (`docs/.vitepress/dist`).                                  |
| `pnpm changeset`     | Record a changeset for the next release.                                                |

## Tooling

- **Linting & formatting:** strict, type-checked ESLint (`strictTypeChecked`
  plus sonarjs, regexp, promise, perfectionist, unicorn, import-x, jsdoc, and
  check-file), in-house import ordering (`@april/import-sort`), and Prettier.
- **Testing:** Vitest with V8 coverage thresholds.
- **Repository health:** Knip (unused code), manypkg (workspace consistency),
  and dependency-cruiser (architecture boundaries).
- **Releases & deps:** Changesets (versioning) and Renovate (dependency updates).
- **Docs:** VitePress site generated from each package's README, TSDoc
  (TypeDoc) and changelog (`pnpm docs:dev`); published to GitHub Pages.
- **Commits:** Husky + lint-staged + commitlint (Angular convention).
- **CI:** GitHub Actions run all of the above, plus CodeQL and dependency-review.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the local workflow and conventions,
and [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) for community guidelines. Report
security issues privately per [`SECURITY.md`](SECURITY.md).

## License

[Apache-2.0](LICENSE) © Yankı Küçük
