# @april/interface

Component-oriented CSS framework for April. Consumers get one compiled
stylesheet with semantic classes (`.ai-button`, `.ai-card`) and a small
behaviour layer for the components that need state. The design language is
Apple-derived: restrained, generous whitespace, liquid-glass surfaces that
render identically in Safari, Chrome and Opera.

> The package is scaffolded; the token layer and reset ship today, components
> follow. See the design spec under `docs/specs` for the agreed scope.

## Usage

```js
import '@april/interface/styles.css';
import { initAll } from '@april/interface';

const teardown = initAll();
```

`styles.min.css` is the minified build. Every initialiser returns a teardown
function, so React effects and Vue lifecycle hooks use the same contract as
plain HTML.

## How it is built

- **Authored in Less.** Breakpoints live in Less variables because custom
  properties are invalid inside media query conditions, and the glass recipe is
  a mixin so its fallback and reduced-transparency branches exist once.
- **One cascade layer.** Everything is scoped under `@layer april` with ordered
  sub-layers (`reset`, `tokens`, `base`, `layout`, `components`, `utilities`).
  Unlayered consumer CSS always wins; nobody needs `!important`.
- **Three token tiers.** Primitives are Less variables (never emitted), semantic
  tokens are custom properties on `:root` (light, dark, accessibility modes),
  component tokens are local custom properties.
- **Lightning CSS** lowers the output to the `browserslist` floor in
  `package.json` (Safari 17.4, Chrome 117, Opera 103, Firefox 128) and produces
  the minified build.

## Development

```sh
pnpm --filter @april/interface dev     # rebuild on change and serve demo/ at http://localhost:4400/
pnpm --filter @april/interface build   # dist/interface.css, dist/interface.min.css, dist/behavior/
pnpm --filter @april/interface lint    # Prettier, Stylelint (@april/stylelint-config), ESLint
```

Cross-browser verification is manual: open the demo in Safari, Chrome and Opera
and compare.

## License

Apache-2.0
