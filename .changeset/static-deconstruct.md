---
'@april/cyberflake': major
---

`deconstruct` is now a static method: call `Cyberflake.deconstruct(id)` instead of `generator.deconstruct(id)`. Decoding depends only on the fixed bit layout — never on generator state — so the API now reflects that consistently with the already-static `isValid`. Additionally, fractional time sources are truncated to whole milliseconds, non-integer `workerId`/`processId` values are rejected at construction time with a clear `RangeError`, and `isValid` no longer performs redundant per-field checks (behavior unchanged; the 63-bit layout guarantees field bounds structurally).
