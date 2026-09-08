#!/usr/bin/env node
/**
 * Compiles the stylesheets:
 *
 * - `src/index.less` → `dist/interface.css` and `dist/interface.min.css`
 * - `src/icons.less` → `dist/icons.css`, `dist/icons.min.css` and `dist/webfonts/`
 *   (Font Awesome Pro, solid style; opt-in because of its size)
 *
 * Less resolves variables, mixins and cascade-layer nesting; Lightning CSS
 * then lowers the output to the `browserslist` floor in package.json and
 * produces the minified builds. The TypeScript behaviour layer is emitted
 * separately by `tsc`.
 */

import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import browserslist from 'browserslist';
import less from 'less';
import { browserslistToTargets, transform } from 'lightningcss';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'dist');
const fontAwesome = join(root, 'node_modules', '@fortawesome', 'fontawesome-pro');
/** Webfonts the icon stylesheet references; only the solid style ships. */
const WEBFONTS = ['fa-solid-900.woff2'];

/**
 * Renders one Less entry and post-processes it with Lightning CSS.
 * @param {string} entry - Absolute path of the Less entry file.
 * @param {string} name - Output name without extension (`interface`, `icons`).
 * @param {(css: string) => string} [rewrite] - Adjusts the rendered CSS before Lightning CSS.
 * @returns {Promise<{ css: string, minified: string }>} Readable and minified stylesheets.
 */
export const buildCss = async (entry, name, rewrite = css => css) => {
  /** @type {{ browserslist: string[] }} */
  const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  const targets = browserslistToTargets(browserslist(manifest.browserslist));
  const rendered = await less.render(await readFile(entry, 'utf8'), { filename: entry, math: 'parens-division' });
  const code = Buffer.from(rewrite(rendered.css));
  const css = transform({ filename: `${name}.css`, code, targets, minify: false }).code.toString();
  const minified = transform({ filename: `${name}.min.css`, code, targets, minify: true }).code.toString();
  return { css, minified };
};

/**
 * Writes one stylesheet pair to `dist/`.
 * @param {string} name - Output name without extension.
 * @param {{ css: string, minified: string }} output - Rendered stylesheets.
 * @returns {Promise<void>} Resolves when both files are on disk.
 */
const writePair = async (name, { css, minified }) => {
  await writeFile(join(outDir, `${name}.css`), css);
  await writeFile(join(outDir, `${name}.min.css`), minified);
  console.log(`${name}.css ${css.length} bytes, ${name}.min.css ${minified.length} bytes`);
};

/**
 * Builds the framework stylesheet, the icon stylesheet and copies the webfonts.
 * @returns {Promise<void>} Resolves when everything is on disk.
 */
export const writeCss = async () => {
  await mkdir(join(outDir, 'webfonts'), { recursive: true });
  await writePair('interface', await buildCss(join(root, 'src', 'index.less'), 'interface'));
  await writePair(
    'icons',
    await buildCss(join(root, 'src', 'icons.less'), 'icons', css => css.replaceAll('../webfonts/', './webfonts/'))
  );
  await Promise.all(
    WEBFONTS.map(font => copyFile(join(fontAwesome, 'webfonts', font), join(outDir, 'webfonts', font)))
  );
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await writeCss();
}
