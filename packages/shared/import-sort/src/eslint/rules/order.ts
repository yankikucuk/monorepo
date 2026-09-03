/**
 * `import-sort/order` — enforce a deterministic, configurable order for import
 * declarations.
 *
 * The rule renders every import block into its canonical form (see
 * `../render.ts`) and reports once per block when the source differs, with a
 * single fix that rewrites the whole block. One report + one fix per block
 * means the autofix converges in a single pass and never fights other fixers.
 * @packageDocumentation
 */

import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import { createComparator } from '../../core/compare.js';
import { resolveOptions } from '../../core/options.js';
import { sortImports } from '../../core/sort.js';
import { collectImportChunks } from '../chunks.js';
import { diagnoseChunk } from '../diagnose.js';
import { compilePartitionComments } from '../partitions.js';
import { commentLine, detectEol, renderChunk } from '../render.js';
import { ruleDocsUrl } from '../ruleDocs.js';
import { internalPatternsFromTsconfig } from '../tsconfig.js';

import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import type { JSONSchema4 } from '@typescript-eslint/utils/json-schema';
import type { SortOptions } from '../../core/types.js';
import type { ImportContainer } from '../chunks.js';
import type { OrderMessageId } from '../diagnose.js';
import type { PartitionByComment } from '../partitions.js';
import type { NewlinesBetween } from '../render.js';
import type { RuleDocs } from '../ruleDocs.js';
import type { TypeSpecifierPlacement } from '../specifiers.js';
import type { TsconfigOption } from '../tsconfig.js';

/** Options of the `order` rule: every core {@link SortOptions} field plus layout options. */
export interface OrderRuleOptions extends SortOptions {
  /** Blank lines between groups: `'always'` (one), `'never'`, or an exact count. Default: `'always'`. */
  readonly newlinesBetween?: NewlinesBetween;
  /** Also sort the named specifiers inside braces. Default: `true`. */
  readonly sortSpecifiers?: boolean;
  /** Where inline `type` specifiers go inside the braces. Default: `'mixed'`. */
  readonly typeSpecifiers?: TypeSpecifierPlacement;
  /** Comments that start an independently sorted block. Default: disabled. */
  readonly partitionByComment?: PartitionByComment;
  /** Derive `internal` patterns from the `paths` of a `tsconfig.json`. Default: disabled. */
  readonly tsconfig?: TsconfigOption;
}

/** ESLint passes rule options as a tuple; this rule takes a single optional object. */
export type OrderRuleOptionsTuple = [OrderRuleOptions?];

/** Defaults for the layout options owned by the rule (core defaults live in `DEFAULT_SORT_OPTIONS`). */
export const DEFAULT_ORDER_RULE_OPTIONS: Required<
  Pick<OrderRuleOptions, 'newlinesBetween' | 'sortSpecifiers' | 'typeSpecifiers'>
> = {
  newlinesBetween: 'always',
  sortSpecifiers: true,
  typeSpecifiers: 'mixed',
};

const GROUP_NAME: JSONSchema4 = { type: 'string', minLength: 1 };
const GROUP_NAMES: JSONSchema4 = { type: 'array', items: GROUP_NAME, minItems: 1 };
const PATTERN_LIST: JSONSchema4 = {
  anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' }, minItems: 1 }],
};
const COMMENT_PATTERNS: JSONSchema4 = {
  anyOf: [{ type: 'boolean' }, { type: 'string' }, { type: 'array', items: { type: 'string' }, minItems: 1 }],
};
const ALGORITHM: JSONSchema4 = {
  type: 'string',
  enum: ['alphabetical', 'custom', 'line-length', 'natural', 'unsorted'],
};
const ORDER: JSONSchema4 = { type: 'string', enum: ['asc', 'desc'] };
const GROUP_BLOCK: JSONSchema4 = {
  type: 'object',
  additionalProperties: false,
  required: ['group'],
  properties: {
    group: { anyOf: [GROUP_NAME, GROUP_NAMES] },
    commentAbove: { type: 'string', minLength: 1 },
    newlinesInside: { type: 'integer', minimum: 0 },
  },
};

