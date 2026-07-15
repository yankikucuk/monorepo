/**
 * Clock-regression handling for Cyberflake.
 *
 * Distributed systems cannot assume a strictly monotonic physical clock; time
 * may move backwards due to NTP corrections, VM snapshot restores, or drift
 * adjustments. This module absorbs such regressions into a logical offset so
 * that emitted identifiers never decrease.
 * @packageDocumentation
 */

/**
 * Outcome of a clock-regression evaluation.
 */
export interface RegressionResult {
  /** The monotonically safe logical timestamp that should be emitted. */
  readonly timestamp: bigint;

  /** The (possibly increased) logical offset carried into the next call. */
  readonly offset: bigint;
}

/**
 * Enforces monotonic time progression in the presence of physical clock
 * regressions.
 *
 * When the freshly computed logical timestamp is earlier than the last emitted
 * timestamp, the difference is folded into the logical offset and the previous
 * timestamp is reused, guaranteeing that time never appears to move backwards.
 * @param {bigint} logicalTimestamp - Newly computed logical timestamp.
 * @param {bigint} lastTimestamp - Last emitted logical timestamp.
 * @param {bigint} offset - Current logical clock offset.
 * @returns {RegressionResult} The corrected timestamp and offset.
 */
export const handleClockRegression = (
  logicalTimestamp: bigint,
  lastTimestamp: bigint,
  offset: bigint
): RegressionResult => {
  if (logicalTimestamp < lastTimestamp) {
    return {
      timestamp: lastTimestamp,
      offset: offset + (lastTimestamp - logicalTimestamp),
    };
  }

  return { timestamp: logicalTimestamp, offset };
};
