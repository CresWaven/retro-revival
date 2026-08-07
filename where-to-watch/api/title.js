/**
 * GET /api/title?type=movie&id=771&region=US
 *
 * Returns full metadata plus streaming availability for one title, and an
 * Amazon search link for a physical copy when an associate tag is configured.
 *
 * These URLs are deep-linkable (the frontend mirrors them into `?t=movie-771`),
 * which is the point: you can send a reel or story straight to the page for one
 * specific title.
 */

import { canServeTitles, resolveRegion } from './_lib/config.js';
import { getTitleDetail } from './_lib/tmdb.js';
import { buildAmazonLink } from './_lib/affiliate.js';
import { getQuery, requireMethod, sendError, sendJson, withErrorHandling } from './_lib/http.js';

export default withErrorHandling(async (req, res) => {
  if (!requireMethod(req, res, ['GET'])) return;

  if (!canServeTitles()) {
    return sendError(res, 503, 'This site is not configured yet: the TMDB API key is missing.');
  }

  const query = getQuery(req);
  const type = query.type === 'tv' ? 'tv' : 'movie';
  const id = Number.parseInt(query.id, 10);

  if (!Number.isFinite(id) || id <= 0) {
    return sendError(res, 400, 'A numeric `id` is required, for example: /api/title?type=movie&id=771');
  }

  const region = resolveRegion(query.region);
  const title = await getTitleDetail({ type, id, region });

  sendJson(
    res,
    200,
    {
      ...title,
      amazonLink: buildAmazonLink(title.title, { region, year: title.year }),
    },
    { cacheSeconds: 21600 }
  );
});
