/**
 * Public types of the import-sort core engine.
 *
 * The core is deliberately independent of ESLint: it reasons about plain
 * {@link ImportRecord} values and produces ordered {@link SortedGroup}s. That
 * keeps the sorting semantics unit-testable in isolation and reusable by any
 * host — the bundled ESLint rule today, a CLI or editor integration tomorrow.
 * @packageDocumentation
 */

/**
 * Groups the engine can assign without any configuration.
 *
 * - `side-effect` — `import './polyfills'` (no bindings). Only used when listed
 *   in `groups`; otherwise side-effect imports are treated as immovable
 *   boundaries by the host.
 * - `builtin` — Node.js core modules (`node:fs`, `path`, `fs/promises`).
 * - `external` — bare package specifiers (`react`, `@scope/pkg`).
 * - `internal` — sources matching `internalPattern`, plus Node subpath imports
 *   (`#internal/...`).
 * - `parent` — `../` paths.
 * - `sibling` — `./` paths that are not an index import.
 * - `index` — `.`, `./`, `./index`, `./index.js`, …
 * - `style` — stylesheet sources (`.css`, `.less`, `.scss`, …).
 * - `type` — `import type` declarations. Only used when listed in `groups`;
 *   otherwise type imports sort inside the group of their source.
 * - `unknown` — anything else (absolute paths, URLs). Always present: it is
 *   appended automatically when missing from `groups`.
 */
export type BuiltinGroup =
  'builtin' | 'external' | 'index' | 'internal' | 'parent' | 'sibling' | 'side-effect' | 'style' | 'type' | 'unknown';

/**
 * A group name: a {@link BuiltinGroup} or a key of the `customGroups` option.
 * The intersection keeps editor autocompletion for the built-in names while
 * still accepting arbitrary custom names.
 */
export type GroupName = BuiltinGroup | (string & Record<never, never>);

/**
 * A block of the `groups` option written in its long form, so that layout
 * details can be attached to it.
 */
export interface GroupBlockSpec {
  /** A single group, or several groups merged into one block. */
  readonly group: GroupName | readonly GroupName[];
  /** Comment line the host renders above the block, e.g. `'// Packages'`. */
  readonly commentAbove?: string;
  /** Exact number of blank lines between the block's own members. Default: none. */
  readonly newlinesInside?: number;
}

/**
 * One entry of the `groups` option: a single group, several groups merged into
 * one visual block (no blank line between them, sorted together), or the long
 * form {@link GroupBlockSpec}.
 */
export type GroupSpec = GroupBlockSpec | GroupName | readonly GroupName[];

/** Sort direction applied inside every group. Group order itself is never reversed. */
export type SortOrder = 'asc' | 'desc';

/**
 * Comparison algorithm.
 *
 * - `alphabetical` — locale-aware comparison (see `locales`).
 * - `natural` — like `alphabetical`, but digit runs compare numerically, so
 *   `v2` sorts before `v10`.
 * - `line-length` — by length: of the declaration for imports, of the name for
 *   specifiers. Shortest first under `asc`.
 * - `custom` — by the position of each character in the `alphabet` option.
 * - `unsorted` — no ordering at all; records keep their source order inside
 *   their group, which is useful when only the grouping matters.
 */
export type SortAlgorithm = 'alphabetical' | 'custom' | 'line-length' | 'natural' | 'unsorted';

/**
 * How characters that are neither letters nor digits take part in comparison.
 *
 * - `keep` — compare the specifier as written.
 * - `trim` — ignore leading special characters (`_internal` sorts as `internal`).
 * - `remove` — ignore every special character.
 */
export type SpecialCharacters = 'keep' | 'remove' | 'trim';

/** Which of `import` and `import type` comes first when both import the same source. */
export type KindOrder = 'type-first' | 'value-first';

/**
 * The shape of an import declaration, used as a tiebreaker when two
 * declarations share a source: `import * as ns` reads as the "main" import, and
 * a default import has to precede named ones inside a single declaration.
 */
export type ImportStyle = 'default' | 'named' | 'namespace' | 'side-effect';

/** Whether an import declaration is a value import or an `import type`. */
export type ImportKind = 'type' | 'value';

/** Secondary comparison applied when the primary one considers two records equal. */
export interface FallbackSort {
  readonly algorithm?: SortAlgorithm;
  /** Defaults to the primary `order`. */
  readonly order?: SortOrder;
}

/**
 * The minimal description of an import declaration the engine needs.
 *
 * Hosts extend this with whatever they need (AST nodes, text ranges, …); the
 * engine passes the extended objects through untouched.
 */
