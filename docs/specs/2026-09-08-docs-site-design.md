# Documentation site

Date: 2026-09-08
Status: approved

## Goal

A generated documentation site for every workspace package: overview, usage
with code examples, API reference and changelog, with a consistent, current
design and zero hand-maintenance when packages are added or released.

## Decisions

- **VitePress** (`docs/`), default theme with a small brand layer. It matches
  the repository's Vue and Vite tooling and the look of the Vue, Vite and
  Vitest documentation.
- **Everything generated is ignored by git.** `scripts/generate-docs.mjs`
  writes `docs/packages/<slug>/index.md`, `docs/packages/<slug>/changelog.md`
  and `docs/.vitepress/generated/packages.json`; TypeDoc writes `docs/api/`
  through `typedoc-plugin-markdown` and `typedoc-vitepress-theme`. The repo
  keeps only the generator, the templates and the hand-written guide pages.
- **Sources of truth stay where they are:** `package.json` (name, version,
  description, peer dependencies), `README.md` (features, usage, examples),
  `CHANGELOG.md` (written by Changesets) and TSDoc comments (API).
- **Config packages have no API pages.** `@april/eslint-config`,
  `@april/prettier-config`, `@april/stylelint-config` and `@april/tsconfig`
  are documented by their README and changelog only; the TypeDoc entry points
  remain `packages/cyberflake` and `packages/shared/import-sort`.
- **Deployment:** GitHub Pages at `https://yankikucuk.github.io/monorepo/`
  (`base: '/monorepo/'`), published by `.github/workflows/docs.yaml` on every
  push to `stage`; pull requests only build.

## Layout

```
docs/
  .vitepress/
    config.ts            site config; sidebar and nav built from generated/packages.json and api/typedoc-sidebar.json
    theme/index.ts       default theme + PackageGrid component + style.css
    theme/PackageGrid.vue
    theme/style.css      brand colours, package cards
    generated/           (ignored) packages.json
  index.md               home: hero + <PackageGrid />
  guide/getting-started.md
  guide/contributing.md  points at CONTRIBUTING.md content
  packages/              (ignored) one directory per package
  api/                   (ignored) TypeDoc markdown
  specs/                 design documents, excluded from the site (srcExclude)
scripts/generate-docs.mjs
```

## Generator contract

For each workspace package (discovered from `pnpm-workspace.yaml` globs,
sorted with product packages first, then `packages/shared/*` alphabetically):

- `slug` = package name without the `@april/` scope.
- `index.md`: frontmatter `title`, `description`; a header block with the
  version badge, description, and the install line
  (`pnpm add -D @april/<slug>` plus a note that packages are consumed through
  the workspace protocol); then the README body with its first H1 removed,
  the trailing "License" section removed, and relative links rewritten
  (`../shared/x` → `/packages/x/`, `LICENSE` → repository URL, other files →
  GitHub blob URL at `stage`).
- `changelog.md`: the CHANGELOG with its first H1 replaced by
  `# Changelog · @april/<slug>`; packages without a CHANGELOG get a page that
  says no release has been recorded yet.
- `packages.json`: `[{ name, slug, version, description, hasApi, hasChangelog, path }]`.

The generator is idempotent and deterministic; running it twice produces no
diff. It fails when a package has no README.

## Site behaviour

- Nav: Guide, Packages, API, GitHub. Sidebar per section; the Packages sidebar
  lists every package with Overview, API (when present) and Changelog.
- Local search, dark mode, "Edit this page" to the source README on GitHub,
  last-updated from git.
- `docs:build` fails on dead links (VitePress default) and on TypeDoc
  warnings (`treatWarningsAsErrors`, unchanged).

## Scripts and gates

- `docs:generate` = generator + TypeDoc; `docs:dev`, `docs:build`,
  `docs:preview` run the generator first. `docs:api` is removed.
- CI runs `pnpm docs:build`. Knip gets the docs entry files; ESLint lints
  `docs/.vitepress/**/*.ts` with the tooling block.
- `.gitignore`: `docs/api`, `docs/packages`, `docs/.vitepress/generated`,
  `docs/.vitepress/cache`, `docs/.vitepress/dist`.

## Out of scope

Versioned docs per release, i18n, a playground. Each can be added on top of
VitePress later.
