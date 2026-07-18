# @april/stylelint-config

Shared Stylelint configuration for the April monorepo, tuned for **Less**
sources (the foundation of April's CSS framework packages).

## What it does

- Parses Less via **`postcss-less`** custom syntax — variables, mixins, `//`
  comments, and `@`-rule extensions are understood instead of rejected as
  invalid CSS. The syntax is resolved from **this** package's dependencies, so
  consumers do not need to install `postcss-less` themselves.
- Enforces **error-catching rules**: invalid hex colors, unknown units and
  media features, duplicate properties, shorthand overrides, unspaced `calc()`
  operators, unmatchable `:nth-child()`, invalid grid areas, and more.
- **Silences Less false positives** with documented reasons: Less functions,
  at-rule variables, `//` comments, empty hook mixins, positional selector
  repetition, and variable-driven font stacks.

Formatting is intentionally out of scope — Prettier owns it.

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
