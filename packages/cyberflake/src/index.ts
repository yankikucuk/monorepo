/**
 * Public entry point for the Cyberflake distributed ID generator.
 *
 * Consumers should import exclusively from this module; everything under
 * `./internal` is a private implementation detail and may change without
 * notice.
 */

export { Cyberflake } from './cyberflake.js';

export type { CyberflakeConfig, DeconstructedCyberflake } from './types.js';
