# @april/cyberflake

## 1.0.1

### Patch Changes

- f01c98f: Tighten identifier parsing to the canonical decimal form. `isValid` now rejects radix prefixes, whitespace, signs, leading zeros and non-string input instead of inheriting `BigInt()`'s leniency, and `deconstruct` throws a `SyntaxError` for such strings instead of silently decoding `''` as the epoch. The documented example ID now decodes to the fields it is described with, and the docs state the `processId` default, what `deterministic` does and does not change, and that the decoded timestamp is logical time that can run ahead of the wall clock.

## 1.0.0

### Major Changes

- Initial stable release. Snowflake-inspired distributed ID generator with a
  63-bit layout (41-bit timestamp / 5-bit worker / 5-bit process / 12-bit
  sequence), monotonic ordering, clock-regression tolerance via a logical
  offset, deterministic time injection for testing, static `deconstruct` and
  `isValid`, and fail-fast guards at every domain boundary (configuration,
  epoch, timestamp-space exhaustion, decode domain). 100% test coverage across
  statements, branches, functions, and lines.
