---
'@april/cyberflake': patch
---

Tighten identifier parsing to the canonical decimal form. `isValid` now rejects radix prefixes, whitespace, signs, leading zeros and non-string input instead of inheriting `BigInt()`'s leniency, and `deconstruct` throws a `SyntaxError` for such strings instead of silently decoding `''` as the epoch. The documented example ID now decodes to the fields it is described with, and the docs state the `processId` default, what `deterministic` does and does not change, and that the decoded timestamp is logical time that can run ahead of the wall clock.
