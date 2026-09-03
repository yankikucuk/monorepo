/**
 * Plugin rule groups: unicorn, import hygiene/ordering (via
 * `@april/import-sort`), repository governance, and targeted overrides of
 * preset-enabled rules.
 * @packageDocumentation
 */

import type { Linter } from 'eslint';

/**
 * Unicorn rules. `unicorn/filename-case` is intentionally replaced by
 * `check-file/filename-naming-convention` (see {@link GOVERNANCE_RULES}),
 * which checks basenames only — unicorn's version also flags kebab-case
 * package directories.
 */
export const UNICORN_RULES: Linter.RulesRecord = {
  'unicorn/no-abusive-eslint-disable': 'error',
  'unicorn/no-empty-file': 'error',
  'unicorn/prefer-at': 'error',
  'unicorn/prefer-includes': 'error',
  'unicorn/prefer-node-protocol': 'error',
  'unicorn/prefer-string-slice': 'error',
  'unicorn/throw-new-error': 'error',
};

/**
 * Import hygiene and deterministic ordering.
 *
 * Ownership is split to avoid fixer conflicts:
 * - `import-sort/order` (from `@april/import-sort`) owns import statement
 *   ordering, blank lines between import groups, and the order of named
 *   specifiers inside braces — one rule, one fix per import block. Workspace
 *   packages (`@april/*`) form the `internal` group.
 * - `import/no-duplicates` owns duplicate detection — unlike the core
 *   `no-duplicate-imports`, it understands `import type`.
 * - perfectionist sorts exports only; it must never sort imports here.
 */
export const IMPORT_RULES: Linter.RulesRecord = {
  'import/no-duplicates': 'error',
  'import/no-dynamic-require': 'error',
  'import/no-self-import': 'error',
  'import/no-useless-path-segments': 'error',
  'import-sort/order': ['error', { internalPattern: ['^@april/'] }],
  'perfectionist/sort-exports': ['error', { type: 'natural' }],
  'perfectionist/sort-named-exports': ['error', { type: 'natural' }],
};

/**
 * Repository governance rules: no inline escape hatches in product code and
 * camelCase file names (basenames only, so kebab-case package directories
 * remain valid).
 */
export const GOVERNANCE_RULES: Linter.RulesRecord = {
  'eslint-comments/no-use': 'error',
  'check-file/filename-naming-convention': [
    'error',
    { '**/*.{js,ts}': 'CAMEL_CASE' },
    { ignoreMiddleExtensions: true },
  ],
};

/**
 * Targeted overrides of rules that recommended presets enable but that
 * duplicate a better-configured rule elsewhere in this config.
 */
export const PRESET_OVERRIDES: Linter.RulesRecord = {
  // Duplicates @typescript-eslint/no-unused-vars diagnostics and does not
  // honor the ^_ escape patterns, so intentional _unused bindings would flag.
  'sonarjs/no-unused-vars': 'off',
};
