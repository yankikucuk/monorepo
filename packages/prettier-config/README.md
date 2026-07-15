# @april/prettier-config

Shared Prettier configuration for the April monorepo.

## Usage

The root `prettier.config.ts` re-exports this package, so every workspace
package inherits it automatically:

```ts
// prettier.config.ts
export { default } from '@april/prettier-config';
```

## License

Apache-2.0
