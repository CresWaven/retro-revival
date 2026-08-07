/**
 * GET /api/discover?type=movie&decade=90s&page=1
 *
 * Powers the default browse rows shown before anyone searches, so the page is
 * never empty on arrival.
 */

import { canServeTitles, resolveDecade } from './_lib/config.js';
import { discoverTitles } from './_lib/tmdb.js';
import { getQuery, requireMethod, sendError, sendJson, withErrorHandling } from './_lib/http.js';

export default withErrorHandling(async (req, res) => {
  if (!requireMethod(req, res, ['GET'])) return;

  if (!canServeTitles()) {
    return sendError(res, 503, 'This site is not configured yet: the TMDB API key is missing.');
  }

  const query = getQuery(req);
  const page = Math.min(Math.max(Number.parseInt(query.page, 10) || 1, 1), 500);

  const data = await discoverTitles({
    // Browse rows are always a single media type; "all" is not meaningful here.
    type: query.type === 'tv' ? 'tv' : 'movie',
    decade: resolveDecade(query.decade),
    page,
  });

  sendJson(res, 200, data, { cacheSeconds: 21600 });
});
