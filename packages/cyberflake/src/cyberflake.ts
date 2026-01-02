/* eslint-disable no-bitwise, class-methods-use-this */

/**
 * Cyberflake
 *
 * A low-level, Snowflake-inspired ID generator designed for distributed systems.
 *
 * Characteristics:
 * - Monotonic ordering based on time
 * - Global uniqueness via worker/process isolation
 * - Logical clock offset for clock regressions
 * - Deterministic and test-friendly via injectable time source
 *
 * This module is intended to be used as a core infrastructure primitive.
 * It performs no cross-process coordination and assumes correct configuration
 * of workerId and processId by the consumer.
 */

import { TIME, BITS, SHIFTS, MASKS, RANGES, DEFAULTS, INITIAL, NUMERIC, BINARY } from './constants.js';

import type { CyberflakeConfig, DeconstructedCyberflake } from '../typings/index.js';

/* ------------------------------------------------------------------ */
/* Helper functions                                                    */
/* ------------------------------------------------------------------ */

/**
 * Safely parses a string into a BigInt.
 * @param {string} id - Candidate cyberflake ID
 * @returns {bigint | null} Parsed BigInt value or null if parsing fails
 */
const parseBigInt = (id: string): bigint | null => {
  try {
    return BigInt(id);
  } catch {
    return null;
  }
};

/**
 * Reads the current time using the provided time source and enforces
 * epoch correctness.
 * @param {() => number} now - Time source function (usually Date.now)
 * @throws {RangeError} If system time is before the configured epoch
 * @returns {bigint} Current physical time as BigInt (milliseconds)
 */
const readCurrentTime = (now: () => number): bigint => {
  const current = BigInt(now());

  if (current < TIME.EPOCH) {
    throw new RangeError('System time is before Cyberflake epoch. Refusing to generate ID.');
  }

  return current;
};

/**
 * Converts physical time into logical time by applying the current offset.
 * @param {bigint} current - Current physical timestamp
 * @param {bigint} offset - Logical clock offset
 * @returns {bigint} Logical timestamp
 */
const calculateLogicalTimestamp = (current: bigint, offset: bigint): bigint => current - TIME.EPOCH + offset;

/**
 * Handles clock regressions by enforcing monotonic time progression.
 *
 * If the logical timestamp moves backwards relative to the last emitted
 * timestamp, a logical offset is applied.
 * @param {bigint} logicalTimestamp - Newly calculated logical timestamp
 * @param {bigint} lastTimestamp - Last emitted timestamp
 * @param {bigint} offset - Current logical offset
 * @returns {{ timestamp: bigint; offset: bigint }} Corrected timestamp and offset
 */
const handleClockRegression = (
  logicalTimestamp: bigint,
  lastTimestamp: bigint,
  offset: bigint
): { timestamp: bigint; offset: bigint } => {
  if (logicalTimestamp < lastTimestamp) {
    const nextOffset = offset + (lastTimestamp - logicalTimestamp);
    return {
      timestamp: lastTimestamp,
      offset: nextOffset,
    };
  }

  return {
    timestamp: logicalTimestamp,
    offset,
  };
};

/**
 * Handles sequence incrementation and overflow logic.
 *
 * Rules:
 * - If timestamp changes, sequence is reset
 * - If sequence overflows, logical time is advanced
 * @param {bigint} timestamp - Current logical timestamp
 * @param {bigint} lastTimestamp - Previous timestamp
 * @param {bigint} sequence - Current sequence value
 * @param {bigint} offset - Current logical offset
 * @returns {{ timestamp: bigint; sequence: bigint; offset: bigint }}
 * Updated timestamp, sequence, and offset
 */
const handleSequence = (
  timestamp: bigint,
  lastTimestamp: bigint,
  sequence: bigint,
  offset: bigint
): {
  timestamp: bigint;
  sequence: bigint;
  offset: bigint;
} => {
  if (timestamp !== lastTimestamp) {
    return {
      timestamp,
      sequence: INITIAL.SEQUENCE,
      offset,
    };
  }

  const nextSequence = sequence + NUMERIC.BIGINT_ONE;

  if (nextSequence <= MASKS.SEQUENCE) {
    return {
      timestamp,
      sequence: nextSequence,
      offset,
    };
  }

  return {
    timestamp: timestamp + NUMERIC.BIGINT_ONE,
    sequence: INITIAL.SEQUENCE,
    offset: offset + NUMERIC.BIGINT_ONE,
  };
};

/**
 * Assembles the final cyberflake ID by packing all fields into a single bigint.
 * @param {bigint} timestamp - Logical timestamp
 * @param {bigint} workerId - Worker identifier
 * @param {bigint} processId - Process identifier
 * @param {bigint} sequence - Sequence number
 * @returns {bigint} Encoded cyberflake ID
 */
const assembleId = (timestamp: bigint, workerId: bigint, processId: bigint, sequence: bigint): bigint =>
  (timestamp << SHIFTS.TIMESTAMP) | (workerId << SHIFTS.WORKER) | (processId << SHIFTS.PROCESS) | sequence;

/**
 * Validates that the binary length of a cyberflake does not exceed
 * the configured bit layout.
 * @param {bigint} value - Cyberflake ID
 * @returns {boolean} True if bit length is valid
 */
const isBitLengthValid = (value: bigint): boolean => value.toString(BINARY.RADIX).length <= Number(BITS.TOTAL);

