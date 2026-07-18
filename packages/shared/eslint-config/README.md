# @april/eslint-config

Shared, **strict**, fully **type-checked** flat ESLint configuration for the
April monorepo.

## Presets

| Export                | Import                          | Use for                                                 |
| --------------------- | ------------------------------- | ------------------------------------------------------- |
| `base`                | `@april/eslint-config/base`     | Environment-agnostic base (rarely used alone).          |
| `frontend`            | `@april/eslint-config/frontend` | Browser packages. Hard-bans `alert`/`confirm`/`prompt`. |
| `backend`             | `@april/eslint-config/backend`  | Node.js / server-side packages.                         |
| `ignores`             | `@april/eslint-config`          | Global build-artifact ignore block.                     |
| `TEST_RULES`          | `@april/eslint-config`          | Relaxed size limits for test files.                     |
| `JSDOC_JS_TYPE_RULES` | `@april/eslint-config`          | JSDoc type annotations for plain JS files.              |

## What's included

Composed on top of the recommended presets:

- `@eslint/js` recommended
- `typescript-eslint` **strict + stylistic, type-checked** (`strictTypeChecked`)
- `eslint-plugin-regexp`, `eslint-plugin-sonarjs`, `eslint-plugin-promise`
- `eslint-plugin-import-x` (`import/order` statement ordering + hygiene)
- `eslint-plugin-perfectionist` (named-import/export specifier sorting)
- `eslint-plugin-unicorn`, `eslint-plugin-jsdoc`, `eslint-plugin-check-file`,
  `@eslint-community/eslint-plugin-eslint-comments`

The overlay is organized into named rule groups in `src/base.ts`:

- **`SHARED_RULES`** — core correctness, complexity/size limits, restrictions
  (`no-alert`, `no-bitwise`, `no-console` as warn, for…in ban, …), and style.
- **`TS_EXTENSION_RULES`** — core rules replaced by their `@typescript-eslint`
  equivalents, including `no-magic-numbers` (with `enforceConst` and structural
  `0/1/-1/2` + bigint exemptions) and `no-unused-vars` with `^_` escapes.
- **`TS_TYPE_AWARE_RULES`** — `no-floating-promises`, `no-misused-promises`,
  `await-thenable`, `return-await` (`in-try-catch`), pinned explicitly.
- **`JSDOC_RULES`** — documentation is mandatory; type annotations are **not**
  required in TypeScript (the compiler owns types). For plain JS, add
  `JSDOC_JS_TYPE_RULES` on top.
- **`GOVERNANCE_RULES`** — no inline `eslint-disable` in product code, and
  camelCase filenames via `check-file` (basenames only; kebab-case package
  directories stay valid — this deliberately replaces `unicorn/filename-case`).

### Preset-specific rules

- **`frontend`**: `no-alert` + `no-restricted-globals` for `alert`/`confirm`/`prompt`.
- **`backend`**: `no-sync` (avoid synchronous I/O in server code).

## Usage

Because these presets are type-checked, the consuming config must point the
parser at the repo root:

```ts
// eslint.config.ts
import { backend } from '@april/eslint-config/backend';
import tseslint from 'typescript-eslint';

export default tseslint.config({
  files: ['packages/*/src/**/*.ts'],
  extends: [backend],
  languageOptions: {
    parserOptions: { tsconfigRootDir: import.meta.dirname },
  },
});
```

Files outside the type-checked `src` graph (config, tests, benchmarks) should be
matched by a separate block that adds `tseslint.configs.disableTypeChecked`.

## Frontend `no-alert` guarantee

The `frontend` preset enforces both `no-alert` and `no-restricted-globals` for
`alert`, `confirm`, and `prompt` — these must never appear in frontend code.

## License

Apache-2.0
