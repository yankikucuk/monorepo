# @april/cyberflake

A high-performance, Snowflake-inspired distributed ID generator designed as a **core infrastructure primitive** for the April monorepo.

Cyberflake provides **globally unique**, **monotonically ordered** identifiers with strong guarantees around clock regression, burst traffic, and deterministic testing.

---

## Features

- Globally unique IDs without central coordination
- Monotonically increasing ordering
- Clock regression tolerance via logical offset
- High-throughput burst handling (sequence overflow safe)
- Deterministic time injection for testing and benchmarks
- Minimal allocation and GC-friendly
- Designed for distributed systems and microservices

---

## Installation (Monorepo)

Cyberflake is intended for **internal monorepo usage**.

```ts
import { Cyberflake } from '@april/cyberflake';
```

---

## Basic Usage

```ts
const generator = new Cyberflake({
  workerId: 1,
  processId: 0,
});

const id = generator.generate();
// => string (safe for DB keys, logs, JSON)
```

---

## Configuration

### `CyberflakeConfig`

```ts
interface CyberflakeConfig {
  workerId: number;
  processId?: number;
  deterministic?: boolean;
  now?: () => number;
}
```

### Worker / Process IDs

- `workerId` identifies a logical node or service instance
- `processId` allows multiple processes on the same worker
- `(workerId, processId)` pairs **must be unique**
- Misconfiguration fails fast at construction time

---

## Deterministic Mode (Testing)

```ts
let now = 1_700_000_000_000;

const cf = new Cyberflake({
  workerId: 1,
  deterministic: true,
  now: () => now,
});

cf.generate();
now += 1;
cf.generate();
```

> **Note:** When `deterministic` is `true`, an explicit `now` time source is
> **required**. Omitting it throws a `RangeError` at construction time, so the
> generator never silently falls back to `Date.now`.

Used for:

- Unit tests
- Integration tests
- Benchmarks
- Controlled environments

---

## Deconstruction

Decoding is **static** — it depends only on the bit layout, so no generator
instance is needed:

```ts
const data = Cyberflake.deconstruct(id);

console.log(data.timestamp);
console.log(data.workerId);
console.log(data.processId);
console.log(data.sequence);
```

Useful for:

- Debugging
- Tracing
- Auditing
- Observability pipelines

---

## Validation

```ts
Cyberflake.isValid(id); // boolean — never throws
```

Accepts exactly the values that are structurally valid Cyberflakes:

- Non-empty, parseable integer strings
- Non-negative values
- Values that fit the 63-bit layout

Field-level bounds (worker, process, sequence) need no separate checks — the
bit layout guarantees them structurally for any value that passes the size
check. `isValid` is safe as a guard for untrusted input; `deconstruct` throws
on unparseable strings, so validate first when input is untrusted.

---

## Bit Layout

Each ID is a 63-bit unsigned integer, returned as a decimal string:

| Field     | Bits | Range         | Purpose                             |
| --------- | ---- | ------------- | ----------------------------------- |
| timestamp | 41   | ~69 years     | Milliseconds since the custom epoch |
| worker    | 5    | 0–31          | Logical node / service instance     |
| process   | 5    | 0–31          | Process within a worker             |
| sequence  | 12   | 0–4095 per ms | Disambiguates same-millisecond IDs  |

Epoch: `2015-01-01T00:00:00.000Z`.

---

## Performance

Measured on Node.js 26 (Apple Silicon):

| Scenario               | Throughput   |
| ---------------------- | ------------ |
| Normal generation      | ~12M IDs/sec |
| Same-millisecond burst | ~18M IDs/sec |

Memory behavior:

- No leaks
- Minimal heap growth
- GC-friendly under sustained load

---

## Benchmarks

Benchmarks are provided under:

```
packages/cyberflake/benchmarks/
```

Run all benchmarks via the package script:

```bash
pnpm --filter @april/cyberflake bench
```

Or run an individual benchmark directly:

```bash
pnpm tsx packages/cyberflake/benchmarks/generate.bench.ts
pnpm tsx packages/cyberflake/benchmarks/sameMs.bench.ts
```

---

## Design Notes

- No central coordinator
- No network calls
- No locks
- No async behavior
- All guarantees are enforced via tests

This package is designed to be **boring, predictable, and safe**.

---

## Architecture

Cyberflake is intentionally split into small, single-purpose modules. The public
entry point re-exports only the class and its types; everything under
`src/internal/` is a private implementation detail and may change without notice.

```
src/
├── index.ts        # Public entry point (Cyberflake + types)
├── cyberflake.ts   # Thin orchestration class holding generator state
├── constants.ts    # Bit layout, shifts, masks, ranges
├── types.ts        # Public type definitions
└── internal/
    ├── time.ts       # Epoch enforcement & logical time
    ├── clock.ts      # Clock-regression handling
    ├── sequence.ts   # Intra-millisecond sequencing & overflow
    ├── encoding.ts   # Bit packing / unpacking / parsing
    └── validation.ts # Config guards & semantic ID validation
```

Each internal module is pure and independently testable; the class merely wires
them together in the correct order.

---

## Versioning

Versions and changelogs are managed with [Changesets](../../.changeset); breaking
changes follow semver. The public API surface is `Cyberflake`,
`CyberflakeConfig`, and `DeconstructedCyberflake` — everything under
`src/internal/` may change without notice.

---

## License

Apache-2.0 — see the repository [LICENSE](../../LICENSE).
