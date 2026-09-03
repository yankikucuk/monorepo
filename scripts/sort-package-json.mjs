#!/usr/bin/env node
/**
 * Sorts package.json files into sort-package-json's canonical key order while
 * preserving the original, logical order of the `scripts` field.
 *
 * sort-package-json alphabetizes `scripts`, which loses the intentional
 * dev → build → test → release grouping we keep. This wrapper restores that
 * order after sorting every other key.
 *
 * Usage:
 *   node scripts/sort-package-json.mjs [--check] [files...]
 *
 * With no file arguments it processes the root and every workspace package.
 */

import { globSync, readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';

import { sortPackageJson } from 'sort-package-json';

const DEFAULT_PATTERNS = ['package.json', 'packages/*/package.json', 'packages/shared/*/package.json'];

const args = process.argv.slice(2);
const check = args.includes('--check');
const fileArgs = args.filter(arg => arg !== '--check');

const files = fileArgs.length > 0 ? fileArgs : DEFAULT_PATTERNS.flatMap(pattern => globSync(pattern));

let unsorted = 0;

for (const file of files) {
  const original = readFileSync(file, 'utf8');
  const parsed = JSON.parse(original);
  const scriptsOrder = parsed.scripts ? Object.keys(parsed.scripts) : null;

  const sorted = sortPackageJson(parsed);

  if (scriptsOrder) {
    const preserved = {};
    for (const key of scriptsOrder) {
      preserved[key] = sorted.scripts[key];
    }
    sorted.scripts = preserved;
  }

  const output = `${JSON.stringify(sorted, null, 2)}\n`;

  if (output !== original) {
    unsorted += 1;

    if (check) {
      console.error(`✗ ${file} is not sorted`);
    } else {
      writeFileSync(file, output);
      console.log(`✓ sorted ${file}`);
    }
  }
}

if (check && unsorted > 0) {
  console.error(`${unsorted} package.json file(s) are not sorted. Run "pnpm sort:pkg".`);
  process.exit(1);
}

if (unsorted === 0) {
  console.log('All package.json files are already sorted.');
}
