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

import { DEFAULTS, INITIAL } from './constants.js';
import { handleClockRegression } from './internal/clock.js';
import { assembleId, deconstructId } from './internal/encoding.js';
import { handleSequence } from './internal/sequence.js';
import { calculateLogicalTimestamp, readCurrentTime } from './internal/time.js';
import {
  assertTimestampWithinLayout,
  assertValidProcessId,
  assertValidWorkerId,
  isValidId,
} from './internal/validation.js';
import type { CyberflakeConfig, DeconstructedCyberflake } from './types.js';

/**
 * Cyberflake ID generator.
 *
 * Each instance maintains its own internal state and must be configured with a
 * unique `(workerId, processId)` pair in distributed environments.
 * @example
 * ```ts
 * import { Cyberflake } from '@april/cyberflake';
 *
 * const generator = new Cyberflake({ workerId: 1, processId: 0 });
 *
 * const id = generator.generate();
 * // => '158110629309382656'
 *
 * Cyberflake.deconstruct(id).workerId;
 * // => 1
 *
 * Cyberflake.isValid(id);
 * // => true
 * ```
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
   * @example
   * ```ts
   * const id = generator.generate();
   * // => '158110629309382656' (safe for DB keys, logs, JSON)
   * ```
   * @throws {RangeError} If the system time precedes the Cyberflake epoch, or
   * if the 41-bit timestamp space is exhausted (~year 2084, earlier when the
   * logical offset has been inflated by sustained bursts or regressions).
   * @returns {string} The generated Cyberflake ID as a decimal string.
   */
  generate(): string {
    const current = readCurrentTime(this.now);
    const logicalTimestamp = calculateLogicalTimestamp(current, this.offset);
    const regression = handleClockRegression(logicalTimestamp, this.lastTimestamp, this.offset);
    const next = handleSequence(regression.timestamp, this.lastTimestamp, this.sequence, regression.offset);

    // Guard before committing state — an exhausted layout must not corrupt the generator's monotonic bookkeeping.
    assertTimestampWithinLayout(next.timestamp);

    this.lastTimestamp = next.timestamp;
    this.sequence = next.sequence;
    this.offset = next.offset;

    return assembleId(next.timestamp, this.workerId, this.processId, this.sequence).toString();
  }

  /**
   * Deconstructs a Cyberflake ID into its individual components.
   *
   * Static because decoding depends only on the fixed bit layout, never on
   * generator state — any ID can be decoded without an instance.
   * @example
   * ```ts
   * const parts = Cyberflake.deconstruct('158110629309382656');
   * parts.timestamp; // 1_700_000_000_000
   * parts.workerId; // 1
   * parts.processId; // 0
   * parts.sequence; // 0
   * ```
   * @param {string | bigint} id - Cyberflake ID to decode.
   * @throws {SyntaxError} If `id` is a string that cannot be parsed as an
   * integer.
   * @throws {RangeError} If the value is negative or exceeds the 63-bit
   * layout — decoding it would produce meaningless components. Use
   * {@link Cyberflake.isValid} first when handling untrusted input.
   * @returns {DeconstructedCyberflake} The recovered components.
   */
  static deconstruct(id: string | bigint): DeconstructedCyberflake {
    const value = typeof id === 'bigint' ? id : BigInt(id);

    return deconstructId(value);
  }

  /**
   * Performs semantic validation of a Cyberflake ID.
   *
   * Never throws: unparseable, negative, or oversized input simply returns
   * `false`, making this safe as a guard for untrusted input.
   * @example
   * ```ts
   * Cyberflake.isValid('158110629309382656'); // true
   * Cyberflake.isValid('not-a-number'); // false
   * ```
   * @param {string} id - Cyberflake ID as a string.
   * @returns {boolean} `true` if the ID is structurally valid.
   */
  static isValid(id: string): boolean {
    return isValidId(id);
  }
}
