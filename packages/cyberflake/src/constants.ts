/**
 * Bit-layout constants for Cyberflake identifiers.
 *
 * A Cyberflake is a 63-bit unsigned integer packed as:
 *
 * ```text
 * | timestamp (41 bits) | worker (5 bits) | process (5 bits) | sequence (12 bits) |
 * ```
 *
 * Every module derives its shifts, masks, and ranges from {@link BITS}, so
 * changing the layout in one place keeps the whole package consistent.
 * @packageDocumentation
 */

/**
 * Time-domain constants.
 */
export const TIME = {
  /** PlayerBerry epoch: 2015-01-01T00:00:00.000Z, in Unix milliseconds. */
  EPOCH: 1_420_070_400_000n,
} as const;

/**
 * Width, in bits, of each field in the identifier layout.
 *
 * The 41-bit timestamp covers ~69 years from the {@link TIME.EPOCH}; 5-bit
 * worker/process fields allow 32 × 32 concurrent generators; the 12-bit
 * sequence allows 4096 IDs per generator per millisecond.
 */
export const BITS = {
  TIMESTAMP: 41n,
  WORKER: 5n,
  PROCESS: 5n,
  SEQUENCE: 12n,

  /** Total width of the packed identifier (63 bits). */
  TOTAL: 41n + 5n + 5n + 12n,
} as const;

/**
 * Left-shift distances used to place each field into its bit range.
 *
 * Each field is shifted past every field to its right in the layout.
 */
export const SHIFTS = {
  PROCESS: BITS.SEQUENCE,
  WORKER: BITS.SEQUENCE + BITS.PROCESS,
  TIMESTAMP: BITS.SEQUENCE + BITS.PROCESS + BITS.WORKER,
} as const;

/**
 * Bit masks used to extract each field after shifting.
 *
 * Each mask is `2^width - 1`, i.e. a run of `width` set bits.
 */
export const MASKS = {
  SEQUENCE: (1n << BITS.SEQUENCE) - 1n,
  WORKER: (1n << BITS.WORKER) - 1n,
  PROCESS: (1n << BITS.PROCESS) - 1n,
} as const;

/**
 * Structural limits derived from the bit layout.
 */
export const LIMITS = {
  /** Largest value representable within {@link BITS.TOTAL} bits. */
  MAX_ID: (1n << BITS.TOTAL) - 1n,

  /**
   * Largest logical timestamp representable within {@link BITS.TIMESTAMP}
   * bits (~69.7 years past the epoch, ≈ year 2084). Generation fails fast at
   * this boundary instead of emitting corrupt identifiers.
   */
  MAX_TIMESTAMP: (1n << BITS.TIMESTAMP) - 1n,
} as const;

/**
 * Inclusive configuration ranges for worker and process identifiers, as plain
 * numbers for ergonomic validation and error messages.
 */
export const RANGES = {
  WORKER: {
    MIN: 0,
    MAX: Number((1n << BITS.WORKER) - 1n),
  },
  PROCESS: {
    MIN: 0,
    MAX: Number((1n << BITS.PROCESS) - 1n),
  },
} as const;

/**
 * Default configuration values applied when optional settings are omitted.
 */
export const DEFAULTS = {
  /** Process identifier used when {@link CyberflakeConfig.processId} is omitted. */
  PROCESS_ID: 0,
} as const;

/**
 * Initial generator state.
 *
 * `TIMESTAMP` starts at `-1n` so the very first generation is always treated
 * as a new millisecond (no logical timestamp can be negative).
 */
export const INITIAL = {
  TIMESTAMP: -1n,
  SEQUENCE: 0n,
  OFFSET: 0n,
} as const;

/**
 * Formatting constants for the binary debug representation.
 */
export const BINARY = {
  /** Radix used by {@link DeconstructedCyberflake.binary}. */
  RADIX: 2,
  /** Character used to left-pad the binary string to the full layout width. */
  PAD_CHAR: '0',
} as const;
