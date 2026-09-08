/**
 * Option defaults and normalization.
 *
 * {@link resolveOptions} is the single place where user input is validated. It
 * fails fast with a descriptive `TypeError` on configuration mistakes (unknown
 * or duplicated group names, custom groups that never appear in `groups`,
 * invalid regular expressions) so that a typo can never silently disable
 * sorting.
 * @packageDocumentation
 */

import { createCollator } from './compare.js';

import type {
  BuiltinGroup,
  ComparePass,
  CustomGroup,
  GroupBlockSpec,
  GroupName,
  GroupSpec,
  KindOrder,
  ResolvedBlock,
  ResolvedSortOptions,
  SortAlgorithm,
  SortOptions,
  SortOrder,
  SpecialCharacters,
} from './types.js';

/** Every group name the engine understands without configuration. */
export const BUILTIN_GROUPS: readonly BuiltinGroup[] = [
  'side-effect',
  'builtin',
  'external',
  'internal',
  'parent',
  'sibling',
  'index',
  'style',
  'type',
  'unknown',
];

/**
 * Default layout: platform modules first, then third-party, then the
 * project's own code from far to near, stylesheets, and finally type-only
 * imports. `side-effect` is deliberately absent so side-effect imports act as
 * immovable boundaries by default (see the README).
 */
export const DEFAULT_GROUPS: readonly GroupSpec[] = [
  'builtin',
  'external',
  'internal',
  'parent',
  'sibling',
  'index',
  'style',
  'type',
];

/** Defaults applied by {@link resolveOptions} for every omitted option. */
export const DEFAULT_SORT_OPTIONS: Required<SortOptions> = {
  groups: DEFAULT_GROUPS,
  customGroups: {},
  internalPattern: [],
  safeSideEffects: [],
  order: 'asc',
  algorithm: 'natural',
  ignoreCase: true,
  locales: 'en',
  specialCharacters: 'keep',
  alphabet: '',
  fallbackSort: { algorithm: 'unsorted' },
  kindOrder: 'value-first',
};

/** Delimiters of a block comment, for validating `commentAbove`. */
const BLOCK_COMMENT_OPEN = '/*';
const BLOCK_COMMENT_CLOSE = '*/';

/**
 * Compiles a user-supplied pattern with the `u` flag, wrapping syntax errors
 * with the option path for a readable diagnostic.
 * @param {string} pattern - Regular expression source.
 * @param {string} location - Option path for the error message (e.g. `customGroups.react`).
 * @returns {RegExp} The compiled expression.
 * @throws {TypeError} If the pattern is not a valid regular expression.
 */
const compilePattern = (pattern: string, location: string): RegExp => {
  try {
    return new RegExp(pattern, 'u');
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new TypeError(`Invalid regular expression ${JSON.stringify(pattern)} in "${location}": ${reason}`, {
      cause: error,
    });
  }
};

/**
 * Compiles a list of patterns.
 * @param {readonly string[]} patterns - Regular expression sources.
 * @param {string} location - Option name for error messages.
 * @returns {RegExp[]} Compiled expressions.
 */
const compilePatterns = (patterns: readonly string[], location: string): RegExp[] =>
  patterns.map((pattern, index) => compilePattern(pattern, `${location}[${index}]`));

/**
 * Compiles the `customGroups` option.
 * @param {SortOptions['customGroups']} customGroups - Raw option value.
 * @returns {CustomGroup[]} Compiled groups in declaration order.
 * @throws {TypeError} If a custom group shadows a built-in name or has an invalid pattern.
 */
const compileCustomGroups = (customGroups: NonNullable<SortOptions['customGroups']>): CustomGroup[] =>
  Object.entries(customGroups).map(([name, value]) => {
    if (BUILTIN_GROUPS.includes(name as BuiltinGroup)) {
      throw new TypeError(`Custom group "${name}" shadows a built-in group; choose a different name.`);
    }
    const patterns = typeof value === 'string' ? [value] : value;
    if (patterns.length === 0) {
      throw new TypeError(`Custom group "${name}" must define at least one pattern.`);
    }
    return { name, patterns: patterns.map(pattern => compilePattern(pattern, `customGroups.${name}`)) };
  });

/**
 * Normalizes the three accepted spellings of a `groups` entry into its long form.
 * @param {GroupSpec} spec - Raw entry.
 * @returns {GroupBlockSpec} The long form.
 */
