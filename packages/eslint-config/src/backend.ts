/**
 * Backend ESLint preset for the April monorepo.
 *
 * Extends the strict {@link base} preset with Node.js globals. It is a single,
 * uncompromising strict configuration intended for services, libraries, and any
 * server-side package.
 */

import globals from 'globals';
import tseslint from 'typescript-eslint';

import { base } from './base.js';

/**
 * Strict, type-checked configuration for Node.js / server-side packages.
 */
export const backend = tseslint.config(base, {
  languageOptions: {
    globals: {
      ...globals.node,
    },
  },
  rules: {
    'no-magic-numbers': 'error',
    'no-sync': 'error',
  },
});
