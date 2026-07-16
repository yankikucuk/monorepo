/**
 * Public entry point for the April shared ESLint configuration.
 *
 * Exposes three flat-config presets:
 * - {@link base}: environment-agnostic strict base (rarely used directly).
 * - {@link frontend}: browser packages, with a hard ban on `alert`/`confirm`/`prompt`.
 * - {@link backend}: Node.js / server-side packages.
 */

export { backend } from './backend.js';
export { base } from './base.js';
export { frontend } from './frontend.js';
