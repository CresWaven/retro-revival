/**
 * GET /api/settings
 *
 * Public, non-secret configuration for the frontend: which features are wired
 * up, and what the decade options are. Lets the UI hide the newsletter form or
 * the affiliate buttons rather than rendering dead controls.
 */

import { config, DECADES, emailEnabled, canServeTitles } from './_lib/config.js';
import { affiliateEnabled } from './_lib/affiliate.js';
import { requireMethod, sendJson, withErrorHandling } from './_lib/http.js';

export default withErrorHandling(async (req, res) => {
  if (!requireMethod(req, res, ['GET'])) return;

  sendJson(
    res,
    200,
    {
      configured: canServeTitles(),
      mock: config.mock,
      affiliateEnabled: affiliateEnabled(),
      emailEnabled: emailEnabled(),
      defaultRegion: config.defaultRegion,
      decades: Object.entries(DECADES).map(([key, value]) => ({
        key,
        label: value.label,
        start: value.start,
        end: value.end,
      })),
    },
    { cacheSeconds: 300 }
  );
});
