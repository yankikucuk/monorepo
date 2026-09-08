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
  /** Every configured group comment, so a label an earlier fix left above any entry is recognised. */
  readonly groupComments: ReadonlySet<string>;
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
  /** Group comments found above an entry that does not open the block they label, keyed by that entry. */
  readonly strayComments: ReadonlyMap<ImportEntry, string>;
  /** Entries whose own group comment was present but not written exactly as it is rendered. */
  readonly rewrittenComments: ReadonlySet<ImportEntry>;
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

/** An entry's text split into the group comments it carried and the rest. */
interface SplitText {
  /** The text without its leading group comments. */
  readonly body: string;
  /** The removed lines, exactly as written (indentation and any `\r` included). */
  readonly removed: readonly string[];
}

/**
 * Strips every group comment an earlier run left at the top of an entry, so
 * that rendering never stacks copies of a label and a label travelling with an
 * import that moved to another block is dropped rather than duplicated.
 * @param {string} text - The entry's text.
 * @param {ReadonlySet<string>} groupComments - Every configured group comment.
 * @returns {SplitText} The body and the removed lines.
 */
const splitGroupComments = (text: string, groupComments: ReadonlySet<string>): SplitText => {
  const removed: string[] = [];
  let body = text;
  for (let breakIndex = body.indexOf('\n'); breakIndex !== -1; breakIndex = body.indexOf('\n')) {
    const line = body.slice(0, breakIndex);
    if (!groupComments.has(line.trim())) {
      break;
    }
    removed.push(line);
    body = body.slice(breakIndex + 1);
  }
  return { body, removed };
};

/** One entry's contribution to the rendered chunk. */
interface RenderedEntry {
  /** Whitespace before the entry. */
  readonly gap: string;
  /** Group comment line rendered above the entry, or `''`. */
  readonly header: string;
  /** The entry's own text, minus any group comments it carried. */
  readonly body: string;
  /** The group comment the source is missing, or `null`. */
  readonly missing: string | null;
  /** A group comment the entry carried without opening the block it labels, or `null`. */
  readonly stray: string | null;
  /** Whether the entry's own group comment was present but not written as rendered. */
  readonly rewritten: boolean;
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
 * @param {RenderOptions} options - Render options.
 * @returns {RenderedEntry} The pieces to append.
 */
const renderEntry = (
  entry: ImportEntry,
  position: EntryPosition,
  layout: BlockLayout,
  options: RenderOptions
): RenderedEntry => {
  const gap = gapFor(position, layout.between, layout.inside);
  const { body, removed } = splitGroupComments(entry.text, options.groupComments);
  const comment = position.opensBlock ? layout.comment : null;
  const header = comment === null ? '' : `${INDENTATION.exec(body)?.[0] ?? ''}${comment}${options.eol}`;
  const ownIndex = comment === null ? -1 : removed.findIndex(line => line.trim() === comment);
  const stray = removed.find((_line, index) => index !== ownIndex) ?? null;

  return {
    gap,
    header,
    body,
    missing: comment !== null && ownIndex === -1 ? comment : null,
    stray,
    rewritten: ownIndex !== -1 && stray === null && `${removed[ownIndex] ?? ''}${options.eol}` !== header,
  };
};

/** Mutable accumulator for {@link renderChunk}. */
interface ChunkState {
  text: string;
  readonly order: ImportEntry[];
  readonly separators: string[];
  readonly missingComments: Map<ImportEntry, string>;
  readonly strayComments: Map<ImportEntry, string>;
  readonly rewrittenComments: Set<ImportEntry>;
}

/**
 * Renders one entry and records it in the chunk state.
 * @param {ChunkState} state - The chunk being built.
 * @param {ImportEntry} entry - The entry to append.
 * @param {EntryPosition} position - Where it sits in the chunk.
 * @param {BlockLayout} layout - The block's separators and comment.
 * @param {RenderOptions} options - Render options.
 * @returns {void} Nothing; the state is updated in place.
 */
const appendEntry = (
  state: ChunkState,
  entry: ImportEntry,
  position: EntryPosition,
  layout: BlockLayout,
  options: RenderOptions
): void => {
  const { gap, header, body, missing, stray, rewritten } = renderEntry(entry, position, layout, options);

  if (missing !== null) {
    state.missingComments.set(entry, missing);
  }
  if (stray !== null) {
    state.strayComments.set(entry, stray.trim());
  }
  if (rewritten) {
    state.rewrittenComments.add(entry);
  }
  state.order.push(entry);
  state.separators.push(gap);
  state.text += gap + header + body;
};

/**
 * Renders sorted blocks into the canonical chunk text.
 * @param {readonly SortedGroup<ImportEntry>[]} blocks - Output of `sortImports`.
 * @param {RenderOptions} options - Render options.
 * @returns {RenderedChunk} The text, its per-entry separators, and any missing, stray or misspaced group comments.
 */
export const renderChunk = (blocks: readonly SortedGroup<ImportEntry>[], options: RenderOptions): RenderedChunk => {
  const state: ChunkState = {
    text: '',
    order: [],
    separators: [],
    missingComments: new Map(),
    strayComments: new Map(),
    rewrittenComments: new Set(),
  };
  const between = separatorFor(blankLinesBetween(options.newlinesBetween), options.eol);

  for (const [blockIndex, block] of blocks.entries()) {
    const layout: BlockLayout = {
      comment: commentLine(block.commentAbove),
      between,
      inside: separatorFor(block.newlinesInside ?? 0, options.eol),
    };

    for (const [entryIndex, entry] of block.records.entries()) {
      const opensBlock = entryIndex === 0;
      appendEntry(state, entry, { isFirst: blockIndex === 0 && opensBlock, opensBlock }, layout, options);
    }
  }

  /*
   * An entry that ends in a line comment must not end up in front of code that
   * stayed on the chunk's last line — the comment would swallow it.
   */
  const closing =
    state.order.at(-1)?.endsWithLineComment === true && options.restOfLine.trim() !== '' ? options.eol : '';

  return { ...state, text: state.text + closing };
};
