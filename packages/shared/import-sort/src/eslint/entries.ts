/**
 * Adapts an `ImportDeclaration` AST node into an {@link ImportEntry}: the core
 * {@link ImportRecord} fields plus the exact source-text span that travels with
 * the declaration when it moves.
 *
 * Comment ownership rules (see the README for the rationale):
 *
 * - Comments on the same line *after* a declaration belong to it.
 * - Comments on the lines directly above a declaration belong to it — unless
 *   the declaration opens its import block, in which case they stay where they
 *   are (file headers, licence banners, and hashbangs must not move).
 * - The one exception to that exception: *directive* comments
 *   (`eslint-disable-next-line`, `@ts-expect-error`, `prettier-ignore`, …)
 *   bind to the line below them, so the run of them sitting directly above the
 *   first declaration travels with it. Leaving them behind would silently
 *   re-target the directive at whichever import the fixer moves up. The same
 *   applies to the group comments the `commentAbove` layout option inserts.
 *
 * The span also carries the declaration's own indentation, so imports written
 * inside an indented `<script>` block keep it when they move.
 * @packageDocumentation
 */

import { AST_NODE_TYPES, AST_TOKEN_TYPES } from '@typescript-eslint/utils';

import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import type { ImportKind, ImportRecord, ImportStyle } from '../core/types.js';
import type { SpecifierIssue, SpecifierResult } from './specifiers.js';

/** An import declaration together with the text span the rule treats as one unit. */
export interface ImportEntry extends ImportRecord {
  readonly node: TSESTree.ImportDeclaration;
  /** Offset where the entry's text starts (its indentation, or its first owned comment). */
  readonly start: number;
  /** Offset where the entry's text ends (last owned trailing comment, or the declaration). */
  readonly end: number;
  /** The `[start, end)` slice of the source: what the fixer emits for this entry. */
  readonly text: string;
  /**
   * Whether the entry ends in a line comment. Such an entry must not be
   * followed by code on the same line, or the fixer would comment it out.
   */
  readonly endsWithLineComment: boolean;
  /** First misplaced specifier, when specifier sorting changed the declaration. */
  readonly specifierIssue: SpecifierIssue | null;
}

/** Inputs for {@link buildEntry}. */
export interface EntryInput {
  readonly node: TSESTree.ImportDeclaration;
  readonly sourceCode: Readonly<TSESLint.SourceCode>;
  /** Whether the declaration opens its block; leading comments of the first import mostly stay in place. */
  readonly first: boolean;
  /** Whether the declaration closes its block; only then can its semicolon belong to the next statement. */
  readonly last: boolean;
  /** Group comments the layout inserts (see `commentAbove`); they belong to the import below them. */
  readonly groupComments: ReadonlySet<string>;
  /** The declaration text to emit (see `sortSpecifiers`). */
  readonly declaration: SpecifierResult;
}

/**
 * Comments that apply to the line below them. Anchored at the start of the
 * comment body so that prose merely *mentioning* a directive is not treated as
 * one.
 */
const DIRECTIVE_COMMENT =
  /^\s*(?:eslint-disable-next-line|@ts-ignore|@ts-expect-error|prettier-ignore|biome-ignore|(?:c8|v8|istanbul)\s+ignore)\b/u;

/** The opt-out comment that pins a single import in place. */
const IGNORE_COMMENT = /^\s*import-sort-ignore\b/u;

/**
 * Whether a declaration has no specifiers at all, which includes both
 * `import 'polyfill'` and `import {} from 'polyfill'`: the module is evaluated
 * for its side effects, so its position is semantically significant.
 * @param {TSESTree.ImportDeclaration} node - The import declaration.
 * @returns {boolean} `true` for side-effect-only imports.
 */
export const isSideEffectImport = (node: TSESTree.ImportDeclaration): boolean => node.specifiers.length === 0;

/**
 * The comments above a declaration that are not trailing comments of whatever
 * precedes it: everything `getCommentsBefore` returns that starts on a later
 * line than the previous token ends on. A comment at the end of the previous
 * statement's line belongs to that statement, whatever it says.
 * @param {TSESTree.ImportDeclaration} node - The import declaration.
 * @param {Readonly<TSESLint.SourceCode>} sourceCode - Source code accessor.
 * @returns {TSESTree.Comment[]} The declaration's own leading comments, in source order.
 */
export const ownLeadingComments = (
  node: TSESTree.ImportDeclaration,
  sourceCode: Readonly<TSESLint.SourceCode>
): TSESTree.Comment[] => {
  const previousToken = sourceCode.getTokenBefore(node);
  return sourceCode
    .getCommentsBefore(node)
    .filter(comment => previousToken === null || comment.loc.start.line > previousToken.loc.end.line);
};

