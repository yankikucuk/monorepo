/**
 * Splits a container's body into independently sorted import blocks ("chunks").
 *
 * A chunk is a maximal run of consecutive `import` declarations. Any other
 * statement ends the run, and so do:
 *
 * - side-effect imports, unless `side-effect` is a configured group or the
 *   source matches `safeSideEffects` — they are order-sensitive at runtime, so
 *   by default nothing is ever moved across them;
 * - imports pinned with an `import-sort-ignore` comment;
 * - imports introduced by a `partitionByComment` comment, which open a new
 *   chunk instead of being dropped from one.
 * @packageDocumentation
 */

import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import { isOrderSensitive } from '../core/classify.js';

import { buildEntry, isPinnedImport, isSideEffectImport, ownLeadingComments } from './entries.js';
import { sortSpecifiers } from './specifiers.js';

import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import type { ResolvedSortOptions } from '../core/types.js';
import type { ImportEntry } from './entries.js';
import type { NameComparator, TypeSpecifierPlacement } from './specifiers.js';

/** A node whose body can hold import declarations: a module, or an ambient module block. */
export type ImportContainer = TSESTree.Program | TSESTree.TSModuleBlock;

/** One contiguous block of imports and the exact source span it occupies. */
export interface ImportChunk {
  readonly entries: readonly ImportEntry[];
  readonly start: number;
  readonly end: number;
  /** `sourceCode.text.slice(start, end)`. */
  readonly text: string;
  /** What follows the chunk on its last line; non-empty means code shares that line. */
  readonly restOfLine: string;
}

/** Everything {@link collectImportChunks} needs from the rule context. */
export interface ChunkContext {
  readonly sourceCode: Readonly<TSESLint.SourceCode>;
  readonly options: ResolvedSortOptions;
  readonly compare: NameComparator;
  readonly sortSpecifiers: boolean;
  readonly typeSpecifiers: TypeSpecifierPlacement;
  /** Whether a comment opens a new chunk (see `partitionByComment`). */
  readonly isPartitionComment: (comment: TSESTree.Comment) => boolean;
  /** Group comments the layout inserts (see `commentAbove`). */
  readonly groupComments: ReadonlySet<string>;
}

/** How a declaration relates to the run it appears in. */
type RunRole = 'boundary' | 'member' | 'partition';

/**
 * Groups consecutive import declarations of a container body.
 * @param {ImportContainer} container - The program or ambient module block.
 * @returns {TSESTree.ImportDeclaration[][]} Runs of adjacent import declarations, in source order.
 */
const importRuns = (container: ImportContainer): TSESTree.ImportDeclaration[][] => {
  const runs: TSESTree.ImportDeclaration[][] = [];
  let current: TSESTree.ImportDeclaration[] = [];

  for (const statement of container.body) {
    if (statement.type === AST_NODE_TYPES.ImportDeclaration) {
      current.push(statement);
    } else if (current.length > 0) {
      runs.push(current);
      current = [];
    }
  }
  if (current.length > 0) {
    runs.push(current);
  }

  return runs;
};

/**
 * Whether a declaration is preceded by a partition comment.
 * @param {TSESTree.ImportDeclaration} node - The import declaration.
 * @param {ChunkContext} context - Rule context.
 * @returns {boolean} `true` when the declaration opens a new chunk.
 */
const startsPartition = (node: TSESTree.ImportDeclaration, context: ChunkContext): boolean =>
  ownLeadingComments(node, context.sourceCode).some(comment => context.isPartitionComment(comment));

/**
 * Classifies a declaration's role inside its run.
 * @param {TSESTree.ImportDeclaration} node - The import declaration.
 * @param {ChunkContext} context - Rule context.
 * @returns {RunRole} Whether the declaration ends a chunk, opens one, or belongs to one.
 */
const roleOf = (node: TSESTree.ImportDeclaration, context: ChunkContext): RunRole => {
  if (isPinnedImport(node, context.sourceCode)) {
    return 'boundary';
  }
  const record = { source: node.source.value, kind: 'value', sideEffect: isSideEffectImport(node) } as const;
  if (!context.options.groupIndex.has('side-effect') && isOrderSensitive(record, context.options)) {
    return 'boundary';
  }
  return startsPartition(node, context) ? 'partition' : 'member';
};

/**
 * Splits a run into the segments that are sorted independently.
 * @param {readonly TSESTree.ImportDeclaration[]} run - A run of adjacent imports.
 * @param {ChunkContext} context - Rule context.
 * @returns {TSESTree.ImportDeclaration[][]} Non-empty segments, in source order.
 */
const splitRun = (
  run: readonly TSESTree.ImportDeclaration[],
  context: ChunkContext
): TSESTree.ImportDeclaration[][] => {
  const segments: TSESTree.ImportDeclaration[][] = [];
  let current: TSESTree.ImportDeclaration[] = [];

  for (const node of run) {
    const role = roleOf(node, context);
    if (role === 'member') {
      current.push(node);
    } else {
      segments.push(current);
      current = role === 'partition' ? [node] : [];
    }
  }
  segments.push(current);

  return segments.filter(segment => segment.length > 0);
};

/**
 * Builds the chunk for one run of imports.
 * @param {readonly TSESTree.ImportDeclaration[]} run - The run.
 * @param {ChunkContext} context - Rule context.
 * @returns {ImportChunk | null} The chunk, or `null` for an empty run.
 */
const toChunk = (run: readonly TSESTree.ImportDeclaration[], context: ChunkContext): ImportChunk | null => {
  const { sourceCode } = context;
  const entries = run.map((node, index) =>
    buildEntry({
      node,
      sourceCode,
      first: index === 0,
      last: index === run.length - 1,
      groupComments: context.groupComments,
      declaration: context.sortSpecifiers
        ? sortSpecifiers(node, sourceCode, context.compare, context.typeSpecifiers)
        : { text: sourceCode.getText(node), issue: null },
    })
  );
  const [first] = entries;
  const last = entries.at(-1);
  if (!first || !last) {
    return null;
  }

  const lineEnd = sourceCode.text.indexOf('\n', last.end);
  return {
    entries,
    start: first.start,
    end: last.end,
    text: sourceCode.text.slice(first.start, last.end),
    restOfLine: sourceCode.text.slice(last.end, lineEnd === -1 ? sourceCode.text.length : lineEnd),
  };
};

/**
 * Collects every import chunk of a container.
 * @param {ImportContainer} container - The program or ambient module block.
 * @param {ChunkContext} context - Rule context.
 * @returns {ImportChunk[]} Chunks in source order.
 */
export const collectImportChunks = (container: ImportContainer, context: ChunkContext): ImportChunk[] =>
  importRuns(container)
    .flatMap(run => splitRun(run, context))
    .flatMap(run => {
      const chunk = toChunk(run, context);
      return chunk ? [chunk] : [];
    });