export interface ImportRecord {
  /** The module specifier exactly as written (`'./a.js'`, `'react'`). */
  readonly source: string;
  /** `type` for `import type … from`, otherwise `value`. */
  readonly kind: ImportKind;
  /** `true` when the declaration binds nothing (`import './setup'`). */
  readonly sideEffect: boolean;
  /** Declaration shape; tiebreaker for records that share a source. Default: `named`. */
  readonly style?: ImportStyle;
  /** Length used by the `line-length` algorithm. Defaults to the length of `source`. */
  readonly length?: number;
}

/** User-facing sorting options. Every field is optional; see {@link DEFAULT_SORT_OPTIONS}. */
export interface SortOptions {
  /** Ordered group layout. Unknown names are a configuration error. */
  readonly groups?: readonly GroupSpec[];
  /**
   * Additional groups keyed by name. Each value is one or more regular
   * expression sources (compiled with the `u` flag) tested against the module
   * specifier. Custom names must also appear in `groups`.
   */
  readonly customGroups?: Readonly<Record<string, string | readonly string[]>>;
  /** Regular expression sources (compiled with the `u` flag) that mark a specifier as `internal`. */
  readonly internalPattern?: readonly string[];
  /**
   * Regular expression sources for side-effect imports that are safe to sort.
   * A matching `import './a.css'` is ordered like an ordinary import instead of
   * acting as a boundary; everything else (`import 'reflect-metadata'`) stays
   * put.
   */
  readonly safeSideEffects?: readonly string[];
  /** Sort direction inside groups. */
  readonly order?: SortOrder;
  /** Comparison algorithm. */
  readonly algorithm?: SortAlgorithm;
  /** Compare case-insensitively (ties are still broken case-sensitively for determinism). */
  readonly ignoreCase?: boolean;
  /** Locale(s) for `alphabetical` and `natural` comparison. Default: `'en'`. */
  readonly locales?: readonly string[] | string;
  /** How non-alphanumeric characters take part in comparison. */
  readonly specialCharacters?: SpecialCharacters;
  /** Character order used by the `custom` algorithm. */
  readonly alphabet?: string;
  /** Comparison applied when the primary one ties. */
  readonly fallbackSort?: FallbackSort;
  /** Whether `import` or `import type` of the same source comes first. */
  readonly kindOrder?: KindOrder;
}

/** A compiled custom group. */
export interface CustomGroup {
  readonly name: string;
  readonly patterns: readonly RegExp[];
}

/** A resolved entry of the `groups` option. */
export interface ResolvedBlock {
  /** The group names merged into this block. */
  readonly names: readonly GroupName[];
  /** Comment line to render above the block, or `null`. */
  readonly commentAbove: string | null;
  /** Blank lines between the block's members, or `null` to use the host default. */
  readonly newlinesInside: number | null;
}

/** The comparison settings of a single pass (primary or fallback). */
export interface ComparePass {
  readonly algorithm: SortAlgorithm;
  readonly order: SortOrder;
}

/**
 * Fully normalized options: every group flattened to a block of names, custom
 * groups and internal patterns compiled, defaults filled in, and `unknown`
 * guaranteed to be present.
 */
export interface ResolvedSortOptions {
  /** Blocks in output order. */
  readonly groups: readonly ResolvedBlock[];
  /** Group name → index of the block it belongs to. */
  readonly groupIndex: ReadonlyMap<GroupName, number>;
  readonly customGroups: readonly CustomGroup[];
  readonly internalPatterns: readonly RegExp[];
  readonly safeSideEffectPatterns: readonly RegExp[];
  readonly order: SortOrder;
  readonly algorithm: SortAlgorithm;
  readonly ignoreCase: boolean;
  readonly specialCharacters: SpecialCharacters;
  readonly alphabet: string;
  readonly fallback: ComparePass;
  readonly kindOrder: KindOrder;
  /** Collator for the primary pass, built from `locales`, `ignoreCase` and `algorithm`. */
  readonly collator: Intl.Collator;
  /** Collator for the fallback pass; numeric only when `fallbackSort.algorithm` is `natural`. */
  readonly fallbackCollator: Intl.Collator;
}

/** A non-empty output block: the group names it merges and its records in final order. */
export interface SortedGroup<T extends ImportRecord> {
  readonly groups: readonly GroupName[];
  /** Comment line to render above the block, or `null`. */
  readonly commentAbove: string | null;
  /** Blank lines between the block's members, or `null` to use the host default. */
  readonly newlinesInside: number | null;
  readonly records: readonly T[];
}
