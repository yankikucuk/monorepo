/**
 * Named-specifier sorting for a single import declaration.
 *
 * Rewrites only the text between the first and last named specifier and reuses
 * the original separators (`, `, `,\n  `, …), so the declaration keeps its
 * layout — single-line stays single-line, multi-line stays multi-line — and
 * only the specifier order changes.
 * @packageDocumentation
 */

import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import type { TSESLint, TSESTree } from '@typescript-eslint/utils';

/** Describes the first misplaced specifier for diagnostics. */
export interface SpecifierIssue {
  /** The specifier that should move up. */
  readonly specifier: string;
  /** The specifier currently occupying its place. */
  readonly before: string;
}

/** Result of {@link sortSpecifiers}. */
export interface SpecifierResult {
  /** The declaration text with specifiers in order (unchanged when already sorted or skipped). */
  readonly text: string;
  /** `null` when nothing needs to change. */
  readonly issue: SpecifierIssue | null;
}

/** A comparator over specifier names, e.g. the module comparator from the core. */
export type NameComparator = (left: string, right: string) => number;

/** Where inline `type` specifiers (`import { type A, b }`) go inside the braces. */
export type TypeSpecifierPlacement = 'first' | 'last' | 'mixed';

/**
 * The imported name of a specifier: `a` in `{ a as b }`, `"a-b"` in `{ "a-b" as ab }`.
 * @param {TSESTree.ImportSpecifier} specifier - A named import specifier.
 * @returns {string} The imported name.
 */
const importedName = (specifier: TSESTree.ImportSpecifier): string =>
  specifier.imported.type === AST_NODE_TYPES.Identifier ? specifier.imported.name : specifier.imported.value;

/**
 * Ranks a specifier by its inline `type` modifier under the configured
 * placement. Equal ranks leave the ordering to the name comparison.
 * @param {TSESTree.ImportSpecifier} specifier - A named import specifier.
 * @param {TypeSpecifierPlacement} placement - Configured placement.
 * @returns {number} The rank.
 */
const typeRank = (specifier: TSESTree.ImportSpecifier, placement: TypeSpecifierPlacement): number => {
  if (placement === 'mixed') {
    return 0;
  }
  const isType = specifier.importKind === 'type';
  if (placement === 'first') {
    return isType ? 0 : 1;
  }
  return isType ? 1 : 0;
};

/**
 * Narrows the specifier list to the named specifiers inside braces.
 * @param {TSESTree.ImportDeclaration} node - The import declaration.
 * @returns {TSESTree.ImportSpecifier[]} Named specifiers in source order.
 */
const namedSpecifiers = (node: TSESTree.ImportDeclaration): TSESTree.ImportSpecifier[] =>
  node.specifiers.filter(
    (specifier): specifier is TSESTree.ImportSpecifier => specifier.type === AST_NODE_TYPES.ImportSpecifier
  );

/**
 * Reassembles the declaration with `sorted` specifiers in place of `original`,
 * keeping every separator between positions verbatim.
 * @param {TSESTree.ImportDeclaration} node - The import declaration.
 * @param {Readonly<TSESLint.SourceCode>} sourceCode - Source code accessor.
 * @param {readonly TSESTree.ImportSpecifier[]} original - Specifiers in source order.
 * @param {readonly TSESTree.ImportSpecifier[]} sorted - Specifiers in target order.
 * @returns {string} The rewritten declaration text.
 */
const rebuild = (
  node: TSESTree.ImportDeclaration,
  sourceCode: Readonly<TSESLint.SourceCode>,
  original: readonly TSESTree.ImportSpecifier[],
  sorted: readonly TSESTree.ImportSpecifier[]
): string => {
  const [first] = original;
  const last = original.at(-1);
  if (!first || !last) {
    return sourceCode.getText(node);
  }

  const declaration = sourceCode.getText(node);
  const [nodeStart] = node.range;
  let text = declaration.slice(0, first.range[0] - nodeStart);

  for (const [index, specifier] of sorted.entries()) {
    text += sourceCode.getText(specifier);
    const current = original[index];
    const next = original[index + 1];
    if (current && next) {
      text += sourceCode.text.slice(current.range[1], next.range[0]);
    }
  }

  return text + declaration.slice(last.range[1] - nodeStart);
};

/**
 * Produces the declaration text with named specifiers sorted by imported name
 * (local name as tie-breaker).
 *
 * Declarations containing comments are left untouched: reordering could
 * silently detach a comment from the specifier it documents.
 * @param {TSESTree.ImportDeclaration} node - The import declaration.
 * @param {Readonly<TSESLint.SourceCode>} sourceCode - Source code accessor.
 * @param {NameComparator} compare - Comparator honouring the configured algorithm, case handling, and direction.
 * @param {TypeSpecifierPlacement} placement - Where inline `type` specifiers go.
 * @returns {SpecifierResult} The (possibly rewritten) text and the first misplaced specifier, if any.
 */
export const sortSpecifiers = (
  node: TSESTree.ImportDeclaration,
  sourceCode: Readonly<TSESLint.SourceCode>,
  compare: NameComparator,
  placement: TypeSpecifierPlacement
): SpecifierResult => {
  const unchanged: SpecifierResult = { text: sourceCode.getText(node), issue: null };
  const original = namedSpecifiers(node);

  if (original.length < 2 || sourceCode.getCommentsInside(node).length > 0) {
    return unchanged;
  }

  const sorted = original.toSorted((left, right) => {
    const byKind = typeRank(left, placement) - typeRank(right, placement);
    if (byKind !== 0) {
      return byKind;
    }
    const byImported = compare(importedName(left), importedName(right));
    return byImported === 0 ? compare(left.local.name, right.local.name) : byImported;
  });

  const misplacedAt = sorted.findIndex((specifier, index) => specifier !== original[index]);
  if (misplacedAt === -1) {
    return unchanged;
  }

  const expected = sorted[misplacedAt];
  const actual = original[misplacedAt];
  const issue: SpecifierIssue | null =
    expected && actual ? { specifier: importedName(expected), before: importedName(actual) } : null;

  return { text: rebuild(node, sourceCode, original, sorted), issue };
};
