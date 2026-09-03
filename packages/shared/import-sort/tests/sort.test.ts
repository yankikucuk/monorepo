import { describe, expect, it } from 'vitest';

import { createRecordComparator, resolveOptions, sortImports } from '../src/core/index.js';

import type { ImportRecord, SortedGroup, SortOptions } from '../src/core/index.js';

interface TaggedRecord extends ImportRecord {
  readonly tag: number;
}

/**
 * Builds a record.
 * @param {string} source - Module specifier.
 * @param {Partial<ImportRecord>} [overrides] - Field overrides.
 * @returns {ImportRecord} The record.
 */
function record(source: string, overrides: Partial<ImportRecord> = {}): ImportRecord {
  return { source, kind: 'value', sideEffect: false, ...overrides };
}

/**
 * Flattens sorted blocks into `[groupNames, sources]` pairs for compact assertions.
 * @param {readonly SortedGroup<ImportRecord>[]} blocks - Output of `sortImports`.
 * @returns {[readonly string[], string[]][]} One pair per block.
 */
function summarize(blocks: readonly SortedGroup<ImportRecord>[]): [readonly string[], string[]][] {
  return blocks.map(block => [block.groups, block.records.map(item => item.source)]);
}

/**
 * Sorts sources with the given options and returns the flattened result.
 * @param {readonly string[]} sources - Module specifiers in source order.
 * @param {SortOptions} [options] - Sort options.
 * @returns {[readonly string[], string[]][]} Summarized blocks.
 */
function sortSources(sources: readonly string[], options?: SortOptions): [readonly string[], string[]][] {
  return summarize(
    sortImports(
      sources.map(source => record(source)),
      options
    )
  );
}

describe('sortImports', () => {
  it('groups by the default layout and omits empty blocks', () => {
    expect(
      sortSources(['./b.js', 'react', 'node:path', '../up.js', './index.js', '@scope/a', 'node:fs', './a.js'])
    ).toEqual([
      [['builtin'], ['node:fs', 'node:path']],
      [['external'], ['@scope/a', 'react']],
      [['parent'], ['../up.js']],
      [['sibling'], ['./a.js', './b.js']],
      [['index'], ['./index.js']],
    ]);
  });

  it('accepts already resolved options', () => {
    const resolved = resolveOptions({ groups: ['sibling', 'external'] });
    expect(sortSources(['react', './a.js'], resolved)).toEqual([
      [['sibling'], ['./a.js']],
      [['external'], ['react']],
    ]);
  });

  it('sorts merged blocks as one alphabetical list', () => {
    expect(sortSources(['./z.js', '../a.js', './b.js'], { groups: [['parent', 'sibling']] })).toEqual([
      [
        ['parent', 'sibling'],
        ['../a.js', './b.js', './z.js'],
      ],
    ]);
  });

  it('reverses only the order inside groups for desc', () => {
    expect(sortSources(['./a.js', 'a', './b.js', 'b'], { order: 'desc' })).toEqual([
      [['external'], ['b', 'a']],
      [['sibling'], ['./b.js', './a.js']],
    ]);
  });

  it('places value imports before type imports of the same source when type is not a group', () => {
    const blocks = sortImports([record('a', { kind: 'type' }), record('a'), record('b')], { groups: ['external'] });
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.records.map(item => `${item.kind}:${item.source}`)).toEqual(['value:a', 'type:a', 'value:b']);
  });

  it('collects type imports into the type group and mirrors the value layout inside it', () => {
    const blocks = sortImports([
      record('./s.js', { kind: 'type' }),
      record('@x/utils', { kind: 'type' }),
      record('node:fs', { kind: 'type' }),
      record('../p.js', { kind: 'type' }),
      record('react'),
    ]);
    expect(summarize(blocks)).toEqual([
      [['external'], ['react']],
      [['type'], ['node:fs', '@x/utils', '../p.js', './s.js']],
    ]);
  });

  it('keeps side-effect imports in source order inside the side-effect group', () => {
    const blocks = sortImports(
      [record('a'), record('./z.js', { sideEffect: true }), record('./b.js', { sideEffect: true })],
      { groups: ['side-effect', 'external'] }
    );
    expect(summarize(blocks)).toEqual([
      [['side-effect'], ['./z.js', './b.js']],
      [['external'], ['a']],
    ]);
  });

  it('puts side-effect imports first when a block merges them with ordinary imports', () => {
    const blocks = sortImports([record('a'), record('./z.js', { sideEffect: true }), record('0')], {
      groups: [['side-effect', 'external']],
    });
    expect(summarize(blocks)).toEqual([
      [
        ['side-effect', 'external'],
        ['./z.js', '0', 'a'],
      ],
    ]);
  });

  it('routes side-effect records through their structural group, ahead of the rest, when side-effect is not configured', () => {
    expect(summarize(sortImports([record('./a.js'), record('./b.js', { sideEffect: true })]))).toEqual([
      [['sibling'], ['./b.js', './a.js']],
    ]);
  });

  it('honours custom groups and internal patterns', () => {
    expect(
      sortSources(['axios', '@acme/core', 'react-dom', 'react', './a.js'], {
        groups: ['react', 'external', 'internal', 'sibling'],
        customGroups: { react: '^react(?:-|$)' },
        internalPattern: ['^@acme/'],
      })
    ).toEqual([
      [['react'], ['react', 'react-dom']],
      [['external'], ['axios']],
      [['internal'], ['@acme/core']],
      [['sibling'], ['./a.js']],
    ]);
  });

  it('is stable for duplicate sources and passes host records through untouched', () => {
    const records: TaggedRecord[] = [
      { source: 'a', kind: 'value', sideEffect: false, tag: 1 },
      { source: 'a', kind: 'value', sideEffect: false, tag: 2 },
    ];
    const [block] = sortImports(records);
    expect(block?.records.map(item => item.tag)).toEqual([1, 2]);
    expect(block?.records[0]).toBe(records[0]);
  });

  it('returns no blocks for no records', () => {
    expect(sortImports([])).toEqual([]);
  });
});

