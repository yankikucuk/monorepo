/**
 * Host-agnostic import sorting engine.
 *
 * Import from `@april/import-sort/core` to reuse the sorting semantics without
 * pulling in ESLint. The ESLint rule in the package root is a thin adapter over
 * this module.
 * @packageDocumentation
 */

export { classifySource, groupCandidates, isOrderSensitive, isStyleSource, resolveGroup } from './classify.js';
export type { PathCategory, ResolvedGroup } from './classify.js';
export { applyOrder, compareModuleSources, compareStrings, createCollator, createComparator } from './compare.js';
export type { CompareOptions } from './compare.js';

export { BUILTIN_GROUPS, DEFAULT_GROUPS, DEFAULT_SORT_OPTIONS, isResolvedOptions, resolveOptions } from './options.js';
export { createRecordComparator, sortImports } from './sort.js';
export type {
  BuiltinGroup,
  ComparePass,
  CustomGroup,
  FallbackSort,
  GroupBlockSpec,
  GroupName,
  GroupSpec,
  ImportKind,
  ImportRecord,
  ImportStyle,
  KindOrder,
  ResolvedBlock,
  ResolvedSortOptions,
  SortAlgorithm,
  SortedGroup,
  SortOptions,
  SortOrder,
  SpecialCharacters,
} from './types.js';
