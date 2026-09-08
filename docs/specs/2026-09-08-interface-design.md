# `@april/interface` — design

Date: 2026-09-08
Status: approved scope; visual values (colours, type) supplied by the owner as work proceeds
Supersedes: the 2026-09-05 draft on the `docs/interface-design-spec` branch

## 1. What it is

A CSS framework authored in Less for PlayerBerry projects: one compiled
stylesheet with prefixed component classes, light and dark themes, and a small
behaviour layer for the few components that need state. The demo pages are
built with the framework itself; anything the demo needs becomes a framework
variant, never demo-only CSS.

## 2. Conventions

- **Classes are prefixed and stacked.** The component class carries the prefix,
  variants are short unprefixed words stacked after it:
  `class="ai-button ghost primary lg pill"`. Variant words only take effect
  inside a component selector (`.ai-button.ghost`), so they never leak.
- **Global modifiers mean the same thing everywhere.**
  - Shape: `square` (0), `soft` (small radius), `rounded` (medium radius),
    `pill` (full). Default per component is set in its tokens.
  - Size: `sm`, `md` (default), `lg`.
  - State: `disabled` (also `[disabled]` and `[aria-disabled="true"]`),
    `active`, `loading` where it applies.
- **Colour roles are shared by every component:** `primary`, `secondary`,
  `success`, `danger`, `info`, `warn`, plus `neutral` for greys. Additional
  colours may exist in the palette for specific purposes without becoming
  roles.
- **State is read from attributes where the platform has one** (`[disabled]`,
  `[aria-current]`, `[aria-expanded]`, `[open]`), and from a class only where
  it has none.
- **Logical properties** (`inline-size`, `padding-inline`) throughout.

## 3. Tokens and themes

Three tiers, as scaffolded:

| Tier      | Form                             | Example                                 |
| --------- | -------------------------------- | --------------------------------------- |
| Primitive | Less variable (never emitted)    | `@ai-primary`, `@ai-bp-md`              |
| Semantic  | custom property on `:root`       | `--ai-primary`, `--ai-primary-hover`    |
| Component | custom property on the component | `--ai-button-height`, `--ai-link-color` |

**Colour generation.** Each role is one Less variable per theme. Hover, active,
soft (tinted background) and contrast (text on the role colour) values are
derived at compile time with `darken()`, `lighten()`, `fade()` and `contrast()`,
then emitted as custom properties for each theme:

```less
.ai-role(@name, @color, @dark: false) {
  --ai-@{name}: @color;
  --ai-@{name}-hover: if(@dark, lighten(@color, 8%), darken(@color, 8%));
  --ai-@{name}-active: if(@dark, lighten(@color, 14%), darken(@color, 14%));
  --ai-@{name}-soft: fade(@color, 12%);
  --ai-@{name}-contrast: contrast(@color, @ai-text-on-dark, @ai-text-on-light);
}
```

The percentages live in one place (`tokens/derive.less`). Light values sit on
`:root`; dark values are written once in a mixin and applied to
`:root:not([data-ai-theme="light"])` under `prefers-color-scheme: dark` and to
`[data-ai-theme="dark"]`.

**Theme switching.** Follows the system by default. The behaviour layer ships
`theme.ts`: `setTheme('light' | 'dark' | 'auto')`, `getTheme()`, and an
`initTheme()` that reads `localStorage['ai-theme']` before first paint (an
inline snippet for the `<head>` is documented so there is no flash), toggles
`data-ai-theme`, and keeps `color-scheme` in sync. Any element with
`data-ai-theme-toggle` cycles the modes.

**Typography and spacing** tokens follow the owner's specification when it
arrives; the scale mechanics (rem-based spacing steps, fluid headings via
`clamp()`) are fixed now.

## 4. Files

```
packages/interface/src/
  index.less                 layer order + imports
  tokens/
    palette.less             owner-supplied colours, one Less variable per role per theme
    derive.less              .ai-role() and the hover/active/soft percentages
    semantic.less            :root light set, dark mixin, motion, typography, spacing, radius, shadows
  mixins/
    media.less               .mq()
    shape.less               .ai-shape() — square/soft/rounded/pill for any component
    size.less                .ai-size() — sm/md/lg height, padding, font size
    focus.less               focus ring
  base.less                  reset + default element styles (html, body, headings, p, lists, code, hr, tables, media, forms baseline)
  typography.less            .ai-heading, .ai-text, .ai-lead, .ai-muted, .ai-code
  components/
    links.less               .ai-link and every link pattern: inline, standalone with arrow, nav link, breadcrumb, external, disabled, colour roles
    buttons.less             .ai-button: solid/outline/ghost/link × roles × sizes × shapes, disabled, loading, icon-only, .ai-button-group
    ...                      one file per component, added in priority order
  layout/                    container, stack, cluster, grid — added when the demo shell needs them
  behavior/
    index.ts                 initAll(), re-exports
    theme.ts                 theme persistence and toggle
    ...                      one module per stateful component
demo/
  index.html                 overview
  <component>.html           one page per component
  shell.html?                no — the shell is markup repeated per page (no templating), styled entirely by framework classes: .ai-sidebar, .ai-topbar, .ai-container, code samples in .ai-code
```

Layer order: `april.reset, april.tokens, april.base, april.layout,
april.components, april.utilities`. Variant words are part of the component
rule, so they live in `april.components`.

## 5. Priority

1. Tokens (with the owner's colours and type), `base.less`, theme switching.
2. Typography.
3. `links.less`.
4. `buttons.less`.
5. Demo shell (sidebar, topbar, theme toggle, code sample block) — every piece
   it needs is added as a framework component or variant first.
6. Further components in the order the owner sets.

Each step ends with its demo page, Stylelint clean, the build under the size
budget noted in the README, and a visual check in Safari and Chrome.

## 6. Behaviour layer

Planned from the start, kept minimal: `theme.ts` now; dropdown, modal, tabs
and similar later. Every initialiser returns a teardown; `initAll()` binds by
`data-ai-*` attributes. No runtime dependencies.

## 7. Build, tooling, browsers

Unchanged from the scaffold: Less → Lightning CSS (`dist/interface.css`,
`dist/interface.min.css`), `tsc` for `dist/behavior`, Stylelint through
`@april/stylelint-config`, browserslist floor Safari 17.4 / Chrome 117 /
Opera 103 / Firefox 128, `pnpm --filter @april/interface dev` for the demo.

## 8. Open

- Whether the demo is also published (for example under the docs site). Local
  only until decided; publishing is a copy step.
- Exact colour, type and spacing values: supplied by the owner per component.
