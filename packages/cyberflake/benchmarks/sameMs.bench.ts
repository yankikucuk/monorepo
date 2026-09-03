/**
 * Cyberflake same-millisecond benchmark.
 *
 * Freezes the time source so every ID lands in the same physical millisecond,
 * forcing ordering to rely entirely on the sequence field and logical time
 * advancement. This models burst scenarios — event-ingestion spikes, batch
 * jobs — and exercises the sequence-overflow path continuously.
 * @packageDocumentation
 */

import { Cyberflake } from '../src/cyberflake.js';

import { runBenchmark } from './runBenchmark.js';

// Exceeds the 4096-per-ms sequence capacity to force logical time advancement.
const ITERATIONS = 1_000_000;

const FIXED_NOW = 1_700_000_000_000;

const generator = new Cyberflake({
  workerId: 1,
  now: () => FIXED_NOW,
});

runBenchmark({
  name: 'Cyberflake same-ms benchmark',
  iterations: ITERATIONS,
  metricLabel: 'IDs/sec (same ms)',
  operation: () => {
    generator.generate();
  },
});
