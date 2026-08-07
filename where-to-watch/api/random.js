/**
 * GET /api/random?decade=90s&type=movie&region=US
 *
 * Powers the "Surprise me" button. Doubles as a content-idea generator: hit it
 * when you need a title to build a reel around.
 */

import { canServeTitles, resolveDecade, resolveRegion } from './_lib/config.js';
import { getRandomTitle } from './_lib/tmdb.js';
import { buildAmazonLink } from './_lib/affiliate.js';
import { getQuery, requireMethod, sendError, sendJson, withErrorHandling } from './_lib/http.js';

export default withErrorHandling(async (req, res) => {
  if (!requireMethod(req, res, ['GET'])) return;

  if (!canServeTitles()) {
    return sendError(res, 503, 'This site is not configured yet: the TMDB API key is missing.');
  }

  const query = getQuery(req);
  const region = resolveRegion(query.region);

  const title = await getRandomTitle({
    decade: resolveDecade(query.decade),
    type: query.type === 'tv' ? 'tv' : 'movie',
    region,
  });

  // Never cache: every request should return a different pick.
  sendJson(res, 200, {
    ...title,
    amazonLink: buildAmazonLink(title.title, { region, year: title.year }),
  });
});
