#!/usr/bin/env node
/**
 * Compiles `src/index.less` into `dist/interface.css` and `dist/interface.min.css`.
 *
 * Less resolves variables, mixins and cascade-layer nesting; Lightning CSS
 * then lowers the output to the `browserslist` floor in package.json (adding
 * `-webkit-backdrop-filter` and friends) and produces the minified build.
 * The TypeScript behaviour layer is emitted separately by `tsc`.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import browserslist from 'browserslist';
import less from 'less';
import { browserslistToTargets, transform } from 'lightningcss';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const entry = join(root, 'src', 'index.less');
const outDir = join(root, 'dist');

/**
 * Renders the Less entry and post-processes it with Lightning CSS.
 * @returns {Promise<{ css: string, minified: string }>} Readable and minified stylesheets.
 */
export const buildCss = async () => {
  /** @type {{ browserslist: string[] }} */
  const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  const targets = browserslistToTargets(browserslist(manifest.browserslist));
  const rendered = await less.render(await readFile(entry, 'utf8'), { filename: entry, math: 'parens-division' });
  const code = Buffer.from(rendered.css);
  const css = transform({ filename: 'interface.css', code, targets, minify: false }).code.toString();
  const minified = transform({ filename: 'interface.min.css', code, targets, minify: true }).code.toString();
  return { css, minified };
};

/**
 * Writes both stylesheets to `dist/`.
 * @returns {Promise<void>} Resolves when the files are on disk.
 */
export const writeCss = async () => {
  const { css, minified } = await buildCss();
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, 'interface.css'), css);
  await writeFile(join(outDir, 'interface.min.css'), minified);
  console.log(`interface.css ${css.length} bytes, interface.min.css ${minified.length} bytes`);
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await writeCss();
}
