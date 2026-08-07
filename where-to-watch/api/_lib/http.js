/**
 * Request/response helpers.
 *
 * These are written to work identically under Vercel's Node runtime (where
 * `req.query` and `req.body` are pre-populated) and under the zero-dependency
 * local dev server (where they are not).
 */

/** Read query params as a plain object, regardless of runtime. */
export function getQuery(req) {
  if (req.query && typeof req.query === 'object') return req.query;

  const url = new URL(req.url || '/', 'http://localhost');
  return Object.fromEntries(url.searchParams.entries());
}

/** Read and JSON-parse the request body, regardless of runtime. */
export async function readJsonBody(req, { maxBytes = 16 * 1024 } = {}) {
  // Vercel may have already parsed it.
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  const chunks = [];
  let total = 0;

  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) {
      const err = new Error('Request body too large');
      err.statusCode = 413;
      throw err;
    }
    chunks.push(chunk);
  }

  if (!chunks.length) return {};

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    const err = new Error('Invalid JSON body');
    err.statusCode = 400;
    throw err;
  }
}

export function sendJson(res, statusCode, data, { cacheSeconds = 0 } = {}) {
  const body = JSON.stringify(data);
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader(
    'Cache-Control',
    cacheSeconds > 0
      ? `public, max-age=0, s-maxage=${cacheSeconds}, stale-while-revalidate=86400`
      : 'no-store'
  );
  res.end(body);
}

export function sendError(res, statusCode, message, extra = {}) {
  sendJson(res, statusCode, { error: message, ...extra });
}

/** Best-effort client IP, used only for coarse abuse throttling. */
export function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

const rateBuckets = new Map();

/**
 * Coarse fixed-window rate limit. Returns true when the request is allowed.
 * Not distributed, so on serverless this limits per instance — enough to blunt
 * casual abuse of the newsletter endpoint without adding infrastructure.
 */
export function rateLimit(key, { limit = 10, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const bucket = rateBuckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) return false;

  bucket.count += 1;
  return true;
}

/** Only allow the given HTTP methods. Responds and returns false if not. */
export function requireMethod(req, res, methods) {
  const allowed = Array.isArray(methods) ? methods : [methods];
  if (allowed.includes(req.method)) return true;

  res.setHeader('Allow', allowed.join(', '));
  sendError(res, 405, `Method ${req.method} not allowed`);
  return false;
}

/** Wrap a handler so thrown errors become clean JSON instead of a crash. */
export function withErrorHandling(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      const status = err.statusCode || 500;
      if (status >= 500) console.error('[api] unhandled error:', err);
      if (!res.headersSent) {
        sendError(res, status, err.publicMessage || err.message || 'Server error');
      } else {
        res.end();
      }
    }
  };
}
