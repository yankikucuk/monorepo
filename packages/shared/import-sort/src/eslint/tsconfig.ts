/**
 * Turns the `paths` aliases of a `tsconfig.json` into `internal` patterns.
 *
 * A project that maps `@/*` or `~/lib/*` onto its own source tree usually wants
 * those imports in the `internal` group. Reading them from the TypeScript
 * configuration keeps the ESLint options from drifting away from the compiler
 * options.
 *
 * TypeScript is loaded lazily and only when the option is used, so it stays an
 * optional peer dependency: JavaScript-only projects never pay for it. Results
 * are cached per configuration file for the lifetime of the process, so a lint
 * run reads each `tsconfig.json` once.
 * @packageDocumentation
 */

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

/** Where to look for the TypeScript configuration. */
export interface TsconfigOption {
  /** File name to look for. Default: `'tsconfig.json'`. */
  readonly filename?: string;
  /** Directory the search starts from. Default: the directory of the linted file. */
  readonly rootDir?: string;
}

/** The subset of the TypeScript API this module needs. */
interface TypeScriptApi {
  readonly findConfigFile: (search: string, exists: (path: string) => boolean, name?: string) => string | undefined;
  readonly sys: { readonly fileExists: (path: string) => boolean };
  readonly readConfigFile: (path: string, read: (path: string) => string) => { config?: unknown; error?: unknown };
  readonly parseJsonConfigFileContent: (
    config: unknown,
    host: unknown,
    basePath: string
  ) => { options: { paths?: Readonly<Record<string, readonly string[]>> } };
}

/** Regular-expression metacharacters that must be escaped in a literal. */
const META_CHARACTERS = /[$()*+.?[\]^{|}\\]/gu;

const requireFrom = createRequire(import.meta.url);
/** Compiled patterns per resolved config file. */
const cache = new Map<string, readonly string[]>();
/** Resolved config path (or `null`) per search directory and file name, so the upward walk runs once per directory. */
const lookups = new Map<string, string | null>();
/** `null` once TypeScript has been looked up and found missing. */
let typescript: TypeScriptApi | null = null;
let loaded = false;

/**
 * Escapes every regular-expression metacharacter of a literal string.
 * @param {string} value - The literal.
 * @returns {string} A pattern matching exactly `value`.
 */
const escapeRegExp = (value: string): string => value.replace(META_CHARACTERS, String.raw`\$&`);

/**
 * Converts a `paths` key (`@app/*`, `~utils`, `@app/*.js`) into an anchored
 * pattern: the wildcard matches anything, everything else matches literally.
 * A bare `*` alias (a catch-all fallback) is skipped — it would turn every
 * specifier into an internal import.
 * @param {string} alias - The alias as written in `tsconfig.json`.
 * @returns {string | null} A regular-expression source, or `null` for a catch-all alias.
 */
const aliasToPattern = (alias: string): string | null => {
  const parts = alias.split('*');
  if (parts.length > 1 && parts[0] === '') {
    return null;
  }
  return `^${parts.map(escapeRegExp).join('.*')}$`;
};

/**
 * Loads TypeScript once, or returns `null` when it is not installed.
 * @returns {TypeScriptApi | null} The TypeScript API.
 */
const loadTypeScript = (): TypeScriptApi | null => {
  if (!loaded) {
    loaded = true;
    try {
      typescript = requireFrom('typescript') as TypeScriptApi;
    } catch {
      typescript = null;
    }
  }
  return typescript;
};

/**
 * Finds the configuration file that applies to a search directory, caching the
 * upward walk per directory and file name.
 * @param {TypeScriptApi} api - The TypeScript API.
 * @param {TsconfigOption} option - Where to look.
 * @param {string} filename - Path of the file being linted.
 * @returns {string | null} The resolved configuration path, or `null` when there is none.
 */
const findConfig = (api: TypeScriptApi, option: TsconfigOption, filename: string): string | null => {
  const searchFrom = typeof option.rootDir === 'string' ? resolve(option.rootDir) : dirname(resolve(filename));
  const key = `${option.filename ?? 'tsconfig.json'}\0${searchFrom}`;
  if (!lookups.has(key)) {
    lookups.set(key, api.findConfigFile(searchFrom, api.sys.fileExists, option.filename) ?? null);
  }
  return lookups.get(key) ?? null;
};

/**
 * Reads and parses one configuration file into `internalPattern` sources,
 * caching the result per file.
 * @param {TypeScriptApi} api - The TypeScript API.
 * @param {string} configPath - Resolved path of the configuration file.
 * @returns {readonly string[]} Regular-expression sources for `internalPattern`.
 */
const patternsOf = (api: TypeScriptApi, configPath: string): readonly string[] => {
  const cached = cache.get(configPath);
  if (cached) {
    return cached;
  }

  const { config, error } = api.readConfigFile(configPath, path => readFileSync(path, 'utf8'));
  // A malformed tsconfig.json is tsc's problem to report; the option is a convenience.
  // Only `paths` is needed, so the host never has to enumerate the project's files.
  const host = { ...api.sys, readDirectory: (): string[] => [] };
  const parsed = error ? null : api.parseJsonConfigFileContent(config ?? {}, host, dirname(configPath));
  const patterns = Object.keys(parsed?.options.paths ?? {}).flatMap(alias => {
    const pattern = aliasToPattern(alias);
    return pattern === null ? [] : [pattern];
  });

  cache.set(configPath, patterns);
  return patterns;
};

/**
 * Reads the `paths` aliases that apply to a linted file and returns them as
 * `internalPattern` sources.
 *
 * A missing or malformed configuration file — or a TypeScript that is not
 * installed — yields no patterns rather than an error: the option is a
 * convenience, not a requirement. Both the upward search for the file and
 * the parsed result are cached for the lifetime of the process.
 * @param {TsconfigOption} option - Where to look.
 * @param {string} filename - Path of the file being linted.
 * @returns {readonly string[]} Regular-expression sources for `internalPattern`.
 */
export const internalPatternsFromTsconfig = (option: TsconfigOption, filename: string): readonly string[] => {
  const api = loadTypeScript();
  if (!api) {
    return [];
  }
  const configPath = findConfig(api, option, filename);
  return configPath === null ? [] : patternsOf(api, configPath);
};
