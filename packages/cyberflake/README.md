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

Used for:

- Unit tests
- Integration tests
- Benchmarks
- Controlled environments

---

## Deconstruction

```ts
const data = cf.deconstruct(id);

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
Cyberflake.isValid(id); // boolean
```

Performs **semantic validation**, not just parsing:

- Bit layout correctness
- Epoch validity
- Worker / process bounds
- Non-negative constraint

---

## Performance

Measured on Node.js 18+:

| Scenario               | Throughput   |
| ---------------------- | ------------ |
| Normal generation      | ~10M IDs/sec |
| Same-millisecond burst | ~14M IDs/sec |

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

Run with:

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

## Versioning

- **v1.0.0** — Initial stable release
- Public API is considered stable
- Breaking changes will follow semver

---

## License

Internal — April Monorepo
