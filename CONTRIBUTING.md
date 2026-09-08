# Contributing

Thanks for contributing to April! This guide covers the local workflow and the
conventions enforced by CI.

## Prerequisites

- Node.js `>=26` (`nvm use` reads [`.nvmrc`](.nvmrc))
- pnpm `>=11` (the `packageManager` field pins the exact version; Node 26 no
  longer bundles Corepack, so `npm i -g pnpm` or enable Corepack separately)

```bash
pnpm install
```

`@april/interface` depends on Font Awesome Pro from a private registry. Before
the first install, add the token to your **user-level** `~/.npmrc` (never to
the repository):

```
//npm.fontawesome.com/:_authToken=<token>
```

CI gets it from the `FONTAWESOME_TOKEN` secret.

## Documentation

The site at [yankikucuk.github.io/monorepo](https://yankikucuk.github.io/monorepo/)
is generated from each package's `README.md`, its TSDoc comments and its
`CHANGELOG.md`, so documenting a package means editing those. `pnpm docs:dev`
serves the site locally; `pnpm docs:build` is what CI and the Pages workflow run.

## Development workflow

1. Create a branch off `stage`.
2. Make your change. Add or update tests and TSDoc.
3. Run the quality gates locally (see below).
4. Add a changeset if your change affects a package's public behavior:
   ```bash
   pnpm changeset
   ```
5. Commit using the Angular convention (enforced by commitlint), e.g.
   `feat(cyberflake): add batch generation`. Husky runs lint-staged and
   commitlint on commit.
6. Open a PR against `stage`.

## Quality gates

CI runs — and you should run locally before pushing:

```bash
pnpm typecheck      # tsc --noEmit
pnpm lint           # Prettier + strict, type-checked ESLint (package sources)
pnpm lint:build     # the same checks across the whole repository
pnpm test:coverage  # Vitest with 90% coverage thresholds
pnpm build          # emit to dist/
pnpm docs:api       # TypeDoc must build without warnings
pnpm manypkg        # workspace consistency
pnpm depcruise      # dependency boundaries
pnpm sort:pkg:check # package.json key order
pnpm knip           # unused deps/exports (advisory)
```

`pnpm format` (packages) and `pnpm format:build` (whole repository) fix
everything the first two can fix.

## Conventions

- **No inline `eslint-disable`** in product code — rule exceptions live in the
  central ESLint config.
- **Documentation is mandatory** — public APIs need TSDoc.
- Formatting is handled by Prettier; do not hand-format.
- Import order is enforced by `import-sort/order` (`@april/import-sort`) and
  fixed by `pnpm format`; do not hand-sort imports.
- Shared config changes go through the `@april/eslint-config`,
  `@april/prettier-config`, `@april/tsconfig`, and `@april/import-sort`
  packages.

## Adding a package

New packages live under `packages/`; shared configuration packages live under
`packages/shared/`. Extend the shared presets (consumed by package name, so
location never matters):

- `tsconfig.json` → `@april/tsconfig/library.json` (or `base.json`)
- ESLint via the root config's file globs
- Prettier is inherited from the root config

Then add the new source glob to the root `eslint.config.ts` product block and,
if the package emits code, point `main`/`types`/`exports` at its `dist/`.
