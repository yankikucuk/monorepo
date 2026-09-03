/**
 * Cyberflake generate benchmark.
 *
 * Measures the raw throughput of `Cyberflake.generate()` under normal
 * operating conditions: real wall-clock time, advancing timestamps, and a
 * fixed `(workerId, processId)` pair. This is the primary indicator of
 * suitability for hot execution paths.
 * @packageDocumentation
 */

import { Cyberflake } from '../src/cyberflake.js';

import { runBenchmark } from './runBenchmark.js';

// Large enough to amortize JIT warm-up, fast enough for local and CI runs.
const ITERATIONS = 5_000_000;

const generator = new Cyberflake({
  workerId: 1,
  processId: 1,
});

runBenchmark({
  name: 'Cyberflake benchmark',
  iterations: ITERATIONS,
  metricLabel: 'IDs/sec',
  operation: () => {
    generator.generate();
  },
});
