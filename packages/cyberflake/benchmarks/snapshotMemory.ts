/* eslint-disable no-magic-numbers, no-console */

/**
 * Captures and logs a snapshot of the current Node.js process memory usage.
 *
 * This helper is designed to be used exclusively in benchmark scripts
 * to observe memory behavior before and after high-throughput operations.
 *
 * The snapshot includes:
 * - RSS (Resident Set Size)
 * - Heap total size
 * - Heap used size
 * - External memory usage
 *
 * NOTE:
 * This utility is not intended for production runtime monitoring.
 * It is a lightweight diagnostic tool for benchmark and performance analysis.
 */

/**
 * Forces a garbage collection cycle (when available) and logs
 * a labeled memory usage snapshot.
 *
 * When Node.js is started with the `--expose-gc` flag, this function
 * triggers a full garbage collection before capturing memory metrics.
 * This ensures that the reported values reflect retained allocations
 * rather than transient garbage.
 * @param {string} label - A descriptive label used to identify the snapshot
 *                (e.g. "start", "after warmup", "finish")
 */
export const snapshotMemory = (label: string): void => {
  /**
   * Trigger a full GC cycle when explicitly exposed.
   *
   * This is intentionally guarded to avoid runtime errors when
   * `--expose-gc` is not provided.
   */
  if (global.gc) {
    global.gc();
  }

  /**
   * Read current process memory statistics.
   *
   * - rss: Resident Set Size (total memory allocated to the process)
   * - heapTotal: Total size of the V8 heap
   * - heapUsed: Actively used portion of the heap
   * - external: Memory used by C++ objects bound to JavaScript objects
   */
  const { rss, heapTotal, heapUsed, external } = process.memoryUsage();

  /**
   * Output a human-readable memory snapshot.
   *
   * Values are converted from bytes to megabytes to:
   * - Improve readability
   * - Simplify comparison between snapshots
   */
  console.log(`\n[Memory Snapshot: ${label}]`);
  console.log(`rss:       ${(rss / 1024 / 1024).toFixed(2)} MB`);
  console.log(`heapTotal: ${(heapTotal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`heapUsed:  ${(heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`external:  ${(external / 1024 / 1024).toFixed(2)} MB`);
};
