/**
 * Ambient module declarations for ESLint plugins that do not ship their own
 * TypeScript types. These are consumed only for their runtime flat-config
 * objects, so an untyped (`any`) surface is acceptable here.
 */

declare module 'eslint-plugin-promise';