const toBlockSpec = (spec: GroupSpec): GroupBlockSpec => {
  if (typeof spec === 'string') {
    return { group: spec };
  }
  if ('group' in spec) {
    return spec;
  }
  return { group: spec };
};

/**
 * Validates the layout details of one block.
 * @param {GroupBlockSpec} spec - The block in long form.
 * @param {number} index - Its position in `groups`, for error messages.
 * @returns {Pick<ResolvedBlock, 'commentAbove' | 'newlinesInside'>} The validated details.
 * @throws {TypeError} On an empty, multi-line or unterminated comment, or a non-integer line count.
 */
const blockLayout = (spec: GroupBlockSpec, index: number): Pick<ResolvedBlock, 'commentAbove' | 'newlinesInside'> => {
  const { commentAbove, newlinesInside } = spec;
  if (typeof commentAbove === 'string') {
    if (commentAbove.trim() === '') {
      throw new TypeError(`"groups[${index}].commentAbove" must not be empty.`);
    }
    if (/[\r\n]/u.test(commentAbove)) {
      throw new TypeError(`"groups[${index}].commentAbove" must be a single line.`);
    }
    if (commentAbove.startsWith(BLOCK_COMMENT_OPEN)) {
      const inner = commentAbove.slice(BLOCK_COMMENT_OPEN.length, -BLOCK_COMMENT_CLOSE.length);
      const closesOnce =
        commentAbove.length >= BLOCK_COMMENT_OPEN.length + BLOCK_COMMENT_CLOSE.length &&
        commentAbove.endsWith(BLOCK_COMMENT_CLOSE) &&
        !inner.includes(BLOCK_COMMENT_CLOSE);
      if (!closesOnce) {
        throw new TypeError(
          `"groups[${index}].commentAbove" must be a complete block comment when it starts with "/*".`
        );
      }
    }
  }
  if (typeof newlinesInside === 'number' && (!Number.isInteger(newlinesInside) || newlinesInside < 0)) {
    throw new TypeError(`"groups[${index}].newlinesInside" must be a non-negative integer.`);
  }
  return { commentAbove: commentAbove ?? null, newlinesInside: newlinesInside ?? null };
};

/**
 * Flattens `groups` into blocks and indexes every name.
 * @param {readonly GroupSpec[]} groups - Raw option value.
 * @param {ReadonlySet<string>} known - Every valid group name (built-in + custom).
 * @returns {Pick<ResolvedSortOptions, 'groupIndex' | 'groups'>} Blocks and the name → block index map.
 * @throws {TypeError} On empty blocks, unknown names, or duplicates.
 */
const compileGroups = (
  groups: readonly GroupSpec[],
  known: ReadonlySet<string>
): Pick<ResolvedSortOptions, 'groupIndex' | 'groups'> => {
  const blocks: ResolvedBlock[] = groups.map((spec, index) => {
    const normalized = toBlockSpec(spec);
    const { group } = normalized;
    return { names: typeof group === 'string' ? [group] : [...group], ...blockLayout(normalized, index) };
  });
  const groupIndex = new Map<GroupName, number>();

  for (const [index, block] of blocks.entries()) {
    if (block.names.length === 0) {
      throw new TypeError(`"groups" contains an empty block at position ${index}.`);
    }
    for (const name of block.names) {
      if (!known.has(name)) {
        throw new TypeError(
          `Unknown group "${name}" in "groups". Use a built-in group (${BUILTIN_GROUPS.join(', ')}) or declare it in "customGroups".`
        );
      }
      if (groupIndex.has(name)) {
        throw new TypeError(`Group "${name}" is listed more than once in "groups".`);
      }
      groupIndex.set(name, index);
    }
  }

  if (!groupIndex.has('unknown')) {
    groupIndex.set('unknown', blocks.length);
    blocks.push({ names: ['unknown'], commentAbove: null, newlinesInside: null });
  }

  return { groups: blocks, groupIndex };
};

/**
 * Resolves the secondary comparison, inheriting the primary direction.
 * @param {NonNullable<SortOptions['fallbackSort']>} fallbackSort - Raw option value.
 * @param {SortOrder} order - The primary direction.
 * @returns {ComparePass} The resolved fallback pass.
 */
const compileFallback = (fallbackSort: NonNullable<SortOptions['fallbackSort']>, order: SortOrder): ComparePass => ({
  algorithm: fallbackSort.algorithm ?? 'unsorted',
  order: fallbackSort.order ?? order,
});

