# @april/interface

Component-oriented CSS framework for April. Consumers get one compiled
stylesheet with semantic classes (`.ai-button`, `.ai-card`) and a small
behaviour layer for the components that need state. The design language is
Apple-derived: restrained, generous whitespace, liquid-glass surfaces that
render identically in Safari, Chrome and Opera.

> In progress. Shipping today: tokens with light and dark themes, base
> element styles, typography utilities, links, buttons, layout primitives
> (container, stack, cluster) and the application shell used by the demo. See
> `docs/specs/2026-09-08-interface-design.md` for the agreed scope and order.

## Usage

```js
import '@april/interface/styles.css';
import { initAll } from '@april/interface';

const teardown = initAll(); // theme toggle today; stateful components as they land
```

`styles.min.css` is the minified build. Every initialiser returns a teardown
function, so React effects and Vue lifecycle hooks use the same contract as
plain HTML. Load Montserrat and Roboto Mono yourself (the demo uses Google
Fonts); the stylesheet only declares the font stacks.

### Conventions

- Component classes carry the `ai-` prefix; variants are short words stacked
  after it: `class="ai-button ghost primary lg pill"`. Variant words only take
  effect inside a component selector, so they never leak.
- Shape words mean the same on every component: `square`, `soft`, `rounded`,
  `pill`. Sizes: `sm`, `md` (default), `lg`.
- Colour roles are shared by every component: `primary`, `secondary`,
  `success`, `danger`, `info`, `warn`, `neutral`. Hover, active, soft and
  contrast values are derived at build time from one colour per role.
- State is read from attributes where the platform has one (`[disabled]`,
  `[aria-current="page"]`), from a class only where it has none (`active`,
  `loading`).

### Themes

The stylesheet follows the system preference. `data-ai-theme="light|dark"` on
`<html>` overrides it; `initAll()` wires any `[data-ai-theme-toggle]` element
to cycle auto → light → dark and remembers the choice in `localStorage`. To
avoid a flash on load, inline `THEME_BOOT_SCRIPT` (exported from the package)
in `<head>` before the stylesheet.

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
pnpm --filter @april/interface dev     # build, rebuild on change and serve demo/ at http://localhost:4400/
pnpm --filter @april/interface build   # dist/interface.css, dist/interface.min.css, dist/behavior/
pnpm --filter @april/interface lint    # Prettier, Stylelint (@april/stylelint-config), ESLint
```

Cross-browser verification is manual: open the demo in Safari, Chrome and Opera
and compare. The demo pages reference `../dist/interface.css`, so after
`pnpm --filter @april/interface build` they also open straight from disk; the
theme toggle needs the module script, which browsers only run over HTTP, so
use `pnpm dev` for that.

## License

Apache-2.0
