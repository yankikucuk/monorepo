/**
 * Shared benchmark runner for Cyberflake performance scripts.
 *
 * Owns the common measurement pipeline — memory snapshots, high-resolution
 * timing, the hot loop, and throughput reporting — so individual benchmark
 * scripts only declare *what* they measure, not *how*.
 *
 * Benchmarks are plain Node.js scripts (run via `tsx`) rather than test-runner
 * cases, to avoid framework overhead in the hot path. They measure performance
 * only; correctness is covered by the test suite.
 * @packageDocumentation
 */

import { snapshotMemory } from './snapshotMemory.js';

const NS_PER_SEC = 1e9;

/**
 * Configuration for a single benchmark run.
 */
export interface BenchmarkOptions {
  /** Human-readable benchmark name, printed in the report header. */
  readonly name: string;

  /** Number of iterations to execute in the hot loop. */
  readonly iterations: number;

  /** Label for the throughput line (e.g. `'IDs/sec'`). */
  readonly metricLabel: string;

  /** The operation under measurement; called once per iteration. */
  readonly operation: () => void;
}

/**
 * Runs a benchmark and prints timing, throughput, and memory snapshots.
 *
 * The hot loop intentionally performs no work besides invoking `operation`,
 * so the report reflects the pure cost of the operation itself.
 * @example
 * ```ts
 * runBenchmark({
 *   name: 'Cyberflake benchmark',
 *   iterations: 5_000_000,
 *   metricLabel: 'IDs/sec',
 *   operation: () => generator.generate(),
 * });
 * ```
 * @param {BenchmarkOptions} options - The benchmark to execute.
 * @returns {void} Nothing; results are written to stdout.
 */
export const runBenchmark = (options: BenchmarkOptions): void => {
  const { name, iterations, metricLabel, operation } = options;

  console.log(name);
  console.log(`Iterations: ${iterations.toLocaleString()}`);

  snapshotMemory('start');

  const start = process.hrtime.bigint();

  for (let index = 0; index < iterations; index += 1) {
    operation();
  }

  const end = process.hrtime.bigint();

  snapshotMemory('finish');

  const durationSec = Number(end - start) / NS_PER_SEC;
  const perSec = Math.floor(iterations / durationSec);

  console.log('---');
  console.log(`Total time: ${durationSec.toFixed(3)}s`);
  console.log(`${metricLabel}: ${perSec.toLocaleString()}`);
};
