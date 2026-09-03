import { describe, expect, it } from 'vitest';

import { classifySource, groupCandidates, isStyleSource, resolveGroup, resolveOptions } from '../src/core/index.js';

import type { ImportRecord } from '../src/core/index.js';

const defaults = resolveOptions();

/**
 * Builds a value import record for a source.
 * @param {string} source - Module specifier.
 * @param {Partial<ImportRecord>} [overrides] - Field overrides.
 * @returns {ImportRecord} The record.
 */
function record(source: string, overrides: Partial<ImportRecord> = {}): ImportRecord {
  return { source, kind: 'value', sideEffect: false, ...overrides };
}

describe('classifySource', () => {
  it('recognises Node.js built-ins with and without the node: scheme', () => {
    expect(classifySource('node:fs', defaults)).toBe('builtin');
    expect(classifySource('fs', defaults)).toBe('builtin');
    expect(classifySource('fs/promises', defaults)).toBe('builtin');
    expect(classifySource('node:test', defaults)).toBe('builtin');
  });

  it('recognises bare and scoped package specifiers as external', () => {
    expect(classifySource('react', defaults)).toBe('external');
    expect(classifySource('@scope/pkg', defaults)).toBe('external');
    expect(classifySource('lodash/fp', defaults)).toBe('external');
  });

  it('treats Node subpath imports and internalPattern matches as internal', () => {
    expect(classifySource('#internal/util', defaults)).toBe('internal');
    const options = resolveOptions({ internalPattern: ['^@acme/', '^~/'] });
    expect(classifySource('@acme/core', options)).toBe('internal');
    expect(classifySource('~/lib/a', options)).toBe('internal');
    expect(classifySource('@other/core', options)).toBe('external');
  });

  it('distinguishes parent, sibling, and index paths', () => {
    expect(classifySource('..', defaults)).toBe('parent');
    expect(classifySource('../a.js', defaults)).toBe('parent');
    expect(classifySource('../../a', defaults)).toBe('parent');
    expect(classifySource('./a.js', defaults)).toBe('sibling');
    expect(classifySource('./a/b', defaults)).toBe('sibling');
    expect(classifySource('.', defaults)).toBe('index');
    expect(classifySource('./', defaults)).toBe('index');
    expect(classifySource('./index', defaults)).toBe('index');
    expect(classifySource('./index.js', defaults)).toBe('index');
    expect(classifySource('./index.d.ts', defaults)).toBe('index');
    expect(classifySource('./indexes.js', defaults)).toBe('sibling');
    expect(classifySource('./.index.js', defaults)).toBe('sibling');
    expect(classifySource('.index', defaults)).toBe('unknown');
    expect(classifySource('.index.js', defaults)).toBe('unknown');
  });

  it('classifies absolute paths, URLs, other schemes, and empty strings as unknown', () => {
    expect(classifySource('/abs/path.js', defaults)).toBe('unknown');
    expect(classifySource('https://esm.sh/react', defaults)).toBe('unknown');
    expect(classifySource('npm:react', defaults)).toBe('unknown');
    expect(classifySource('bun:test', defaults)).toBe('unknown');
    expect(classifySource('node:not-a-real-module', defaults)).toBe('unknown');
    expect(classifySource('', defaults)).toBe('unknown');
    expect(classifySource('.hidden', defaults)).toBe('unknown');
  });
});

