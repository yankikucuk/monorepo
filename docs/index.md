---
layout: home
hero:
  name: April
  text: Strict, type-safe TypeScript building blocks
  tagline: A distributed ID generator, an import sorter and the shared configuration behind every PlayerBerry TypeScript project.
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/yankikucuk/monorepo
features:
  - icon: 🧊
    title: Zero surprises
    details: Every package is strict by default and fails fast on misconfiguration, so mistakes surface at build time rather than in production data.
  - icon: 📦
    title: One workspace, one source of truth
    details: Packages are consumed through the pnpm workspace protocol; this site is generated from their README, TSDoc and Changesets on every build.
  - icon: 🛠️
    title: Batteries for the tooling
    details: Shared ESLint, Prettier, Stylelint and TypeScript presets keep every project in the workspace on the same rules.
---

<PackageGrid />
