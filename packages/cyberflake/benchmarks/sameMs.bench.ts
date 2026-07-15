/**
 * Cyberflake Same-Millisecond Benchmark
 *
 * This benchmark measures the throughput of `Cyberflake.generate()`
 * when all IDs are generated within the *same physical millisecond*.
 *
 * Scope:
 * - Evaluates sequence incrementation performance
 * - Evaluates logical time advancement when sequence space is exhausted
 * - Measures performance under burst conditions
 *
 * Unlike the baseline benchmark, this scenario intentionally fixes
 * the time source to a single millisecond in order to:
 * - Eliminate timestamp progression
 * - Force reliance on the sequence and logical offset mechanisms
 *
 * This benchmark represents real-world burst scenarios such as:
 * - High-throughput event ingestion
 * - Log or telemetry spikes
 * - Batch job execution
 *
 * NOTE:
 * This benchmark is not a correctness test.
 * All ordering and overflow guarantees are validated in the test suite.
 * This script strictly measures performance and memory behavior.
 */

import { Cyberflake } from '../src/cyberflake.js';
import { snapshotMemory } from './snapshotMemory.js';

/**
 * Number of ID generations to perform during the benchmark run.
 *
 * The iteration count is chosen to:
 * - Exceed the sequence field capacity
 * - Trigger logical time advancement
 * - Remain fast enough for repeated local execution
 */
const ITERATIONS = 1_000_000;

/**
 * Fixed timestamp used as the time source.
 *
 * By freezing time, this benchmark ensures that:
 * - All generated IDs share the same physical timestamp
 * - Ordering is maintained solely via the sequence field
 *   and logical time adjustments
 */
const FIXED_NOW = 1_700_000_000_000;

/**
 * Cyberflake instance configured with a deterministic time source.
 *
 * No `processId` is specified to:
 * - Reduce configuration variables
 * - Focus purely on sequencing and logical time behavior
 */
const cf = new Cyberflake({
  workerId: 1,
  now: () => FIXED_NOW,
});

console.log('Cyberflake same-ms benchmark');
console.log(`Iterations: ${ITERATIONS.toLocaleString()}`);

/**
 * Capture initial memory state.
 *
 * This snapshot provides a baseline for detecting:
 * - Allocation pressure caused by rapid sequence updates
 * - Heap growth during burst ID generation
 */
snapshotMemory('start');

/**
 * High-resolution start time.
 *
 * Nanosecond precision is required to accurately measure
 * throughput in high-performance, tight-loop scenarios.
 */
const start = process.hrtime.bigint();

/**
 * Hot-path benchmark loop.
 *
 * This loop intentionally performs no work other than invoking
 * `Cyberflake.generate()` in order to measure:
 * - Sequence increment cost
 * - Logical offset handling cost
 * - Bitwise packing performance under burst load
 */
for (let i = 0; i < ITERATIONS; i += 1) {
  cf.generate();
}

/**
 * High-resolution end time.
 */
const end = process.hrtime.bigint();

/**
 * Capture final memory state after benchmark execution.
 *
 * A forced GC is triggered inside `snapshotMemory` (when available)
 * to ensure retained memory is measured rather than transient garbage.
 */
snapshotMemory('finish');

/**
 * Duration calculations.
 *
 * Nanoseconds are converted to seconds to derive
 * a human-readable throughput metric.
 */
const durationNs = end - start;
const durationSec = Number(durationNs) / 1e9;

/**
 * Derived throughput metric.
 *
 * IDs/sec (same ms) reflects Cyberflake's maximum sustainable
 * burst throughput when timestamp progression is not available.
 */
const idsPerSec = Math.floor(ITERATIONS / durationSec);

console.log('---');
console.log(`Total time: ${durationSec.toFixed(3)}s`);
console.log(`IDs/sec (same ms): ${idsPerSec.toLocaleString()}`);
