/**
 * Bit-level encoding and decoding for Cyberflake identifiers.
 *
 * This module is the single source of truth for how the individual fields
 * (timestamp, worker, process, sequence) are packed into, and recovered from,
 * a 63-bit `bigint`. All bitwise arithmetic lives here so the rest of the
 * codebase can reason in terms of plain values.
 * @packageDocumentation
 */

import { BINARY, BITS, MASKS, SHIFTS, TIME } from '../constants.js';
import type { DeconstructedCyberflake } from '../types.js';

/**
 * Packs the individual fields into a single Cyberflake identifier by shifting
 * each field into its designated bit range and combining them.
 * @param {bigint} timestamp - Logical, epoch-relative timestamp.
 * @param {bigint} workerId - Worker identifier.
 * @param {bigint} processId - Process identifier.
 * @param {bigint} sequence - Intra-millisecond sequence value.
 * @returns {bigint} The encoded Cyberflake identifier.
 */
export const assembleId = (timestamp: bigint, workerId: bigint, processId: bigint, sequence: bigint): bigint =>
  (timestamp << SHIFTS.TIMESTAMP) | (workerId << SHIFTS.WORKER) | (processId << SHIFTS.PROCESS) | sequence;

/**
 * Safely parses a string into a `bigint`.
 * @param {string} id - Candidate Cyberflake identifier.
 * @returns {bigint | null} The parsed value, or `null` if the string is not a
 * valid integer literal.
 */
export const parseId = (id: string): bigint | null => {
  try {
    return BigInt(id);
  } catch {
    return null;
  }
};

/**
 * Decodes a Cyberflake identifier into its constituent components.
 * @param {bigint} value - The encoded Cyberflake identifier.
 * @returns {DeconstructedCyberflake} The recovered fields, plus a derived
 * `Date` and zero-padded binary representation.
 */
export const deconstructId = (value: bigint): DeconstructedCyberflake => {
  const timestamp = Number(value >> SHIFTS.TIMESTAMP) + Number(TIME.EPOCH);

  return {
    timestamp,
    date: new Date(timestamp),
    workerId: Number((value >> SHIFTS.WORKER) & MASKS.WORKER),
    processId: Number((value >> SHIFTS.PROCESS) & MASKS.PROCESS),
    sequence: Number(value & MASKS.SEQUENCE),
    binary: value.toString(BINARY.RADIX).padStart(Number(BITS.TOTAL), BINARY.PAD_CHAR),
  };
};
