/**
 * TMDB client.
 *
 * Why TMDB: it is free, it covers movies and TV, and its `watch/providers`
 * endpoint exposes streaming availability sourced from JustWatch. That means one
 * free API key gives us posters, metadata, and "where to watch" in a single
 * integration.
 *
 * Attribution is required by TMDB's terms and is rendered in the UI footer.
 */

import { config, DECADES } from './config.js';
import { withCache } from './cache.js';
import * as mock from './mock.js';

const API_BASE = 'https://api.themoviedb.org/3';
const IMAGE_BASE = 'https://image.tmdb.org/t/p';
const REQUEST_TIMEOUT_MS = 8000;

// Availability shifts over days, not minutes. Metadata basically never changes.
const TTL_SEARCH = 60 * 60 * 1000; // 1 hour
const TTL_DETAIL = 6 * 60 * 60 * 1000; // 6 hours
const TTL_DISCOVER = 12 * 60 * 60 * 1000; // 12 hours

/** Build a full image URL, or null when TMDB has no artwork. */
function img(path, size) {
  return path ? `${IMAGE_BASE}/${size}${path}` : null;
}

function yearOf(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const year = Number.parseInt(dateStr.slice(0, 4), 10);
  return Number.isFinite(year) ? year : null;
}

class TmdbError extends Error {
  constructor(message, statusCode, publicMessage) {
    super(message);
    this.name = 'TmdbError';
    this.statusCode = statusCode;
    this.publicMessage = publicMessage || message;
  }
}

async function tmdbFetch(path, params = {}, ttlMs = TTL_SEARCH) {
  if (!config.tmdbApiKey) {
    throw new TmdbError(
      'TMDB_API_KEY is not configured',
      500,
      'This site is not configured yet: the TMDB API key is missing.'
    );
  }

  const url = new URL(API_BASE + path);
  url.searchParams.set('api_key', config.tmdbApiKey);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }

  // Cache key deliberately excludes the API key.
  const cacheKey = `tmdb:${path}:${JSON.stringify(params)}`;

  return withCache(cacheKey, ttlMs, async () => {
    let response;
    try {
      response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (err) {
      const timedOut = err.name === 'TimeoutError' || err.name === 'AbortError';
      throw new TmdbError(
        `TMDB request failed: ${err.message}`,
        504,
        timedOut
          ? 'The movie database took too long to respond. Please try again.'
          : 'Could not reach the movie database. Please try again.'
      );
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => '');

      if (response.status === 401) {
        throw new TmdbError(
          `TMDB rejected the API key: ${detail}`,
          500,
          'This site is not configured correctly: the TMDB API key was rejected.'
        );
      }
      if (response.status === 404) {
        throw new TmdbError('Not found in TMDB', 404, 'We could not find that title.');
      }
      if (response.status === 429) {
        throw new TmdbError(
          'TMDB rate limit hit',
          429,
          'Too many lookups right now. Give it a few seconds and try again.'
        );
      }
      throw new TmdbError(
        `TMDB error ${response.status}: ${detail}`,
        502,
        'The movie database returned an error. Please try again.'
      );
    }

    return response.json();
  });
}

/* --------------------------------------------------------------------------
 * Normalizers: collapse TMDB's movie/tv shape differences into one shape so
 * the frontend never has to branch on media type.
 * -------------------------------------------------------------------------- */

function normalizeSummary(raw, type) {
  const isMovie = type === 'movie';
  return {
    id: raw.id,
    type,
    title: (isMovie ? raw.title || raw.original_title : raw.name || raw.original_name) || 'Untitled',
    year: yearOf(isMovie ? raw.release_date : raw.first_air_date),
    overview: raw.overview || '',
    poster: img(raw.poster_path, 'w342'),
    backdrop: img(raw.backdrop_path, 'w780'),
    rating: typeof raw.vote_average === 'number' ? Math.round(raw.vote_average * 10) / 10 : null,
    votes: raw.vote_count ?? 0,
    popularity: raw.popularity ?? 0,
  };
}

function normalizeDetail(raw, type) {
  const base = normalizeSummary(raw, type);
  return {
    ...base,
    tagline: raw.tagline || '',
    genres: Array.isArray(raw.genres) ? raw.genres.map((g) => g.name).filter(Boolean) : [],
    runtime: type === 'movie' ? raw.runtime || null : null,
    seasons: type === 'tv' ? raw.number_of_seasons || null : null,
    episodes: type === 'tv' ? raw.number_of_episodes || null : null,
    tmdbUrl: `https://www.themoviedb.org/${type}/${raw.id}`,
  };
}

function normalizeProviderList(list) {
  if (!Array.isArray(list)) return [];
  return list
    .slice()
    .sort((a, b) => (a.display_priority ?? 999) - (b.display_priority ?? 999))
    .map((p) => ({
      id: p.provider_id,
      name: p.provider_name,
      logo: img(p.logo_path, 'w92'),
    }));
}

