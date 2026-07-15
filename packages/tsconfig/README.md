# @april/tsconfig

Shared TypeScript configuration presets for the April monorepo.

## Presets

| Preset         | Extend with                    | Use for                                    |
| -------------- | ------------------------------ | ------------------------------------------ |
| `base.json`    | `@april/tsconfig/base.json`    | Strict base (type-checking, no emit opts). |
| `library.json` | `@april/tsconfig/library.json` | Emitting libraries (declaration + maps).   |

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

`rootDir` and `outDir` are intentionally **not** set in the presets — TypeScript
resolves those paths relative to the file that declares them, so each package
must set its own.

## License

Apache-2.0