describe('isStyleSource', () => {
  it('matches stylesheet extensions with optional query or fragment', () => {
    expect(isStyleSource('./a.css')).toBe(true);
    expect(isStyleSource('./a.module.scss')).toBe(true);
    expect(isStyleSource('theme.less?inline')).toBe(true);
    expect(isStyleSource('./a.css#id')).toBe(true);
    expect(isStyleSource('./a.js')).toBe(false);
    expect(isStyleSource('./css')).toBe(false);
    expect(isStyleSource('./a.css?v=1#id')).toBe(true);
    expect(isStyleSource('./a.js?style.css')).toBe(false);
  });

  it('does not backtrack on a specifier that repeats the extension', () => {
    // A single pattern spanning the extension and the query part runs in
    // quadratic time on this input; cutting the query first keeps it linear.
    // The answer comes from the path before the first `?`/`#`, so `.css#…` is
    // a stylesheet and `.js#…` is not, however long the tail.
    const stylesheet = `${'.css#'.repeat(20_000)}\n`;
    const script = `${'.js#'.repeat(20_000)}\n`;
    const started = performance.now();

    expect(isStyleSource(stylesheet)).toBe(true);
    expect(isStyleSource(script)).toBe(false);
    expect(performance.now() - started).toBeLessThan(100);
  });
});

describe('groupCandidates', () => {
  it('lists candidates from most specific to unknown', () => {
    expect(groupCandidates(record('./index.js'), defaults)).toEqual(['index', 'sibling', 'unknown']);
    expect(groupCandidates(record('node:fs'), defaults)).toEqual(['builtin', 'external', 'unknown']);
    expect(groupCandidates(record('#x'), defaults)).toEqual(['internal', 'external', 'unknown']);
    expect(groupCandidates(record('./a.css'), defaults)).toEqual(['style', 'sibling', 'unknown']);
    expect(groupCandidates(record('react'), defaults)).toEqual(['external', 'unknown']);
  });

  it('puts side-effect, type, and custom groups ahead of structural categories', () => {
    const options = resolveOptions({
      groups: ['react', 'side-effect', 'type', 'external'],
      customGroups: { react: ['^react'] },
    });
    expect(groupCandidates(record('react-dom', { sideEffect: true }), options)).toEqual([
      'side-effect',
      'react',
      'external',
      'unknown',
    ]);
    expect(groupCandidates(record('react', { kind: 'type' }), options)).toEqual([
      'type',
      'react',
      'external',
      'unknown',
    ]);
  });

  it('lists matching custom groups in declaration order', () => {
    const options = resolveOptions({
      groups: ['ui', 'vendor', 'external'],
      customGroups: { vendor: '^@vendor/', ui: '^@vendor/ui' },
    });
    expect(groupCandidates(record('@vendor/ui-kit'), options)).toEqual(['vendor', 'ui', 'external', 'unknown']);
  });
});

describe('resolveGroup', () => {
  it('picks the first candidate present in the layout', () => {
    expect(resolveGroup(record('node:fs'), defaults)).toEqual({ name: 'builtin', index: 0 });
    expect(resolveGroup(record('./a.js', { kind: 'type' }), defaults)).toEqual({ name: 'type', index: 7 });
  });

  it('falls back along the candidate chain when categories are not configured', () => {
    const noIndex = resolveOptions({ groups: ['external', 'sibling'] });
    expect(resolveGroup(record('./index.js'), noIndex)).toEqual({ name: 'sibling', index: 1 });
    expect(resolveGroup(record('node:fs'), noIndex)).toEqual({ name: 'external', index: 0 });
    expect(resolveGroup(record('#x'), noIndex)).toEqual({ name: 'external', index: 0 });
    expect(resolveGroup(record('../a.js'), noIndex)).toEqual({ name: 'unknown', index: 2 });
    expect(resolveGroup(record('./a.js', { kind: 'type' }), noIndex)).toEqual({ name: 'sibling', index: 1 });
    expect(resolveGroup(record('./x.js', { sideEffect: true }), noIndex)).toEqual({ name: 'sibling', index: 1 });
  });

  it('respects an explicit position for unknown', () => {
    const options = resolveOptions({ groups: ['unknown', 'external'] });
    expect(resolveGroup(record('/abs.js'), options)).toEqual({ name: 'unknown', index: 0 });
    expect(resolveGroup(record('react'), options)).toEqual({ name: 'external', index: 1 });
  });
});
