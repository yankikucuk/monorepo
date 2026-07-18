# @april/stylelint-config

Shared Stylelint configuration for the April monorepo, tuned for **Less**
sources (the foundation of April's CSS framework packages).

## What it does

- Parses Less via **`postcss-less`** custom syntax — variables, mixins, `//`
  comments, and `@`-rule extensions are understood instead of rejected as
  invalid CSS. The syntax is resolved from **this** package's dependencies, so
  consumers do not need to install `postcss-less` themselves.
- **`CORRECTNESS_RULES`** — error-catching rules: invalid hex colors, unknown
  units and media features, duplicate properties, shorthand overrides,
  unspaced `calc()` operators, unmatchable `:nth-child()`, invalid grid areas,
  and more. (`property-no-unknown` needs no ignore list: Stylelint already
  exempts custom properties and vendor prefixes by default — locked in by the
  test suite.)
- **`LESS_EXEMPTIONS`** — rules disabled with documented reasons: Less
  functions, at-rule variables, `//` comments, empty hook mixins, positional
  selector repetition, and variable-driven font stacks.

Formatting is intentionally out of scope — Prettier owns it.

## Testing

The repository contains no Less sources yet, so `tests/` ships a vitest smoke
suite that runs Stylelint programmatically: idiomatic Less must lint clean,
real errors must fire the expected rules, and `postcss-less` must resolve from
this package's own tree. A broken rule name or an incompatible Stylelint
upgrade fails CI immediately instead of surfacing in a consumer months later.

## Usage

From a project's `.stylelintrc.json`:

```json
{ "extends": ["@april/stylelint-config"] }
```

Or spread it in a `stylelint.config.js` to add overrides:

```js
import base from '@april/stylelint-config';

export default {
  ...base,
  rules: {
    ...base.rules,
    'color-no-invalid-hex': null,
  },
};
```

Add the workspace dependency and a lint script to the consuming package:

```jsonc
{
  "devDependencies": {
    "@april/stylelint-config": "workspace:*",
    "stylelint": "^17.14.0",
  },
  "scripts": {
    "lint:styles": "stylelint 'src/**/*.less'",
  },
}
```

## License

Apache-2.0
