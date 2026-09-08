/**
 * Public behaviour API of `@april/interface`.
 *
 * The stylesheet is the product; this layer exists only for the components
 * that need state (modal, navbar, menubar). Every initialiser returns a
 * teardown function so plain HTML, React effects and Vue lifecycle hooks share
 * one contract.
 * @packageDocumentation
 */

/** Data attribute that marks an element for {@link initAll}. */
export const BINDING_ATTRIBUTE = 'data-ai-component';

/** Teardown handle returned by every initialiser. */
export type Teardown = () => void;

/**
 * Binds every element carrying `data-ai-component` under `root` and returns
 * one function that tears all of them down.
 *
 * No component ships behaviour yet; the function already implements the
 * lifecycle contract so consumers can wire it up once and receive the
 * components as they land.
 * @param root - Subtree to scan. Defaults to the whole document.
 * @returns A function that removes every binding made by this call.
 */
export const initAll = (root: ParentNode = document): Teardown => {
  const teardowns: Teardown[] = [];
  for (const element of root.querySelectorAll<HTMLElement>(`[${BINDING_ATTRIBUTE}]`)) {
    element.setAttribute('data-ai-bound', '');
    teardowns.push(() => {
      element.removeAttribute('data-ai-bound');
    });
  }
  return () => {
    for (const teardown of teardowns.splice(0)) {
      teardown();
    }
  };
};
