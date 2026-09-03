import { describe, expect, it } from 'vitest';

import {
  applyOrder,
  compareModuleSources,
  compareStrings,
  createComparator,
  resolveOptions,
} from '../src/core/index.js';

import type { CompareOptions, SortOptions } from '../src/core/index.js';

/**
 * Builds comparison options the way the rule does.
 * @param {SortOptions} [options] - User options.
 * @returns {CompareOptions} Resolved comparison settings.
 */
function compareOptions(options: SortOptions = {}): CompareOptions {
  return resolveOptions(options);
}

const natural = compareOptions();
const alphabetical = compareOptions({ algorithm: 'alphabetical' });
const caseSensitive = compareOptions({ ignoreCase: false });

/**
 * Sorts a list with the given string comparator options, for readable
 * whole-list assertions.
 * @param {readonly string[]} values - Input values.
 * @param {CompareOptions} options - Comparator options.
 * @returns {string[]} The sorted copy.
 */
function sortWith(values: readonly string[], options: CompareOptions): string[] {
  return values.toSorted((left, right) => compareModuleSources(left, right, options));
}

describe('compareStrings', () => {
  it('compares character by character with the alphabetical algorithm', () => {
    expect(compareStrings('a', 'b', alphabetical)).toBeLessThan(0);
    expect(compareStrings('b', 'a', alphabetical)).toBeGreaterThan(0);
    expect(compareStrings('a', 'a', alphabetical)).toBe(0);
    // Digits compare as characters: '1' < '2' so 'v10' < 'v2'.
    expect(compareStrings('v10', 'v2', alphabetical)).toBeLessThan(0);
  });

  it('compares digit runs numerically with the natural algorithm', () => {
    expect(compareStrings('v2', 'v10', natural)).toBeLessThan(0);
    expect(compareStrings('file10', 'file9', natural)).toBeGreaterThan(0);
    expect(compareStrings('a1', 'ab', natural)).toBeLessThan(0);
    expect(compareStrings('a', 'a1', natural)).toBeLessThan(0);
    // Numeric runs longer than Number.MAX_SAFE_INTEGER stay exact.
    expect(compareStrings('x99999999999999999999', 'x100000000000000000000', natural)).toBeLessThan(0);
  });

  it('treats numerically equal runs with different padding deterministically', () => {
    expect(compareStrings('v007', 'v7', natural)).not.toBe(0);
    expect(Math.sign(compareStrings('v007', 'v7', natural))).toBe(-Math.sign(compareStrings('v7', 'v007', natural)));
  });

  it('ignores case by default but still produces a total order', () => {
    expect(compareStrings('a', 'B', natural)).toBeLessThan(0);
    expect(compareStrings('Foo', 'foo', natural)).not.toBe(0);
    expect(compareStrings('Foo', 'foo', natural)).toBeLessThan(0);
  });

  it('makes case significant, as a tiebreaker, when asked', () => {
    expect(compareStrings('a', 'B', caseSensitive)).toBeLessThan(0);
    expect(compareStrings('foo', 'Foo', caseSensitive)).toBeLessThan(0);
    expect(compareStrings('Foo', 'foo', caseSensitive)).toBeGreaterThan(0);
  });

  it('sorts accented characters next to their base letter, not after z', () => {
    expect(compareStrings('été', 'zulu', natural)).toBeLessThan(0);
    expect(compareStrings('été', 'ete', natural)).not.toBe(0);
  });

  it('honours the locales option', () => {
    // In Swedish, "ä" is a distinct letter that sorts after "z".
    expect(compareStrings('ätten', 'zulu', compareOptions({ locales: 'sv' }))).toBeGreaterThan(0);
    expect(compareStrings('ätten', 'zulu', compareOptions({ locales: ['de'] }))).toBeLessThan(0);
  });

  it('can ignore leading or all special characters', () => {
    const keep = compareOptions();
    const trim = compareOptions({ specialCharacters: 'trim' });
    const remove = compareOptions({ specialCharacters: 'remove' });

    expect(compareStrings('_beta', 'alpha', trim)).toBeGreaterThan(0);
    expect(compareStrings('_beta', 'alpha', keep)).toBeLessThan(0);
    expect(compareStrings('a-b-c', 'abc', remove)).not.toBe(0);
    expect(compareStrings('a-b-c', 'abd', remove)).toBeLessThan(0);
  });

  it('sorts by length with the line-length algorithm', () => {
    const shortest = compareOptions({ algorithm: 'line-length' });
    expect(compareStrings('zz', 'aaa', shortest)).toBeLessThan(0);
    expect(compareStrings('aaa', 'zz', shortest)).toBeGreaterThan(0);
    expect(compareStrings('ab', 'ba', shortest)).toBeLessThan(0);
  });

  it('follows a custom alphabet', () => {
    const custom = compareOptions({ algorithm: 'custom', alphabet: 'zyxwvutsrqponmlkjihgfedcba' });
    expect(compareStrings('zoo', 'apple', custom)).toBeLessThan(0);
    // Characters outside the alphabet sort last.
    expect(compareStrings('a', '1', custom)).toBeLessThan(0);
  });

  it('keeps everything equal with the unsorted algorithm', () => {
    expect(compareStrings('b', 'a', compareOptions({ algorithm: 'unsorted' }))).toBe(0);
  });

  it('breaks primary ties with the fallback comparison', () => {
    const options = compareOptions({ algorithm: 'line-length', fallbackSort: { algorithm: 'natural' } });
    expect(compareStrings('zz', 'aa', options)).toBeGreaterThan(0);
    expect(compareStrings('aa', 'zz', options)).toBeLessThan(0);
    expect(compareStrings('aa', 'bbb', options)).toBeLessThan(0);
  });

  it('lets the fallback have its own direction', () => {
    const options = compareOptions({
      algorithm: 'unsorted',
      fallbackSort: { algorithm: 'natural', order: 'desc' },
    });
    expect(compareStrings('a', 'b', options)).toBeGreaterThan(0);
  });
});

