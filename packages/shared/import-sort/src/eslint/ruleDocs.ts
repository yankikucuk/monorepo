/**
 * Documentation metadata shared by every rule in this plugin.
 * @packageDocumentation
 */

/** Plugin-specific documentation metadata attached to every rule's `meta.docs`. */
export interface RuleDocs {
  /** Whether the rule is part of the `recommended` config. */
  readonly recommended: boolean;
}

/** Canonical location of the package README, used for rule documentation URLs. */
const README_URL = 'https://github.com/playerberry/april/tree/stage/packages/shared/import-sort';

/**
 * Documentation URL of a rule: the matching `Rule: import-sort/<name>` README section.
 * @param {string} name - Short rule name (`order`).
 * @returns {string} Absolute URL to the rule's README section.
 */
export const ruleDocsUrl = (name: string): string => `${README_URL}#rule-import-sort${name}`;
