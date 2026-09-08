/**
 * Public entry point for the April shared ESLint configuration.
 *
 * Exposes three flat-config presets plus composable fragments:
 * - {@link base}: environment-agnostic strict base (rarely used directly).
 * - {@link frontend}: browser packages, with a hard ban on `alert`/`confirm`/`prompt`.
 * - {@link backend}: Node.js / server-side packages.
 * - {@link JSDOC_JS_TYPE_RULES}: JSDoc type-annotation rules for plain JS files.
 * - {@link TEST_RULES}: relaxed size limits for test files.
 */

export { backend } from './backend.js';
export { base } from './base.js';
export { frontend } from './frontend.js';
export { JSDOC_JS_TYPE_RULES } from './rules/jsdoc.js';
export { TEST_RULES } from './rules/tests.js';
