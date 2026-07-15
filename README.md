# April

A strict, type-safe TypeScript monorepo powered by **pnpm workspaces** and
**Turborepo**.

## Packages

| Package                                              | Description                                                                   |
| ---------------------------------------------------- | ----------------------------------------------------------------------------- |
| [`@april/cyberflake`](packages/cyberflake)           | Snowflake-inspired distributed ID generator (the core library).               |
| [`@april/eslint-config`](packages/eslint-config)     | Shared strict, type-checked flat ESLint config (`base`/`frontend`/`backend`). |
| [`@april/prettier-config`](packages/prettier-config) | Shared Prettier config.                                                       |
| [`@april/tsconfig`](packages/tsconfig)               | Shared TypeScript config presets (`base`/`library`).                          |

All packages are `private` and consumed **internally** via the workspace
protocol; nothing is published to a registry.

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
| `pnpm test`          | Run the Vitest suite.                               |
| `pnpm test:coverage` | Run tests with V8 coverage (90% thresholds).        |
| `pnpm knip`          | Report unused dependencies / exports.               |
| `pnpm manypkg`       | Validate workspace package.json consistency.        |
| `pnpm depcruise`     | Enforce dependency boundaries (dependency-cruiser). |
| `pnpm docs:api`      | Generate API docs (TypeDoc → `docs/api`).           |
| `pnpm changeset`     | Record a changeset for the next release.            |

## Tooling

Strict ESLint (type-checked `strictTypeChecked` + sonarjs/regexp/promise/
perfectionist), Prettier, Vitest, Changesets, Renovate, Husky + lint-staged +
commitlint, and Knip — all wired into CI.

## Architecture decisions

Notable decisions are recorded as ADRs under [`docs/adr`](docs/adr).

## License

[Apache-2.0](LICENSE) © Yankı Küçük
