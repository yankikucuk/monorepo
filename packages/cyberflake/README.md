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

## Recommended Usage (Singleton)

Uniqueness is guaranteed **per instance**: two instances configured with the
same `(workerId, processId)` pair have independent sequence counters, so both
can emit the same ID within the same millisecond — even inside a single
process. The rule is therefore: **one instance per `(workerId, processId)`
pair**, created once at module level and imported everywhere.

```ts
// src/idGenerator.ts — the application's ONE generator
import { Cyberflake } from '@april/cyberflake';

export const idGenerator = new Cyberflake({
  workerId: Number(process.env.CYBERFLAKE_WORKER_ID ?? 1),
  processId: Number(process.env.CYBERFLAKE_PROCESS_ID ?? 1),
});
```

```ts
// Everywhere else:
import { idGenerator } from './idGenerator.js';

const userId = idGenerator.generate();
const telemetryId = idGenerator.generate();
```

Properties of this pattern:

- **One source, many destinations.** IDs from a single generator are unique
  across the whole system, so user rows, telemetry events, and moderation logs
  can live in different tables — or different databases — without any risk of
  overlap. A telemetry ID can never equal a user ID.
- **Env-driven configuration.** The pair comes from the environment, not the
  code. The day a second concurrent process is deployed, it simply starts with
  a different `CYBERFLAKE_WORKER_ID`/`CYBERFLAKE_PROCESS_ID` — no code change,
  no coordination, no silent-collision risk.
- **Fail-fast misconfiguration.** Invalid or missing values are rejected by
  the constructor with a `RangeError` at boot, not discovered in production
  data.

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
- `processId` allows multiple processes on the same worker (defaults to `0`)
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
> generator never silently falls back to `Date.now`. The flag changes nothing
> else: generation is fully determined by `now`, with or without it.

Used for:

- Unit tests
- Integration tests
- Benchmarks
- Controlled environments

---

## Deconstruction

Decoding is **static** — it depends only on the bit layout, so no generator
instance is needed. Values outside the 63-bit domain (negative or oversized)
throw a `RangeError` instead of decoding into meaningless components; use
`Cyberflake.isValid` first for untrusted input.

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

Accepts exactly the values that a generator can emit:

- Canonical decimal strings: digits only, no sign, whitespace, radix prefix
  (`0x`, `0b`) or leading zeros
- Values that fit the 63-bit layout

Anything else, including non-string input from untyped callers, returns `false`.

Field-level bounds (worker, process, sequence) need no separate checks — the
bit layout guarantees them structurally for any value that passes the size
check. `isValid` is safe as a guard for untrusted input; `deconstruct` throws a
`SyntaxError` on non-canonical strings and a `RangeError` on out-of-domain
values, so validate first when input is untrusted.

---

## Bit Layout

Each ID is a 63-bit unsigned integer, returned as a decimal string:

| Field     | Bits | Range         | Purpose                             |
| --------- | ---- | ------------- | ----------------------------------- |
| timestamp | 41   | ~69 years     | Milliseconds since the custom epoch |
| worker    | 5    | 0–31          | Logical node / service instance     |
| process   | 5    | 0–31          | Process within a worker             |
| sequence  | 12   | 0–4095 per ms | Disambiguates same-millisecond IDs  |

Epoch: `2015-01-01T00:00:00.000Z`. The timestamp field is exhausted ~69.7
years past the epoch (≈ 2084) — or earlier if sustained bursts inflate the
logical offset — at which point `generate()` **fails fast with a `RangeError`**
instead of silently emitting identifiers that no longer fit the layout.

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

Versions and changelogs are managed with
[Changesets](https://github.com/changesets/changesets); breaking
changes follow semver. The public API surface is `Cyberflake`,
`CyberflakeConfig`, and `DeconstructedCyberflake` — everything under
`src/internal/` may change without notice.

---

## License

Apache-2.0 — see the repository [LICENSE](../../LICENSE).
