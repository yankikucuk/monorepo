/**
 * Public behaviour API of `@april/interface`.
 *
 * The stylesheet is the product; this layer exists for the parts that need
 * state. Every initialiser returns a teardown function so plain HTML, React
 * effects and Vue lifecycle hooks share one contract.
 * @packageDocumentation
 */

import { initTheme } from './theme.js';

export {
  cycleTheme,
  getTheme,
  initTheme,
  resolvedTheme,
  setTheme,
  THEME_ATTRIBUTE,
  THEME_BOOT_SCRIPT,
  THEME_STORAGE_KEY,
  THEME_TOGGLE_ATTRIBUTE,
} from './theme.js';
export type { ThemeMode } from './theme.js';

/** Teardown handle returned by every initialiser. */
export type Teardown = () => void;

/**
 * Initialises every behaviour under `root` and returns one function that
 * tears all of them down. Today that is the theme switcher; stateful
 * components register here as they land.
 * @param root - Subtree to scan. Defaults to the whole document.
 * @returns A function that removes every binding made by this call.
 */
export const initAll = (root: ParentNode = document): Teardown => {
  const teardowns: Teardown[] = [initTheme(root)];
  return () => {
    for (const teardown of teardowns.splice(0)) {
      teardown();
    }
  };
};
