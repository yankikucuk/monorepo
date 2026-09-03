# Architecture Decision Records

This directory records significant architectural decisions for the April
monorepo, using lightweight [ADRs](https://adr.github.io/).

Each ADR captures the **context**, the **decision**, and its **consequences**
so future contributors understand _why_ the codebase looks the way it does.

## Index

| ADR                                          | Title                                          | Status   |
| -------------------------------------------- | ---------------------------------------------- | -------- |
| [0001](0001-monorepo-tooling.md)             | Monorepo tooling stack                         | Accepted |
| [0002](0002-strict-typechecked-eslint.md)    | Strict, type-checked ESLint & toolchain pins   | Accepted |
| [0003](0003-in-house-import-sorting.md)      | In-house import sorting (`@april/import-sort`) | Accepted |
| [0004](0004-config-packages-ship-sources.md) | Configuration packages ship TypeScript sources | Accepted |
| [0005](0005-supply-chain-policy.md)          | Supply-chain and dependency policy             | Accepted |
| [0006](0006-quality-gates.md)                | Quality-gate scope                             | Accepted |

## Adding an ADR

Copy the format of an existing record, increment the number, and add it to the
index above. Keep them short and focused on a single decision.
