# Documentation site — implementation plan

Spec: `2026-09-08-docs-site-design.md`. One task per commit; every task ends
with `pnpm docs:build` green.

1. **Toolchain.** Add `vitepress`, `typedoc-plugin-markdown`,
   `typedoc-vitepress-theme` as root devDependencies. Root scripts
   `docs:generate`, `docs:dev`, `docs:build`, `docs:preview`; remove
   `docs:api`. Point `typedoc.json` at the markdown plugin and theme with
   `out: docs/api`, `docsRoot: docs`. Ignore generated paths.
2. **Generator.** `scripts/generate-docs.mjs` per the spec contract, with
   `--check` mode that fails when a package lacks a README. Verify idempotency
   by running twice and diffing.
3. **Site.** `docs/.vitepress/config.ts` (base, nav, sidebars from generated
   data, search, editLink, lastUpdated, srcExclude specs), theme with
   `PackageGrid.vue` and `style.css`, `docs/index.md`, two guide pages.
4. **Gates.** ESLint block for `docs/.vitepress/**/*.ts`, Knip entries, CI
   step `pnpm docs:build`, README docs badge and link.
5. **Deploy.** `.github/workflows/docs.yaml` (configure-pages, build,
   upload-pages-artifact, deploy-pages on `stage`), enable Pages with the
   Actions source, confirm the live URL.
