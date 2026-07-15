/* ------------------------------------------------------------------ */
/* Time                                                               */
/* ------------------------------------------------------------------ */

/**
 * PlayerBerry epoch timestamp (2015-01-01T00:00:00.000Z)
 */
export const TIME = {
  EPOCH: 1_420_070_400_000n,
} as const;

/* ------------------------------------------------------------------ */
/* Bit layout                                                         */
/* ------------------------------------------------------------------ */

export const BITS = {
  TIMESTAMP: 41n,
  WORKER: 5n,
  PROCESS: 5n,
  SEQUENCE: 12n,

  TOTAL: 41n + 5n + 5n + 12n,
} as const;

/* ------------------------------------------------------------------ */
/* Shifts                                                            */
/* ------------------------------------------------------------------ */

export const SHIFTS = {
  PROCESS: BITS.SEQUENCE,
  WORKER: BITS.SEQUENCE + BITS.PROCESS,
  TIMESTAMP: BITS.SEQUENCE + BITS.PROCESS + BITS.WORKER,
} as const;

/* ------------------------------------------------------------------ */
/* Masks                                                             */
/* ------------------------------------------------------------------ */

export const MASKS = {
  SEQUENCE: (1n << BITS.SEQUENCE) - 1n,
  WORKER: (1n << BITS.WORKER) - 1n,
  PROCESS: (1n << BITS.PROCESS) - 1n,
} as const;

/* ------------------------------------------------------------------ */
/* Ranges                                                            */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* Defaults                                                          */
/* ------------------------------------------------------------------ */

export const DEFAULTS = {
  PROCESS_ID: 0,
} as const;

/* ------------------------------------------------------------------ */
/* Initial state                                                      */
/* ------------------------------------------------------------------ */

export const INITIAL = {
  TIMESTAMP: -1n,
  SEQUENCE: 0n,
  OFFSET: 0n,
} as const;

/* ------------------------------------------------------------------ */
/* Numeric helpers                                                    */
/* ------------------------------------------------------------------ */

export const NUMERIC = {
  BIGINT_ZERO: 0n,
  BIGINT_ONE: 1n,
  NUMBER_ZERO: 0,
} as const;

/* ------------------------------------------------------------------ */
/* Binary formatting                                                  */
/* ------------------------------------------------------------------ */

export const BINARY = {
  RADIX: 2,
  PAD_CHAR: '0',
} as const;
