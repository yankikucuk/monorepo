---
'@april/cyberflake': patch
---

Fail fast at domain boundaries instead of producing corrupt output: `generate()` now throws a `RangeError` when the 41-bit timestamp space is exhausted (previously it silently emitted identifiers that `isValid` itself rejected), and `Cyberflake.deconstruct` rejects negative or oversized values with a `RangeError` (previously they decoded into meaningless components with a malformed binary string).
