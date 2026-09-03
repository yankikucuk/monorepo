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
- [`@april/import-sort`](../import-sort) (`import-sort/order`: import statement
  ordering, blank lines between groups, and named-specifier sorting — one fix
  per import block)
- `eslint-plugin-import-x` (import hygiene: duplicates, self-imports, useless
  path segments, dynamic `require`)
- `eslint-plugin-perfectionist` (export sorting only)
- `eslint-plugin-unicorn`, `eslint-plugin-jsdoc`, `eslint-plugin-check-file`,
  `@eslint-community/eslint-plugin-eslint-comments`

`src/base.ts` is composition only — every rule decision lives in a documented
group under `src/rules/`, one file per concern:

| Module                | Groups                                                                                                                                                                                                                                                                                                                      |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rules/shared.ts`     | **`SHARED_RULES`** — core correctness, complexity/size limits, restrictions (`no-alert`, `no-bitwise`, `no-console` as warn, for…in ban, …), and style.                                                                                                                                                                     |
| `rules/typescript.ts` | **`TS_EXTENSION_RULES`** — off/on pairs replacing core rules with `@typescript-eslint` equivalents (magic numbers with `enforceConst` + bigint exemptions, unused vars with `^_` escapes, …). **`TS_TYPE_AWARE_RULES`** — `no-floating-promises`, `await-thenable`, `return-await` (`in-try-catch`), pinned explicitly.     |
| `rules/plugins.ts`    | **`UNICORN_RULES`**, **`IMPORT_RULES`** (`import-sort/order` with `internalPattern: ['^@april/']` + TS-aware `import/no-duplicates` + perfectionist export sorting), **`GOVERNANCE_RULES`** (no inline `eslint-disable`, camelCase filenames via `check-file`), **`PRESET_OVERRIDES`** (duplicate-diagnostic suppressions). |
| `rules/jsdoc.ts`      | **`JSDOC_RULES`** — documentation mandatory, type annotations not required in TS. **`JSDOC_JS_TYPE_RULES`** — type annotations for plain JS.                                                                                                                                                                                |
| `rules/tests.ts`      | **`TEST_RULES`** — relaxed size limits for test files.                                                                                                                                                                                                                                                                      |

`ignores` is exported separately and deliberately **not** baked into `base`:
global ignores belong at the top of a consuming config exactly once, while
`base` may be extended by several file-scoped blocks.

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

## Import ordering

Import statements are ordered by `import-sort/order` from
[`@april/import-sort`](../import-sort): built-ins → packages → `@april/*`
(internal) → parent → sibling → index → stylesheets → `import type`, one blank
line between groups, named specifiers sorted, natural case-insensitive
comparison. `pnpm format` fixes everything in one pass. To customise the
layout for a package, override the rule in the consuming config:

```ts
rules: {
  'import-sort/order': ['error', { internalPattern: ['^@april/'], order: 'desc' }],
},
```

## Frontend `no-alert` guarantee

The `frontend` preset enforces both `no-alert` and `no-restricted-globals` for
`alert`, `confirm`, and `prompt` — these must never appear in frontend code.

## License

Apache-2.0
