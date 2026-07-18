/**
 * Shared Prettier configuration for the April monorepo.
 *
 * Consumed by the root `prettier.config.ts`, which re-exports it so every
 * package inherits the same formatting rules.
 *
 * Options are grouped by intent:
 *
 * - **Deviations** change Prettier's default behavior on purpose.
 * - **Pinned defaults** restate the current default explicitly, so a future
 *   Prettier major cannot silently reformat the whole repository. This is not
 *   theoretical: Prettier 3.0 flipped `trailingComma` from `es5` to `all`,
 *   which is exactly the kind of churn pinning prevents.
 *
 * The `satisfies Config` constraint makes invalid option names or values a
 * compile-time error while preserving the exact literal types.
 * @example
 * ```ts
 * // prettier.config.ts (repo root)
 * export { default } from '@april/prettier-config';
 * ```
 * @example
 * ```ts
 * // A package that needs local overrides
 * import base from '@april/prettier-config';
 *
 * export default {
 *   ...base,
 *   overrides: [{ files: '*.md', options: { proseWrap: 'always' } }],
 * };
 * ```
 * @packageDocumentation
 */

import type { Config } from 'prettier';

const config = {
  /* ── Deviations from Prettier defaults ─────────────────────────────── */

  // Default: 80. Wide screens are the norm; 120 keeps strict-ESLint code
  // (long rule names, descriptive identifiers) from wrapping constantly.
  printWidth: 120,

  // Default: false. Single quotes match the ESLint/TS ecosystem convention
  // used across all April sources.
  singleQuote: true,

  // Default: 'all' since Prettier 3.0 (was 'es5' in 2.x). We keep 'es5':
  // no trailing commas after rest args / function call parens, which reads
  // cleaner in stack traces and diffs.
  trailingComma: 'es5',

  // Default: 'always'. Omitting parens on single-arg arrows keeps callback
  // chains compact: `values.map(value => ...)`.
  arrowParens: 'avoid',

  /* ── Pinned defaults (guard against upstream default changes) ──────── */

  tabWidth: 2,
  semi: true,
  quoteProps: 'as-needed',
  endOfLine: 'lf',
} satisfies Config;

export default config;
