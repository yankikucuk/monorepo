/**
 * Configuration guards and semantic validation for Cyberflake.
 *
 * Two concerns live here:
 *
 * - Construction-time guards (`assertValidWorkerId`, `assertValidProcessId`)
 *   that fail fast on out-of-range configuration.
 * - Structural validation (`isValidId`) that decides whether an arbitrary
 *   string is a well-formed Cyberflake identifier.
 *
 * Note that once a value is known to be a non-negative integer that fits the
 * 63-bit layout, every individual field is guaranteed to be within range by
 * construction — a 5-bit mask can only ever yield 0–31, a 12-bit mask 0–4095.
 * `isValidId` therefore needs no per-field checks; the layout itself is the
 * invariant.
 * @packageDocumentation
 */

import { LIMITS, RANGES } from '../constants.js';

import { parseId } from './encoding.js';

/**
 * Asserts that a worker identifier falls within the range permitted by the bit
 * layout.
 * @example
 * ```ts
 * assertValidWorkerId(1); // ok
 * assertValidWorkerId(99); // throws RangeError
 * ```
 * @param {number} workerId - Candidate worker identifier.
 * @throws {RangeError} If the value is outside the allowed range.
 * @returns {void} Nothing; returns normally when the value is valid.
 */
export const assertValidWorkerId = (workerId: number): void => {
  if (!Number.isInteger(workerId) || workerId < RANGES.WORKER.MIN || workerId > RANGES.WORKER.MAX) {
    throw new RangeError(`workerId must be an integer between ${RANGES.WORKER.MIN} and ${RANGES.WORKER.MAX}`);
  }
};

/**
 * Asserts that a process identifier falls within the range permitted by the bit
 * layout.
 * @example
 * ```ts
 * assertValidProcessId(0); // ok
 * assertValidProcessId(999); // throws RangeError
 * ```
 * @param {number} processId - Candidate process identifier.
 * @throws {RangeError} If the value is outside the allowed range.
 * @returns {void} Nothing; returns normally when the value is valid.
 */
export const assertValidProcessId = (processId: number): void => {
  if (!Number.isInteger(processId) || processId < RANGES.PROCESS.MIN || processId > RANGES.PROCESS.MAX) {
    throw new RangeError(`processId must be an integer between ${RANGES.PROCESS.MIN} and ${RANGES.PROCESS.MAX}`);
  }
};

/**
 * Asserts that a logical timestamp still fits the 41-bit timestamp field.
 *
 * The layout is exhausted ~69.7 years past the epoch (≈ year 2084) — or
 * earlier if sustained sequence overflows and clock regressions inflate the
 * logical offset. Failing fast here keeps the generator from silently
 * emitting identifiers that its own `isValid` rejects.
 * @param {bigint} timestamp - Logical, epoch-relative timestamp about to be
 * encoded.
 * @throws {RangeError} If the timestamp no longer fits the bit layout.
 * @returns {void} Nothing; returns normally while capacity remains.
 */
export const assertTimestampWithinLayout = (timestamp: bigint): void => {
  if (timestamp > LIMITS.MAX_TIMESTAMP) {
    throw new RangeError('Cyberflake timestamp space is exhausted. Refusing to generate a corrupt ID.');
  }
};

/**
 * Performs semantic validation of a Cyberflake identifier.
 *
 * An identifier is valid when it is a canonical decimal string (digits only,
 * no sign, whitespace, radix prefix or leading zeros) whose value fits within
 * the 63-bit layout. Field-level bounds (worker,
 * process, sequence) require no separate checks: the bit layout guarantees
 * them structurally for any value that passes the size check.
 * @example
 * ```ts
 * isValidId('1174109840998531072'); // true
 * isValidId('-5'); // false (negative)
 * isValidId('not-a-number'); // false (unparseable)
 * isValidId('0x1F'); // false (not canonical decimal)
 * isValidId((1n << 70n).toString()); // false (exceeds 63-bit layout)
 * ```
 * @param {string} id - Candidate Cyberflake identifier as a string.
 * @returns {boolean} `true` if the identifier is structurally valid.
 */
export const isValidId = (id: string): boolean => {
  // Untyped callers may pass anything; a guard must never throw.
  if (typeof (id as unknown) !== 'string') {
    return false;
  }

  const value = parseId(id);

  return value !== null && value <= LIMITS.MAX_ID;
};