/**
 * Whether a declaration opts out of sorting with an `import-sort-ignore`
 * comment, written either on the line directly above it or at the end of its
 * own line. Such a declaration never moves and nothing moves across it.
 * @param {TSESTree.ImportDeclaration} node - The import declaration.
 * @param {Readonly<TSESLint.SourceCode>} sourceCode - Source code accessor.
 * @returns {boolean} `true` when the declaration is pinned.
 */
export const isPinnedImport = (node: TSESTree.ImportDeclaration, sourceCode: Readonly<TSESLint.SourceCode>): boolean =>
  ownLeadingComments(node, sourceCode).some(
    comment => IGNORE_COMMENT.test(comment.value) && comment.loc.end.line === node.loc.start.line - 1
  ) ||
  sourceCode
    .getCommentsAfter(node)
    .some(comment => IGNORE_COMMENT.test(comment.value) && comment.loc.start.line === node.loc.end.line);

/**
 * The shape of a declaration, used to order two imports of the same module.
 * @param {TSESTree.ImportDeclaration} node - The import declaration.
 * @returns {ImportStyle} `side-effect`, `namespace`, `default` or `named`.
 */
const styleOf = (node: TSESTree.ImportDeclaration): ImportStyle => {
  const [first] = node.specifiers;
  if (!first) {
    return 'side-effect';
  }
  if (first.type === AST_NODE_TYPES.ImportNamespaceSpecifier) {
    return 'namespace';
  }
  if (first.type === AST_NODE_TYPES.ImportDefaultSpecifier) {
    return 'default';
  }
  return 'named';
};

/**
 * The kind of an import declaration. ESTree parsers (espree) do not set
 * `importKind`, so anything but an explicit `'type'` is a value import.
 * @param {TSESTree.ImportDeclaration} node - The import declaration.
 * @returns {ImportKind} `type` or `value`.
 */
const importKindOf = (node: TSESTree.ImportDeclaration): ImportKind => (node.importKind === 'type' ? 'type' : 'value');

/**
 * Whether a comment may be moved at all. Hashbangs are reported as comments by
 * ESLint but are only valid on the very first line, so they never travel.
 * @param {TSESTree.Comment} comment - A comment token.
 * @returns {boolean} `true` for ordinary line and block comments.
 */
const isMovableComment = (comment: TSESTree.Comment): boolean => {
  // Typed as Line | Block, but ESLint also hands out `Shebang` comments at runtime.
  const type: string = comment.type;
  return type === 'Line' || type === 'Block';
};

/**
 * The comments on the lines above a declaration that are not trailing comments
 * of whatever precedes it.
 * @param {TSESTree.ImportDeclaration} node - The import declaration.
 * @param {Readonly<TSESLint.SourceCode>} sourceCode - Source code accessor.
 * @returns {TSESTree.Comment[]} Owned leading comments, in source order.
 */
const leadingComments = (
  node: TSESTree.ImportDeclaration,
  sourceCode: Readonly<TSESLint.SourceCode>
): TSESTree.Comment[] => ownLeadingComments(node, sourceCode).filter(comment => isMovableComment(comment));

/**
 * The comments the first declaration of a block takes with it: the unbroken
 * run of comments immediately above it (each on its own line, no blank line
 * in between), starting at the topmost directive or group comment in that
 * run. Ordinary comments *below* such a binding comment travel too — the
 * fixer itself puts a group label above an import's own comment — while
 * ordinary comments above it (file headers, banners) stay where they are.
 * @param {TSESTree.ImportDeclaration} node - The import declaration.
 * @param {readonly TSESTree.Comment[]} comments - Its owned leading comments, in source order.
 * @param {Pick<EntryInput, 'groupComments' | 'sourceCode'>} input - Source access and the configured group comments.
 * @returns {TSESTree.Comment[]} The owned run, in source order.
 */
const directiveRun = (
  node: TSESTree.ImportDeclaration,
  comments: readonly TSESTree.Comment[],
  input: Pick<EntryInput, 'groupComments' | 'sourceCode'>
): TSESTree.Comment[] => {
  let boundary = node.loc.start.line;
  let ownedFrom = comments.length;

  for (let index = comments.length - 1; index >= 0; index -= 1) {
    const comment = comments[index];
    if (comment?.loc.end.line !== boundary - 1) {
      break;
    }
    if (DIRECTIVE_COMMENT.test(comment.value) || input.groupComments.has(input.sourceCode.getText(comment).trim())) {
      ownedFrom = index;
    }
    boundary = comment.loc.start.line;
  }

  return comments.slice(ownedFrom);
};

