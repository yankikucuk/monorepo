/**
 * Shared Prettier configuration for the April monorepo.
 *
 * Consumed by the root `prettier.config.ts`, which re-exports it so every
 * package inherits the same formatting rules.
 */

const config = {
  printWidth: 120,
  trailingComma: 'es5',
  tabWidth: 2,
  semi: true,
  singleQuote: true,
  arrowParens: 'avoid',
  quoteProps: 'as-needed',
  endOfLine: 'lf',
} as const;

export default config;
