/**
 * Renders sorted blocks back into source text.
 *
 * Entries inside a block are separated by `newlinesInside` blank lines (none by
 * default) and blocks by `newlinesBetween`. A block configured with
 * `commentAbove` gets that comment as its first line. The rendered text is what
 * the fixer writes, and — because it is canonical — what the rule compares
 * against to decide whether to report.
 * @packageDocumentation
 */

import type { SortedGroup } from '../core/types.js';
import type { ImportEntry } from './entries.js';

/** Blank-line policy between blocks: a keyword, or an exact number of blank lines. */
export type NewlinesBetween = 'always' | 'never' | number;

/** Inputs for {@link renderChunk}. */
export interface RenderOptions {
  /** Line terminator to emit (`\n` or `\r\n`, see {@link detectEol}). */
  readonly eol: string;
  readonly newlinesBetween: NewlinesBetween;
  /** What follows the chunk on its last line; non-empty means code shares that line. */
  readonly restOfLine: string;
}

/** The rendered text plus the data needed to explain a mismatch. */
export interface RenderedChunk {
  readonly text: string;
  /** Entries in their final order. */
  readonly order: readonly ImportEntry[];
  /** `separators[i]` is the whitespace expected before `order[i]`; `separators[0]` is always empty. */
  readonly separators: readonly string[];
  /** Group comments the source is missing, keyed by the entry that opens the block. */
  readonly missingComments: ReadonlyMap<ImportEntry, string>;
}

/** Leading whitespace of a line. */
const INDENTATION = /^[^\S\n]*/u;

/**
 * Picks the line terminator used by a file. Files that contain a single CRLF
 * are treated as CRLF files so the fixer never mixes terminators.
 * @param {string} text - Full source text.
 * @returns {string} `'\r\n'` or `'\n'`.
 */
export const detectEol = (text: string): string => (text.includes('\r\n') ? '\r\n' : '\n');

/**
 * Turns a blank-line count into the separator that produces it.
 * @param {number} blankLines - Blank lines to emit between two entries.
 * @param {string} eol - Line terminator.
 * @returns {string} The separator.
 */
const separatorFor = (blankLines: number, eol: string): string => eol.repeat(blankLines + 1);

/**
 * The number of blank lines the `newlinesBetween` option asks for.
 * @param {NewlinesBetween} newlinesBetween - Configured policy.
 * @returns {number} Blank lines between two blocks.
 */
const blankLinesBetween = (newlinesBetween: NewlinesBetween): number => {
  if (newlinesBetween === 'always') {
    return 1;
  }
  if (newlinesBetween === 'never') {
    return 0;
  }
  return newlinesBetween;
};

/**
 * The comment line a block renders above itself, normalized to a real comment.
 * Exported so the chunker can recognise an already-inserted one.
 * @param {string | null} commentAbove - Configured text, or `null` for no comment.
 * @returns {string | null} The comment as it appears in the source.
 */
export const commentLine = (commentAbove: string | null): string | null => {
  if (commentAbove === null) {
    return null;
  }
  return commentAbove.startsWith('//') || commentAbove.startsWith('/*') ? commentAbove : `// ${commentAbove}`;
};

/**
 * Drops a group comment the previous run already inserted, so that rendering
 * the same chunk twice does not stack copies of it.
 * @param {string} text - The first entry's text.
 * @param {string} comment - The comment the block renders above itself.
 * @returns {string} The text without its leading copy of the comment.
 */
const withoutLeadingComment = (text: string, comment: string): string => {
  const breakIndex = text.indexOf('\n');
  if (breakIndex === -1) {
    return text;
  }
  return text.slice(0, breakIndex).trim() === comment ? text.slice(breakIndex + 1) : text;
};

/** One entry's contribution to the rendered chunk. */
interface RenderedEntry {
  /** Whitespace before the entry. */
  readonly gap: string;
  /** Group comment line rendered above the entry, or `''`. */
  readonly header: string;
  /** The entry's own text, minus a group comment it already carried. */
  readonly body: string;
  /** The group comment the source is missing, or `null`. */
  readonly missing: string | null;
}

/** Where an entry sits in the chunk. */
interface EntryPosition {
  readonly isFirst: boolean;
  readonly opensBlock: boolean;
}

/** The separators and comment of the block being rendered. */
interface BlockLayout {
  readonly comment: string | null;
  readonly between: string;
  readonly inside: string;
}

/**
 * The whitespace expected before an entry.
 * @param {object} position - Where the entry sits.
 * @param {boolean} position.isFirst - Whether it opens the chunk.
 * @param {boolean} position.opensBlock - Whether it opens its block.
 * @param {string} between - Separator between blocks.
 * @param {string} inside - Separator inside the block.
 * @returns {string} The separator to emit.
 */
const gapFor = (position: EntryPosition, between: string, inside: string): string => {
  if (position.isFirst) {
    return '';
  }
  return position.opensBlock ? between : inside;
};

/**
 * Renders one entry: its separator, the group comment when it opens a labelled
 * block, and its own text.
 * @param {ImportEntry} entry - The entry to render.
 * @param {EntryPosition} position - Where it sits in the chunk.
 * @param {BlockLayout} layout - The block's separators and comment.
 * @param {string} eol - Line terminator.
 * @returns {RenderedEntry} The pieces to append.
 */
const renderEntry = (entry: ImportEntry, position: EntryPosition, layout: BlockLayout, eol: string): RenderedEntry => {
  const gap = gapFor(position, layout.between, layout.inside);
  const { comment } = layout;
  if (!position.opensBlock || comment === null) {
    return { gap, header: '', body: entry.text, missing: null };
  }

  const body = withoutLeadingComment(entry.text, comment);
  return {
    gap,
    header: `${INDENTATION.exec(body)?.[0] ?? ''}${comment}${eol}`,
    body,
    missing: body === entry.text ? comment : null,
  };
};

/**
 * Renders sorted blocks into the canonical chunk text.
 * @param {readonly SortedGroup<ImportEntry>[]} blocks - Output of `sortImports`.
 * @param {RenderOptions} options - Render options.
 * @returns {RenderedChunk} The text, its per-entry separators, and any missing group comments.
 */
export const renderChunk = (blocks: readonly SortedGroup<ImportEntry>[], options: RenderOptions): RenderedChunk => {
  const order: ImportEntry[] = [];
  const separators: string[] = [];
  const missingComments = new Map<ImportEntry, string>();
  const between = separatorFor(blankLinesBetween(options.newlinesBetween), options.eol);
  let text = '';

  for (const [blockIndex, block] of blocks.entries()) {
    const layout: BlockLayout = {
      comment: commentLine(block.commentAbove),
      between,
      inside: separatorFor(block.newlinesInside ?? 0, options.eol),
    };

    for (const [entryIndex, entry] of block.records.entries()) {
      const opensBlock = entryIndex === 0;
      const position = { isFirst: blockIndex === 0 && opensBlock, opensBlock };
      const { gap, header, body, missing } = renderEntry(entry, position, layout, options.eol);

      if (missing !== null) {
        missingComments.set(entry, missing);
      }
      order.push(entry);
      separators.push(gap);
      text += gap + header + body;
    }
  }

  // An entry that ends in a line comment must not end up in front of code that
  // stayed on the chunk's last line — the comment would swallow it.
  const closing = order.at(-1)?.endsWithLineComment === true && options.restOfLine.trim() !== '' ? options.eol : '';

  return { text: text + closing, order, separators, missingComments };
};
