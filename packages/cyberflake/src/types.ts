/**
 * Public type definitions for the Cyberflake distributed ID generator.
 *
 * These interfaces form part of the package's public API and are re-exported
 * from the package entry point.
 */

/**
 * Represents the fully deconstructed components of a Cyberflake ID.
 *
 * This interface defines the structured form obtained by decoding a generated
 * Cyberflake identifier back into its constituent parts.
 *
 * Deconstruction is primarily intended for:
 * - Debugging and observability
 * - Tracing and auditing
 * - Validation and inspection of ID metadata
 *
 * All properties reflect the exact values encoded into the ID at generation
 * time.
 */
export interface DeconstructedCyberflake {
  /**
   * Absolute timestamp in milliseconds since the Unix epoch.
   *
   * This value corresponds to the physical time (plus any logical offset) used
   * during ID generation.
   */
  timestamp: number;

  /**
   * Date representation derived from the `timestamp`.
   *
   * Read-only and provided as a convenience for human-readable inspection and
   * logging.
   */
  readonly date: Date;

  /**
   * Worker identifier encoded into the ID.
   *
   * Identifies the logical node or service instance responsible for generating
   * the ID.
   */
  workerId: number;

  /**
   * Process identifier encoded into the ID.
   *
   * Allows multiple processes on the same worker to generate IDs without
   * collision.
   */
  processId: number;

  /**
   * Sequence number used to disambiguate multiple IDs generated within the same
   * millisecond.
   *
   * The sequence is reset when the timestamp advances.
   */
  sequence: number;

  /**
   * Binary representation of the full Cyberflake ID.
   *
   * Reflects the exact bit layout and is primarily intended for debugging,
   * inspection, and documentation purposes.
   */
  binary: string;
}

/**
 * Configuration object used to construct a {@link Cyberflake} instance.
 *
 * Incorrect configuration values are rejected eagerly at construction time to
 * prevent silent misconfiguration and ID collisions.
 */
export interface CyberflakeConfig {
  /**
   * Worker identifier for this Cyberflake instance.
   *
   * Each unique `workerId` defines an independent ID namespace. Values must
   * fall within the range allowed by the bit layout.
   */
  workerId: number;

  /**
   * Optional process identifier.
   *
   * When provided, allows multiple processes under the same worker to safely
   * generate IDs concurrently. If omitted, a default process identifier is
   * used.
   */
  processId?: number;

  /**
   * Enables deterministic behavior for controlled environments.
   *
   * When set to `true`, an explicit {@link CyberflakeConfig.now} time source
   * MUST be provided; otherwise the constructor throws a `RangeError`. This
   * makes the intent explicit and prevents silently falling back to
   * `Date.now`.
   *
   * Intended primarily for:
   * - Unit and integration testing
   * - Reproducible benchmarks
   * - Simulated or controlled execution environments
   */
  deterministic?: boolean;

  /**
   * Custom time source function.
   *
   * When provided, this function is invoked to obtain the current timestamp in
   * milliseconds. Commonly used together with `deterministic` mode to fully
   * control time progression during testing.
   */
  now?: () => number;
}
