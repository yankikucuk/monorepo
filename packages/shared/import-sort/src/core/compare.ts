/**
 * String comparison primitives.
 *
 * Every comparison here is total: two different strings never compare equal, so
 * sorting is deterministic on every platform. `alphabetical` and `natural` are
 * locale-aware (`Intl.Collator`), which puts `./été.js` next to `./ete.js`
 * instead of after `./z.js`; ties from the collator — case folding, accents —
 * are broken on the original text by code unit.
 * @packageDocumentation
 */

import type { ComparePass, ResolvedSortOptions, SortOrder, SpecialCharacters } from './types.js';

/** The comparison settings {@link compareStrings} needs. */
export interface CompareOptions extends ComparePass {
  /** Fold case: the collators are built with it, and the `custom` alphabet is looked up in lower case. */
  readonly ignoreCase: boolean;
  readonly specialCharacters: SpecialCharacters;
  readonly alphabet: string;
  readonly fallback: ComparePass;
  /** Collator of the primary pass. */
  readonly collator: Intl.Collator;
  /** Collator of the fallback pass (numeric collation follows the fallback algorithm, not the primary one). */
  readonly fallbackCollator: Intl.Collator;
}

/** A path segment made only of dots: `.` or `..`. */
const DOTS_ONLY = /^\.+$/u;
/** Leading characters that are neither letters nor digits. */
const LEADING_SPECIALS = /^[^\p{L}\p{N}]+/u;
/** Any character that is neither a letter nor a digit. */
const SPECIALS = /[^\p{L}\p{N}]+/gu;

/**
 * Plain character-code comparison. Used as the final tiebreaker so that the
 * result never depends on input order.
 * @param {string} left - First operand.
 * @param {string} right - Second operand.
 * @returns {number} Negative, zero, or positive per the usual comparator contract.
 */
export const compareCodeUnits = (left: string, right: string): number => {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
};

/**
 * Comparison by the position of each character in a user-supplied alphabet.
 * Characters outside the alphabet sort after every character in it.
 * @param {string} left - First operand.
 * @param {string} right - Second operand.
 * @param {string} alphabet - Character order.
 * @returns {number} Comparator result.
 */
const compareByAlphabet = (left: string, right: string, alphabet: string): number => {
  const shared = Math.min(left.length, right.length);

  for (let index = 0; index < shared; index += 1) {
    const leftRank = alphabet.indexOf(left[index] ?? '');
    const rightRank = alphabet.indexOf(right[index] ?? '');
    const result = Math.sign(
      (leftRank === -1 ? alphabet.length : leftRank) - (rightRank === -1 ? alphabet.length : rightRank)
    );
    if (result !== 0) {
      return result;
    }
  }

  return Math.sign(left.length - right.length);
};

/**
 * Strips the special characters the `specialCharacters` option ignores.
 * @param {string} value - The string to normalize.
 * @param {SpecialCharacters} mode - Configured handling.
 * @returns {string} The comparison key.
 */
const withoutSpecials = (value: string, mode: SpecialCharacters): string => {
  if (mode === 'trim') {
    return value.replace(LEADING_SPECIALS, '');
  }
  if (mode === 'remove') {
    return value.replace(SPECIALS, '');
  }
  return value;
};

/**
 * Runs one comparison pass over two already-normalized strings.
 * @param {string} left - First operand.
 * @param {string} right - Second operand.
 * @param {CompareOptions} options - Comparison settings.
 * @param {ComparePass} pass - The algorithm and direction of this pass.
 * @param {Intl.Collator} collator - The collator built for this pass.
 * @returns {number} Comparator result, before the direction is applied.
 */
const runPass = (
  left: string,
  right: string,
  options: CompareOptions,
  pass: ComparePass,
  collator: Intl.Collator
): number => {
  if (pass.algorithm === 'unsorted') {
    return 0;
  }
  if (pass.algorithm === 'line-length') {
    return Math.sign(left.length - right.length);
  }
  if (pass.algorithm === 'custom') {
    return options.ignoreCase
      ? compareByAlphabet(left.toLowerCase(), right.toLowerCase(), options.alphabet)
      : compareByAlphabet(left, right, options.alphabet);
  }
  return Math.sign(collator.compare(left, right));
};

/**
 * Applies the configured direction to a comparator result. Zero stays zero
 * (never `-0`) so callers can compare against `0` with `Object.is`.
 * @param {number} result - Ascending comparator result.
 * @param {SortOrder} order - Configured direction.
 * @returns {number} The result, negated for `desc`.
 */
export const applyOrder = (result: number, order: SortOrder): number => {
  if (order === 'desc' && result !== 0) {
    return -result;
  }
  return result;
};