function normalizeProviders(rawProviders, region) {
  const forRegion = rawProviders?.results?.[region];

  if (!forRegion) {
    return { region, link: null, stream: [], free: [], ads: [], rent: [], buy: [], available: false };
  }

  const result = {
    region,
    // JustWatch deep link supplied by TMDB for this title + region.
    link: forRegion.link || null,
    stream: normalizeProviderList(forRegion.flatrate),
    free: normalizeProviderList(forRegion.free),
    ads: normalizeProviderList(forRegion.ads),
    rent: normalizeProviderList(forRegion.rent),
    buy: normalizeProviderList(forRegion.buy),
  };

  result.available =
    result.stream.length > 0 ||
    result.free.length > 0 ||
    result.ads.length > 0 ||
    result.rent.length > 0 ||
    result.buy.length > 0;

  return result;
}

/** Keep only titles released inside the decade window. */
function withinDecade(items, decadeKey) {
  const window = DECADES[decadeKey] || DECADES.all;
  return items.filter((item) => item.year !== null && item.year >= window.start && item.year <= window.end);
}

/* --------------------------------------------------------------------------
 * Public API
 * -------------------------------------------------------------------------- */

export async function searchTitles({ query, type = 'all', decade = '90s', page = 1 }) {
  if (config.mock) return mock.searchTitles({ query, type, decade, page });

  const types = type === 'all' ? ['movie', 'tv'] : [type];

  const responses = await Promise.all(
    types.map((t) =>
      tmdbFetch(
        `/search/${t}`,
        { query, page, include_adult: 'false', language: 'en-US' },
        TTL_SEARCH
      ).then((data) => ({ t, data }))
    )
  );

  let results = [];
  let totalResults = 0;
  let totalPages = 1;

  for (const { t, data } of responses) {
    results = results.concat((data.results || []).map((r) => normalizeSummary(r, t)));
    totalResults += data.total_results || 0;
    totalPages = Math.max(totalPages, data.total_pages || 1);
  }

  const filtered = withinDecade(results, decade).sort((a, b) => b.popularity - a.popularity);

  return {
    results: filtered,
    page: Number(page),
    totalPages,
    // How many raw hits we dropped for being outside the decade. The UI uses
    // this to explain an empty result set instead of just showing nothing.
    filteredOut: results.length - filtered.length,
    totalResults,
  };
}

export async function discoverTitles({ type = 'movie', decade = '90s', page = 1 }) {
  if (config.mock) return mock.discoverTitles({ type, decade, page });

  const window = DECADES[decade] || DECADES.all;
  const from = `${window.start}-01-01`;
  const to = `${window.end}-12-31`;
  const mediaType = type === 'tv' ? 'tv' : 'movie';

  const dateParams =
    mediaType === 'movie'
      ? { 'primary_release_date.gte': from, 'primary_release_date.lte': to }
      : { 'first_air_date.gte': from, 'first_air_date.lte': to };

  const data = await tmdbFetch(
    `/discover/${mediaType}`,
    {
      ...dateParams,
      sort_by: 'popularity.desc',
      // Filters out obscure entries with almost no ratings, which keeps the
      // browse rows genuinely recognisable rather than technically correct.
      'vote_count.gte': mediaType === 'movie' ? 200 : 50,
      include_adult: 'false',
      language: 'en-US',
      page,
    },
    TTL_DISCOVER
  );

  const results = withinDecade(
    (data.results || []).map((r) => normalizeSummary(r, mediaType)),
    decade
  );

  return {
    results,
    page: Number(page),
    totalPages: Math.min(data.total_pages || 1, 500),
    totalResults: data.total_results || 0,
  };
}

export async function getTitleDetail({ type, id, region }) {
  if (config.mock) return mock.getTitleDetail({ type, id, region });

  const mediaType = type === 'tv' ? 'tv' : 'movie';

  // One request for metadata + availability.
  const data = await tmdbFetch(
    `/${mediaType}/${id}`,
    { language: 'en-US', append_to_response: 'watch/providers' },
    TTL_DETAIL
  );

  return {
    ...normalizeDetail(data, mediaType),
    providers: normalizeProviders(data['watch/providers'], region),
  };
}

/**
 * Pick a random well-known title from the decade. Powers the "Surprise me"
 * button, which doubles as a content-idea generator.
 */
export async function getRandomTitle({ decade = '90s', type = 'movie', region }) {
  if (config.mock) return mock.getRandomTitle({ decade, type, region });

  const mediaType = type === 'tv' ? 'tv' : 'movie';
  // Stay in the first few pages so results remain recognisable.
  const page = 1 + Math.floor(Math.random() * 5);

  const { results } = await discoverTitles({ type: mediaType, decade, page });
  if (!results.length) {
    throw new TmdbError('No titles found', 404, 'Could not find a random pick. Try again.');
  }

  const pick = results[Math.floor(Math.random() * results.length)];
  return getTitleDetail({ type: pick.type, id: pick.id, region });
}
