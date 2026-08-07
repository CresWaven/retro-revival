/**
 * POST /api/subscribe  { "email": "...", "source": "..." }
 *
 * Adds a subscriber to your Beehiiv publication. The API key stays server-side.
 *
 * NOTE ON AFFILIATE COMPLIANCE: do not put Amazon affiliate links in the emails
 * you send to this list. Amazon prohibits affiliate links in email. Link to this
 * site instead and let the affiliate links live on the page.
 */

import { config, emailEnabled } from './_lib/config.js';
import {
  clientIp,
  rateLimit,
  readJsonBody,
  requireMethod,
  sendError,
  sendJson,
  withErrorHandling,
} from './_lib/http.js';

const BEEHIIV_API = 'https://api.beehiiv.com/v2';
const REQUEST_TIMEOUT_MS = 8000;

// Deliberately permissive: real validation is the confirmation email.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default withErrorHandling(async (req, res) => {
  if (!requireMethod(req, res, ['POST'])) return;

  if (!emailEnabled()) {
    return sendError(res, 503, 'The newsletter is not configured on this site yet.');
  }

  // Coarse throttle: 5 signups per minute per IP.
  if (!rateLimit(`subscribe:${clientIp(req)}`, { limit: 5, windowMs: 60_000 })) {
    return sendError(res, 429, 'Too many attempts. Please wait a minute and try again.');
  }

  const body = await readJsonBody(req);
  const email = String(body.email || '').trim().toLowerCase();

  if (!email || !EMAIL_PATTERN.test(email) || email.length > 254) {
    return sendError(res, 400, 'Please enter a valid email address.');
  }

  // Mock mode short-circuits so the form can be demoed without Beehiiv wired up.
  if (config.mock) {
    return sendJson(res, 200, { ok: true, status: 'mocked', email });
  }

  let response;
  try {
    response = await fetch(
      `${BEEHIIV_API}/publications/${config.beehiivPublicationId}/subscriptions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.beehiivApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          reactivate_existing: true,
          send_welcome_email: true,
          utm_source: 'where-to-watch',
          utm_medium: 'organic',
          referring_site: String(body.source || 'where-to-watch-the-90s').slice(0, 120),
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      }
    );
  } catch (err) {
    console.error('[subscribe] network error:', err.message);
    return sendError(res, 504, 'Could not reach the newsletter service. Please try again.');
  }

  if (response.ok) {
    return sendJson(res, 200, { ok: true, status: 'subscribed', email });
  }

  const detail = await response.text().catch(() => '');

  // An already-subscribed address is a success from the visitor's point of view.
  if (response.status === 409 || /already/i.test(detail)) {
    return sendJson(res, 200, { ok: true, status: 'already_subscribed', email });
  }

  // Log the real reason, but never surface credentials or internals to the client.
  console.error(`[subscribe] beehiiv ${response.status}: ${detail}`);

  if (response.status === 401 || response.status === 403) {
    return sendError(res, 500, 'The newsletter is misconfigured on this site.');
  }
  if (response.status === 429) {
    return sendError(res, 429, 'Too many signups right now. Please try again shortly.');
  }

  return sendError(res, 502, 'Could not complete the signup. Please try again.');
});
