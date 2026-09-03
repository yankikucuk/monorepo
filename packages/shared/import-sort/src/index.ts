/**
 * `@april/import-sort` — deterministic import sorting for JavaScript and
 * TypeScript.
 *
 * This entry point is the ESLint plugin (flat config). The default export is
 * the plugin object; named exports expose its parts (`configs`, `rules`, the
 * `order` rule module and its schema) and the rule types.
 *
 * The underlying sorting engine has no ESLint dependency and is available from
 * `@april/import-sort/core`.
 * @example
 * ```ts
 * // eslint.config.ts
 * import importSort from '@april/import-sort';
 *
 * export default [
 *   importSort.configs.recommended,
 *   // or, with options:
 *   {
 *     plugins: { 'import-sort': importSort },
 *     rules: { 'import-sort/order': ['error', { internalPattern: ['^@acme/'], order: 'desc' }] },
 *   },
 * ];
 * ```
 * @packageDocumentation
 */

import { plugin } from './eslint/plugin.js';

export type { OrderMessageId } from './eslint/diagnose.js';
export type { CommentPatterns, PartitionByComment, PartitionByCommentKinds } from './eslint/partitions.js';

export { configs, rules } from './eslint/plugin.js';
export type { ImportSortPlugin } from './eslint/plugin.js';
export type { NewlinesBetween } from './eslint/render.js';
export type { RuleDocs } from './eslint/ruleDocs.js';
export { DEFAULT_ORDER_RULE_OPTIONS, order, ORDER_OPTIONS_SCHEMA } from './eslint/rules/order.js';
export type { OrderRule, OrderRuleOptions, OrderRuleOptionsTuple } from './eslint/rules/order.js';
export type { TypeSpecifierPlacement } from './eslint/specifiers.js';
export type { TsconfigOption } from './eslint/tsconfig.js';

export default plugin;
