/**
 * Configuration guards and semantic validation for Cyberflake.
 *
 * Two concerns live here:
 *
 * - Construction-time guards (`assertValidWorkerId`, `assertValidProcessId`)
 *   that fail fast on out-of-range configuration.
 * - Structural validation (`isValidId`) that decides whether an arbitrary
 *   string is a well-formed Cyberflake identifier, performing semantic checks
 *   rather than mere parsing.
 * @packageDocumentation
 */

import { BINARY, BITS, MASKS, NUMERIC, RANGES, SHIFTS, TIME } from '../constants.js';
import { parseId } from './encoding.js';

/**
 * Asserts that a worker identifier falls within the range permitted by the bit
 * layout.
 * @param {number} workerId - Candidate worker identifier.
 * @throws {RangeError} If the value is outside the allowed range.
 * @returns {void} Nothing; returns normally when the value is valid.
 */
export const assertValidWorkerId = (workerId: number): void => {
  if (workerId < RANGES.WORKER.MIN || workerId > RANGES.WORKER.MAX) {
    throw new RangeError(`workerId must be between ${RANGES.WORKER.MIN} and ${RANGES.WORKER.MAX}`);
  }
};

/**
 * Asserts that a process identifier falls within the range permitted by the bit
 * layout.
 * @param {number} processId - Candidate process identifier.
 * @throws {RangeError} If the value is outside the allowed range.
 * @returns {void} Nothing; returns normally when the value is valid.
 */
export const assertValidProcessId = (processId: number): void => {
  if (processId < RANGES.PROCESS.MIN || processId > RANGES.PROCESS.MAX) {
    throw new RangeError(`processId must be between ${RANGES.PROCESS.MIN} and ${RANGES.PROCESS.MAX}`);
  }
};

/**
 * Validates that the binary length of a value does not exceed the configured
 * bit layout.
 * @param {bigint} value - Candidate identifier.
 * @returns {boolean} `true` if the bit length is within bounds.
 */
const isBitLengthValid = (value: bigint): boolean => value.toString(BINARY.RADIX).length <= Number(BITS.TOTAL);

/**
 * Validates the timestamp portion of a candidate identifier.
 * @param {bigint} value - Candidate identifier.
 * @returns {boolean} `true` if the decoded timestamp is finite and not before
 * the epoch.
 */
const isTimestampValid = (value: bigint): boolean => {
  const timestamp = Number(value >> SHIFTS.TIMESTAMP) + Number(TIME.EPOCH);

  return Number.isFinite(timestamp) && timestamp >= Number(TIME.EPOCH);
};

/**
 * Validates the worker and process portions of a candidate identifier.
 * @param {bigint} value - Candidate identifier.
 * @returns {boolean} `true` if both identifiers are within their allowed
 * ranges.
 */
const isWorkerAndProcessValid = (value: bigint): boolean => {
  const workerId = Number((value >> SHIFTS.WORKER) & MASKS.WORKER);
  const processId = Number((value >> SHIFTS.PROCESS) & MASKS.PROCESS);

  return (
    workerId >= RANGES.WORKER.MIN &&
    workerId <= RANGES.WORKER.MAX &&
    processId >= RANGES.PROCESS.MIN &&
    processId <= RANGES.PROCESS.MAX
  );
};

/**
 * Validates the sequence portion of a candidate identifier.
 * @param {bigint} value - Candidate identifier.
 * @returns {boolean} `true` if the sequence is within its allowed range.
 */
const isSequenceValid = (value: bigint): boolean => {
  const sequence = Number(value & MASKS.SEQUENCE);

  return sequence >= NUMERIC.NUMBER_ZERO && sequence <= Number(MASKS.SEQUENCE);
};

/**
 * Performs semantic validation of a Cyberflake identifier.
 *
 * Beyond parsing, this enforces the full structural contract: non-empty input,
 * non-negative value, correct bit length, a valid epoch, and in-range
 * worker/process/sequence fields.
 * @param {string} id - Candidate Cyberflake identifier as a string.
 * @returns {boolean} `true` if the identifier is structurally valid.
 */
export const isValidId = (id: string): boolean => {
  if (id.trim().length === NUMERIC.NUMBER_ZERO) {
    return false;
  }

  const value = parseId(id);

  if (value === null) {
    return false;
  }

  if (value < NUMERIC.BIGINT_ZERO) {
    return false;
  }

  return isBitLengthValid(value) && isTimestampValid(value) && isWorkerAndProcessValid(value) && isSequenceValid(value);
};