describe('createRecordComparator', () => {
  it('returns zero for two side-effect imports so stable sorting keeps their order', () => {
    const compare = createRecordComparator(resolveOptions({ groups: ['side-effect'] }));
    expect(compare(record('./b.js', { sideEffect: true }), record('./a.js', { sideEffect: true }))).toBe(0);
  });

  it('stays a total order when the type group shares a block with another group', () => {
    // Ranking only type/type pairs used to make the comparator non-transitive:
    // `react` < `./local.js` by name, `./local.js` < `type react` by block,
    // yet `type react` < `react` by kind.
    const options = resolveOptions({ groups: [['external', 'type']] });
    const compare = createRecordComparator(options);
    const records = [
      record('react', { kind: 'type' }),
      record('./local.js', { kind: 'type' }),
      record('react'),
      record('axios'),
    ];

    for (const left of records) {
      for (const middle of records) {
        for (const right of records) {
          if (compare(left, middle) <= 0 && compare(middle, right) <= 0) {
            expect(compare(left, right)).toBeLessThanOrEqual(0);
          }
        }
      }
    }
  });

  it('keeps a merged type block in value layout regardless of input order', () => {
    const sources = ['./local.js', 'react', 'axios'];
    const expected = [
      [
        ['external', 'type'],
        ['axios', 'react', './local.js'],
      ],
    ];

    for (const rotation of [0, 1, 2]) {
      const rotated = [...sources.slice(rotation), ...sources.slice(0, rotation)];
      expect(
        summarize(
          sortImports(
            rotated.map(source => record(source, { kind: 'type' })),
            { groups: [['external', 'type']] }
          )
        )
      ).toEqual(expected);
    }
  });

  it('orders declaration shapes when two imports share a source', () => {
    const records = [
      record('mod', { style: 'named' }),
      record('mod', { style: 'default' }),
      record('mod', { style: 'namespace' }),
    ];
    const [block] = sortImports(records, { groups: ['external'] });
    expect(block?.records.map(item => item.style)).toEqual(['namespace', 'default', 'named']);
  });

  it('puts type imports first when kindOrder says so', () => {
    const records = [record('a', { kind: 'value' }), record('a', { kind: 'type' })];
    const [block] = sortImports(records, { groups: ['external'], kindOrder: 'type-first' });
    expect(block?.records.map(item => item.kind)).toEqual(['type', 'value']);
  });

  it('sorts by declaration length when asked, falling back to the source length', () => {
    const records = [record('zz', { length: 40 }), record('aaaa', { length: 10 }), record('mmm', { length: 25 })];
    const [block] = sortImports(records, { groups: ['external'], algorithm: 'line-length' });
    expect(block?.records.map(item => item.source)).toEqual(['aaaa', 'mmm', 'zz']);
  });

  it('keeps the source order inside a group with the unsorted algorithm', () => {
    expect(sortSources(['react', 'axios', 'node:fs'], { algorithm: 'unsorted' })).toEqual([
      [['builtin'], ['node:fs']],
      [['external'], ['react', 'axios']],
    ]);
  });

  it('sorts safe side-effect imports into their structural group', () => {
    const records = [record('./b.css', { sideEffect: true }), record('./a.css', { sideEffect: true }), record('react')];
    expect(summarize(sortImports(records, { groups: ['external', 'style'], safeSideEffects: ['\\.css$'] }))).toEqual([
      [['external'], ['react']],
      [['style'], ['./a.css', './b.css']],
    ]);
  });

  it('keeps order-sensitive side-effect imports ahead of everything in their block', () => {
    const records = [record('react'), record('./setup.js', { sideEffect: true })];
    expect(summarize(sortImports(records, { groups: [['side-effect', 'external']] }))).toEqual([
      [
        ['side-effect', 'external'],
        ['./setup.js', 'react'],
      ],
    ]);
  });

  it('carries the layout details of a block through to the output', () => {
    const [block] = sortImports([record('react')], {
      groups: [{ group: 'external', commentAbove: 'Packages', newlinesInside: 2 }],
    });
    expect(block?.commentAbove).toBe('Packages');
    expect(block?.newlinesInside).toBe(2);
  });

  it('sorts everything into one alphabetical list when groups is empty', () => {
    expect(sortSources(['./b.js', 'react', 'node:fs', '../a.js'], { groups: [] })).toEqual([
      [['unknown'], ['../a.js', './b.js', 'node:fs', 'react']],
    ]);
  });
});