describe('compareModuleSources', () => {
  it('keeps a package ahead of its subpaths and of longer names sharing a prefix', () => {
    expect(sortWith(['react-dom', 'react/jsx-runtime', 'react'], natural)).toEqual([
      'react',
      'react/jsx-runtime',
      'react-dom',
    ]);
  });

  it('keeps scoped packages together', () => {
    expect(sortWith(['@eslint-community/eslint-utils', '@eslint/js'], natural)).toEqual([
      '@eslint/js',
      '@eslint-community/eslint-utils',
    ]);
  });

  it('orders relative paths by segment, deeper prefixes first', () => {
    expect(sortWith(['./ab', './a/b', './a'], natural)).toEqual(['./a', './a/b', './ab']);
    expect(sortWith(['../local', '../../shared'], natural)).toEqual(['../../shared', '../local']);
    expect(sortWith(['./b', '../a', '../../c', '.'], natural)).toEqual(['../../c', '../a', '.', './b']);
  });

  it('compares whole specifiers, not segments, for length-based sorting', () => {
    expect(sortWith(['./aaaa', 'z', './bb'], compareOptions({ algorithm: 'line-length' }))).toEqual([
      'z',
      './bb',
      './aaaa',
    ]);
  });

  it('returns zero only for identical specifiers', () => {
    expect(compareModuleSources('./a.js', './a.js', natural)).toBe(0);
    expect(compareModuleSources('./a.js', './A.js', natural)).not.toBe(0);
  });
});

describe('applyOrder', () => {
  it('leaves ascending results untouched', () => {
    expect(applyOrder(-1, 'asc')).toBe(-1);
    expect(applyOrder(1, 'asc')).toBe(1);
  });

  it('negates descending results without producing -0', () => {
    expect(applyOrder(-1, 'desc')).toBe(1);
    expect(applyOrder(1, 'desc')).toBe(-1);
    expect(Object.is(applyOrder(0, 'desc'), 0)).toBe(true);
  });
});

describe('createComparator', () => {
  it('honours order, algorithm, and case options', () => {
    const asc = createComparator(resolveOptions());
    const desc = createComparator(resolveOptions({ order: 'desc' }));
    const plain = createComparator(resolveOptions({ algorithm: 'alphabetical' }));

    expect(['b', 'a', 'c'].toSorted(asc)).toEqual(['a', 'b', 'c']);
    expect(['b', 'a', 'c'].toSorted(desc)).toEqual(['c', 'b', 'a']);
    expect(['v2', 'v10'].toSorted(asc)).toEqual(['v2', 'v10']);
    expect(['v2', 'v10'].toSorted(plain)).toEqual(['v10', 'v2']);
  });
});
