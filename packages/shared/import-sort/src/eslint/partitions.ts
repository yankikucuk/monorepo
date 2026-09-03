/**
 * Compiles the `partitionByComment` option into a comment predicate.
 *
 * A partition comment marks a deliberate section of the import list
 * (`// --- test doubles ---`). The import below it opens a new block that is
 * sorted on its own, so the sections a developer wrote by hand survive the
 * fixer.
 * @packageDocumentation
 */

import type { TSESTree } from '@typescript-eslint/utils';

/** One or more regular-expression sources, or `true` for "every comment". */
export type CommentPatterns = boolean | readonly string[] | string;

/** Per-comment-kind form of {@link PartitionByComment}. */
export interface PartitionByCommentKinds {
  readonly block?: CommentPatterns;
  readonly line?: CommentPatterns;
}

/**
 * The `partitionByComment` option: the same value for both comment kinds, or
 * one value per kind.
 */
export type PartitionByComment = CommentPatterns | PartitionByCommentKinds;

/** A compiled matcher for one comment kind. */
type Matcher = readonly RegExp[] | boolean;

/**
 * Whether the option was written in its per-kind form.
 * @param {PartitionByComment | undefined} option - Raw option value.
 * @returns {boolean} `true` for `{ block, line }`.
 */
const isPerKind = (option: PartitionByComment | undefined): option is PartitionByCommentKinds =>
  typeof option === 'object' && !Array.isArray(option);

/**
 * Compiles one `CommentPatterns` value.
 * @param {CommentPatterns | undefined} patterns - Raw option value.
 * @param {string} location - Option path for error messages.
 * @returns {Matcher} `true`/`false`, or the compiled expressions.
 * @throws {TypeError} If a pattern is not a valid regular expression.
 */
const compileMatcher = (patterns: CommentPatterns | undefined, location: string): Matcher => {
  if (typeof patterns === 'boolean') {
    return patterns;
  }
  if (typeof patterns === 'string') {
    return compileMatcher([patterns], location);
  }
  if (!Array.isArray(patterns)) {
    return false;
  }
  return patterns.map((source, index) => {
    try {
      return new RegExp(source, 'u');
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new TypeError(
        `Invalid regular expression ${JSON.stringify(source)} in "${location}[${index}]": ${reason}`,
        {
          cause: error,
        }
      );
    }
  });
};

/**
 * Whether a matcher accepts a comment body.
 * @param {Matcher} matcher - Compiled matcher.
 * @param {string} value - The comment body, as written between the delimiters.
 * @returns {boolean} `true` when the comment opens a partition.
 */
const matches = (matcher: Matcher, value: string): boolean => {
  if (typeof matcher === 'boolean') {
    return matcher;
  }
  return matcher.some(pattern => pattern.test(value.trim()));
};

/**
 * Builds the predicate the chunker uses to detect partition comments.
 * @example
 * ```ts
 * const isPartition = compilePartitionComments({ line: ['^-{3,}'] });
 * ```
 * @param {PartitionByComment} [option] - Raw option value; omit to disable partitioning.
 * @returns {(comment: TSESTree.Comment) => boolean} The predicate.
 * @throws {TypeError} If a configured pattern is not a valid regular expression.
 */
export const compilePartitionComments = (option?: PartitionByComment): ((comment: TSESTree.Comment) => boolean) => {
  const kinds: { block: CommentPatterns | undefined; line: CommentPatterns | undefined } = isPerKind(option)
    ? { block: option.block, line: option.line }
    : { block: option, line: option };
  const block = compileMatcher(kinds.block, 'partitionByComment.block');
  const line = compileMatcher(kinds.line, 'partitionByComment.line');

  return comment => matches(String(comment.type) === 'Block' ? block : line, comment.value);
};