/**
 * Builds the collator used by the `alphabetical` and `natural` algorithms.
 *
 * `natural` enables numeric collation, so `v2` sorts before `v10`.
 * Case-insensitive comparison uses the `base` sensitivity, which also folds
 * accents; the caller breaks the resulting ties on the original text.
 * @param {object} options - Locale and case handling.
 * @param {readonly string[] | string} options.locales - Locale(s) to compare in.
 * @param {boolean} options.ignoreCase - Whether case (and accents) are ignored.
 * @param {boolean} options.numeric - Whether digit runs compare numerically.
 * @returns {Intl.Collator} The collator.
 */
export const createCollator = ({
  locales,
  ignoreCase,
  numeric,
}: {
  locales: readonly string[] | string;
  ignoreCase: boolean;
  numeric: boolean;
}): Intl.Collator =>
  new Intl.Collator(typeof locales === 'string' ? locales : [...locales], {
    usage: 'sort',
    numeric,
    sensitivity: ignoreCase ? 'base' : 'variant',
  });

/**
 * Compares two strings with the configured algorithm, case handling, direction
 * and fallback. With the `custom` algorithm, `ignoreCase` lower-cases both
 * operands before the alphabet lookup, so a case-insensitive alphabet should be
 * written in lower case.
 *
 * The result is a total order: when every configured pass ties, the original
 * strings are compared by character code so the outcome never depends on input
 * order. `unsorted` is the one exception — it deliberately returns zero for
 * every pair so that a stable sort keeps the source order.
 * @example
 * ```ts
 * compareStrings('v2', 'v10', options); // < 0 with algorithm 'natural'
 * ```
 * @param {string} left - First operand.
 * @param {string} right - Second operand.
 * @param {CompareOptions} options - Comparison settings.
 * @returns {number} Negative if `left` sorts first, positive if `right` does, zero only when equivalent.
 */
export const compareStrings = (left: string, right: string, options: CompareOptions): number => {
  if (options.algorithm === 'unsorted' && options.fallback.algorithm === 'unsorted') {
    return 0;
  }

  const leftKey = withoutSpecials(left, options.specialCharacters);
  const rightKey = withoutSpecials(right, options.specialCharacters);

  const primary = applyOrder(runPass(leftKey, rightKey, options, options, options.collator), options.order);
  if (primary !== 0) {
    return primary;
  }

  const fallback = applyOrder(
    runPass(leftKey, rightKey, options, options.fallback, options.fallbackCollator),
    options.fallback.order
  );
  if (fallback !== 0) {
    return fallback;
  }

  return applyOrder(compareCodeUnits(left, right), options.order);
};

/**
 * Compares two module specifiers segment by segment, splitting on `/`.
 *
 * Segment-wise comparison keeps a package next to its subpaths and ahead of
 * packages that merely share a prefix:
 *
 * - `react` < `react/jsx-runtime` < `react-dom`
 * - `@eslint/js` < `@eslint-community/eslint-utils`
 * - `./a` < `./a/b` < `./ab`
 * - `../../shared` < `../local` < `./sibling` — relative prefixes with more
 *   dots sort first, so paths run from far to near.
 *
 * A specifier with fewer segments sorts first when every shared segment ties.
 * Length-based and unsorted algorithms compare the specifier as a whole, since
 * splitting it into segments would defeat the point.
 * @param {string} left - First module specifier.
 * @param {string} right - Second module specifier.
 * @param {CompareOptions} options - Comparison settings.
 * @returns {number} Comparator result.
 */
export const compareModuleSources = (left: string, right: string, options: CompareOptions): number => {
  if (options.algorithm === 'line-length' || options.algorithm === 'unsorted') {
    return compareStrings(left, right, options);
  }

  const leftSegments = left.split('/');
  const rightSegments = right.split('/');
  const shared = Math.min(leftSegments.length, rightSegments.length);

  for (let index = 0; index < shared; index += 1) {
    const leftSegment = leftSegments[index] ?? '';
    const rightSegment = rightSegments[index] ?? '';
    const result =
      DOTS_ONLY.test(leftSegment) && DOTS_ONLY.test(rightSegment)
        ? applyOrder(Math.sign(rightSegment.length - leftSegment.length), options.order)
        : compareStrings(leftSegment, rightSegment, options);
    if (result !== 0) {
      return result;
    }
  }

  return applyOrder(Math.sign(leftSegments.length - rightSegments.length), options.order);
};

/**
 * Builds the module-specifier comparator for a resolved option set: segment-wise
 * comparison with the configured algorithm, case handling, and direction.
 * @param {ResolvedSortOptions} options - Resolved options (see `resolveOptions`).
 * @returns {(left: string, right: string) => number} A comparator usable with `Array.prototype.sort`.
 */
export const createComparator =
  (options: ResolvedSortOptions): ((left: string, right: string) => number) =>
  (left, right) =>
    compareModuleSources(left, right, options);
