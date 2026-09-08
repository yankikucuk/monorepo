/**
 * The sorting algorithm proper: bucket records into configured blocks, then
 * order each block deterministically.
 * @packageDocumentation
 */

import { isOrderSensitive, resolveGroup } from './classify.js';
import { applyOrder, compareCodeUnits, createComparator } from './compare.js';
import { isResolvedOptions, resolveOptions } from './options.js';

import type { ImportKind, ImportRecord, ImportStyle, ResolvedSortOptions, SortedGroup, SortOptions } from './types.js';

/** Declaration shapes, most "main" first; the tiebreaker for records sharing a source. */
const STYLE_RANK: Readonly<Record<ImportStyle, number>> = {
  'side-effect': 0,
  namespace: 1,
  default: 2,
  named: 3,
};

/**
 * Orders the two import kinds according to `kindOrder` — the direction option
 * is about names, not about kinds, so it never applies here.
 * @param {ImportKind} left - First kind.
 * @param {ImportKind} right - Second kind.
 * @param {ResolvedSortOptions} options - Resolved options.
 * @returns {number} Comparator result.
 */
const compareKinds = (left: ImportKind, right: ImportKind, options: ResolvedSortOptions): number => {
  if (left === right) {
    return 0;
  }
  const first: ImportKind = options.kindOrder === 'type-first' ? 'type' : 'value';
  return left === first ? -1 : 1;
};

/**
 * Compares two declaration shapes, so that `import * as ns from 'x'` — the
 * "main" import of a module — precedes `import x from 'x'` and its named
 * imports when both target the same source.
 * @param {ImportRecord} left - First record.
 * @param {ImportRecord} right - Second record.
 * @returns {number} Comparator result.
 */
const compareStyles = (left: ImportRecord, right: ImportRecord): number =>
  Math.sign(STYLE_RANK[left.style ?? 'named'] - STYLE_RANK[right.style ?? 'named']);

/**
 * The length the `line-length` algorithm compares: the host-supplied
 * declaration length, or the specifier's own length when the host has none.
 * @param {ImportRecord} record - Any record.
 * @returns {number} The length.
 */
const lengthOf = (record: ImportRecord): number => record.length ?? record.source.length;

/**
 * The block a record would land in if it were a plain value import.
 *
 * This is the layout key of a block's members. It is constant inside a block
 * that holds a single group, and only becomes visible when a block merges
 * several — most importantly `type`, where it makes type-only imports mirror
 * the configured layout (built-ins, then packages, then relative paths)
 * instead of collapsing into one alphabetical list where `./a` sorts before
 * `react`.
 * @param {ImportRecord} record - Any record.
 * @param {ResolvedSortOptions} options - Resolved options.
 * @returns {number} Block index of the value-import equivalent.
 */
const valueRank = (record: ImportRecord, options: ResolvedSortOptions): number =>
  resolveGroup({ source: record.source, kind: 'value', sideEffect: false }, options).index;

/**
 * Memoised `valueRank`: a comparator runs O(n log n) times and ranking walks
 * the whole candidate chain.
 * @param {ResolvedSortOptions} options - Resolved options.
 * @returns {(record: ImportRecord) => number} The record's value-import block index.
 */
const memoisedRank = (options: ResolvedSortOptions): ((record: ImportRecord) => number) => {
  const ranks = new WeakMap<ImportRecord, number>();
  return record => {
    const cached = ranks.get(record);
    if (typeof cached === 'number') {
      return cached;
    }
    const rank = valueRank(record, options);
    ranks.set(record, rank);
    return rank;
  };
};

/**
 * The length key, only meaningful for the `line-length` algorithm.
 * @param {ImportRecord} left - First record.
 * @param {ImportRecord} right - Second record.
 * @param {ResolvedSortOptions} options - Resolved options.
 * @returns {number} Comparator result, already in the configured direction.
 */
const byLength = (left: ImportRecord, right: ImportRecord, options: ResolvedSortOptions): number => {
  if (options.algorithm !== 'line-length') {
    return 0;
  }
  const result = Math.sign(lengthOf(left) - lengthOf(right));
  return options.order === 'desc' ? -result : result;
};

/**
 * The source comparator used once `line-length` has compared declaration
 * lengths: the fallback pass decides ties, never the length of the source
 * string itself. Without a fallback, ties are broken by code unit so the
 * result stays independent of input order.
 * @param {ResolvedSortOptions} options - Resolved options with `algorithm: 'line-length'`.
 * @returns {(left: string, right: string) => number} The tie-breaking source comparator.
 */
