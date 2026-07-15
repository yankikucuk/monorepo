# @april/eslint-config

Shared, **strict**, fully **type-checked** flat ESLint configuration for the
April monorepo.

## Presets

| Export     | Import                          | Use for                                                 |
| ---------- | ------------------------------- | ------------------------------------------------------- |
| `base`     | `@april/eslint-config/base`     | Environment-agnostic base (rarely used alone).          |
| `frontend` | `@april/eslint-config/frontend` | Browser packages. Hard-bans `alert`/`confirm`/`prompt`. |
| `backend`  | `@april/eslint-config/backend`  | Node.js / server-side packages.                         |

## What's included

Composed on top of the recommended presets:

- `@eslint/js` recommended
- `typescript-eslint` **strict + stylistic, type-checked** (`strictTypeChecked`)
- `eslint-plugin-regexp`, `eslint-plugin-sonarjs`, `eslint-plugin-promise`
- `eslint-plugin-perfectionist` (deterministic import/export ordering)
- `eslint-plugin-unicorn`, `eslint-plugin-import-x`, `eslint-plugin-jsdoc`

Plus an opinionated strict overlay: complexity/size limits, broad restrictions
(`no-alert`, `no-bitwise`, `no-console`, …), mandatory JSDoc, and consistent
style.

### Preset-specific rules

- **`frontend`**: `no-alert` + `no-restricted-globals` for `alert`/`confirm`/`prompt`.
- **`backend`**: `no-magic-numbers` and `no-sync` (server code should extract
  named constants and avoid synchronous I/O). These are intentionally **not** in
  `base`, so `frontend` does not enforce them.

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
