/**
 * Theme switching with persistence.
 *
 * The stylesheet follows the system preference by default. An explicit choice
 * is written to `data-ai-theme` on `<html>` and remembered in `localStorage`
 * under {@link THEME_STORAGE_KEY}. To avoid a flash on load, inline
 * {@link THEME_BOOT_SCRIPT} in `<head>` before the stylesheet; it applies the
 * stored choice before first paint and needs nothing else from this module.
 * @packageDocumentation
 */

/** The three modes a page can be in. */
export type ThemeMode = 'auto' | 'dark' | 'light';

/** `localStorage` key holding the explicit choice; absent means `auto`. */
export const THEME_STORAGE_KEY = 'ai-theme';

/** Attribute on `<html>` that overrides the system preference. */
export const THEME_ATTRIBUTE = 'data-ai-theme';

/** Elements with this attribute cycle the mode when clicked; the value can pin a mode instead. */
export const THEME_TOGGLE_ATTRIBUTE = 'data-ai-theme-toggle';

const ORDER: readonly ThemeMode[] = ['auto', 'light', 'dark'];

/**
 * Inline this in `<head>`, before the stylesheet, so the stored theme applies
 * before the first paint. It is deliberately self-contained.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='light'||t==='dark'){document.documentElement.setAttribute('${THEME_ATTRIBUTE}',t)}}catch(e){}})();`;

const isMode = (value: unknown): value is ThemeMode => value === 'auto' || value === 'light' || value === 'dark';

/**
 * Reads the stored choice.
 * @returns The explicit mode, or `auto` when none is stored or storage is unavailable.
 */
const storedMode = (): ThemeMode => {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return isMode(value) ? value : 'auto';
  } catch {
    return 'auto';
  }
};

/**
 * The current mode: the explicit choice on `<html>`, else `auto`.
 * @returns The mode in effect.
 */
export const getTheme = (): ThemeMode => {
  const value = document.documentElement.getAttribute(THEME_ATTRIBUTE);
  return isMode(value) && value !== 'auto' ? value : 'auto';
};

/**
 * The theme actually rendered right now, resolving `auto` against the system.
 * @returns `light` or `dark`.
 */
export const resolvedTheme = (): 'dark' | 'light' => {
  const mode = getTheme();
  if (mode !== 'auto') {
    return mode;
  }
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

/**
 * Applies a mode, persists it, and notifies listeners through an
 * `ai:themechange` event on `document`.
 * @param mode - The mode to apply; `auto` removes the override.
 */
export const setTheme = (mode: ThemeMode): void => {
  const root = document.documentElement;
  if (mode === 'auto') {
    root.removeAttribute(THEME_ATTRIBUTE);
  } else {
    root.setAttribute(THEME_ATTRIBUTE, mode);
  }
  try {
    if (mode === 'auto') {
      localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    }
  } catch {
    // Storage may be unavailable (private mode, blocked); the choice still applies to this page.
  }
  document.dispatchEvent(new CustomEvent('ai:themechange', { detail: { mode, resolved: resolvedTheme() } }));
};

/**
 * Advances to the next mode: auto → light → dark → auto.
 * @returns The mode now in effect.
 */
export const cycleTheme = (): ThemeMode => {
  const next = ORDER[(ORDER.indexOf(getTheme()) + 1) % ORDER.length] ?? 'auto';
  setTheme(next);
  return next;
};

/**
 * Reflects the current mode on a toggle element for styling and assistive
 * technology: `data-ai-theme-state` and `aria-pressed` when a mode is pinned.
 * @param element - The toggle.
 */
const reflect = (element: HTMLElement): void => {
  const pinned = element.getAttribute(THEME_TOGGLE_ATTRIBUTE);
  const mode = getTheme();
  element.setAttribute('data-ai-theme-state', mode);
  if (isMode(pinned)) {
    element.setAttribute('aria-pressed', String(pinned === mode));
  }
};

/**
 * Applies the stored choice and wires every `[data-ai-theme-toggle]` under
 * `root`. A toggle with an empty value cycles; a toggle whose value is a mode
 * pins that mode.
 * @param root - Subtree to scan. Defaults to the whole document.
 * @returns A function that removes the listeners.
 */
export const initTheme = (root: ParentNode = document): (() => void) => {
  setTheme(storedMode());
  const toggles = [...root.querySelectorAll<HTMLElement>(`[${THEME_TOGGLE_ATTRIBUTE}]`)];
  const onClick = (event: Event): void => {
    const target = event.currentTarget;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const pinned = target.getAttribute(THEME_TOGGLE_ATTRIBUTE);
    if (isMode(pinned)) {
      setTheme(pinned);
    } else {
      cycleTheme();
    }
  };
  const onChange = (): void => {
    for (const toggle of toggles) {
      reflect(toggle);
    }
  };
  for (const toggle of toggles) {
    toggle.addEventListener('click', onClick);
  }
  document.addEventListener('ai:themechange', onChange);
  onChange();
  return () => {
    for (const toggle of toggles) {
      toggle.removeEventListener('click', onClick);
    }
    document.removeEventListener('ai:themechange', onChange);
  };
};
