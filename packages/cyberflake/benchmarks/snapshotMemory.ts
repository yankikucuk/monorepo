/**
 * Memory snapshot helper for benchmark scripts.
 *
 * Not intended for production runtime monitoring — this is a lightweight
 * diagnostic used to compare retained memory before and after a benchmark's
 * hot loop.
 * @packageDocumentation
 */

const BYTES_PER_MB = 1024 * 1024;
const DECIMALS = 2;

/**
 * Logs a labeled snapshot of the current process memory usage (RSS, heap
 * total, heap used, external).
 *
 * When Node.js runs with `--expose-gc` (the `bench` script enables it via
 * `NODE_OPTIONS`), a full garbage-collection cycle is forced first so the
 * numbers reflect retained allocations rather than transient garbage.
 * @example
 * ```ts
 * snapshotMemory('start');
 * // ... hot loop ...
 * snapshotMemory('finish');
 * ```
 * @param {string} label - Identifies the snapshot (e.g. `'start'`, `'finish'`).
 * @returns {void} Nothing; the snapshot is written to stdout.
 */
export const snapshotMemory = (label: string): void => {
  // Guarded: `gc` only exists when Node is started with --expose-gc.
  if (global.gc) {
    global.gc();
  }

  const { rss, heapTotal, heapUsed, external } = process.memoryUsage();
  const toMb = (bytes: number): string => (bytes / BYTES_PER_MB).toFixed(DECIMALS);

  console.log(`\n[Memory Snapshot: ${label}]`);
  console.log(`rss:       ${toMb(rss)} MB`);
  console.log(`heapTotal: ${toMb(heapTotal)} MB`);
  console.log(`heapUsed:  ${toMb(heapUsed)} MB`);
  console.log(`external:  ${toMb(external)} MB`);
};