/**
 * Start offset of the leading comments a declaration takes with it.
 * @param {EntryInput} input - The declaration and its context.
 * @returns {number} Offset of the first owned comment, or the declaration start.
 */
const leadingStart = (input: Omit<EntryInput, 'declaration' | 'last'>): number => {
  const { node, sourceCode, first } = input;
  const comments = leadingComments(node, sourceCode);
  const owned = first ? directiveRun(node, comments, input) : comments;
  return owned[0]?.range[0] ?? node.range[0];
};

/**
 * The whitespace between the start of a line and the entry, so indented
 * imports keep their indentation when they move. Empty when anything but
 * whitespace precedes the entry on its line (`const x = 1; import a from …`).
 * @param {number} start - Offset the entry would otherwise start at.
 * @param {Readonly<TSESLint.SourceCode>} sourceCode - Source code accessor.
 * @returns {string} The indentation, possibly empty.
 */
const indentationBefore = (start: number, sourceCode: Readonly<TSESLint.SourceCode>): string => {
  const lineStart = sourceCode.text.lastIndexOf('\n', start - 1) + 1;
  const indentation = sourceCode.text.slice(lineStart, start);
  return indentation.trim() === '' ? indentation : '';
};

/**
 * Where the declaration itself ends.
 *
 * Parsers attach a trailing semicolon to the statement before it, but in a
 * semicolon-free style it can belong to the statement *after* it:
 *
 * ```js
 * import x from 'x'
 * ;[1, 2].forEach(log)
 * ```
 *
 * Moving that import would take the semicolon with it and break the following
 * line, so a closing declaration whose semicolon sits on a later line — with
 * code after it — is treated as ending at its module source instead.
 * @param {EntryInput} input - The declaration and its context.
 * @returns {number} The effective end offset of the declaration.
 */
const declarationEnd = ({ node, sourceCode, last }: Pick<EntryInput, 'last' | 'node' | 'sourceCode'>): number => {
  if (!last) {
    return node.range[1];
  }

  const [beforeLast, lastToken] = sourceCode.getLastTokens(node, { count: 2 });
  if (!beforeLast || lastToken?.value !== ';') {
    return node.range[1];
  }

  const ownsSemicolon =
    beforeLast.loc.end.line === lastToken.loc.start.line || sourceCode.getTokenAfter(lastToken) === null;
  return ownsSemicolon ? node.range[1] : beforeLast.range[1];
};

/** The trailing comments a declaration owns: end offset and whether they end in a line comment. */
interface Trailing {
  readonly end: number;
  readonly endsWithLineComment: boolean;
}

/**
 * The trailing comments owned by a declaration — those on its own last line.
 * @param {TSESTree.ImportDeclaration} node - The import declaration.
 * @param {Readonly<TSESLint.SourceCode>} sourceCode - Source code accessor.
 * @param {number} end - The declaration's effective end offset.
 * @returns {Trailing} End offset after the last owned comment, and its kind.
 */
const trailingComments = (
  node: TSESTree.ImportDeclaration,
  sourceCode: Readonly<TSESLint.SourceCode>,
  end: number
): Trailing => {
  const owned =
    end === node.range[1]
      ? sourceCode
          .getCommentsAfter(node)
          .filter(comment => isMovableComment(comment) && comment.loc.start.line === node.loc.end.line)
      : [];
  const last = owned.at(-1);
  if (!last) {
    return { end, endsWithLineComment: false };
  }
  return { end: last.range[1], endsWithLineComment: last.type === AST_TOKEN_TYPES.Line };
};

/**
 * Builds the {@link ImportEntry} for a declaration.
 * @param {EntryInput} input - The declaration, its context, and its (possibly rewritten) text.
 * @returns {ImportEntry} The entry.
 */
export const buildEntry = ({ node, sourceCode, first, last, groupComments, declaration }: EntryInput): ImportEntry => {
  const commentStart = leadingStart({ node, sourceCode, first, groupComments });
  const indentation = indentationBefore(commentStart, sourceCode);
  const start = commentStart - indentation.length;
  const trimmed = node.range[1] - declarationEnd({ node, sourceCode, last });
  const trailing = trailingComments(node, sourceCode, node.range[1] - trimmed);
  const declarationText = declaration.text.slice(0, declaration.text.length - trimmed);

  return {
    node,
    source: node.source.value,
    kind: importKindOf(node),
    sideEffect: isSideEffectImport(node),
    style: styleOf(node),
    length: declarationText.length,
    start,
    end: trailing.end,
    text:
      indentation +
      sourceCode.text.slice(commentStart, node.range[0]) +
      declarationText +
      sourceCode.text.slice(node.range[1] - trimmed, trailing.end),
    endsWithLineComment: trailing.endsWithLineComment,
    specifierIssue: declaration.issue,
  };
};
