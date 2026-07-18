/**
 * Rule relaxations for test files.
 * @packageDocumentation
 */

import type { Linter } from 'eslint';

/**
 * Relaxed limits for test files: test bodies legitimately run longer than
 * product functions, and fixture values read clearer inline.
 */
export const TEST_RULES: Linter.RulesRecord = {
  'max-lines-per-function': ['error', { max: 100, skipBlankLines: true, skipComments: true }],
  'max-statements': ['error', { max: 40 }],
};
