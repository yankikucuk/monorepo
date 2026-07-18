/**
 * Plugin rule groups: unicorn, import hygiene/ordering, repository
 * governance, and targeted overrides of preset-enabled rules.
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
 * - `import/order` owns statement ordering (type imports grouped last).
 * - `import/no-duplicates` owns duplicate detection — unlike the core
 *   `no-duplicate-imports`, it understands `import type`, which `import/order`
 *   forces into a separate statement.
 * - perfectionist sorts the specifiers inside braces, a concern
 *   `import/order` does not cover.
 */
export const IMPORT_RULES: Linter.RulesRecord = {
  'import/no-duplicates': 'error',
  'import/no-dynamic-require': 'error',
  'import/no-self-import': 'error',
  'import/no-useless-path-segments': 'error',
  'import/order': [
    'error',
    {
      groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type'],
      alphabetize: { order: 'asc' },
    },
  ],
  'perfectionist/sort-exports': ['error', { type: 'natural' }],
  'perfectionist/sort-named-exports': ['error', { type: 'natural' }],
  'perfectionist/sort-named-imports': ['error', { type: 'natural' }],
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
