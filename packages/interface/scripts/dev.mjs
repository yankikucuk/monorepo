#!/usr/bin/env node
/**
 * Watch-and-serve for manual cross-browser checks, with no extra dependency:
 * rebuilds the stylesheet when anything under `src/` changes and serves
 * `demo/` plus `dist/` over HTTP.
 *
 *   pnpm --filter @april/interface dev   →  http://localhost:4400/
 */

import { watch } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { writeCss } from './build.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env['PORT'] ?? 4400);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
};

/**
 * Rebuilds the stylesheet, reporting instead of crashing on a Less error so
 * the watcher survives a half-typed rule.
 * @returns {Promise<void>} Resolves after the attempt.
 */
const rebuild = async () => {
  try {
    await writeCss();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
  }
};

const demoDir = join(root, 'demo');
const distDir = join(root, 'dist');

/**
 * Maps a request path to a file under `demo/` or `dist/`, refusing anything
 * that would resolve outside those two directories.
 * @param {string} url - Request URL path.
 * @returns {string | null} Absolute file path, or `null` when the request is malformed or escapes the served roots.
 */
const fileFor = url => {
  let path;
  try {
    path = decodeURIComponent(url.split('?')[0] ?? '/');
  } catch {
    return null;
  }
  // Pages link to ../dist/…, which the browser resolves to /dist/… at the server root.
  const [prefix, base] = path.startsWith('/dist/') ? ['/dist/', distDir] : ['/', demoDir];
  const candidate = resolve(base, path.slice(prefix.length) || 'index.html');
  return candidate.startsWith(base + sep) ? candidate : null;
};

await rebuild();
let timer = null;
watch(join(root, 'src'), { recursive: true }, () => {
  clearTimeout(timer);
  timer = setTimeout(rebuild, 50);
});

createServer(async (request, response) => {
  const file = fileFor(request.url ?? '/');
  try {
    if (file === null || !(await stat(file)).isFile()) {
      throw new Error('not a file');
    }
    response.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
}).listen(port, () => {
  console.log(`Serving demo at http://localhost:${port}/ (watching src/)`);
});
