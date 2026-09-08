# @april/tsconfig

Shared TypeScript configuration presets for the April monorepo. Maximum
strictness, native Node.js ESM, and no dead flags — every option is either a
deliberate deviation, a documented pin, or deliberately absent.

## Presets

| Preset         | Extend with                    | Use for                                                     |
| -------------- | ------------------------------ | ----------------------------------------------------------- |
| `base.json`    | `@april/tsconfig/base.json`    | Strict base; emits nothing extra (no declarations or maps). |
| `library.json` | `@april/tsconfig/library.json` | Emitting libraries (declaration + maps).                    |

## Option rationale

### Strictness deviations (beyond `strict: true`)

`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`,
`noPropertyAccessFromIndexSignature: false` (index access stays ergonomic),
`noImplicitOverride`, `noImplicitReturns`, `noFallthroughCasesInSwitch`,
`noUnusedLocals`/`noUnusedParameters`, `allowUnreachableCode: false`,
`allowUnusedLabels: false`, `skipLibCheck: false` (third-party types are
checked too; packages whose upstream `.d.ts` do not type-check under this
strictness opt out locally, as `eslint-config`, `prettier-config` and
`import-sort` do today).

### Pinned values (guard against default/`strict` changes)

- `noImplicitAny`, `useUnknownInCatchVariables` — implied by `strict`, pinned
  so they survive even if `strict` is ever toggled.
- `moduleResolution: NodeNext` — implied by `module: NodeNext`, pinned for
  explicitness.
- `forceConsistentCasingInFileNames`, `useDefineForClassFields`,
  `importHelpers: false` — current defaults, pinned deliberately.

### Deliberately absent — do not re-add

| Option                         | Why it is gone                                                                                                                                 |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `esModuleInterop`              | TypeScript 6 removed `esModuleInterop: false`; the interop is always on. Setting it is dead config.                                            |
| `allowSyntheticDefaultImports` | Implied by the always-on interop above. Dead config (proven: repo typechecks identically without it).                                          |
| `experimentalDecorators`       | Nothing uses decorators; leaving the flag on would silently give any future decorator **legacy** semantics instead of standard TC39 semantics. |
| `noEmitHelpers`                | Inert at `target: ESNext`, but if the target is ever lowered it produces output that references undefined helpers — a silent runtime crash.    |

## Usage

```jsonc
// packages/<pkg>/tsconfig.json
{
  "extends": "@april/tsconfig/library.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
  },
  "include": ["src"],
}
```

`rootDir` and `outDir` are intentionally **not** set in the presets —
TypeScript resolves those paths relative to the file that declares them, so
each package must set its own.

`library.json` adds `declaration` + `declarationMap` + `sourceMap`: consumers
get types, go-to-definition into sources, and debuggable output.

## License

Apache-2.0
