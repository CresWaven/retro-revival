# Where to Watch the 90s

A live streaming-availability lookup for 90s and 2000s movies and TV. Someone types a title, and it tells them exactly which services have it right now — subscription, free, free-with-ads, rent, or buy.

**This is the replacement for a streaming-guide PDF.** A PDF goes stale within weeks and makes you look wrong. This reads live data, so it stays correct on its own, and it's a page you can send traffic to from every reel, story, and email.

- **Zero dependencies.** No `npm install`, no build step, nothing to break.
- **Free to run.** TMDB API is free; Vercel's free tier covers this comfortably.
- **Three integrations, all optional:** TMDB (required for real data), Amazon Associates, Beehiiv.

---

## Try it right now, no API key needed

```bash
MOCK=1 node dev-server.js
```

Open <http://localhost:3000>. You'll get a working app with ~24 sample titles so you can see the whole thing before signing up for anything.

To run the full test suite (46 checks):

```bash
./smoke-test.sh
```

---

## Setup

### 1. TMDB API key (required, ~2 minutes, free)

1. Create an account at [themoviedb.org](https://www.themoviedb.org/signup).
2. Go to **Settings → API** and request an API key. Choose **Developer**. For "type of use" pick personal/non-commercial unless you're operating this commercially, in which case read their terms.
3. Copy the **API Key (v3 auth)** value.

```bash
cp .env.example .env
# then edit .env and paste your key into TMDB_API_KEY=
node dev-server.js
```

TMDB sources its streaming-availability data from JustWatch, which is why one free key gives you posters, metadata, *and* "where to watch."

### 2. Amazon Associates tag (optional, this is the money part)

Put your tracking tag (e.g. `yourtag-20`) in `AMAZON_ASSOCIATE_TAG`. The app then shows a **"Find it on DVD / Blu-ray"** button on every title, scoped to Amazon's Movies & TV department and automatically pointed at the right Amazon domain for the visitor's selected country.

Leave it blank and those buttons — and the disclosure line — simply don't render.

> ### ⚠️ Read this before you promote the site
>
> **Amazon prohibits affiliate links in email, and in any "offline" medium — which includes PDFs and downloadable files.**
>
> So: **do not paste Amazon links into your Beehiiv newsletter or your free PDF.** Link to *this site* instead, and let the affiliate links live here on the page. You get the same commission, and you don't risk your Associates account.
>
> This is exactly why the app builds Amazon links server-side for web rendering only. The required disclosure is rendered in the footer automatically — leave it there.

### 3. Beehiiv (optional)

Set `BEEHIIV_API_KEY` (Beehiiv → Settings → Integrations → API) and `BEEHIIV_PUBLICATION_ID` (starts with `pub_`). The signup form appears once both are present and hides itself when they're not. The API key never reaches the browser.

---

## Deploy to Vercel

1. Push this folder to a GitHub repo (already done if I set it up for you — see the repo link).
2. Go to [vercel.com/new](https://vercel.com/new), import the repo, and click **Deploy**. No build settings to change; `vercel.json` handles it.
3. In **Project → Settings → Environment Variables**, add `TMDB_API_KEY` (and optionally `AMAZON_ASSOCIATE_TAG`, `BEEHIIV_API_KEY`, `BEEHIIV_PUBLICATION_ID`). Redeploy.
4. Add your custom domain under **Settings → Domains** — something like `watch.yourbrand.com`.

Secrets stay server-side; nothing sensitive is exposed to the browser.

---

## How to actually use this in your content

This is the part that matters. The tool is only worth building if it feeds the funnel.

**Every title has its own shareable URL.** Opening *Hocus Pocus* gives you:

```
https://yoursite.com/?t=movie-4011
```

That link opens straight to that title. So:

| Move | How |
|---|---|
| **Reel CTA** | End a reel about a movie with "link in bio tells you where to stream it" — point the bio link at that title's URL |
| **Story sticker** | Link sticker straight to `?t=movie-771`, zero friction |
| **Comment reply** | Someone asks "where can I watch this?" — you have an actual answer, instantly |
| **Newsletter** | Link to the site (never Amazon directly), let the affiliate links convert on-page |
| **Content ideas** | Hit **🎲 Surprise me** when you need a title to build a reel around |

Filters are URL-driven too, so you can share pre-filtered views: `?decade=00s&type=tv`, `?q=rugrats`.

**The `Both` decade toggle** means this one deployment serves your 90s audience *and* your 00s page — no second site needed.

### Add a social share image

Drop a 1200×630 PNG at `public/og.png`, then add this to `<head>` in `public/index.html`:

```html
<meta property="og:image" content="https://yoursite.com/og.png">
```

Without it, links shared to Facebook will look plain.

---

## Project structure

```
public/              Static frontend — no build step
  index.html         Markup, meta tags, required attributions
  styles.css         Retro CRT/VHS theme, mobile-first
  app.js             Search, filters, modal, deep links, newsletter
api/                 Serverless functions (Vercel auto-detects these)
  settings.js        Which features are configured (drives the UI)
  search.js          Search + decade filtering
  discover.js        Default browse rows
  title.js           One title: metadata + availability + Amazon link
  random.js          "Surprise me"
  subscribe.js       Beehiiv signup (key stays server-side)
  _lib/              Shared code. The _ prefix keeps these out of routing.
    config.js        Env loading (includes a tiny .env parser)
    tmdb.js          TMDB client + normalizers
    mock.js          Fixture data for MOCK=1
    affiliate.js     Amazon link builder + compliance notes
    cache.js         In-memory TTL cache
    http.js          Request/response helpers, rate limiting
dev-server.js        Local server; routes to the same api/ handlers
smoke-test.sh        46 end-to-end checks
```

### API reference

| Endpoint | Purpose |
|---|---|
| `GET /api/settings` | Feature flags + decade options |
| `GET /api/search?q=&type=&decade=&page=` | Search, filtered to the decade |
| `GET /api/discover?type=movie&decade=90s` | Browse rows |
| `GET /api/title?type=movie&id=771&region=US` | Full detail + availability |
| `GET /api/random?decade=90s&type=movie` | Random pick |
| `POST /api/subscribe` | `{ "email": "..." }` → Beehiiv |

---

## Notes on behaviour

- **Caching.** TMDB responses are cached in memory (1–12h depending on endpoint). Keeps the app fast and stays well inside rate limits. Availability genuinely changes on the order of days.
- **One API call per title.** Uses `append_to_response=watch/providers` so metadata and availability arrive together.
- **Region-aware.** Availability is per-country. Visitors pick their country and the choice persists in `localStorage`. Set the default with `DEFAULT_REGION`.
- **Graceful degradation.** No TMDB key → a clear setup message, not a broken page. No Amazon tag → no affiliate buttons. No Beehiiv → no signup form. Missing poster → styled fallback tile.
- **Security.** All third-party strings are HTML-escaped before rendering. Secrets stay server-side. Path traversal and `_lib` access are blocked. The newsletter endpoint is rate-limited.

---

## Attribution (required — do not remove)

The footer contains:

> This product uses the TMDB API but is not endorsed or certified by TMDB. Streaming availability data is provided by JustWatch via TMDB.

TMDB's terms require this attribution. Keep it visible. The Amazon disclosure line is likewise required whenever affiliate links are present.

Review [TMDB's API terms](https://www.themoviedb.org/api-terms-of-use) yourself before running this commercially, and verify the current [Amazon Associates Operating Agreement](https://affiliate-program.amazon.com/help/operating/agreement) — the email/PDF restriction is the rule people most often get terminated for.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| "This site is not configured yet" | `TMDB_API_KEY` missing or not picked up. On Vercel, redeploy after adding env vars. |
| "the TMDB API key was rejected" | Wrong key. You need **API Key (v3 auth)**, not the v4 read access token. |
| No DVD/Blu-ray buttons | `AMAZON_ASSOCIATE_TAG` not set. Expected behaviour. |
| No signup form | Beehiiv vars missing. Both are required. |
| Everything empty, no errors | Check the decade filter — a 2005 title won't appear under `90s`. Try `Both`. |
| "Too many lookups right now" | TMDB rate limit. The cache makes this rare; wait a few seconds. |