/**
 * Validates the timestamp portion of a cyberflake.
 * @param {bigint} value - Cyberflake ID
 * @returns {boolean} True if timestamp is valid
 */
const isTimestampValid = (value: bigint): boolean => {
  const timestamp = Number(value >> SHIFTS.TIMESTAMP) + Number(TIME.EPOCH);
  return Number.isFinite(timestamp) && timestamp >= Number(TIME.EPOCH);
};

/**
 * Validates worker and process identifiers.
 * @param {bigint} value - Cyberflake ID
 * @returns {boolean} True if worker and process IDs are valid
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
 * Validates the sequence portion of a cyberflake.
 * @param {bigint} value - Cyberflake ID
 * @returns {boolean} True if sequence value is valid
 */
const isSequenceValid = (value: bigint): boolean => {
  const sequence = Number(value & MASKS.SEQUENCE);

  return sequence >= NUMERIC.NUMBER_ZERO && sequence <= Number(MASKS.SEQUENCE);
};

/* ------------------------------------------------------------------ */
/* Cyberflake                                                          */
/* ------------------------------------------------------------------ */

/**
 * Cyberflake ID generator.
 *
 * Each instance maintains its own internal state and must be configured
 * with a unique `(workerId, processId)` pair in distributed environments.
 */
export class Cyberflake {
  private readonly workerId: bigint;
  private readonly processId: bigint;

  /**
   * Time source used by the generator.
   *
   * Defaults to `Date.now`.
   * Can be injected for deterministic testing or controlled environments.
   */
  private readonly now: () => number;

  /** Last emitted logical timestamp */
  private lastTimestamp: bigint = INITIAL.TIMESTAMP;

  /** Sequence counter for the current millisecond */
  private sequence: bigint = INITIAL.SEQUENCE;

  /** Logical clock offset */
  private offset: bigint = INITIAL.OFFSET;

  /**
   * Creates a new Cyberflake generator instance.
   * @param {CyberflakeConfig} settings - Generator configuration
   * @throws {RangeError} If workerId or processId is out of allowed range
   */
  constructor(settings: CyberflakeConfig) {
    if (settings.workerId < RANGES.WORKER.MIN || settings.workerId > RANGES.WORKER.MAX) {
      throw new RangeError(`workerId must be between ${RANGES.WORKER.MIN} and ${RANGES.WORKER.MAX}`);
    }

    const processId = settings.processId ?? DEFAULTS.PROCESS_ID;

    if (processId < RANGES.PROCESS.MIN || processId > RANGES.PROCESS.MAX) {
      throw new RangeError(`processId must be between ${RANGES.PROCESS.MIN} and ${RANGES.PROCESS.MAX}`);
    }

    this.workerId = BigInt(settings.workerId);
    this.processId = BigInt(processId);
    this.now = settings.now ?? Date.now;
  }

  /**
   * Generates a new cyberflake ID.
   * @returns {string} Cyberflake ID as a string
   */
  generate(): string {
    const current = readCurrentTime(this.now);

    const logicalTimestamp = calculateLogicalTimestamp(current, this.offset);

    const regressionHandled = handleClockRegression(logicalTimestamp, this.lastTimestamp, this.offset);

    const sequenceHandled = handleSequence(
      regressionHandled.timestamp,
      this.lastTimestamp,
      this.sequence,
      regressionHandled.offset
    );

    this.offset = sequenceHandled.offset;
    this.sequence = sequenceHandled.sequence;
    this.lastTimestamp = sequenceHandled.timestamp;

    const id = assembleId(sequenceHandled.timestamp, this.workerId, this.processId, this.sequence);

    return id.toString();
  }

  /**
   * Deconstructs a cyberflake ID into its individual components.
   * @param {string | bigint} id - Cyberflake ID
   * @returns {DeconstructedCyberflake} Deconstructed cyberflake components
   */
  deconstruct(id: string | bigint): DeconstructedCyberflake {
    const value = typeof id === 'bigint' ? id : BigInt(id);

    const timestampPart = value >> SHIFTS.TIMESTAMP;
    const timestamp = Number(timestampPart) + Number(TIME.EPOCH);

    return {
      timestamp,
      date: new Date(timestamp),
      workerId: Number((value >> SHIFTS.WORKER) & MASKS.WORKER),
      processId: Number((value >> SHIFTS.PROCESS) & MASKS.PROCESS),
      sequence: Number(value & MASKS.SEQUENCE),
      binary: value.toString(BINARY.RADIX).padStart(Number(BITS.TOTAL), BINARY.PAD_CHAR),
    };
  }

  /**
   * Performs semantic validation of a cyberflake ID.
   * @param {string} id - Cyberflake ID as string
   * @returns {boolean} True if the ID is structurally valid
   */
  static isValid(id: string): boolean {
    if (id.trim().length === NUMERIC.NUMBER_ZERO) {
      return false;
    }

    const value = parseBigInt(id);

    if (value === null) {
      return false;
    }

    if (value < NUMERIC.BIGINT_ZERO) {
      return false;
    }

    if (!isBitLengthValid(value)) {
      return false;
    }

    if (!isTimestampValid(value)) {
      return false;
    }

    if (!isWorkerAndProcessValid(value)) {
      return false;
    }

    if (!isSequenceValid(value)) {
      return false;
    }

    return true;
  }
}
