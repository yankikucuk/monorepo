/**
 * Time-domain helpers for Cyberflake.
 *
 * These functions encapsulate every interaction with the wall clock: reading
 * the injected time source, enforcing the epoch lower bound, and translating a
 * physical timestamp into Cyberflake's epoch-relative logical time domain.
 *
 * Keeping this logic isolated allows the generator to remain fully
 * deterministic and testable, since all time flows through a single,
 * injectable boundary.
 * @packageDocumentation
 */

import { TIME } from '../constants.js';

/**
 * Reads the current time from the injected time source and enforces that it is
 * not earlier than the Cyberflake epoch.
 * @param {() => number} now - Time source returning milliseconds since the Unix
 * epoch (typically `Date.now` or a deterministic stub).
 * @throws {RangeError} If the reported time precedes the Cyberflake epoch and
 * therefore cannot be represented within the timestamp bit field.
 * @returns {bigint} The current physical time, in milliseconds, as a `bigint`.
 */
export const readCurrentTime = (now: () => number): bigint => {
  const current = BigInt(now());

  if (current < TIME.EPOCH) {
    throw new RangeError('System time is before Cyberflake epoch. Refusing to generate ID.');
  }

  return current;
};

/**
 * Converts a physical timestamp into Cyberflake's logical time domain by
 * subtracting the epoch and applying the accumulated logical offset.
 * @param {bigint} current - Current physical timestamp, in milliseconds.
 * @param {bigint} offset - Accumulated logical clock offset used to absorb
 * regressions.
 * @returns {bigint} The epoch-relative logical timestamp.
 */
export const calculateLogicalTimestamp = (current: bigint, offset: bigint): bigint => current - TIME.EPOCH + offset;
