/**
 * Intra-millisecond sequencing for Cyberflake.
 *
 * The sequence field disambiguates identifiers generated within the same
 * logical millisecond. This module owns the rules for incrementing the
 * sequence, resetting it when time advances, and advancing logical time when
 * the sequence space is exhausted.
 * @packageDocumentation
 */

import { INITIAL, MASKS } from '../constants.js';

/**
 * Outcome of a sequence evaluation for a single generation step.
 */
export interface SequenceResult {
  /** The logical timestamp to emit (advanced on sequence overflow). */
  readonly timestamp: bigint;

  /** The sequence value to emit for this identifier. */
  readonly sequence: bigint;

  /** The logical offset carried into the next call. */
  readonly offset: bigint;
}

/**
 * Computes the next sequence value, resetting or advancing logical time as
 * required.
 *
 * Rules:
 * - When the timestamp changes, the sequence resets to its initial value.
 * - Within the same timestamp, the sequence increments.
 * - When the sequence space overflows, logical time is advanced by one and the
 *   offset is incremented so ordering is preserved.
 * @param {bigint} timestamp - Current logical timestamp.
 * @param {bigint} lastTimestamp - Previously emitted logical timestamp.
 * @param {bigint} sequence - Current sequence value.
 * @param {bigint} offset - Current logical offset.
 * @returns {SequenceResult} The updated timestamp, sequence, and offset.
 */
export const handleSequence = (
  timestamp: bigint,
  lastTimestamp: bigint,
  sequence: bigint,
  offset: bigint
): SequenceResult => {
  if (timestamp !== lastTimestamp) {
    return { timestamp, sequence: INITIAL.SEQUENCE, offset };
  }

  const nextSequence = sequence + 1n;

  if (nextSequence <= MASKS.SEQUENCE) {
    return { timestamp, sequence: nextSequence, offset };
  }

  return {
    timestamp: timestamp + 1n,
    sequence: INITIAL.SEQUENCE,
    offset: offset + 1n,
  };
};
