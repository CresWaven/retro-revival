/**
 * GET /api/search?q=hocus+pocus&type=all&decade=90s&page=1
 *
 * Searches TMDB, then filters to the selected decade window so a nostalgia
 * search never surfaces a 2019 remake above the original.
 */

import { canServeTitles, resolveDecade, resolveType } from './_lib/config.js';
import { searchTitles } from './_lib/tmdb.js';
import { getQuery, requireMethod, sendError, sendJson, withErrorHandling } from './_lib/http.js';

const MAX_QUERY_LENGTH = 120;

export default withErrorHandling(async (req, res) => {
  if (!requireMethod(req, res, ['GET'])) return;

  if (!canServeTitles()) {
    return sendError(res, 503, 'This site is not configured yet: the TMDB API key is missing.');
  }

  const query = getQuery(req);
  const term = String(query.q || '').trim();

  if (!term) {
    return sendError(res, 400, 'Add a search term, for example: /api/search?q=jurassic+park');
  }
  if (term.length > MAX_QUERY_LENGTH) {
    return sendError(res, 400, `Search terms are limited to ${MAX_QUERY_LENGTH} characters.`);
  }

  const page = Math.min(Math.max(Number.parseInt(query.page, 10) || 1, 1), 500);

  const data = await searchTitles({
    query: term,
    type: resolveType(query.type),
    decade: resolveDecade(query.decade),
    page,
  });

  sendJson(res, 200, { query: term, ...data }, { cacheSeconds: 3600 });
});
