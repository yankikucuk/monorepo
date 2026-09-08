# Getting started

April is a pnpm + Turborepo monorepo. Everything below assumes you have cloned
[the repository](https://github.com/yankikucuk/monorepo).

## Requirements

- Node.js 26 or newer (`nvm use` reads the repository's `.nvmrc`)
- pnpm 11 (the exact version is pinned in `packageManager`; Node 26 no longer bundles Corepack, so install pnpm with `npm i -g pnpm` or enable Corepack separately)

## Install, build, test

```sh
pnpm install
pnpm build
pnpm test
```

## Using a package

Packages are private and consumed inside the workspace through the `workspace:*` protocol. Add the one you need to your package's manifest and import it by name:

::: code-group

```json [package.json]
{
  "dependencies": {
    "@april/cyberflake": "workspace:*"
  }
}
```

```ts [example.ts]
import { Cyberflake } from '@april/cyberflake';

const generator = new Cyberflake({ workerId: 1 });
const id = generator.generate();
```

:::

Each package page on this site carries its own install snippet, usage guide, API reference and changelog.

## Scripts you will use most

| Script            | What it does                                                        |
| ----------------- | ------------------------------------------------------------------- |
| `pnpm dev`        | Run each package's `dev` script (Turbo, persistent).                |
| `pnpm build`      | Emit the product packages to `dist/`; config packages ship sources. |
| `pnpm typecheck`  | `tsc --noEmit` across packages, then the repository tsconfig.       |
| `pnpm lint:build` | Prettier and strict ESLint across the whole repository.             |
| `pnpm test`       | Vitest, with V8 coverage thresholds under `pnpm test:coverage`.     |
| `pnpm docs:dev`   | This site, regenerated from the packages and served locally.        |
| `pnpm changeset`  | Record a changeset for the next release.                            |

## Where things live

```
packages/
  cyberflake/        product library: Snowflake-inspired ID generator
  shared/
    eslint-config/   strict, type-checked flat ESLint presets
    import-sort/     deterministic import sorting (ESLint rule + core engine)
    prettier-config/ shared Prettier config
    stylelint-config/ shared Stylelint config for Less
    tsconfig/        TypeScript presets (base, library)
docs/                this site (generated pages are ignored by git)
scripts/             repository scripts, including the docs generator
```
