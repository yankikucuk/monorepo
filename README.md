# April

A strict, type-safe TypeScript monorepo powered by **pnpm workspaces** and
**Turborepo**.

## Packages

| Package                                                       | Description                                                                   |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [`@april/cyberflake`](packages/cyberflake)                    | Snowflake-inspired distributed ID generator (the core library).               |
| [`@april/eslint-config`](packages/shared/eslint-config)       | Shared strict, type-checked flat ESLint config (`base`/`frontend`/`backend`). |
| [`@april/prettier-config`](packages/shared/prettier-config)   | Shared Prettier config.                                                       |
| [`@april/stylelint-config`](packages/shared/stylelint-config) | Shared Stylelint config for Less sources (postcss-less syntax).               |
| [`@april/tsconfig`](packages/shared/tsconfig)                 | Shared TypeScript config presets (`base`/`library`).                          |

All packages are `private` and consumed **internally** via the workspace
protocol; nothing is published to a registry. The shared config packages live
under `packages/shared/` and are consumed by package name, so any new package
added to the workspace can reuse them without extra setup.

## Requirements

- Node.js `>=26` (see [`.nvmrc`](.nvmrc))
- pnpm `>=11` (managed via `packageManager` / Corepack)

## Getting started

```bash
pnpm install
pnpm build
pnpm test
```

## Scripts

| Script               | What it does                                        |
| -------------------- | --------------------------------------------------- |
| `pnpm dev`           | Run `dev` across packages (Turbo).                  |
| `pnpm build`         | Type-check and emit each package to its `dist/`.    |
| `pnpm typecheck`     | `tsc --noEmit` across packages.                     |
| `pnpm lint`          | Prettier + strict ESLint across package sources.    |
| `pnpm format`        | Auto-format and auto-fix across packages.           |
| `pnpm test`          | Run the Vitest suite.                               |
| `pnpm test:coverage` | Run tests with V8 coverage (90% thresholds).        |
| `pnpm knip`          | Report unused dependencies / exports.               |
| `pnpm manypkg`       | Validate workspace package.json consistency.        |
| `pnpm depcruise`     | Enforce dependency boundaries (dependency-cruiser). |
| `pnpm sort:pkg`      | Sort package.json files (scripts kept logical).     |
| `pnpm docs:api`      | Generate API docs (TypeDoc → `docs/api`).           |
| `pnpm changeset`     | Record a changeset for the next release.            |

## Tooling

- **Linting & formatting:** strict, type-checked ESLint (`strictTypeChecked`
  plus sonarjs, regexp, promise, perfectionist, unicorn, import-x, jsdoc, and
  check-file) and Prettier.
- **Testing:** Vitest with V8 coverage thresholds.
- **Repository health:** Knip (unused code), manypkg (workspace consistency),
  and dependency-cruiser (architecture boundaries).
- **Releases & deps:** Changesets (versioning) and Renovate (dependency updates).
- **Docs:** TypeDoc (`pnpm docs:api`).
- **Commits:** Husky + lint-staged + commitlint (Angular convention).
- **CI:** GitHub Actions run all of the above, plus CodeQL and dependency-review.

## Architecture decisions

Notable decisions are recorded as ADRs under [`docs/adr`](docs/adr).

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the local workflow and conventions,
and [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) for community guidelines. Report
security issues privately per [`SECURITY.md`](SECURITY.md).

## License

[Apache-2.0](LICENSE) © Yankı Küçük