/** JSON schema of the single options object. Exported so hosts can validate configuration up front. */
export const ORDER_OPTIONS_SCHEMA: JSONSchema4 = {
  type: 'object',
  additionalProperties: false,
  properties: {
    groups: { type: 'array', items: { anyOf: [GROUP_NAME, GROUP_NAMES, GROUP_BLOCK] } },
    customGroups: { type: 'object', additionalProperties: PATTERN_LIST },
    internalPattern: { type: 'array', items: { type: 'string' } },
    safeSideEffects: { type: 'array', items: { type: 'string' } },
    order: ORDER,
    algorithm: ALGORITHM,
    ignoreCase: { type: 'boolean' },
    locales: { anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' }, minItems: 1 }] },
    specialCharacters: { type: 'string', enum: ['keep', 'remove', 'trim'] },
    alphabet: { type: 'string' },
    fallbackSort: {
      type: 'object',
      additionalProperties: false,
      properties: { algorithm: ALGORITHM, order: ORDER },
    },
    kindOrder: { type: 'string', enum: ['type-first', 'value-first'] },
    newlinesBetween: {
      anyOf: [
        { type: 'string', enum: ['always', 'never'] },
        { type: 'integer', minimum: 0 },
      ],
    },
    sortSpecifiers: { type: 'boolean' },
    typeSpecifiers: { type: 'string', enum: ['first', 'last', 'mixed'] },
    partitionByComment: {
      anyOf: [
        COMMENT_PATTERNS,
        {
          type: 'object',
          additionalProperties: false,
          properties: { block: COMMENT_PATTERNS, line: COMMENT_PATTERNS },
        },
      ],
    },
    tsconfig: {
      type: 'object',
      additionalProperties: false,
      properties: { filename: { type: 'string' }, rootDir: { type: 'string' } },
    },
  },
};

/** The `order` rule module. */
export type OrderRule = TSESLint.RuleModule<OrderMessageId, OrderRuleOptionsTuple, RuleDocs>;

/**
 * Containers that can hold import declarations: the module itself and ambient
 * module blocks (`declare module 'x' { … }`). Each is sorted on its own.
 * @param {TSESTree.Node} node - The parent of an import declaration.
 * @returns {boolean} `true` when the node's body is sorted as a unit.
 */
const isImportContainer = (node: TSESTree.Node): node is ImportContainer =>
  node.type === AST_NODE_TYPES.Program || node.type === AST_NODE_TYPES.TSModuleBlock;

/**
 * The `order` rule.
 */
export const order: OrderRule = {
  defaultOptions: [{}],
  meta: {
    type: 'layout',
    docs: {
      description: 'Enforce a deterministic, configurable order for import declarations.',
      recommended: true,
      url: ruleDocsUrl('order'),
    },
    fixable: 'code',
    schema: [ORDER_OPTIONS_SCHEMA],
    messages: {
      unsortedImports: "'{{source}}' should be imported before '{{before}}'.",
      unsortedSpecifiers: "Specifiers of '{{source}}' are not sorted: '{{specifier}}' should come before '{{before}}'.",
      missingBlankLine: "Expected one blank line before the import of '{{source}}' (it starts a new group).",
      missingGroupComment: "Expected the comment '{{comment}}' above the group starting with '{{source}}'.",
      sameLine: "Expected the import of '{{source}}' to start on its own line.",
      unexpectedBlankLine: "Unexpected blank line before the import of '{{source}}'.",
      unexpectedWhitespace: "Unexpected whitespace before the import of '{{source}}'.",
    },
  },
  create(context) {
    const [userOptions = {}] = context.options;
    const {
      newlinesBetween = DEFAULT_ORDER_RULE_OPTIONS.newlinesBetween,
      sortSpecifiers = DEFAULT_ORDER_RULE_OPTIONS.sortSpecifiers,
      typeSpecifiers = DEFAULT_ORDER_RULE_OPTIONS.typeSpecifiers,
      partitionByComment,
      tsconfig,
      ...sortOptions
    } = userOptions;

    const aliases = tsconfig ? internalPatternsFromTsconfig(tsconfig, context.filename) : [];
    const options = resolveOptions({
      ...sortOptions,
      internalPattern: [...(sortOptions.internalPattern ?? []), ...aliases],
    });
    const compare = createComparator(options);
    const isPartitionComment = compilePartitionComments(partitionByComment);
    const { sourceCode } = context;
    const eol = detectEol(sourceCode.text);
    const groupComments = new Set(
      options.groups.flatMap(block => {
        const comment = commentLine(block.commentAbove);
        return comment === null ? [] : [comment];
      })
    );
    const chunkContext = {
      sourceCode,
      options,
      compare,
      sortSpecifiers,
      typeSpecifiers,
      isPartitionComment,
      groupComments,
    };
    const containers = new Set<ImportContainer>();

    return {
      ImportDeclaration(node) {
        if (isImportContainer(node.parent)) {
          containers.add(node.parent);
        }
      },
      'Program:exit'() {
        for (const container of containers) {
          for (const chunk of collectImportChunks(container, chunkContext)) {
            const rendered = renderChunk(sortImports(chunk.entries, options), {
              eol,
              newlinesBetween,
              restOfLine: chunk.restOfLine,
            });
            if (rendered.text !== chunk.text) {
              context.report({
                ...diagnoseChunk(chunk, rendered),
                fix: fixer => fixer.replaceTextRange([chunk.start, chunk.end], rendered.text),
              });
            }
          }
        }
        containers.clear();
      },
    };
  },
};
