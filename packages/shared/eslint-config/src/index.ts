/**
 * Public entry point for the April shared ESLint configuration.
 *
 * Exposes three flat-config presets plus composable rule fragments:
 * - {@link base}: environment-agnostic strict base (rarely used directly).
 * - {@link frontend}: browser packages, with a hard ban on `alert`/`confirm`/`prompt`.
 * - {@link backend}: Node.js / server-side packages.
 * - {@link ignores}: global build-artifact ignores.
 * - {@link JSDOC_JS_TYPE_RULES}: JSDoc type-annotation rules for plain JS files.
 * - {@link TEST_RULES}: relaxed size limits for test files.
 */

export { backend } from './backend.js';
export { base, ignores, JSDOC_JS_TYPE_RULES, TEST_RULES } from './base.js';
export { frontend } from './frontend.js';
