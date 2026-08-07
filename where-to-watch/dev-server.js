/**
 * Zero-dependency local dev server.
 *
 * Serves `public/` as static files and routes `/api/<name>` to the matching
 * `api/<name>.js` handler — the same modules Vercel will run in production, so
 * local behaviour matches deployed behaviour.
 *
 *   node dev-server.js            # live data (needs TMDB_API_KEY)
 *   MOCK=1 node dev-server.js     # sample data, no API key needed
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, extname, join, normalize } from 'node:path';

import { config } from './api/_lib/config.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(HERE, 'public');
const API_DIR = join(HERE, 'api');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

/** Only allow API route names we expect, and never path-traverse into _lib. */
const API_ROUTE_PATTERN = /^[a-z0-9-]+$/;

const handlerCache = new Map();

async function loadApiHandler(name) {
  if (handlerCache.has(name)) return handlerCache.get(name);

  const modulePath = join(API_DIR, `${name}.js`);
  try {
    await stat(modulePath);
  } catch {
    return null;
  }

  const module = await import(`file://${modulePath}`);
  const handler = module.default;
  if (typeof handler !== 'function') return null;

  handlerCache.set(name, handler);
  return handler;
}

async function serveStatic(req, res, pathname) {
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');

  // Block traversal outside PUBLIC_DIR.
  const target = normalize(join(PUBLIC_DIR, relative));
  if (!target.startsWith(PUBLIC_DIR)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  let body;
  try {
    body = await readFile(target);
  } catch {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end('<h1>404 — Not found</h1><p><a href="/">Back to the 90s</a></p>');
    return;
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', MIME_TYPES[extname(target).toLowerCase()] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.end(body);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (url.pathname.startsWith('/api/')) {
    const name = url.pathname.slice('/api/'.length).replace(/\/+$/, '');

    if (!API_ROUTE_PATTERN.test(name)) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Unknown API route' }));
      return;
    }

    const handler = await loadApiHandler(name);
    if (!handler) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: `No API route named "${name}"` }));
      return;
    }

    try {
      await handler(req, res);
    } catch (err) {
      console.error(`[dev] /api/${name} threw:`, err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Server error' }));
      }
    }
    return;
  }

  await serveStatic(req, res, url.pathname);
});

server.listen(config.port, () => {
  const mode = config.mock
    ? 'MOCK (sample data)'
    : config.tmdbApiKey
      ? 'LIVE (TMDB)'
      : 'UNCONFIGURED — set TMDB_API_KEY or use MOCK=1';

  console.log(`\n  Where to Watch the 90s`);
  console.log(`  ---------------------------------------------`);
  console.log(`  http://localhost:${config.port}`);
  console.log(`  Mode:      ${mode}`);
  console.log(`  Newsletter ${config.beehiivApiKey && config.beehiivPublicationId ? 'configured' : 'not configured'}`);
  console.log(`  Affiliate  ${config.amazonTag ? `tag ${config.amazonTag}` : 'not configured'}`);
  console.log(`  ---------------------------------------------\n`);
});