/**
 * Builds a collator, turning an invalid language tag into the same kind of
 * descriptive `TypeError` every other option produces.
 * @param {readonly string[] | string} locales - The `locales` option.
 * @param {boolean} ignoreCase - Whether case is folded.
 * @param {boolean} numeric - Whether digit runs compare numerically.
 * @returns {Intl.Collator} The collator.
 * @throws {TypeError} If `locales` is not a valid BCP 47 language tag.
 */
const collatorFor = (locales: readonly string[] | string, ignoreCase: boolean, numeric: boolean): Intl.Collator => {
  try {
    return createCollator({ locales, ignoreCase, numeric });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new TypeError(`Invalid "locales" ${JSON.stringify(locales)}: ${reason}`, { cause: error });
  }
};

/**
 * Validates and normalizes user options into a {@link ResolvedSortOptions}.
 *
 * Idempotent on its own output shape: hosts may resolve once per lint run and
 * pass the result to every engine function.
 * @example
 * ```ts
 * const resolved = resolveOptions({ groups: ['external', ['parent', 'sibling']], order: 'desc' });
 * resolved.groups; // [{ names: ['external'] }, { names: ['parent', 'sibling'] }, { names: ['unknown'] }]
 * ```
 * @param {SortOptions} [options] - User options; every field optional.
 * @returns {ResolvedSortOptions} Normalized options with defaults applied.
 * @throws {TypeError} On any configuration error (see module docs).
 */
export const resolveOptions = (options: SortOptions = {}): ResolvedSortOptions => {
  const customGroups = compileCustomGroups(options.customGroups ?? DEFAULT_SORT_OPTIONS.customGroups);
  const known = new Set<string>([...BUILTIN_GROUPS, ...customGroups.map(group => group.name)]);
  const { groups, groupIndex } = compileGroups(options.groups ?? DEFAULT_SORT_OPTIONS.groups, known);

  for (const group of customGroups) {
    if (!groupIndex.has(group.name)) {
      throw new TypeError(`Custom group "${group.name}" is declared but never listed in "groups".`);
    }
  }

  const order: SortOrder = options.order ?? DEFAULT_SORT_OPTIONS.order;
  const algorithm: SortAlgorithm = options.algorithm ?? DEFAULT_SORT_OPTIONS.algorithm;
  const ignoreCase = options.ignoreCase ?? DEFAULT_SORT_OPTIONS.ignoreCase;
  const specialCharacters: SpecialCharacters = options.specialCharacters ?? DEFAULT_SORT_OPTIONS.specialCharacters;
  const alphabet = options.alphabet ?? DEFAULT_SORT_OPTIONS.alphabet;
  const kindOrder: KindOrder = options.kindOrder ?? DEFAULT_SORT_OPTIONS.kindOrder;
  const fallback = compileFallback(options.fallbackSort ?? DEFAULT_SORT_OPTIONS.fallbackSort, order);
  const locales = options.locales ?? DEFAULT_SORT_OPTIONS.locales;

  if ((algorithm === 'custom' || fallback.algorithm === 'custom') && alphabet === '') {
    throw new TypeError('The "custom" algorithm requires a non-empty "alphabet".');
  }

  return {
    groups,
    groupIndex,
    customGroups,
    internalPatterns: compilePatterns(
      options.internalPattern ?? DEFAULT_SORT_OPTIONS.internalPattern,
      'internalPattern'
    ),
    safeSideEffectPatterns: compilePatterns(
      options.safeSideEffects ?? DEFAULT_SORT_OPTIONS.safeSideEffects,
      'safeSideEffects'
    ),
    order,
    algorithm,
    ignoreCase,
    specialCharacters,
    alphabet,
    fallback,
    kindOrder,
    collator: collatorFor(locales, ignoreCase, algorithm === 'natural'),
    fallbackCollator: collatorFor(locales, ignoreCase, fallback.algorithm === 'natural'),
  };
};

/**
 * Type guard distinguishing already-resolved options from raw user options.
 * @param {ResolvedSortOptions | SortOptions} options - Either shape.
 * @returns {boolean} `true` when `options` came from {@link resolveOptions}.
 */
export const isResolvedOptions = (options: ResolvedSortOptions | SortOptions): options is ResolvedSortOptions =>
  'groupIndex' in options && options.groupIndex instanceof Map;
