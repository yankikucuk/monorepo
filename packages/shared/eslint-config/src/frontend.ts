/**
 * Frontend ESLint preset for the April monorepo.
 *
 * Extends the strict {@link base} preset with browser globals and a hard ban on
 * blocking dialog primitives: `alert`, `confirm`, and `prompt` must never appear
 * in frontend code.
 */

import globals from 'globals';
import tseslint from 'typescript-eslint';

import { base } from './base.js';

/**
 * Strict, type-checked configuration for browser-facing packages.
 */
export const frontend = tseslint.config(base, {
  languageOptions: {
    globals: {
      ...globals.browser,
    },
  },
  rules: {
    'no-alert': 'error',
    'no-restricted-globals': [
      'error',
      { name: 'event', message: 'Please use a local parameter instead.' },
      { name: 'alert', message: 'Frontend code must not use alert().' },
      { name: 'confirm', message: 'Frontend code must not use confirm().' },
      { name: 'prompt', message: 'Frontend code must not use prompt().' },
    ],
  },
});