const afterLengthComparator = (options: ResolvedSortOptions): ((left: string, right: string) => number) => {
  if (options.fallback.algorithm === 'unsorted') {
    return (left, right) => applyOrder(compareCodeUnits(left, right), options.order);
  }
  return createComparator({
    ...options,
    algorithm: options.fallback.algorithm,
    order: options.fallback.order,
    collator: options.fallbackCollator,
    fallback: { algorithm: 'unsorted', order: options.fallback.order },
  });
};

/**
 * Builds the comparator used inside a block.
 *
 * Keys, in order:
 *
 * 1. Order-sensitive side-effect imports are never compared by name: they stay
 *    in source order and sort ahead of ordinary imports when a block merges
 *    both. Side-effect imports matched by `safeSideEffects` take part in normal
 *    sorting instead.
 * 2. The value-import block index (see `valueRank`), applied to *every* record rather than only to
 *    type/type pairs. Ranking one subset of a block would make the comparator
 *    non-transitive as soon as `type` shares a block with another group
 *    (`groups: [['external', 'type']]`), and `Array.prototype.toSorted`
 *    requires a total order to produce a stable, meaningful result.
 * 3. The declaration length, when the algorithm is `line-length`.
 * 4. The module source (under `line-length`, only the fallback pass — see
 *    {@link afterLengthComparator}).
 * 5. For two imports of the *same* module: the import kind (see `kindOrder`),
 *    then the declaration shape. Different modules that tie — which only
 *    happens with the `unsorted` algorithm — keep their source order.
 *
 * `Array.prototype.toSorted` is stable, which preserves source order for
 * every tie.
 * @param {ResolvedSortOptions} options - Resolved options.
 * @returns {(left: ImportRecord, right: ImportRecord) => number} The record comparator.
 */
export const createRecordComparator = (
  options: ResolvedSortOptions
): ((left: ImportRecord, right: ImportRecord) => number) => {
  const compareSources =
    options.algorithm === 'line-length' ? afterLengthComparator(options) : createComparator(options);
  const rankOf = memoisedRank(options);

  return (left, right) => {
    const leftPinned = isOrderSensitive(left, options);
    const rightPinned = isOrderSensitive(right, options);
    if (leftPinned || rightPinned) {
      if (leftPinned && rightPinned) {
        return 0;
      }
      return leftPinned ? -1 : 1;
    }

    const byRank = rankOf(left) - rankOf(right);
    if (byRank !== 0) {
      return byRank;
    }
    const byDeclarationLength = byLength(left, right, options);
    if (byDeclarationLength !== 0) {
      return byDeclarationLength;
    }
    const bySource = compareSources(left.source, right.source);
    if (bySource !== 0 || left.source !== right.source) {
      return bySource;
    }
    return compareKinds(left.kind, right.kind, options) || compareStyles(left, right);
  };
};

/**
 * Sorts a list of import records into ordered, non-empty blocks.
 *
 * The input is treated as one contiguous run of imports; hosts decide what a
 * run is (the ESLint rule splits at non-import statements and at side-effect
 * imports, unless `side-effect` is a configured group or the import matches
 * `safeSideEffects`).
 * @example
 * ```ts
 * sortImports(
 *   [
 *     { source: './b.js', kind: 'value', sideEffect: false },
 *     { source: 'react', kind: 'value', sideEffect: false },
 *     { source: './a.js', kind: 'value', sideEffect: false },
 *   ],
 *   { groups: ['external', 'sibling'] }
 * );
 * // → [{ groups: ['external'], records: [react] }, { groups: ['sibling'], records: [./a.js, ./b.js] }]
 * ```
 * @param {readonly T[]} records - Records in source order.
 * @param {ResolvedSortOptions | SortOptions} [options] - Raw or resolved options.
 * @returns {SortedGroup<T>[]} Blocks in layout order, each with its records sorted; empty blocks are omitted.
 * @template T - The host's record type; passed through untouched.
 */
export const sortImports = <T extends ImportRecord>(
  records: readonly T[],
  options: ResolvedSortOptions | SortOptions = {}
): SortedGroup<T>[] => {
  const resolved = isResolvedOptions(options) ? options : resolveOptions(options);
  const compare = createRecordComparator(resolved);
  const buckets = new Map<number, T[]>();

  for (const record of records) {
    const { index } = resolveGroup(record, resolved);
    const bucket = buckets.get(index);
    if (bucket) {
      bucket.push(record);
    } else {
      buckets.set(index, [record]);
    }
  }

  return resolved.groups.flatMap((block, index) => {
    const bucket = buckets.get(index);
    if (!bucket) {
      return [];
    }
    return [
      {
        groups: block.names,
        commentAbove: block.commentAbove,
        newlinesInside: block.newlinesInside,
        records: bucket.toSorted(compare),
      },
    ];
  });
};
