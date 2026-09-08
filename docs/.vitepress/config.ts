import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitepress';

import type { DefaultTheme } from 'vitepress';

/** One entry of the generated `packages.json` (see `scripts/generate-docs.mjs`). */
interface PackageInfo {
  readonly name: string;
  readonly slug: string;
  readonly version: string;
  readonly description: string;
  readonly kind: 'product' | 'shared';
  readonly hasApi: boolean;
  readonly apiLink: string | null;
  readonly hasChangelog: boolean;
}

const REPO_URL = 'https://github.com/yankikucuk/monorepo';
const here = fileURLToPath(new URL('.', import.meta.url));

/**
 * Reads a generated JSON file, falling back when the generator has not run.
 * @param path - Absolute path of the file.
 * @param fallback - Value to use when the file is missing.
 * @returns The parsed file or the fallback.
 */
const readJson = <T>(path: string, fallback: T): T =>
  existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as T) : fallback;

const packages = readJson<PackageInfo[]>(`${here}generated/packages.json`, []);
const apiSidebar = readJson<DefaultTheme.SidebarItem[]>(`${here}../api/typedoc-sidebar.json`, []);

const packageSidebar: DefaultTheme.SidebarItem[] = packages.map(pkg => ({
  text: pkg.name,
  collapsed: false,
  items: [
    { text: 'Overview', link: `/packages/${pkg.slug}/` },
    ...(pkg.apiLink ? [{ text: 'API reference', link: pkg.apiLink }] : []),
    { text: 'Changelog', link: `/packages/${pkg.slug}/changelog` },
  ],
}));

const guideSidebar: DefaultTheme.SidebarItem[] = [
  {
    text: 'Guide',
    items: [
      { text: 'Getting started', link: '/guide/getting-started' },
      { text: 'Contributing', link: '/guide/contributing' },
    ],
  },
];

export default defineConfig({
  title: 'April',
  description: 'Strict, type-safe TypeScript packages: ID generation, import sorting and shared configuration.',
  base: '/monorepo/',
  lang: 'en-US',
  lastUpdated: true,
  cleanUrls: true,
  srcExclude: ['specs/**'],
  head: [['link', { rel: 'icon', type: 'image/svg+xml', href: '/monorepo/logo.svg' }]],
  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: 'Guide', link: '/guide/getting-started', activeMatch: '/guide/' },
      {
        text: 'Packages',
        activeMatch: '/packages/',
        items: packages.map(pkg => ({ text: pkg.name, link: `/packages/${pkg.slug}/` })),
      },
      {
        text: 'API',
        activeMatch: '/api/',
        items: packages.flatMap(pkg => (pkg.apiLink ? [{ text: pkg.name, link: pkg.apiLink }] : [])),
      },
    ],
    sidebar: {
      '/guide/': guideSidebar,
      '/packages/': [{ text: 'Packages', items: packageSidebar }, ...guideSidebar],
      '/api/': apiSidebar,
    },
    socialLinks: [{ icon: 'github', link: REPO_URL }],
    search: { provider: 'local' },
    editLink: {
      // Serialized into the client bundle: it must not close over module-level values.
      pattern: ({ filePath, frontmatter }) => {
        const source = typeof frontmatter['source'] === 'string' ? frontmatter['source'] : `docs/${filePath}`;
        return `https://github.com/yankikucuk/monorepo/edit/stage/${source}`;
      },
      text: 'Edit this page on GitHub',
    },
    outline: { level: [2, 3] },
    footer: {
      message: 'Released under the Apache-2.0 License.',
      copyright: 'Copyright © Yankı Küçük',
    },
  },
});
