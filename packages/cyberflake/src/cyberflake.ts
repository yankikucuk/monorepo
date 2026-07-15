/**
 * Cyberflake
 *
 * A low-level, Snowflake-inspired ID generator designed for distributed
 * systems.
 *
 * Characteristics:
 * - Monotonic ordering based on time
 * - Global uniqueness via worker/process isolation
 * - Logical clock offset to absorb clock regressions
 * - Deterministic and test-friendly via an injectable time source
 *
 * This class is intentionally thin: it owns only the mutable generator state
 * and orchestrates the pure, single-purpose helpers in `./internal`. It performs
 * no cross-process coordination and assumes correct configuration of
 * `workerId` and `processId` by the consumer.
 */

import type { CyberflakeConfig, DeconstructedCyberflake } from './types.js';

import { DEFAULTS, INITIAL } from './constants.js';
import { handleClockRegression } from './internal/clock.js';
import { assembleId, deconstructId } from './internal/encoding.js';
import { handleSequence } from './internal/sequence.js';
import { calculateLogicalTimestamp, readCurrentTime } from './internal/time.js';
import { assertValidProcessId, assertValidWorkerId, isValidId } from './internal/validation.js';

/**
 * Cyberflake ID generator.
 *
 * Each instance maintains its own internal state and must be configured with a
 * unique `(workerId, processId)` pair in distributed environments.
 */
export class Cyberflake {
  /** Worker identifier encoded into every generated ID. */
  private readonly workerId: bigint;

  /** Process identifier encoded into every generated ID. */
  private readonly processId: bigint;

  /**
   * Time source used by the generator.
   *
   * Defaults to `Date.now`. Can be injected for deterministic testing or
   * controlled environments.
   */
  private readonly now: () => number;

  /** Last emitted logical timestamp. */
  private lastTimestamp: bigint = INITIAL.TIMESTAMP;

  /** Sequence counter for the current logical millisecond. */
  private sequence: bigint = INITIAL.SEQUENCE;

  /** Logical clock offset used to absorb physical clock regressions. */
  private offset: bigint = INITIAL.OFFSET;

  /**
   * Creates a new Cyberflake generator instance.
   * @param {CyberflakeConfig} settings - Generator configuration.
   * @throws {RangeError} If `workerId` or `processId` is out of range, or if
   * `deterministic` is enabled without an explicit `now` time source.
   */
  constructor(settings: CyberflakeConfig) {
    assertValidWorkerId(settings.workerId);

    const processId = settings.processId ?? DEFAULTS.PROCESS_ID;

    assertValidProcessId(processId);

    if (settings.deterministic === true && typeof settings.now !== 'function') {
      throw new RangeError('Deterministic mode requires an explicit `now` time source.');
    }

    this.workerId = BigInt(settings.workerId);
    this.processId = BigInt(processId);
    this.now = settings.now ?? Date.now;
  }

  /**
   * Generates a new Cyberflake ID.
   *
   * The pipeline reads the current time, converts it to logical time, absorbs
   * any clock regression, resolves the intra-millisecond sequence, commits the
   * resulting state, and packs the fields into a single identifier.
   * @throws {RangeError} If the system time precedes the Cyberflake epoch.
   * @returns {string} The generated Cyberflake ID as a decimal string.
   */
  generate(): string {
    const current = readCurrentTime(this.now);
    const logicalTimestamp = calculateLogicalTimestamp(current, this.offset);
    const regression = handleClockRegression(logicalTimestamp, this.lastTimestamp, this.offset);
    const next = handleSequence(regression.timestamp, this.lastTimestamp, this.sequence, regression.offset);

    this.lastTimestamp = next.timestamp;
    this.sequence = next.sequence;
    this.offset = next.offset;

    return assembleId(next.timestamp, this.workerId, this.processId, this.sequence).toString();
  }

  /**
   * Deconstructs a Cyberflake ID into its individual components.
   * @param {string | bigint} id - Cyberflake ID to decode.
   * @returns {DeconstructedCyberflake} The recovered components.
   */
  deconstruct(id: string | bigint): DeconstructedCyberflake {
    const value = typeof id === 'bigint' ? id : BigInt(id);

    return deconstructId(value);
  }

  /**
   * Performs semantic validation of a Cyberflake ID.
   * @param {string} id - Cyberflake ID as a string.
   * @returns {boolean} `true` if the ID is structurally valid.
   */
  static isValid(id: string): boolean {
    return isValidId(id);
  }
}
