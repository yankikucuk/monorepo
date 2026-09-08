/**
 * Explains *why* a chunk differs from its canonical rendering.
 *
 * The rule reports exactly one problem per chunk (with one fix that rewrites
 * the whole chunk). This module picks the most useful message for that single
 * report, checking in order: statement order, specifier order, missing, stray
 * or misspaced group comments, blank lines.
 * @packageDocumentation
 */

import type { TSESTree } from '@typescript-eslint/utils';
import type { ImportChunk } from './chunks.js';
import type { RenderedChunk } from './render.js';

/** Message ids of the `order` rule. */
export type OrderMessageId =
  | 'duplicateGroupComment'
  | 'missingBlankLine'
  | 'missingGroupComment'
  | 'sameLine'
  | 'unexpectedBlankLine'
  | 'unexpectedWhitespace'
  | 'unsortedImports'
  | 'unsortedSpecifiers';

/** A single report: message, anchor node, and message data. */
export interface Diagnosis {
  readonly messageId: OrderMessageId;
  readonly node: TSESTree.Node;
  readonly data: Readonly<Record<string, string>>;
}

/**
 * Counts line breaks in a text fragment (`\r\n` counts once).
 * @param {string} text - Whitespace between two entries.
 * @returns {number} Number of line breaks.
 */
const lineBreaks = (text: string): number => text.split('\n').length - 1;

/**
 * Classifies a whitespace mismatch between two adjacent entries. The renderer
 * always emits at least one line break, so an actual gap without one means the
 * two declarations share a line.
 * @param {string} actual - Whitespace found in the source.
 * @param {string} expected - Whitespace the renderer emits.
 * @returns {OrderMessageId} The most descriptive message id.
 */
const whitespaceMessage = (actual: string, expected: string): OrderMessageId => {
  const breaks = lineBreaks(actual);
  if (breaks === 0) {
    return 'sameLine';
  }
  const difference = breaks - lineBreaks(expected);
  if (difference > 0) {
    return 'unexpectedBlankLine';
  }
  if (difference < 0) {
    return 'missingBlankLine';
  }
  return 'unexpectedWhitespace';
};

/**
 * Finds the first entry that is not where the rendering puts it.
 * @param {ImportChunk} chunk - The chunk as written.
 * @param {RenderedChunk} rendered - The canonical rendering.
 * @returns {Diagnosis | null} An `unsortedImports` diagnosis, or `null` when statement order already matches.
 */
const diagnoseOrder = (chunk: ImportChunk, rendered: RenderedChunk): Diagnosis | null => {
  for (const [index, expected] of rendered.order.entries()) {
    const actual = chunk.entries[index];
    if (actual && actual !== expected) {
      return {
        messageId: 'unsortedImports',
        node: expected.node,
        data: { source: expected.source, before: actual.source },
      };
    }
  }
  return null;
};

/**
 * Finds the first declaration whose specifiers are out of order.
 * @param {ImportChunk} chunk - The chunk as written.
 * @returns {Diagnosis | null} An `unsortedSpecifiers` diagnosis, or `null`.
 */
const diagnoseSpecifiers = (chunk: ImportChunk): Diagnosis | null => {
  for (const entry of chunk.entries) {
    if (entry.specifierIssue) {
      return {
        messageId: 'unsortedSpecifiers',
        node: entry.node,
        data: { source: entry.source, ...entry.specifierIssue },
      };
    }
  }
  return null;
};

/**
 * Finds the first block whose configured `commentAbove` is missing.
 * @param {RenderedChunk} rendered - The canonical rendering.
 * @returns {Diagnosis | null} A `missingGroupComment` diagnosis, or `null`.
 */
const diagnoseGroupComments = (rendered: RenderedChunk): Diagnosis | null => {
  for (const entry of rendered.order) {
    const comment = rendered.missingComments.get(entry);
    if (typeof comment === 'string') {
      return { messageId: 'missingGroupComment', node: entry.node, data: { comment, source: entry.source } };
    }
  }
  return null;
};

/**
 * Finds the first entry carrying a group comment that does not belong above
 * it — a label left behind when an earlier fix moved a different import to
 * the top of its block.
 * @param {RenderedChunk} rendered - The canonical rendering.
 * @returns {Diagnosis | null} A `duplicateGroupComment` diagnosis, or `null`.
 */
const diagnoseStrayComments = (rendered: RenderedChunk): Diagnosis | null => {
  for (const entry of rendered.order) {
    const comment = rendered.strayComments.get(entry);
    if (typeof comment === 'string') {
      return { messageId: 'duplicateGroupComment', node: entry.node, data: { comment, source: entry.source } };
    }
  }
  return null;
};

/**
 * Finds the first block whose group comment is present but written with
 * different whitespace than the renderer emits (trailing spaces, other
 * indentation).
 * @param {RenderedChunk} rendered - The canonical rendering.
 * @returns {Diagnosis | null} An `unexpectedWhitespace` diagnosis, or `null`.
 */
const diagnoseRewrittenComments = (rendered: RenderedChunk): Diagnosis | null => {
  for (const entry of rendered.order) {
    if (rendered.rewrittenComments.has(entry)) {
      return { messageId: 'unexpectedWhitespace', node: entry.node, data: { source: entry.source } };
    }
  }
  return null;
};

/**
 * Finds the first gap between adjacent entries that differs from the expected
 * separator. Only meaningful once statement order is known to match.
 * @param {ImportChunk} chunk - The chunk as written.
 * @param {RenderedChunk} rendered - The canonical rendering.
 * @returns {Diagnosis | null} A blank-line diagnosis, or `null`.
 */
const diagnoseWhitespace = (chunk: ImportChunk, rendered: RenderedChunk): Diagnosis | null => {
  for (let index = 1; index < chunk.entries.length; index += 1) {
    const previous = chunk.entries[index - 1];
    const current = chunk.entries[index];
    const expected = rendered.separators[index] ?? '';
    if (previous && current) {
      const actual = chunk.text.slice(previous.end - chunk.start, current.start - chunk.start);
      if (actual !== expected) {
        return { messageId: whitespaceMessage(actual, expected), node: current.node, data: { source: current.source } };
      }
    }
  }
  return null;
};

/**
 * Produces the diagnosis for a chunk whose text differs from its rendering.
 *
 * Statement order, specifier order, group comments and whitespace are the only
 * ways a rendering can differ from its source, so one of them always explains
 * the difference. Calling this for a chunk that already matches its rendering is a
 * programming error and is reported as one rather than guessed at.
 * @param {ImportChunk} chunk - The chunk as written.
 * @param {RenderedChunk} rendered - The canonical rendering (must differ from `chunk.text`).
 * @returns {Diagnosis} The report to emit.
 * @throws {Error} If the chunk and its rendering are identical.
 */
export const diagnoseChunk = (chunk: ImportChunk, rendered: RenderedChunk): Diagnosis => {
  const diagnosis =
    diagnoseOrder(chunk, rendered) ??
    diagnoseSpecifiers(chunk) ??
    diagnoseGroupComments(rendered) ??
    diagnoseStrayComments(rendered) ??
    diagnoseRewrittenComments(rendered) ??
    diagnoseWhitespace(chunk, rendered);
  if (!diagnosis) {
    throw new Error(`The import block at offset ${chunk.start} already matches its rendering; nothing to diagnose.`);
  }
  return diagnosis;
};
