/**
 * Shared Prettier configuration for the April monorepo.
 *
 * Consumed by the root `prettier.config.ts`, which re-exports it so every
 * package inherits the same formatting rules.
 *
 * The `satisfies Config` constraint makes invalid option names or values a
 * compile-time error while preserving the exact literal types.
 * @example
 * ```ts
 * // prettier.config.ts (repo root)
 * export { default } from '@april/prettier-config';
 * ```
 * @packageDocumentation
 */

import type { Config } from 'prettier';

const config = {
  printWidth: 120,
  trailingComma: 'es5',
  tabWidth: 2,
  semi: true,
  singleQuote: true,
  arrowParens: 'avoid',
  quoteProps: 'as-needed',
  endOfLine: 'lf',
} satisfies Config;

export default config;
