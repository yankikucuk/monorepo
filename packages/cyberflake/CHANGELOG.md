# @april/cyberflake

## 2.0.1

### Patch Changes

- f237df1: Fail fast at domain boundaries instead of producing corrupt output: `generate()` now throws a `RangeError` when the 41-bit timestamp space is exhausted (previously it silently emitted identifiers that `isValid` itself rejected), and `Cyberflake.deconstruct` rejects negative or oversized values with a `RangeError` (previously they decoded into meaningless components with a malformed binary string).

## 2.0.0

### Major Changes

- 84dea75: `deconstruct` is now a static method: call `Cyberflake.deconstruct(id)` instead of `generator.deconstruct(id)`. Decoding depends only on the fixed bit layout — never on generator state — so the API now reflects that consistently with the already-static `isValid`. Additionally, fractional time sources are truncated to whole milliseconds, non-integer `workerId`/`processId` values are rejected at construction time with a clear `RangeError`, and `isValid` no longer performs redundant per-field checks (behavior unchanged; the 63-bit layout guarantees field bounds structurally).
