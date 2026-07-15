/**
 * Cyberflake Generate Benchmark
 *
 * This benchmark measures the raw throughput of `Cyberflake.generate()`
 * under normal operating conditions.
 *
 * Scope:
 * - Measures total IDs generated per second
 * - Includes BigInt arithmetic and bitwise packing costs
 * - Excludes I/O, persistence, and network overhead
 *
 * This benchmark is intentionally implemented as a plain Node.js script
 * (not a test) to avoid framework overhead and to reflect real-world usage
 * in hot execution paths.
 *
 * NOTE:
 * This is not a correctness test. All correctness guarantees are covered
 * by the test suite. This benchmark strictly evaluates performance and
 * memory behavior.
 */

import { Cyberflake } from '../src/cyberflake.js';
import { snapshotMemory } from './snapshotMemory.js';

/**
 * Number of ID generations to perform during the benchmark run.
 *
 * The iteration count is chosen to:
 * - Be large enough to amortize startup and JIT warm-up costs
 * - Remain fast enough for local and CI execution
 */
const ITERATIONS = 5_000_000;

/**
 * Cyberflake instance used for benchmarking.
 *
 * A fixed `(workerId, processId)` pair is used to:
 * - Avoid configuration overhead
 * - Ensure a stable and repeatable execution path
 */
const cf = new Cyberflake({
  workerId: 1,
  processId: 1,
});

console.log('Cyberflake benchmark');
console.log(`Iterations: ${ITERATIONS.toLocaleString()}`);

/**
 * Capture initial memory state.
 *
 * This snapshot serves as a baseline for detecting:
 * - Heap growth
 * - GC pressure
 * - Potential memory leaks
 */
snapshotMemory('start');

/**
 * High-resolution start time.
 *
 * `process.hrtime.bigint()` is used to:
 * - Avoid clock drift
 * - Achieve nanosecond precision
 * - Ensure consistent timing across platforms
 */
const start = process.hrtime.bigint();

/**
 * Hot-path benchmark loop.
 *
 * This loop intentionally performs no work other than invoking
 * `Cyberflake.generate()` to measure the pure cost of ID generation.
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
 * to ensure memory measurements reflect retained allocations rather
 * than transient garbage.
 */
snapshotMemory('finish');

/**
 * Duration calculations.
 *
 * Nanoseconds are converted to seconds to derive a human-readable
 * throughput metric.
 */
const durationNs = end - start;
const durationSec = Number(durationNs) / 1e9;

/**
 * Derived throughput metric.
 *
 * IDs/sec is the primary performance indicator used to evaluate
 * Cyberflake's suitability for high-throughput and hot-path usage.
 */
const idsPerSec = Math.floor(ITERATIONS / durationSec);

console.log('---');
console.log(`Total time: ${durationSec.toFixed(3)}s`);
console.log(`IDs/sec: ${idsPerSec.toLocaleString()}`);
