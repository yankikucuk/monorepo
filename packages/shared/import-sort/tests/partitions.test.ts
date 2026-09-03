import { describe, expect, it } from 'vitest';

import { compilePartitionComments } from '../src/eslint/partitions.js';

import type { TSESTree } from '@typescript-eslint/utils';

/**
 * Builds the minimal comment token the predicate reads.
 * @param {'Block' | 'Line'} type - Comment kind.
 * @param {string} value - Body between the delimiters.
 * @returns {TSESTree.Comment} The token.
 */
function comment(type: 'Block' | 'Line', value: string): TSESTree.Comment {
  return { type, value } as unknown as TSESTree.Comment;
}

describe('compilePartitionComments', () => {
  it('never partitions when the option is omitted or false', () => {
    expect(compilePartitionComments()(comment('Line', 'anything'))).toBe(false);
    expect(compilePartitionComments(false)(comment('Line', 'anything'))).toBe(false);
  });

  it('partitions on every comment when the option is true', () => {
    const isPartition = compilePartitionComments(true);
    expect(isPartition(comment('Line', 'anything'))).toBe(true);
    expect(isPartition(comment('Block', 'anything'))).toBe(true);
  });

  it('accepts one pattern or a list, matching the trimmed body', () => {
    expect(compilePartitionComments('^Section')(comment('Line', ' Section: models'))).toBe(true);
    expect(compilePartitionComments(['^Part', '^Section'])(comment('Line', ' Section: models'))).toBe(true);
    expect(compilePartitionComments(['^Part'])(comment('Line', ' Section: models'))).toBe(false);
  });

  it('can treat the two comment kinds differently', () => {
    const isPartition = compilePartitionComments({ block: true, line: ['^-{3,}'] });
    expect(isPartition(comment('Block', 'anything'))).toBe(true);
    expect(isPartition(comment('Line', '--- fixtures'))).toBe(true);
    expect(isPartition(comment('Line', 'ordinary note'))).toBe(false);
  });

  it('reports an invalid pattern with its option path', () => {
    expect(() => compilePartitionComments({ line: ['('] })).toThrow(/partitionByComment\.line\[0\]/u);
  });
});
