import { describe, expect, it } from 'vitest';

import {
  BUILTIN_GROUPS,
  DEFAULT_GROUPS,
  DEFAULT_SORT_OPTIONS,
  isResolvedOptions,
  resolveOptions,
} from '../src/core/index.js';

import type { GroupName, ResolvedSortOptions } from '../src/core/index.js';

/**
 * The group names of every resolved block, for compact assertions.
 * @param {ResolvedSortOptions} resolved - Resolved options.
 * @returns {(readonly GroupName[])[]} One entry per block.
 */
function blockNames(resolved: ResolvedSortOptions): (readonly GroupName[])[] {
  return resolved.groups.map(block => block.names);
}

describe('resolveOptions', () => {
  it('applies defaults and appends unknown', () => {
    const resolved = resolveOptions();
    expect(blockNames(resolved)).toEqual([...DEFAULT_GROUPS.map(group => [group]), ['unknown']]);
    expect(resolved.groupIndex.get('builtin')).toBe(0);
    expect(resolved.groupIndex.get('unknown')).toBe(DEFAULT_GROUPS.length);
    expect(resolved.order).toBe(DEFAULT_SORT_OPTIONS.order);
    expect(resolved.algorithm).toBe(DEFAULT_SORT_OPTIONS.algorithm);
    expect(resolved.ignoreCase).toBe(DEFAULT_SORT_OPTIONS.ignoreCase);
    expect(resolved.customGroups).toEqual([]);
    expect(resolved.internalPatterns).toEqual([]);
  });

  it('flattens merged blocks and indexes every name', () => {
    const resolved = resolveOptions({ groups: ['builtin', ['parent', 'sibling', 'index'], 'external'] });
    expect(blockNames(resolved)).toEqual([['builtin'], ['parent', 'sibling', 'index'], ['external'], ['unknown']]);
    expect(resolved.groupIndex.get('sibling')).toBe(1);
    expect(resolved.groupIndex.get('index')).toBe(1);
    expect(resolved.groupIndex.get('external')).toBe(2);
  });

  it('keeps an explicit unknown where it is', () => {
    const resolved = resolveOptions({ groups: ['unknown', 'external'] });
    expect(blockNames(resolved)).toEqual([['unknown'], ['external']]);
  });

  it('compiles custom groups and internal patterns with the u flag', () => {
    const resolved = resolveOptions({
      groups: ['react', 'external'],
      customGroups: { react: ['^react$', '^react-'] },
      internalPattern: ['^@acme/'],
    });
    expect(resolved.customGroups).toEqual([{ name: 'react', patterns: [/^react$/u, /^react-/u] }]);
    expect(resolved.internalPatterns).toEqual([/^@acme\//u]);
    expect(resolved.customGroups[0]?.patterns[0]?.flags).toBe('u');
  });

  it('accepts a single pattern string for a custom group', () => {
    const resolved = resolveOptions({ groups: ['vendor'], customGroups: { vendor: '^@vendor/' } });
    expect(resolved.customGroups).toEqual([{ name: 'vendor', patterns: [/^@vendor\//u] }]);
  });

  it('rejects unknown group names', () => {
    expect(() => resolveOptions({ groups: ['external', 'nope'] })).toThrow(/Unknown group "nope"/u);
  });

  it('rejects duplicated group names', () => {
    expect(() => resolveOptions({ groups: ['external', ['sibling', 'external']] })).toThrow(/more than once/u);
  });

  it('rejects empty blocks', () => {
    expect(() => resolveOptions({ groups: ['external', []] })).toThrow(/empty block at position 1/u);
  });

  it('rejects custom groups that shadow built-ins', () => {
    expect(() => resolveOptions({ groups: ['external'], customGroups: { external: '^x' } })).toThrow(
      /shadows a built-in group/u
    );
  });

  it('rejects custom groups without patterns', () => {
    expect(() => resolveOptions({ groups: ['x'], customGroups: { x: [] } })).toThrow(/at least one pattern/u);
  });

  it('rejects custom groups that are never listed in groups', () => {
    expect(() => resolveOptions({ groups: ['external'], customGroups: { react: '^react' } })).toThrow(
      /declared but never listed/u
    );
  });

  it('rejects invalid regular expressions with the option path', () => {
    expect(() => resolveOptions({ internalPattern: ['('] })).toThrow(
      /Invalid regular expression "\(" in "internalPattern\[0\]"/u
    );
    expect(() => resolveOptions({ groups: ['x'], customGroups: { x: '[' } })).toThrow(/in "customGroups\.x"/u);
  });

  it('rejects invalid safeSideEffects patterns with the option path', () => {
    expect(() => resolveOptions({ safeSideEffects: ['('] })).toThrow(/in "safeSideEffects\[0\]"/u);
  });

  it('accepts the long form of a group and validates its layout details', () => {
    const resolved = resolveOptions({
      groups: [{ group: ['builtin', 'external'], commentAbove: 'Packages', newlinesInside: 1 }],
    });
    expect(resolved.groups[0]).toEqual({
      names: ['builtin', 'external'],
      commentAbove: 'Packages',
      newlinesInside: 1,
    });
    expect(resolved.groups[1]?.commentAbove).toBeNull();

    expect(() => resolveOptions({ groups: [{ group: 'external', commentAbove: '  ' }] })).toThrow(
      /"groups\[0\]\.commentAbove" must not be empty/u
    );
    expect(() => resolveOptions({ groups: [{ group: 'external', newlinesInside: -1 }] })).toThrow(
      /"groups\[0\]\.newlinesInside" must be a non-negative integer/u
    );
    expect(() => resolveOptions({ groups: [{ group: 'external', newlinesInside: 1.5 }] })).toThrow(
      /non-negative integer/u
    );
  });

  it('requires an alphabet for the custom algorithm', () => {
    expect(() => resolveOptions({ algorithm: 'custom' })).toThrow(/requires a non-empty "alphabet"/u);
    expect(() => resolveOptions({ fallbackSort: { algorithm: 'custom' } })).toThrow(/requires a non-empty "alphabet"/u);
    expect(() => resolveOptions({ algorithm: 'custom', alphabet: 'abc' })).not.toThrow();
  });

  it('lets the fallback inherit the primary direction', () => {
    expect(resolveOptions({ order: 'desc' }).fallback).toEqual({ algorithm: 'unsorted', order: 'desc' });
    expect(resolveOptions({ order: 'desc', fallbackSort: { algorithm: 'natural', order: 'asc' } }).fallback).toEqual({
      algorithm: 'natural',
      order: 'asc',
    });
  });

  it('exposes every built-in group name', () => {
    expect(BUILTIN_GROUPS).toContain('side-effect');
    expect(BUILTIN_GROUPS).toContain('unknown');
    expect(new Set(BUILTIN_GROUPS).size).toBe(BUILTIN_GROUPS.length);
  });
});

describe('isResolvedOptions', () => {
  it('distinguishes resolved from raw options', () => {
    expect(isResolvedOptions(resolveOptions())).toBe(true);
    expect(isResolvedOptions({})).toBe(false);
    expect(isResolvedOptions({ groups: ['external'] })).toBe(false);
  });
});
