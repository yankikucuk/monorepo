# @april/prettier-config

Shared Prettier configuration for the April monorepo. Type-safe
(`satisfies Config` — an invalid option is a compile-time error), fully
documented, and deliberately small: formatting style is Prettier's job, so this
package only decides _which_ style.

## Options

Every option is either a deliberate deviation from Prettier's default or an
explicit pin of the current default.

### Deviations

| Option          | Value     | Default    | Why                                                                         |
| --------------- | --------- | ---------- | --------------------------------------------------------------------------- |
| `printWidth`    | `120`     | `80`       | Strict-ESLint code with descriptive identifiers wraps constantly at 80.     |
| `singleQuote`   | `true`    | `false`    | Matches the ESLint/TS ecosystem convention used across April sources.       |
| `trailingComma` | `'es5'`   | `'all'`    | No trailing commas after rest args / call parens; cleaner traces and diffs. |
| `arrowParens`   | `'avoid'` | `'always'` | Compact single-arg callbacks: `values.map(value => …)`.                     |

### Pinned defaults

`tabWidth: 2`, `semi: true`, `quoteProps: 'as-needed'`, `endOfLine: 'lf'` —
restated explicitly so a future Prettier major cannot silently reformat the
repository. This is not theoretical: **Prettier 3.0 flipped `trailingComma`
from `es5` to `all`**; pinning is what turns that kind of change into a
reviewed decision instead of surprise churn.

## Usage

The root `prettier.config.ts` re-exports this package, so every workspace
package inherits it automatically:

```ts
// prettier.config.ts
export { default } from '@april/prettier-config';
```

A package that needs local additions spreads the base and appends `overrides`:

```ts
// packages/<pkg>/prettier.config.ts
import base from '@april/prettier-config';

export default {
  ...base,
  overrides: [{ files: '*.md', options: { proseWrap: 'always' } }],
};
```

## License

Apache-2.0
