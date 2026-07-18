# @april/cyberflake

## 1.0.0

### Major Changes

- Initial stable release. Snowflake-inspired distributed ID generator with a
  63-bit layout (41-bit timestamp / 5-bit worker / 5-bit process / 12-bit
  sequence), monotonic ordering, clock-regression tolerance via a logical
  offset, deterministic time injection for testing, static `deconstruct` and
  `isValid`, and fail-fast guards at every domain boundary (configuration,
  epoch, timestamp-space exhaustion, decode domain). 100% test coverage across
  statements, branches, functions, and lines.
