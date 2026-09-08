/**
 * Module-specifier classification.
 *
 * Two layers live here:
 *
 * - {@link classifySource} maps a specifier to its *path category* — the
 *   structural answer to "what kind of module is this?" independent of any
 *   `groups` configuration.
 * - {@link groupCandidates} / {@link resolveGroup} turn a record into the group
 *   it lands in for a given configuration, honouring precedence and falling
 *   back gracefully when a category is not part of `groups`.
 * @packageDocumentation
 */

import { isBuiltin } from 'node:module';

import type { GroupName, ImportRecord, ResolvedSortOptions } from './types.js';

/** Structural categories a specifier can have regardless of configuration. */
export type PathCategory = 'builtin' | 'external' | 'index' | 'internal' | 'parent' | 'sibling' | 'unknown';

/** Stylesheet extensions, anchored at the end of the path. */
const STYLE_EXTENSION = /\.(?:css|less|pcss|postcss|sass|scss|styl|stylus)$/u;
/** Start of a query string or fragment (`./a.css?inline`, `./a.css#id`). */
const QUERY_OR_FRAGMENT = /[?#]/u;
/** `.`, `./`, `./index`, `./index.js`, `./index.d.ts` — but never `.index` or `./index.test.js`. */
const INDEX_SOURCE = /^(?:\.|\.\/(?:index(?:\.d)?(?:\.[\w-]+)?)?)$/u;
/** A URL-like scheme prefix (`https://`, `npm:`, `bun:`). `node:` is handled by `isBuiltin` first. */
const SCHEME_PREFIX = /^[a-z][a-z\d+.-]*:/iu;

/**
 * Whether a specifier refers to a stylesheet, ignoring any query string or
 * fragment (`./a.css?inline`).
 *
 * The query is cut with a linear scan rather than matched with a trailing
 * `.*`: a single pattern spanning both parts backtracks quadratically on a
 * specifier that repeats `.css#` and ends in a newline, and a module specifier
 * is arbitrary text from a source file.
 * @param {string} source - Module specifier.
 * @returns {boolean} `true` for `.css`, `.less`, `.scss`, `.sass`, `.styl`, `.pcss` sources.
 */
export const isStyleSource = (source: string): boolean => {
  const cut = source.search(QUERY_OR_FRAGMENT);
  return STYLE_EXTENSION.test(cut === -1 ? source : source.slice(0, cut));
};

/**
 * Determines the structural category of a module specifier.
 *
 * Precedence, first match wins:
 * 1. Node.js built-ins (`node:fs`, `fs`, `fs/promises`) → `builtin`
 * 2. Node subpath imports (`#internal/x`) and `internalPattern` matches → `internal`
 * 3. `.`, `./`, `./index[.ext]` → `index`
 * 4. `..`, `../…` → `parent`
 * 5. `./…` → `sibling`
 * 6. Absolute paths, URLs, and other schemes → `unknown`
 * 7. Everything else (bare specifiers) → `external`
 * @param {string} source - Module specifier exactly as written.
 * @param {ResolvedSortOptions} options - Resolved options (for `internalPatterns`).
 * @returns {PathCategory} The structural category.
 */
export const classifySource = (source: string, options: ResolvedSortOptions): PathCategory => {
  if (isBuiltin(source)) {
    return 'builtin';
  }
  if (source.startsWith('#') || options.internalPatterns.some(pattern => pattern.test(source))) {
    return 'internal';
  }
  if (INDEX_SOURCE.test(source)) {
    return 'index';
  }
  if (source === '..' || source.startsWith('../')) {
    return 'parent';
  }
  if (source.startsWith('./')) {
    return 'sibling';
  }
  if (source === '' || source.startsWith('/') || source.startsWith('.') || SCHEME_PREFIX.test(source)) {
    return 'unknown';
  }
  return 'external';
};

/**
 * Whether a record's position is semantically significant, i.e. it is a
 * side-effect import that `safeSideEffects` does not mark as safe to move.
 *
 * Order-sensitive records are the ones the host turns into block boundaries and
 * the engine keeps in source order; a *safe* side-effect import is grouped and
 * ordered exactly like an ordinary value import.
 * @param {ImportRecord} record - The import to inspect.
 * @param {ResolvedSortOptions} options - Resolved options.
 * @returns {boolean} `true` when the record must not be reordered freely.
 */
export const isOrderSensitive = (record: ImportRecord, options: ResolvedSortOptions): boolean =>
  record.sideEffect && !options.safeSideEffectPatterns.some(pattern => pattern.test(record.source));

/**
 * Lists every group a record could belong to, most specific first.
 *
 * Precedence: `side-effect` → `type` → custom groups (in declaration order) →
 * `style` → structural category → structural fallbacks → `unknown`. A
 * side-effect import listed in `safeSideEffects` skips the first step and is
 * classified like any other import.
 *
 * The fallbacks make partial `groups` configurations behave intuitively: an
 * index import falls back to `sibling`, a built-in or internal module falls back
 * to `external`, and everything ultimately falls back to `unknown`.
 * @param {ImportRecord} record - The import to classify.
 * @param {ResolvedSortOptions} options - Resolved options.
 * @returns {GroupName[]} Candidate group names in precedence order; always ends with `unknown`.
 */
export const groupCandidates = (record: ImportRecord, options: ResolvedSortOptions): GroupName[] => {
  const candidates: GroupName[] = [];

  if (isOrderSensitive(record, options)) {
    candidates.push('side-effect');
  }
  if (record.kind === 'type') {
    candidates.push('type');
  }
  for (const group of options.customGroups) {
    if (group.patterns.some(pattern => pattern.test(record.source))) {
      candidates.push(group.name);
    }
  }
  if (isStyleSource(record.source)) {
    candidates.push('style');
  }

  const category = classifySource(record.source, options);
  candidates.push(category);
  if (category === 'index') {
    candidates.push('sibling');
  }
  if (category === 'builtin' || category === 'internal') {
    candidates.push('external');
  }
  candidates.push('unknown');

  return candidates;
};

/** The group a record resolved to and the output block it belongs to. */
export interface ResolvedGroup {
  readonly name: GroupName;
  readonly index: number;
}

/**
 * Picks the first candidate group that is part of the configured layout.
 * @param {ImportRecord} record - The import to place.
 * @param {ResolvedSortOptions} options - Resolved options.
 * @returns {ResolvedGroup} The chosen group name and its block index.
 */
export const resolveGroup = (record: ImportRecord, options: ResolvedSortOptions): ResolvedGroup => {
  for (const name of groupCandidates(record, options)) {
    const index = options.groupIndex.get(name);
    if (typeof index === 'number') {
      return { name, index };
    }
  }

  // Unreachable: resolveOptions() guarantees that `unknown` is always mapped.
  throw new Error(`No group could be resolved for ${JSON.stringify(record.source)}`);
};
