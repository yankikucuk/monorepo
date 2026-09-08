#!/usr/bin/env node
/**
 * Generates the package pages of the documentation site.
 *
 * Sources of truth stay where they are: `package.json` (name, version,
 * description, peer dependencies), `README.md` (features, usage, examples),
 * `CHANGELOG.md` (written by Changesets) and the root `CONTRIBUTING.md`. This
 * script turns them into VitePress pages under `docs/packages/<slug>/` and a
 * `packages.json` the site config and the home page read. API pages are
 * produced by TypeDoc (see `typedoc.json`); the two run together as
 * `pnpm docs:generate`.
 *
 * Everything written here is ignored by git and regenerated on every build.
 *
 *   node scripts/generate-docs.mjs          # write the pages
 *   node scripts/generate-docs.mjs --check  # only validate the inputs
 */

import { existsSync, globSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const docsDir = join(root, 'docs');
const REPO_URL = 'https://github.com/yankikucuk/monorepo';
const BRANCH = 'stage';
const SCOPE = '@april/';
const checkOnly = process.argv.includes('--check');

/**
 * @typedef {object} PackageInfo
 * @property {string} name - Full package name, e.g. `@april/cyberflake`.
 * @property {string} slug - Name without the scope, used in URLs.
 * @property {string} version - Current version from `package.json`.
 * @property {string} description - One-line description from `package.json`.
 * @property {string} dir - Package directory relative to the repository root.
 * @property {'product' | 'shared'} kind - Product library or shared configuration.
 * @property {Record<string, string>} peerDependencies - Declared peer dependencies.
 * @property {boolean} hasApi - Whether TypeDoc generates an API reference for it.
 * @property {string | null} apiLink - Site path of the API reference, from TypeDoc's sidebar.
 * @property {boolean} hasChangelog - Whether a `CHANGELOG.md` exists.
 */

/**
 * Reads the sidebar TypeDoc wrote and maps each package name to the site path
 * of its API reference. TypeDoc runs before this script (`pnpm docs:generate`).
 * @returns {Map<string, string>} Package name → API link.
 */
const readApiLinks = () => {
  const sidebarPath = join(docsDir, 'api', 'typedoc-sidebar.json');
  /** @type {Map<string, string>} */
  const links = new Map();
  if (!existsSync(sidebarPath)) {
    return links;
  }
  /** @type {{ text: string, link?: string, items?: { link?: string }[] }[]} */
  const sidebar = JSON.parse(readFileSync(sidebarPath, 'utf8'));
  for (const item of sidebar) {
    const link = item.link ?? item.items?.[0]?.link;
    if (typeof link === 'string') {
      links.set(item.text, link);
    }
  }
  return links;
};

/**
 * The package globs of `pnpm-workspace.yaml` (the `packages:` list).
 * @returns {string[]} Glob patterns relative to the repository root.
 */
const workspaceGlobs = () => {
  const lines = readFileSync(join(root, 'pnpm-workspace.yaml'), 'utf8').split('\n');
  const start = lines.findIndex(line => /^packages:\s*$/u.test(line));
  /** @type {string[]} */
  const globs = [];
  for (const line of lines.slice(start + 1)) {
    const match = /^\s+-\s+['"]?(?<pattern>[^'"#\s]+)/u.exec(line);
    if (!match?.groups) {
      break;
    }
    globs.push(match.groups.pattern);
  }
  return globs;
};

/**
 * Display rank of a package: product libraries before shared configuration.
 * @param {PackageInfo} pkg - The package.
 * @returns {number} Sort key.
 */
const rankOf = pkg => (pkg.kind === 'product' ? 0 : 1);

/**
 * Lists the workspace packages, product packages first, then alphabetically.
 * @returns {PackageInfo[]} Package metadata in display order.
 */
const listPackages = () => {
  /** @type {{ entryPoints: string[] }} */
  const typedoc = JSON.parse(readFileSync(join(root, 'typedoc.json'), 'utf8'));
  const apiDirs = new Set(typedoc.entryPoints.map(entry => resolve(root, entry)));
  const apiLinks = readApiLinks();
  const manifests = workspaceGlobs()
    .flatMap(pattern => globSync(`${pattern}/package.json`, { cwd: root }))
    .filter(path => !path.includes('node_modules'));

  return manifests
    .map(manifestPath => {
      const packageDir = resolve(root, dirname(manifestPath));
      /** @type {{ name: string, version: string, description?: string, peerDependencies?: Record<string, string> }} */
      const manifest = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'));
      const dir = relative(root, packageDir);
      return {
        name: manifest.name,
        slug: manifest.name.replace(SCOPE, ''),
        version: manifest.version,
        description: manifest.description ?? '',
        dir,
        kind: dir.startsWith('packages/shared/') ? 'shared' : 'product',
        peerDependencies: manifest.peerDependencies ?? {},
        hasApi: apiDirs.has(packageDir),
        apiLink: apiLinks.get(manifest.name) ?? null,
        hasChangelog: existsSync(join(packageDir, 'CHANGELOG.md')),
      };
    })
    .sort((left, right) => rankOf(left) - rankOf(right) || left.name.localeCompare(right.name));
};

/**
 * Rewrites the relative links of a Markdown file so they resolve on the site:
 * links into a package become that package's page, links to the root
 * `CONTRIBUTING.md` become the guide page, and anything else points at the
 * file on GitHub.
 * @param {string} markdown - Markdown source.
 * @param {string} fromDir - Absolute directory of the source file.
 * @param {readonly PackageInfo[]} packages - Known packages.
 * @returns {string} Markdown with rewritten links.
 */
const rewriteLinks = (markdown, fromDir, packages) =>
  markdown.replace(/\]\((?<target>[^)\s]+)(?<title>(?:\s+"[^"]*")?)\)/gu, (...args) => {
    /** @type {{ target: string, title: string }} */
    const { target, title } = args.at(-1);
    const [match] = args;
    if (/^(?:[a-z][a-z\d+.-]*:|#|\/)/iu.test(target)) {
      return match;
    }
    const [path = '', anchor = ''] = target.split('#');
    const absolute = resolve(fromDir, path);
    const suffix = anchor ? `#${anchor}` : '';
    const pkg = packages.find(candidate => {
      const packageDir = resolve(root, candidate.dir);
      return absolute === packageDir || absolute === join(packageDir, 'README.md');
    });
    if (pkg) {
      return `](/packages/${pkg.slug}/${suffix}${title})`;
    }
    if (absolute === join(root, 'CONTRIBUTING.md')) {
      return `](/guide/contributing${suffix}${title})`;
    }
    if (absolute === join(root, 'README.md')) {
      return `](/${suffix}${title})`;
    }
    return `](${REPO_URL}/blob/${BRANCH}/${relative(root, absolute)}${suffix}${title})`;
  });

/**
 * Escapes Vue interpolation delimiters outside code, where VitePress would
 * otherwise try to evaluate them.
 * @param {string} markdown - Markdown source.
 * @returns {string} Markdown safe for VitePress.
 */
const escapeInterpolation = markdown =>
  markdown
    .split(/(?<code>```[\s\S]*?```|`[^`\n]*`)/u)
    .map((segment, index) => (index % 2 === 1 ? segment : segment.replaceAll('{{', '&#123;&#123;')))
    .join('');

/**
 * Serializes page frontmatter.
 * @param {Record<string, string>} fields - Frontmatter fields.
 * @returns {string} The frontmatter block.
 */
const frontmatter = fields =>
  ['---', ...Object.entries(fields).map(([key, value]) => `${key}: ${JSON.stringify(value)}`), '---', ''].join('\n');

/**
 * Splits a README into the text before its first `##` heading and the rest,
 * dropping the leading `#` title, a table-of-contents section (the site has
 * its own outline), a trailing horizontal rule in the intro, and the License
 * section. Sections are split on `##` headings, so a `## License` in the
 * middle of a README is removed too.
 * @param {string} readme - README source.
 * @returns {{ intro: string, rest: string, hasInstall: boolean }} The two halves and whether the README documents installation itself.
 */
const splitReadme = readme => {
  const sections = readme
    .replace(/^# .*\n+/u, '')
    .split(/^(?=## )/mu)
    .filter(section => !/^## (?:License|Contents|Table of contents)\b/u.test(section));
  const [intro = '', ...rest] = sections;
  const introLines = intro.trimEnd().split('\n');
  if (/^-{3,}$/u.test(introLines.at(-1) ?? '')) {
    introLines.pop();
  }
  return {
    intro: introLines.join('\n').trim(),
    rest: rest.join(''),
    hasInstall: rest.some(section => /^## (?:Install|Installation|Getting started|Setup|Quick start)\b/u.test(section)),
  };
};

/**
 * Renders the install snippet of a package page.
 * @param {PackageInfo} pkg - The package.
 * @returns {string} Markdown.
 */
const installSection = pkg => {
  const field = pkg.kind === 'product' ? 'dependencies' : 'devDependencies';
  return [
    '## Install',
    '',
    '```json [package.json]',
    JSON.stringify({ [field]: { [pkg.name]: 'workspace:*' } }, null, 2),
    '```',
    '',
    '::: info Internal package',
    'April packages are private and consumed inside this workspace through the `workspace:*` protocol; nothing is published to a registry.',
    ':::',
    '',
  ].join('\n');
};

/**
 * Renders the header lines under the title: quick links and peer dependencies.
 * @param {PackageInfo} pkg - The package.
 * @returns {string} Markdown.
 */
const headerLines = pkg => {
  const links = [
    pkg.apiLink ? `[API reference](${pkg.apiLink})` : '',
    pkg.hasChangelog ? `[Changelog](/packages/${pkg.slug}/changelog)` : '',
    `[Source](${REPO_URL}/tree/${BRANCH}/${pkg.dir})`,
  ]
    .filter(Boolean)
    .join(' · ');
  const peers = Object.entries(pkg.peerDependencies)
    .map(([name, range]) => `\`${name}\` ${range}`)
    .join(', ');
  return [links, peers ? `Peer dependencies: ${peers}` : ''].filter(Boolean).join('\n\n');
};

/**
 * Writes the overview page of a package.
 * @param {PackageInfo} pkg - The package.
 * @param {readonly PackageInfo[]} packages - Every package, for link rewriting.
 * @returns {void} Nothing.
 */
const writeOverview = (pkg, packages) => {
  const packageDir = join(root, pkg.dir);
  const readme = readFileSync(join(packageDir, 'README.md'), 'utf8');
  const { intro, rest, hasInstall } = splitReadme(escapeInterpolation(rewriteLinks(readme, packageDir, packages)));
  const page = [
    frontmatter({ title: pkg.name, description: pkg.description, source: `${pkg.dir}/README.md` }),
    `# ${pkg.name} <Badge type="tip" text="v${pkg.version}" />`,
    '',
    headerLines(pkg),
    '',
    intro,
    '',
    hasInstall ? '' : installSection(pkg),
    rest,
  ].join('\n');
  writeFileSync(join(docsDir, 'packages', pkg.slug, 'index.md'), page);
};

/**
 * Writes the changelog page of a package.
 * @param {PackageInfo} pkg - The package.
 * @param {readonly PackageInfo[]} packages - Every package, for link rewriting.
 * @returns {void} Nothing.
 */
const writeChangelog = (pkg, packages) => {
  const packageDir = join(root, pkg.dir);
  const body = pkg.hasChangelog
    ? escapeInterpolation(
        rewriteLinks(readFileSync(join(packageDir, 'CHANGELOG.md'), 'utf8'), packageDir, packages)
      ).replace(/^# .*\n+/u, '')
    : '_No release has been recorded for this package yet._\n';
  const page = [
    frontmatter({ title: `Changelog · ${pkg.name}`, source: `${pkg.dir}/CHANGELOG.md` }),
    `# Changelog <Badge type="info" text="${pkg.name}" />`,
    '',
    'Releases are recorded by [Changesets](https://github.com/changesets/changesets); every entry links the pull request it came from.',
    '',
    body,
  ].join('\n');
  writeFileSync(join(docsDir, 'packages', pkg.slug, 'changelog.md'), page);
};

/**
 * Writes the contributing guide from the root `CONTRIBUTING.md`.
 * @param {readonly PackageInfo[]} packages - Every package, for link rewriting.
 * @returns {void} Nothing.
 */
const writeContributing = packages => {
  const source = readFileSync(join(root, 'CONTRIBUTING.md'), 'utf8');
  const body = escapeInterpolation(rewriteLinks(source, root, packages));
  writeFileSync(join(docsDir, 'guide', 'contributing.md'), frontmatter({ source: 'CONTRIBUTING.md' }) + body);
};

const packages = listPackages();
const missing = packages.filter(pkg => !existsSync(join(root, pkg.dir, 'README.md')));
if (missing.length > 0) {
  console.error(`Every package needs a README.md; missing in: ${missing.map(pkg => pkg.dir).join(', ')}`);
  process.exit(1);
}
if (checkOnly) {
  console.log(`${packages.length} packages ready for documentation.`);
  process.exit(0);
}

rmSync(join(docsDir, 'packages'), { recursive: true, force: true });
for (const pkg of packages) {
  mkdirSync(join(docsDir, 'packages', pkg.slug), { recursive: true });
  writeOverview(pkg, packages);
  writeChangelog(pkg, packages);
}
mkdirSync(join(docsDir, 'guide'), { recursive: true });
writeContributing(packages);
mkdirSync(join(docsDir, '.vitepress', 'generated'), { recursive: true });
writeFileSync(join(docsDir, '.vitepress', 'generated', 'packages.json'), `${JSON.stringify(packages, null, 2)}\n`);
console.log(`Generated pages for ${packages.length} packages.`);
