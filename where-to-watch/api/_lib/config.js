/**
 * Configuration + environment loading.
 *
 * This project has zero dependencies, so we parse `.env` ourselves for local
 * development. On Vercel, environment variables are already present in
 * `process.env` and the `.env` file simply won't exist.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(HERE, '..', '..');

/**
 * Minimal `.env` parser. Supports `KEY=value`, `export KEY=value`, comments,
 * blank lines, and single/double quoted values. Existing process.env values
 * always win, which matches dotenv's default behaviour.
 */
function loadEnvFile() {
  let raw;
  try {
    raw = readFileSync(join(PROJECT_ROOT, '.env'), 'utf8');
  } catch {
    return; // No .env file: entirely normal in production.
  }

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const withoutExport = trimmed.replace(/^export\s+/, '');
    const eq = withoutExport.indexOf('=');
    if (eq === -1) continue;

    const key = withoutExport.slice(0, eq).trim();
    if (!key || key in process.env) continue;

    let value = withoutExport.slice(eq + 1).trim();
    const quoted =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"));
    if (quoted && value.length >= 2) {
      value = value.slice(1, -1);
    } else {
      // Strip trailing inline comments from unquoted values.
      const hash = value.indexOf(' #');
      if (hash !== -1) value = value.slice(0, hash).trim();
    }

    process.env[key] = value;
  }
}

loadEnvFile();

const truthy = (v) => v === '1' || v === 'true' || v === 'yes';

export const config = {
  tmdbApiKey: process.env.TMDB_API_KEY || '',
  amazonTag: process.env.AMAZON_ASSOCIATE_TAG || '',
  beehiivApiKey: process.env.BEEHIIV_API_KEY || '',
  beehiivPublicationId: process.env.BEEHIIV_PUBLICATION_ID || '',
  defaultRegion: (process.env.DEFAULT_REGION || 'US').toUpperCase(),
  mock: truthy(process.env.MOCK),
  port: Number(process.env.PORT) || 3000,
};

/** True when we can actually serve title data (real key, or mock mode). */
export const canServeTitles = () => config.mock || Boolean(config.tmdbApiKey);

/** True when the newsletter form should be shown at all. */
export const emailEnabled = () =>
  config.mock || Boolean(config.beehiivApiKey && config.beehiivPublicationId);

/**
 * Decade windows. "all" spans both decades so the same deployment can serve
 * a 90s audience and a 2000s audience.
 */
export const DECADES = {
  '90s': { start: 1990, end: 1999, label: 'The 90s' },
  '00s': { start: 2000, end: 2009, label: 'The 2000s' },
  all: { start: 1990, end: 2009, label: 'The 90s & 2000s' },
};

export function resolveDecade(value) {
  return DECADES[value] ? value : '90s';
}

export const TITLE_TYPES = ['movie', 'tv'];

export function resolveType(value) {
  if (value === 'movie' || value === 'tv') return value;
  return 'all';
}

/** ISO 3166-1 alpha-2, loosely validated. */
export function resolveRegion(value) {
  if (typeof value === 'string' && /^[A-Za-z]{2}$/.test(value)) {
    return value.toUpperCase();
  }
  return config.defaultRegion;
}
