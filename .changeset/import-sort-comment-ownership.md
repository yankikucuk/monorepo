---
'@april/import-sort': minor
---

Fix a family of comment-handling defects in `import-sort/order` and tighten the core engine:

- Group comments (`commentAbove`) are no longer duplicated when a new import sorts ahead of the opener, and a label left above the wrong import is removed and reported with the new `duplicateGroupComment` message. A label written with extra whitespace is rewritten instead of crashing the rule.
- A trailing `// import-sort-ignore` or partition comment on the previous line no longer pins or partitions the import below it.
- `algorithm: 'unsorted'` keeps source order across mixed kinds and shapes; `line-length` breaks ties with `fallbackSort` rather than the source length; the fallback pass gets its own collator, so a natural fallback no longer makes an alphabetical primary pass numeric; `ignoreCase` now applies to the `custom` alphabet.
- `commentAbove` rejects multi-line and unterminated block comments, an invalid `locales` value throws a `TypeError` like every other option, `./index.test.js` is a sibling rather than an index import, a `paths` alias of `*` is skipped, aliases keep their suffix, and a malformed `tsconfig.json` yields no patterns instead of throwing.
- `eslint-disable-line` is no longer treated as a comment that binds to the line below it.
- `renderChunk` takes the configured group comments and reports stray and rewritten labels; the tsconfig lookup is cached per directory.
